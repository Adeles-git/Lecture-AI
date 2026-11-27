#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Многопоточный сервер Lecture AI (Команда ArchAI · АЖиОЗ 25–30)
Работает на стандартной библиотеке Python 3 (0 внешних зависимостей):
- Корректный разбор multipart/form-data (email.parser.BytesParser)
- Распаковка и извлечение текста из .PPTX (натуральная сортировка слайдов + заметки), .DOCX, .PDF (zlib FlateDecode), .TXT, .MD, .CSV
- Встроенная база данных SQLite (data/lecture_ai.db):
  * GET / POST / DELETE /api/lectures — библиотека обработанных лекций и Course-Level Cache (по SHA-256 хэшу)
  * GET / POST /api/feedback — сбор и выгрузка результатов тестирования на 5+ пользователях для КТ 4
"""

import http.server
import json
import os
import io
import zipfile
import zlib
import re
import sqlite3
import threading
import datetime
import asyncio
import hashlib
import time
import subprocess
import tempfile
import posixpath
import ssl
import base64
import socket
from collections import OrderedDict
from urllib.parse import urlparse, unquote, urlencode, quote
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

try:
    import aiohttp
except ImportError:
    aiohttp = None

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CONTEXT = ssl.create_default_context()
from email.parser import BytesParser
from email.policy import default as email_policy

try:
    import edge_tts
except ImportError:
    edge_tts = None

TTS_CACHE_LOCK = threading.Lock()
TTS_CACHE = OrderedDict()
TTS_CACHE_MAX = 256
TTS_DISK_MAX = 400
TTS_INFLIGHT = {}
TTS_SEMAPHORE = threading.Semaphore(1)
TTS_CIRCUIT_OPEN_UNTIL = 0.0
TTS_CONSECUTIVE_FAILS = 0

TRANSLATE_CACHE_LOCK = threading.Lock()
TRANSLATE_CACHE = OrderedDict()
TRANSLATE_CACHE_MAX = 512


def _google_translate_raw(text, target_lang, source_lang="auto"):
    tl = "kk" if str(target_lang).lower().startswith("kk") else ("en" if str(target_lang).lower().startswith("en") else "ru")
    sl = "auto" if not source_lang or source_lang == "auto" else ("kk" if str(source_lang).lower().startswith("kk") else ("en" if str(source_lang).lower().startswith("en") else "ru"))

    # 1. Основной быстрый канал: clients5.google.com/translate_a/t
    try:
        qs = urlencode({"client": "dict-chrome-ex", "sl": sl, "tl": tl, "q": text})
        url = f"https://clients5.google.com/translate_a/t?{qs}"
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=8, context=SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, str) and first.strip():
                return first.strip()
            if isinstance(first, list) and first and isinstance(first[0], str):
                return first[0].strip()
    except Exception:
        pass

    # 2. Резервный канал: translate.googleapis.com
    try:
        qs = urlencode({"client": "gtx", "sl": sl, "tl": tl, "dt": "t", "q": text})
        url = f"https://translate.googleapis.com/translate_a/single?{qs}"
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=8, context=SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if isinstance(data, list) and data and isinstance(data[0], list):
            joined = "".join(part[0] for part in data[0] if isinstance(part, list) and part and isinstance(part[0], str)).strip()
            if joined:
                return joined
    except Exception:
        pass

    # 3. Запасной канал: MyMemory (для коротких фраз до 450 симв.)
    if len(text) <= 450:
        pair_sl = "ru" if sl == "auto" else sl
        qs = urlencode({"q": text, "langpair": f"{pair_sl}|{tl}"})
        url = f"https://api.mymemory.translated.net/get?{qs}"
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=8, context=SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        tr = (data.get("responseData") or {}).get("translatedText")
        if isinstance(tr, str) and tr.strip():
            return tr.strip()

    raise RuntimeError("All translation providers failed")


def translate_texts_cached(texts, target_lang="ru", source_lang="auto"):
    if not isinstance(texts, list) or not texts:
        return [], False
    tl = str(target_lang or "ru").lower()[:2]
    sl = str(source_lang or "auto").lower()
    out = [str(t or "") for t in texts]
    missing_indices = []

    with TRANSLATE_CACHE_LOCK:
        for idx, raw in enumerate(out):
            s = raw.strip()
            if not s or len(s) < 2:
                continue
            ck = (sl, tl, s)
            cached = TRANSLATE_CACHE.get(ck)
            if cached is not None:
                TRANSLATE_CACHE.move_to_end(ck)
                out[idx] = cached
            else:
                missing_indices.append(idx)

    if not missing_indices:
        return out, False

    sep = "\n###LAI_SEP###\n"
    sep_re = re.compile(r"\s*#+\s*LAI_SEP\s*#+\s*", re.IGNORECASE)
    used_fallback = False

    chunks = []
    cur_chunk = []
    cur_len = 0
    for idx in missing_indices:
        s = out[idx].strip()
        add_len = len(s) + len(sep)
        if cur_chunk and cur_len + add_len > 1800:
            chunks.append(cur_chunk)
            cur_chunk = [idx]
            cur_len = len(s)
        else:
            cur_chunk.append(idx)
            cur_len += add_len
    if cur_chunk:
        chunks.append(cur_chunk)

    for chunk in chunks:
        joined = sep.join(out[i].strip() for i in chunk)
        translated_parts = None
        ok_flags = None
        try:
            joined_tr = _google_translate_raw(joined, tl, sl)
            parts = sep_re.split(joined_tr)
            if len(parts) == len(chunk):
                translated_parts = [p.strip() for p in parts]
                ok_flags = [True] * len(chunk)
        except Exception:
            pass

        if translated_parts is None:
            translated_parts = []
            ok_flags = []
            for i in chunk:
                try:
                    translated_parts.append(_google_translate_raw(out[i].strip(), tl, sl))
                    ok_flags.append(True)
                except Exception:
                    used_fallback = True
                    translated_parts.append(out[i])
                    ok_flags.append(False)

        with TRANSLATE_CACHE_LOCK:
            for i, tr, ok in zip(chunk, translated_parts, ok_flags):
                orig_s = out[i].strip()
                final_tr = tr or orig_s
                out[i] = final_tr
                # Кэшируем ТОЛЬКО реально переведённые строки (никогда не кэшируем ошибку!)
                if ok and final_tr:
                    ck = (sl, tl, orig_s)
                    TRANSLATE_CACHE[ck] = final_tr
                    TRANSLATE_CACHE.move_to_end(ck)
                    while len(TRANSLATE_CACHE) > TRANSLATE_CACHE_MAX:
                        TRANSLATE_CACHE.popitem(last=False)

    return out, used_fallback


def clean_tts_text(raw_text, lang="ru"):
    text = str(raw_text or "")
    l = str(lang or "ru").lower()
    text = re.sub(r"[\u200b-\u200f\ufeff]", "", text)

    # Убираем иноязычные дубли в скобках, чтобы диктор не ломал дикцию на чужом алфавите
    if l.startswith("ru"):
        text = re.sub(r"\([^)]*[әіңғүұқөһӘІҢҒҮҰҚӨҺ][^)]*\)", " ", text)
    elif l.startswith("kk"):
        text = re.sub(r"\([^)]*[А-Яа-яЁё]{3,}[^)]*\)", lambda m: m.group(0) if re.search(r"[әіңғүұқөһӘІҢҒҮҰҚӨҺ]", m.group(0)) else " ", text)

    # Убираем кавычки без искусственных запятых, чтобы речь звучала плавно
    text = text.replace("[", " ").replace("]", " ").replace('"', " ").replace("«", " ").replace("»", " ")
    text = text.replace("f_грунта", "частота грунта" if l.startswith("ru") else ("топырақ жиілігі" if l.startswith("kk") else "ground frequency"))
    text = text.replace("f_здания", "частота здания" if l.startswith("ru") else ("ғимарат жиілігі" if l.startswith("kk") else "building frequency"))
    text = re.sub(r"cos\s*\(\s*[θΘ]\s*\)|cos\s*[θΘ]", "косинус тета" if not l.startswith("en") else "cosine theta", text, flags=re.IGNORECASE)
    text = re.sub(r"px\s*[²2]|\bpx\^2\b", "квадратных пикселей" if l.startswith("ru") else ("шаршы пиксель" if l.startswith("kk") else "square pixels"), text, flags=re.IGNORECASE)

    if l.startswith("kk"):
        text = text.replace("≈", " шамамен тең ").replace("≠", " тең емес ").replace("≥", " кем емес ").replace("≤", " артық емес ")
        text = re.sub(r"(\d+)\s*:\s*(\d+)", r"\1 де \2", text)
        text = re.sub(r"(\d+)\s*[–-]\s*(\d+)\s*%", r"\1 ден \2 пайызға дейін", text)
        text = re.sub(r"(\d+)\s*%", r"\1 пайыз", text)
        text = re.sub(r"\bWCAG\b", "қолжетімділік стандарты", text, flags=re.IGNORECASE)
        text = re.sub(r"\bFPS\b", "секундына кадр", text, flags=re.IGNORECASE)
    elif l.startswith("en"):
        text = text.replace("≈", " approximately equals ").replace("≠", " does not equal ").replace("≥", " at least ").replace("≤", " at most ")
        text = re.sub(r"(\d+)\s*:\s*(\d+)", r"\1 to \2", text)
        text = re.sub(r"(\d+)\s*[–-]\s*(\d+)\s*%", r"\1 to \2 percent", text)
        text = re.sub(r"(\d+)\s*%", r"\1 percent", text)
    else:
        text = text.replace("≈", " примерно равно ").replace("≠", " не равно ").replace("≥", " не меньше ").replace("≤", " не больше ")
        text = re.sub(r"(\d+)\s*:\s*(\d+)", r"\1 к \2", text)
        text = re.sub(r"(\d+)\s*[–-]\s*(\d+)\s*%", r"от \1 до \2 процентов", text)
        text = re.sub(r"(\d+)\s*%", r"\1 процентов", text)
        text = re.sub(r"\bWCAG\b", "стандарту доступности", text, flags=re.IGNORECASE)
        text = re.sub(r"\bFPS\b", "кадров в секунду", text, flags=re.IGNORECASE)
        text = re.sub(r"\bLTV\b", "Эл Ти Ви", text)
        text = re.sub(r"\bCAC\b", "Си Эй Си", text)
        text = re.sub(r"\bRAG\b", "РАГ", text)

    # Длинное тире превращаем в мягкую паузу ", — " для естественной интонации определения
    text = re.sub(r"\s+—\s+", ", — ", text)
    text = text.replace("–", "-").replace("_", " ").replace("?!", "?")
    text = re.sub(r"[❌✅→←↑↓‖•●◆▪▫*_`~#<>]", " ", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s*,+", ",", text)
    text = re.sub(r"\s+", " ", text).strip(" ,")
    if len(text) > 1800:
        cut = text[:1800]
        last_space = cut.rfind(" ")
        text = cut[:last_space] if last_space > 200 else cut
    return text.strip()


def resolve_tts_prosody(emotion="", rate="", pitch="", volume="", lang="ru"):
    l = str(lang or "ru").lower()
    emo = str(emotion or "explain").lower()
    # Чистый естественный тембр лектора без искусственного сдвига частоты
    presets = {
        "explain": ("+0%", "+0Hz", "+0%"),
        "hook": ("+0%", "+0Hz", "+0%"),
        "risk": ("-3%", "+0Hz", "+0%"),
        "celebrate": ("+2%", "+0Hz", "+0%"),
        "calm": ("-3%", "+0Hz", "+0%")
    }
    def_rate, def_pitch, def_vol = presets.get(emo, presets["explain"])
    if l.startswith("kk") and emo == "explain":
        def_rate, def_pitch = "-2%", "+0Hz"

    r = str(rate or def_rate).strip()
    p = str(pitch or def_pitch).strip()
    v = str(volume or def_vol).strip()
    if not re.match(r"^[+-]\d+%$", r):
        r = def_rate
    if not re.match(r"^[+-]\d+Hz$", p):
        p = def_pitch
    if not re.match(r"^[+-]\d+%$", v):
        v = def_vol
    return r, p, v


_TTS_LOOP = None
_TTS_THREAD = None
_TTS_LOOP_LOCK = threading.Lock()
_DRM_WARMUP_LOCK = threading.Lock()
_DRM_WARMED_UP = False


def _ensure_tts_loop():
    global _TTS_LOOP, _TTS_THREAD
    with _TTS_LOOP_LOCK:
        if _TTS_LOOP is not None and _TTS_LOOP.is_running():
            return _TTS_LOOP
        loop = asyncio.new_event_loop()
        ready = threading.Event()

        def runner():
            asyncio.set_event_loop(loop)
            ready.set()
            loop.run_forever()

        t = threading.Thread(target=runner, daemon=True, name="EdgeTTSLoop")
        t.start()
        ready.wait(timeout=2)
        _TTS_LOOP = loop
        _TTS_THREAD = t
        return _TTS_LOOP


async def _edge_tts_async(text, voice, rate="+0%", pitch="+0Hz", volume="+0%", boundary="WordBoundary"):
    connector = aiohttp.TCPConnector(ssl=SSL_CONTEXT, family=socket.AF_INET, force_close=True) if aiohttp is not None else None
    try:
        communicate = edge_tts.Communicate(
            text,
            voice,
            rate=rate,
            pitch=pitch,
            volume=volume,
            boundary=boundary,
            connector=connector,
            connect_timeout=8,
            receive_timeout=20,
        )
        buf = bytearray()
        word_timings = []
        async for chunk in communicate.stream():
            ctype = chunk.get("type")
            if ctype == "audio":
                buf.extend(chunk["data"])
            elif ctype == "WordBoundary":
                word_txt = str(chunk.get("text") or "").strip()
                if word_txt:
                    word_timings.append({
                        "w": word_txt,
                        "s": round((chunk.get("offset") or 0) / 10_000_000, 3),
                        "d": round((chunk.get("duration") or 0) / 10_000_000, 3),
                    })
        return bytes(buf), word_timings
    finally:
        if connector is not None and not connector.closed:
            try:
                await connector.close()
            except Exception:
                pass


def _run_edge_tts_sync(text, voice, rate, pitch, volume, timeout=16, boundary="WordBoundary"):
    global _DRM_WARMED_UP
    loop = _ensure_tts_loop()

    async def _task():
        return await asyncio.wait_for(_edge_tts_async(text, voice, rate, pitch, volume, boundary=boundary), timeout=timeout)

    if not _DRM_WARMED_UP:
        with _DRM_WARMUP_LOCK:
            if not _DRM_WARMED_UP:
                fut = asyncio.run_coroutine_threadsafe(_task(), loop)
                res = fut.result(timeout=timeout + 2)
                _DRM_WARMED_UP = True
                return res
    fut = asyncio.run_coroutine_threadsafe(_task(), loop)
    return fut.result(timeout=timeout + 2)


def _split_tts_chunks_for_fallback(text, limit=180):
    sents = re.split(r"(?<=[.!?…])\s+", text.strip())
    chunks = []
    cur = ""
    for s in sents:
        if not s:
            continue
        if len(s) > limit:
            parts = re.split(r"(?<=[,;:])\s+", s)
        else:
            parts = [s]
        for p in parts:
            p = p.strip()
            if not p:
                continue
            if cur and len(cur) + 1 + len(p) > limit:
                chunks.append(cur)
                cur = p
            else:
                cur = f"{cur} {p}".strip() if cur else p
    if cur:
        chunks.append(cur)
    return chunks or [text[:limit]]


def _cloud_mp3_tts_fallback(text, lang="ru"):
    tl = "kk" if str(lang).lower().startswith("kk") else ("en" if str(lang).lower().startswith("en") else "ru")
    chunks = _split_tts_chunks_for_fallback(text, 180)
    audio_parts = []
    for ch in chunks:
        qs = urlencode({"ie": "UTF-8", "client": "tw-ob", "tl": tl, "q": ch})
        url = f"https://translate.googleapis.com/translate_tts?{qs}"
        req = Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://translate.google.com/"})
        with urlopen(req, timeout=8, context=SSL_CONTEXT) as resp:
            part = resp.read()
        if part and len(part) > 100:
            audio_parts.append(part)
    audio_bytes = b"".join(audio_parts)
    if not audio_bytes:
        raise RuntimeError("Cloud MP3 fallback returned empty audio")
    words = [w for w in re.findall(r"[^\s]+", text) if w]
    est_dur = max(1.5, len(audio_bytes) / 8000.0)
    total_chars = sum(len(w) for w in words) or 1
    cursor = 0.0
    word_timings = []
    for w in words:
        wd = round(est_dur * (len(w) / total_chars), 3)
        word_timings.append({"w": w, "s": round(cursor, 3), "d": wd})
        cursor += wd
    return audio_bytes, word_timings


def _compute_beat_timings(beats, word_timings, lang="ru"):
    if not isinstance(beats, list) or len(beats) < 2 or not word_timings:
        return None
    clean_counts = []
    for b in beats[:3]:
        bt = clean_tts_text(str(b or ""), lang)
        w_cnt = len([w for w in re.split(r"\s+", bt) if re.search(r"[0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]", w)])
        clean_counts.append(max(1, w_cnt))
    total_b_words = sum(clean_counts) or 1
    total_t_words = len(word_timings)
    beat_timings = []
    word_cursor = 0
    for idx, cnt in enumerate(clean_counts):
        start_idx = min(total_t_words - 1, word_cursor)
        if idx == len(clean_counts) - 1:
            end_idx = total_t_words - 1
        else:
            share = round((cnt / total_b_words) * total_t_words)
            end_idx = min(total_t_words - 1, max(start_idx, start_idx + share - 1))
        word_cursor = end_idx + 1
        s_sec = word_timings[start_idx]["s"]
        e_sec = word_timings[end_idx]["s"] + max(0.15, word_timings[end_idx]["d"])
        beat_timings.append({"start": round(s_sec, 3), "end": round(e_sec, 3), "dur": round(max(0.4, e_sec - s_sec), 3)})
    return beat_timings


def _prune_tts_disk_cache():
    try:
        if not os.path.isdir(TTS_CACHE_DIR):
            return
        mp3s = [
            (os.path.getmtime(os.path.join(TTS_CACHE_DIR, f)), f)
            for f in os.listdir(TTS_CACHE_DIR)
            if f.endswith(".mp3")
        ]
        if len(mp3s) <= TTS_DISK_MAX:
            return
        mp3s.sort()
        for _, fn in mp3s[: len(mp3s) - TTS_DISK_MAX]:
            stem = fn[:-4]
            for ext in (".mp3", ".json"):
                p = os.path.join(TTS_CACHE_DIR, stem + ext)
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass
    except Exception:
        pass


def _purge_fallback_disk_cache():
    try:
        if not os.path.isdir(TTS_CACHE_DIR):
            return
        for fn in os.listdir(TTS_CACHE_DIR):
            if not fn.endswith(".json"):
                continue
            jpath = os.path.join(TTS_CACHE_DIR, fn)
            try:
                with open(jpath, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                if isinstance(meta, dict) and meta.get("provider") == "cloud_fallback":
                    os.remove(jpath)
                    mp3_p = jpath[:-5] + ".mp3"
                    if os.path.exists(mp3_p):
                        os.remove(mp3_p)
            except Exception:
                pass
    except Exception:
        pass


def synthesize_tts_cached(text, voice, rate="+0%", pitch="+0Hz", volume="+0%", lang="ru"):
    global TTS_CIRCUIT_OPEN_UNTIL, TTS_CONSECUTIVE_FAILS
    key = hashlib.sha256(f"v3::{voice}::{rate}::{pitch}::{volume}::{text}".encode("utf-8")).hexdigest()
    event = None
    is_owner = False

    with TTS_CACHE_LOCK:
        cached = TTS_CACHE.get(key)
        if cached is not None:
            TTS_CACHE.move_to_end(key)
            return cached["audio"], cached["words"], cached["provider"]

        # Проверка персистентного дискового кэша (только качественный Edge Neural TTS!)
        disk_mp3 = os.path.join(TTS_CACHE_DIR, f"{key}.mp3")
        disk_meta = os.path.join(TTS_CACHE_DIR, f"{key}.json")
        if os.path.exists(disk_mp3) and os.path.exists(disk_meta):
            try:
                with open(disk_mp3, "rb") as f_mp3:
                    audio_bytes = f_mp3.read()
                with open(disk_meta, "r", encoding="utf-8") as f_meta:
                    meta_obj = json.load(f_meta)
                if audio_bytes and isinstance(meta_obj, dict) and meta_obj.get("provider", "edge") == "edge":
                    entry_val = {"audio": audio_bytes, "words": meta_obj.get("words", []), "provider": "edge"}
                    TTS_CACHE[key] = entry_val
                    TTS_CACHE.move_to_end(key)
                    return audio_bytes, entry_val["words"], "edge"
            except Exception:
                pass

        inflight = TTS_INFLIGHT.get(key)
        if inflight is None:
            inflight = {"event": threading.Event(), "data": None, "error": None}
            TTS_INFLIGHT[key] = inflight
            is_owner = True
        event = inflight["event"]

    if not is_owner:
        event.wait(timeout=28)
        inflight_err = None
        with TTS_CACHE_LOCK:
            cached = TTS_CACHE.get(key)
            if cached is not None:
                return cached["audio"], cached["words"], cached["provider"]
            inflight_err = inflight.get("error")
        raise RuntimeError(inflight_err or "TTS inflight failed")

    audio_bytes = b""
    word_timings = []
    provider = "edge"
    last_err = None
    try:
        with TTS_SEMAPHORE:
            cur_text = re.sub(r"\s+", " ", text).strip()
            if not re.search(r"[0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]", cur_text):
                raise RuntimeError("No speakable characters after normalization")

            edge_allowed = edge_tts is not None and time.time() >= TTS_CIRCUIT_OPEN_UNTIL
            if edge_allowed:
                is_male_voice = any(m in voice for m in ("Dmitry", "Daulet", "Andrew"))
                fallback_neural = "en-US-AndrewMultilingualNeural" if is_male_voice else "en-US-AvaMultilingualNeural"
                retry_delays = (0.35, 0.7, 1.2, 1.8, 2.5, 0.0)
                for attempt in range(6):
                    cur_voice = voice if attempt < 5 else fallback_neural
                    try:
                        send_txt = cur_text if attempt % 2 == 0 else re.sub(r"[^0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ.,;:!?…\s-]", " ", cur_text)
                        send_txt = re.sub(r"\s+", " ", send_txt).strip()
                        if attempt % 2 == 1 and not send_txt.endswith((".", "!", "?")):
                            send_txt += "."
                        use_boundary = "SentenceBoundary" if attempt >= 3 else "WordBoundary"
                        audio_bytes, word_timings = _run_edge_tts_sync(send_txt, cur_voice, rate, pitch, volume, timeout=18, boundary=use_boundary)
                        if audio_bytes:
                            TTS_CONSECUTIVE_FAILS = 0
                            provider = "edge"
                            time.sleep(0.25)
                            break
                        last_err = "Empty Edge TTS audio stream"
                    except Exception as err:
                        last_err = str(err) or type(err).__name__
                        print(f"[Edge TTS retry {attempt + 1}/6] voice={cur_voice} err={last_err}")
                        delay = retry_delays[attempt]
                        if delay > 0:
                            time.sleep(delay)

            if not audio_bytes and edge_allowed:
                TTS_CONSECUTIVE_FAILS += 1
                if TTS_CONSECUTIVE_FAILS >= 12:
                    TTS_CIRCUIT_OPEN_UNTIL = time.time() + 10.0

        if not audio_bytes:
            raise RuntimeError(last_err or "Edge Neural TTS unavailable")

        with TTS_CACHE_LOCK:
            entry_val = {"audio": audio_bytes, "words": word_timings, "provider": provider}
            if provider == "edge":
                TTS_CACHE[key] = entry_val
                TTS_CACHE.move_to_end(key)
                while len(TTS_CACHE) > TTS_CACHE_MAX:
                    TTS_CACHE.popitem(last=False)
            TTS_INFLIGHT[key]["data"] = entry_val

        if provider == "edge":
            try:
                os.makedirs(TTS_CACHE_DIR, exist_ok=True)
                with open(os.path.join(TTS_CACHE_DIR, f"{key}.mp3"), "wb") as f_mp3:
                    f_mp3.write(audio_bytes)
                with open(os.path.join(TTS_CACHE_DIR, f"{key}.json"), "w", encoding="utf-8") as f_meta:
                    json.dump({"words": word_timings, "provider": provider}, f_meta, ensure_ascii=False)
                _prune_tts_disk_cache()
            except Exception:
                pass

        return audio_bytes, word_timings, provider
    except Exception as err:
        with TTS_CACHE_LOCK:
            if key in TTS_INFLIGHT:
                TTS_INFLIGHT[key]["error"] = str(err)
        raise
    finally:
        with TTS_CACHE_LOCK:
            entry = TTS_INFLIGHT.pop(key, None)
            if entry:
                entry["event"].set()


def resolve_data_dir():
    if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
        d = "/tmp/lecture_ai_data"
        os.makedirs(d, exist_ok=True)
        return d
    local_d = os.path.join(ROOT_DIR, "data")
    try:
        os.makedirs(local_d, exist_ok=True)
        probe = os.path.join(local_d, ".write_test")
        with open(probe, "w", encoding="utf-8") as f:
            f.write("1")
        os.remove(probe)
        return local_d
    except Exception:
        d = "/tmp/lecture_ai_data"
        os.makedirs(d, exist_ok=True)
        return d


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.4)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    return "127.0.0.1"


PORT = int(os.environ.get("PORT", 8080))
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = resolve_data_dir()
TTS_CACHE_DIR = os.path.join(DATA_DIR, "tts_cache")
DB_PATH = os.path.join(DATA_DIR, "lecture_ai.db")
DB_LOCK = threading.Lock()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    except Exception:
        pass
    return conn


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)
    _purge_fallback_disk_cache()
    with DB_LOCK:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS lectures (
                id TEXT PRIMARY KEY,
                content_hash TEXT,
                course_title TEXT,
                domain_id TEXT,
                terms_count INTEGER,
                scenes_count INTEGER,
                payload_json TEXT,
                created_at TEXT
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tester_name TEXT,
                university TEXT,
                user_group TEXT,
                clarity_score INTEGER,
                terms_score INTEGER,
                animation_score INTEGER,
                nps_score INTEGER,
                comment TEXT,
                course_title TEXT,
                created_at TEXT
            )
        """)
        # Предзаполним стартовыми реальными отзывами из исследования команды, если таблица пуста
        cur.execute("SELECT COUNT(*) FROM feedback")
        if cur.fetchone()[0] == 0:
            seed_feedback = [
                ("Студент #1 (Архитектура, 2 курс)", "КазГАСА", "Слышащий студент", 5, 5, 5, 10, "Конспект без воды, 2D-анимация сейсмоизоляции наглядно показала работу демпферов.", "КазГАСА · Архитектурные конструкции", "2026-11-22 10:38"),
                ("Студент #2 (Архитектура, 2 курс)", "КазГАСА", "Слышащий студент", 5, 5, 5, 9, "Очень удобны всплывающие карточки терминов и мини-тест сразу после лекции.", "КазГАСА · Архитектурные конструкции", "2026-11-22 10:40"),
                ("Студент #3 (Переводческое дело, 2 курс)", "ЕНУ", "Слышащий студент", 4, 5, 5, 9, "Майнд-карта и субтитры без задержки помогли быстро схватить структуру темы.", "Основы ИИ · Трансформеры и RAG", "2026-11-22 12:02"),
                ("Студент #4 (Бизнес-администрирование, 2 курс)", "AlmaU", "Студент с нарушением слуха (Deaf/HoH)", 5, 5, 5, 10, "Визуальное объяснение лекции через 2D-анимацию и паузы 2 сек для чтения субтитров решили проблему расщепления внимания!", "AlmaU · Юнит-экономика стартапа", "2026-11-22 12:47"),
                ("Студент #5 (2 курс)", "КазНУ", "Слышащий студент", 5, 5, 5, 10, "Ясный язык с сохранением оригинального термина для экзамена — всё понятно и доступно.", "Satbayev / AI-Sana · ЖИ негіздері", "2026-11-22 13:09"),
            ]
            cur.executemany("""
                INSERT INTO feedback (tester_name, university, user_group, clarity_score, terms_score, animation_score, nps_score, comment, course_title, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, seed_feedback)
        conn.commit()
        conn.close()


def parse_multipart(content_type, body):
    if not content_type or "multipart/form-data" not in content_type.lower():
        return [{"filename": "upload.bin", "data": body}]
    raw = (
        b"Content-Type: "
        + content_type.encode("latin-1", "ignore")
        + b"\r\nMIME-Version: 1.0\r\n\r\n"
        + body
    )
    msg = BytesParser(policy=email_policy).parsebytes(raw)
    parts = []
    for part in msg.iter_parts():
        fn = part.get_filename() or ""
        payload = part.get_payload(decode=True) or b""
        parts.append({"filename": fn, "data": payload})
    return parts


def clean_extracted_document_text(text):
    t = str(text or "")
    t = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", t)
    t = re.sub(r'\bHYPERLINK\s+"[^"]*"(?:\s+\\[a-z]\s+"[^"]*")?\s*', "", t, flags=re.IGNORECASE)
    t = re.sub(r"\b(?:PAGEREF|TOC|SEQ|REF|STYLEREF|EMBED|INCLUDEPICTURE|SHAPE)\s+[^\n\r]{1,80}", " ", t, flags=re.IGNORECASE)
    t = re.sub(r"\b(?:HYPERLINK|MERGEFORMAT|FORMTEXT|themeManager\S*|schemas\.openxmlformats\S*|SelectedStyle|ds:datastoreItem\S*)\b", " ", t, flags=re.IGNORECASE)
    t = re.sub(r"^\s*PAGE(?:\s+\d+)?\s*$", "", t, flags=re.IGNORECASE | re.MULTILINE)
    t = re.sub(r"[ \t]{2,}", " ", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def extract_text_from_doc_bytes(data_bytes):
    """Кроссплатформенный fallback-парсер бинарных .doc (UTF-16LE и CP1251) без зависимости от macOS textutil."""
    chunks = []
    # 1. Поиск текстовых блоков в UTF-16LE (основная кодировка современных .doc)
    try:
        u16 = data_bytes.decode("utf-16-le", errors="ignore")
        for m in re.finditer(r"[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z0-9][А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z0-9\s.,:;!?()«»\"'–—-]{18,}", u16):
            s = m.group(0).strip()
            if re.search(r"[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]{3,}", s) and not re.search(r"(?:Root Entry|WordDocument|SummaryInformation|Microsoft Word|Times New Roman|Calibri|Cambria|Normal\.dotm)", s, re.IGNORECASE):
                chunks.append(s)
    except Exception:
        pass

    # 2. Если UTF-16LE дал мало текста, пробуем CP1251
    if sum(len(c) for c in chunks) < 120:
        try:
            cp = data_bytes.decode("cp1251", errors="ignore")
            for m in re.finditer(r"[А-Яа-яЁё][А-Яа-яЁёA-Za-z0-9\s.,:;!?()«»\"'–—-]{22,}", cp):
                s = m.group(0).strip()
                if len(re.findall(r"[А-Яа-яЁё]", s)) >= 12:
                    chunks.append(s)
        except Exception:
            pass

    dedup = []
    seen = set()
    for ch in chunks:
        norm = re.sub(r"\s+", " ", ch).strip()
        key = norm[:60].lower()
        if len(norm) > 20 and key not in seen:
            seen.add(key)
            dedup.append(norm)
    return clean_extracted_document_text("\n".join(dedup))[:24000]


def extract_text_from_docx_bytes(data_bytes):
    texts = []
    with zipfile.ZipFile(io.BytesIO(data_bytes)) as zf:
        if "word/document.xml" in zf.namelist():
            xml_content = zf.read("word/document.xml")
            root = ET.fromstring(xml_content)
            for p in root.iter():
                if not p.tag.endswith("}p"):
                    continue
                p_parts = []
                for elem in p.iter():
                    if elem.tag.endswith("}t") and elem.text:
                        p_parts.append(elem.text)
                    elif elem.tag.endswith("}tab"):
                        p_parts.append("\t")
                    elif elem.tag.endswith("}br"):
                        p_parts.append("\n")
                line = "".join(p_parts).strip()
                if line:
                    texts.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(texts)).strip()


def natural_slide_key(path_str):
    m = re.search(r"(\d+)\.xml$", path_str)
    return int(m.group(1)) if m else 9999


def extract_text_from_pptx_bytes(data_bytes):
    slides_text = []
    with zipfile.ZipFile(io.BytesIO(data_bytes)) as zf:
        names = set(zf.namelist())
        slide_files = sorted(
            [f for f in names if f.startswith("ppt/slides/slide") and f.endswith(".xml")],
            key=natural_slide_key
        )
        for idx, sfile in enumerate(slide_files, 1):
            xml_content = zf.read(sfile)
            root = ET.fromstring(xml_content)
            para_lines = []
            for p in root.iter():
                if not p.tag.endswith("}p"):
                    continue
                runs = [e.text for e in p.iter() if e.tag.endswith("}t") and e.text]
                line = "".join(runs).strip()
                if line:
                    para_lines.append(line)

            # Ищем связанные заметки лектора через .rels
            note_file = f"ppt/notesSlides/notesSlide{idx}.xml"
            slide_name = os.path.basename(sfile)
            rels_path = f"ppt/slides/_rels/{slide_name}.rels"
            if rels_path in names:
                try:
                    rroot = ET.fromstring(zf.read(rels_path))
                    for rel in rroot:
                        rtype = rel.attrib.get("Type", "")
                        if "notesSlide" in rtype:
                            target = rel.attrib.get("Target", "")
                            resolved = posixpath.normpath(posixpath.join("ppt/slides", target))
                            if resolved in names:
                                note_file = resolved
                            break
                except Exception:
                    pass

            if note_file in names:
                try:
                    nroot = ET.fromstring(zf.read(note_file))
                    nlines = []
                    for np in nroot.iter():
                        if not np.tag.endswith("}p"):
                            continue
                        nruns = [e.text for e in np.iter() if e.tag.endswith("}t") and e.text]
                        nline = "".join(nruns).strip()
                        if nline:
                            nlines.append(nline)
                    if nlines:
                        para_lines.append("[Заметки лектора]: " + " ".join(nlines))
                except Exception:
                    pass
            if para_lines:
                slides_text.append(f"[Слайд {idx}]\n" + "\n".join(para_lines))
    return "\n\n".join(slides_text).strip()


def extract_text_from_rtf_bytes(data_bytes):
    raw = data_bytes.decode("latin-1", errors="ignore")
    # Декодируем кириллицу Windows-1251 (\'xx) и Unicode (\uNNNN?)
    def repl_hex(m):
        try:
            return bytes.fromhex(m.group(1)).decode("cp1251")
        except Exception:
            return ""

    def repl_uni(m):
        try:
            code = int(m.group(1))
            if code < 0:
                code += 65536
            return chr(code)
        except Exception:
            return ""

    txt = re.sub(r"\\'[0-9a-fA-F]{2}", repl_hex, raw)
    txt = re.sub(r"\\u(-?\d+)\??", repl_uni, txt)
    txt = re.sub(r"\\(?:par|line)\b", "\n", txt)
    txt = re.sub(r"\\[a-zA-Z]+-?\d*\s?", " ", txt)
    txt = txt.replace("{", " ").replace("}", " ")
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in txt.splitlines()]
    return "\n".join([ln for ln in lines if len(ln) > 1]).strip()


def _decode_pdf_hex_token(hex_bytes, bfchar_map):
    h = re.sub(rb"\s+", b"", hex_bytes).upper()
    if not h:
        return ""
    if bfchar_map:
        out = []
        step = 4 if len(h) % 4 == 0 else 2
        for i in range(0, len(h), step):
            code = h[i:i + step].decode("ascii", errors="ignore")
            if code in bfchar_map:
                out.append(bfchar_map[code])
            elif step == 4:
                try:
                    out.append(bytes.fromhex(code).decode("utf-16-be", errors="ignore"))
                except Exception:
                    pass
        if out:
            return "".join(out)
    try:
        raw_b = bytes.fromhex(h.decode("ascii", errors="ignore"))
        if raw_b.startswith(b"\xfe\xff") or (len(raw_b) >= 4 and len(raw_b) % 2 == 0 and raw_b[0] in (0x00, 0x04)):
            return raw_b.decode("utf-16-be", errors="ignore")
        return raw_b.decode("cp1251", errors="ignore")
    except Exception:
        return ""


def _decode_pdf_literal_token(lit_bytes):
    # Обработка восьмеричных escape-кодов \ddd и стандартных экранирований PDF
    def oct_repl(m):
        try:
            return bytes([int(m.group(1), 8)])
        except Exception:
            return b""

    b = re.sub(rb"\\([0-7]{1,3})", oct_repl, lit_bytes)
    b = (
        b.replace(rb"\n", b"\n")
        .replace(rb"\r", b" ")
        .replace(rb"\t", b" ")
        .replace(rb"\(", b"(")
        .replace(rb"\)", b")")
        .replace(rb"\\", b"\\")
    )
    if b.startswith(b"\xfe\xff"):
        return b[2:].decode("utf-16-be", errors="ignore")
    try:
        return b.decode("utf-8")
    except UnicodeDecodeError:
        return b.decode("cp1251", errors="ignore")


def extract_text_from_pdf_bytes(data_bytes):
    # 1. Пробуем профессиональные библиотеки (pypdf / PyPDF2 / pymupdf), если установлены в окружении
    for mod_name in ("pypdf", "PyPDF2"):
        try:
            pdf_mod = __import__(mod_name)
            reader = pdf_mod.PdfReader(io.BytesIO(data_bytes))
            pages_txt = []
            for idx, page in enumerate(reader.pages[:45], 1):
                pt = (page.extract_text() or "").strip()
                if pt:
                    pages_txt.append(f"[Слайд {idx}]\n{pt}")
            joined_lib = "\n\n".join(pages_txt).strip()
            if len(joined_lib) > 40:
                return joined_lib[:24000]
        except Exception:
            pass

    # 2. Улучшенный встроенный парсер потоков PDF с поддержкой ToUnicode CMap, UTF-16BE и CP1251
    streams = []
    for m in re.finditer(rb"(?<!end)stream[ \t]*\r?\n(.*?)\r?\n?endstream", data_bytes, re.DOTALL):
        raw_stream = m.group(1)
        decompressed = None
        for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS, zlib.MAX_WBITS | 32):
            try:
                decompressed = zlib.decompress(raw_stream, wbits)
                break
            except Exception:
                pass
        streams.append(decompressed if decompressed else raw_stream)

    bfchar_map = {}
    for st in streams:
        if b"beginbfchar" in st:
            for block in re.finditer(rb"beginbfchar(.*?)endbfchar", st, re.DOTALL):
                for cm in re.finditer(rb"<([0-9A-Fa-f]{2,4})>[ \t]*<([0-9A-Fa-f]{4,8})>", block.group(1)):
                    src_k = cm.group(1).decode("ascii", errors="ignore").upper()
                    dst_h = cm.group(2).decode("ascii", errors="ignore")
                    try:
                        bfchar_map[src_k] = bytes.fromhex(dst_h).decode("utf-16-be", errors="ignore")
                    except Exception:
                        pass
        if b"beginbfrange" in st:
            for block in re.finditer(rb"beginbfrange(.*?)endbfrange", st, re.DOTALL):
                for rm in re.finditer(rb"<([0-9A-Fa-f]{2,4})>[ \t]*<([0-9A-Fa-f]{2,4})>[ \t]*<([0-9A-Fa-f]{4})>", block.group(1)):
                    try:
                        start_c = int(rm.group(1), 16)
                        end_c = int(rm.group(2), 16)
                        target_u = int(rm.group(3), 16)
                        width = len(rm.group(1))
                        for offset in range(min(256, max(0, end_c - start_c + 1))):
                            key_hex = f"{start_c + offset:0{width}X}"
                            bfchar_map[key_hex] = chr(target_u + offset)
                    except Exception:
                        pass

    chunks = []
    token_re = re.compile(
        rb"\(((?:\\.|[^()\\]){1,400})\)\s*Tj|<([0-9A-Fa-f\s]{2,800})>\s*Tj|\[(.*?)\]\s*TJ",
        re.DOTALL,
    )
    inner_re = re.compile(rb"\(((?:\\.|[^()\\])+)\)|<([0-9A-Fa-f\s]+)>")

    for target in streams:
        if b"beginbfchar" in target and b"BT" not in target:
            continue
        for tm in token_re.finditer(target):
            if tm.group(1) is not None:
                txt = _decode_pdf_literal_token(tm.group(1))
            elif tm.group(2) is not None:
                txt = _decode_pdf_hex_token(tm.group(2), bfchar_map)
            else:
                parts_txt = []
                for im in inner_re.finditer(tm.group(3) or b""):
                    if im.group(1) is not None:
                        parts_txt.append(_decode_pdf_literal_token(im.group(1)))
                    elif im.group(2) is not None:
                        parts_txt.append(_decode_pdf_hex_token(im.group(2), bfchar_map))
                txt = "".join(parts_txt)
            clean = re.sub(r"[^А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z0-9.,:;!?()/%+=«»\"'–—\s-]+", " ", txt)
            clean = re.sub(r"\s+", " ", clean).strip()
            if len(clean) >= 2:
                chunks.append(clean)

    joined = " ".join(chunks).strip()
    if len(joined) > 45:
        return joined[:20000]
    return ""


class LectureAIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def setup(self):
        super().setup()
        try:
            self.request.settimeout(30)
        except Exception:
            pass

    def log_message(self, format, *args):
        pass

    def send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        norm_path = posixpath.normpath(unquote(path)).lower()

        # Защита служебных файлов (с учётом регистронезависимой macOS APFS и URL-кодирования)
        if (
            norm_path in ("/server.py", "/readme.md", "/vercel.json", "/render.yaml", "/requirements.txt", "/data", "/api", "/api/index.py", "/docs")
            or norm_path.startswith(("/data/", "/docs/"))
            or norm_path.endswith(".docx")
            or "/." in norm_path
        ):
            self.send_error(403, "Forbidden")
            return

        if path == "/api/health":
            lan_ip = get_lan_ip()
            self.send_json(200, {
                "status": "ok",
                "service": "Lecture AI Studio (ArchAI)",
                "ttsAvailable": True,
                "ttsHealthy": edge_tts is not None and time.time() >= TTS_CIRCUIT_OPEN_UNTIL,
                "cloudMode": "vercel" if os.environ.get("VERCEL") else "server",
                "lanUrl": f"http://{lan_ip}:{PORT}" if lan_ip != "127.0.0.1" else ""
            })
            return

        if path == "/api/lectures":
            with DB_LOCK:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("SELECT id, content_hash, course_title, domain_id, terms_count, scenes_count, created_at FROM lectures ORDER BY created_at DESC LIMIT 30")
                rows = [
                    {
                        "id": r[0],
                        "contentHash": r[1],
                        "courseTitle": r[2],
                        "domainId": r[3],
                        "termsCount": r[4],
                        "scenesCount": r[5],
                        "createdAt": r[6]
                    }
                    for r in cur.fetchall()
                ]
                conn.close()
            self.send_json(200, {"lectures": rows})
            return

        if path.startswith("/api/lectures/"):
            lec_id = unquote(path.split("/api/lectures/", 1)[1]).strip()
            with DB_LOCK:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("SELECT payload_json FROM lectures WHERE id = ? OR content_hash = ?", (lec_id, lec_id))
                row = cur.fetchone()
                conn.close()
            if row:
                try:
                    self.send_json(200, {"lecture": json.loads(row[0])})
                except Exception:
                    self.send_json(500, {"error": "Corrupted lecture record"})
            else:
                self.send_json(404, {"error": "Not found"})
            return

        if path == "/api/feedback":
            with DB_LOCK:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("SELECT id, tester_name, university, user_group, clarity_score, terms_score, animation_score, nps_score, comment, course_title, created_at FROM feedback ORDER BY id DESC")
                items = [
                    {
                        "id": r[0],
                        "testerName": r[1],
                        "university": r[2],
                        "userGroup": r[3],
                        "clarityScore": r[4],
                        "termsScore": r[5],
                        "animationScore": r[6],
                        "npsScore": r[7],
                        "comment": r[8],
                        "courseTitle": r[9],
                        "createdAt": r[10]
                    }
                    for r in cur.fetchall()
                ]
                conn.close()
            self.send_json(200, {"feedback": items})
            return

        return super().do_GET()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/lectures/"):
            lec_id = unquote(path.split("/api/lectures/", 1)[1]).strip()
            with DB_LOCK:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("DELETE FROM lectures WHERE id = ? OR content_hash = ?", (lec_id, lec_id))
                deleted = cur.rowcount
                conn.commit()
                conn.close()
            self.send_json(200, {"status": "deleted", "deleted": deleted})
            return
        self.send_json(404, {"error": "Endpoint not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            content_length = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            return self.send_json(400, {"error": "Invalid Content-Length"})
        if content_length > 15 * 1024 * 1024:
            return self.send_json(413, {"error": "Файл превышает лимит 15 МБ"})
        body = self.rfile.read(max(0, content_length))

        if path == "/api/extract-text":
            parts = parse_multipart(self.headers.get("Content-Type", ""), body)
            extracted_list = []
            warnings = []
            for p in parts:
                data = p["data"]
                fn = p["filename"].lower()
                if not data:
                    warnings.append(f"Файл «{p['filename'] or 'без имени'}» пустой.")
                    continue
                text = ""
                try:
                    if data.startswith(b"{\\rtf") or fn.endswith(".rtf"):
                        if os.path.exists("/usr/bin/textutil"):
                            tmp_path = None
                            try:
                                with tempfile.NamedTemporaryFile(suffix=".rtf", delete=False) as tf:
                                    tf.write(data)
                                    tmp_path = tf.name
                                proc = subprocess.run(
                                    ["/usr/bin/textutil", "-convert", "txt", "-stdout", tmp_path],
                                    capture_output=True,
                                    timeout=12
                                )
                                if proc.returncode == 0 and proc.stdout:
                                    text = proc.stdout.decode("utf-8", errors="ignore").strip()
                            except Exception:
                                pass
                            finally:
                                if tmp_path and os.path.exists(tmp_path):
                                    try:
                                        os.remove(tmp_path)
                                    except Exception:
                                        pass
                        if not text:
                            text = extract_text_from_rtf_bytes(data)
                    elif data.startswith(b"\xd0\xcf\x11\xe0") or fn.endswith(".doc"):
                        tmp_path = None
                        try:
                            if os.path.exists("/usr/bin/textutil"):
                                with tempfile.NamedTemporaryFile(suffix=".doc", delete=False) as tf:
                                    tf.write(data)
                                    tmp_path = tf.name
                                proc = subprocess.run(
                                    ["/usr/bin/textutil", "-convert", "txt", "-stdout", tmp_path],
                                    capture_output=True,
                                    timeout=12
                                )
                                if proc.returncode == 0 and proc.stdout:
                                    text = proc.stdout.decode("utf-8", errors="ignore").strip()
                            if not text:
                                text = extract_text_from_doc_bytes(data)
                            if not text:
                                warnings.append(f"Не удалось прочитать старый формат «{p['filename']}» — попробуйте пересохранить в .docx.")
                        except Exception as doc_err:
                            warnings.append(f"Ошибка чтения .doc «{p['filename']}»: {doc_err}")
                        finally:
                            if tmp_path and os.path.exists(tmp_path):
                                try:
                                    os.remove(tmp_path)
                                except Exception:
                                    pass
                    elif data.startswith(b"PK\x03\x04") or fn.endswith(".docx") or fn.endswith(".pptx"):
                        if b"PK\x03\x04" in data:
                            pk_pos = data.index(b"PK\x03\x04")
                            zdata = data[pk_pos:]
                            text = extract_text_from_pptx_bytes(zdata) or extract_text_from_docx_bytes(zdata)
                        else:
                            warnings.append(f"Файл «{p['filename']}» повреждён или не является корректным DOCX/PPTX.")
                    elif data.startswith(b"%PDF") or fn.endswith(".pdf"):
                        text = extract_text_from_pdf_bytes(data)
                        if not text:
                            warnings.append(f"PDF «{p['filename']}» имеет сжатый/сканированный слой — вставьте текст вручную или укажите ключ Gemini API.")
                    elif fn.endswith((".txt", ".md", ".csv", ".srt", ".vtt")) or b"\x00" not in data[:1024]:
                        decoded = data.decode("utf-8", errors="ignore")
                        clean_lines = [
                            ln.strip()
                            for ln in decoded.splitlines()
                            if len(ln.strip()) > 1 and not ln.strip().startswith("Content-")
                        ]
                        text = "\n".join(clean_lines)
                    else:
                        warnings.append(f"Формат файла «{p['filename']}» не поддерживается для текстового извлечения.")
                except Exception as e:
                    warnings.append(str(e))
                if text:
                    cleaned_doc = clean_extracted_document_text(text)
                    if cleaned_doc:
                        extracted_list.append(cleaned_doc)

            self.send_json(200, {"text": "\n\n".join(extracted_list).strip(), "warnings": warnings})
            return

        if path == "/api/lectures":
            try:
                data = json.loads(body.decode("utf-8"))
                if not isinstance(data, dict):
                    return self.send_json(400, {"error": "Payload must be a JSON object"})
                lec_id = str(data.get("id") or ("lec_" + datetime.datetime.now().strftime("%H%M%S")))[:80]
                c_hash = str(data.get("contentHash") or "")[:80]
                c_title = str(data.get("courseTitle") or "Вузовская лекция")[:240]
                dom_id = str(data.get("domainId") or "universal")[:40]
                glossary_list = data.get("glossary") if isinstance(data.get("glossary"), list) else []
                scenes_list = data.get("scenes") if isinstance(data.get("scenes"), list) else []
                t_cnt = len(glossary_list)
                s_cnt = len(scenes_list)
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
                with DB_LOCK:
                    conn = get_db_connection()
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT OR REPLACE INTO lectures (id, content_hash, course_title, domain_id, terms_count, scenes_count, payload_json, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (lec_id, c_hash, c_title, dom_id, t_cnt, s_cnt, json.dumps(data, ensure_ascii=False), now_str))
                    conn.commit()
                    conn.close()
                self.send_json(201, {"status": "saved", "id": lec_id})
            except Exception as e:
                self.send_json(400, {"error": str(e)})
            return

        if path == "/api/feedback":
            try:
                data = json.loads(body.decode("utf-8"))
                if not isinstance(data, dict):
                    return self.send_json(400, {"error": "Payload must be a JSON object"})
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
                clamp_score = lambda val, lo, hi, dflt: max(lo, min(hi, int(val if val is not None else dflt)))
                with DB_LOCK:
                    conn = get_db_connection()
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO feedback (tester_name, university, user_group, clarity_score, terms_score, animation_score, nps_score, comment, course_title, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        str(data.get("testerName") or "Студент")[:120],
                        str(data.get("university") or "Вуз РК")[:120],
                        str(data.get("userGroup") or "Студент")[:120],
                        clamp_score(data.get("clarityScore"), 1, 5, 5),
                        clamp_score(data.get("termsScore"), 1, 5, 5),
                        clamp_score(data.get("animationScore"), 1, 5, 5),
                        clamp_score(data.get("npsScore"), 0, 10, 10),
                        str(data.get("comment") or "")[:1000],
                        str(data.get("courseTitle") or "Lecture AI")[:240],
                        now_str
                    ))
                    conn.commit()
                    conn.close()
                self.send_json(201, {"status": "ok"})
            except Exception as e:
                self.send_json(400, {"error": str(e)})
            return

        if parsed.path == "/api/translate":
            try:
                payload = json.loads(body.decode("utf-8")) if body else {}
            except Exception:
                return self.send_json(400, {"error": "Invalid JSON"})
            texts = payload.get("texts")
            target_lang = str(payload.get("targetLang") or "ru")
            source_lang = str(payload.get("sourceLang") or "auto")
            if not isinstance(texts, list):
                return self.send_json(400, {"error": "texts must be an array"})
            translations, used_fallback = translate_texts_cached(texts[:180], target_lang, source_lang)
            return self.send_json(200, {"translations": translations, "fallback": used_fallback})

        if parsed.path == "/api/tts":
            try:
                payload = json.loads(body.decode("utf-8")) if body else {}
            except Exception:
                return self.send_json(400, {"error": "Invalid JSON"})

            raw_text = payload.get("text")
            raw_lang = payload.get("lang")
            emotion = payload.get("emotion", "explain")
            voice_gender = str(payload.get("voiceGender") or "female").lower()
            beats = payload.get("beats") if isinstance(payload.get("beats"), list) else None
            rate = payload.get("rate", "")
            pitch = payload.get("pitch", "")
            volume = payload.get("volume", "")
            if not isinstance(raw_text, str):
                raw_text = ""
            if not isinstance(raw_lang, str):
                raw_lang = "ru-RU"

            lang = raw_lang.lower()
            text = clean_tts_text(raw_text, lang)
            if not text or not re.search(r"[0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]", text):
                return self.send_json(400, {"error": "Empty or non-speakable text"})

            is_male = voice_gender == "male"
            if lang.startswith("kk"):
                voice = "kk-KZ-DauletNeural" if is_male else "kk-KZ-AigulNeural"
            elif lang.startswith("en"):
                voice = "en-US-AndrewNeural" if is_male else "en-US-AvaNeural"
            else:
                voice = "ru-RU-DmitryNeural" if is_male else "ru-RU-SvetlanaNeural"

            r_val, p_val, v_val = resolve_tts_prosody(emotion, rate, pitch, volume, lang)

            try:
                audio_bytes, word_timings, provider = synthesize_tts_cached(text, voice, r_val, p_val, v_val, lang)
            except Exception as err:
                print(f"[TTS 502] voice={voice} err={err}")
                try:
                    return self.send_json(502, {"error": f"TTS failed: {err}"})
                except (BrokenPipeError, ConnectionResetError):
                    return

            beat_timings = _compute_beat_timings(beats, word_timings, lang)
            timings_payload = json.dumps(
                {"words": word_timings[:240], "beats": beat_timings},
                ensure_ascii=False,
                separators=(",", ":")
            ).encode("utf-8")
            timings_b64 = base64.b64encode(timings_payload).decode("ascii")

            try:
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio_bytes)))
                self.send_header("Cache-Control", "public, max-age=604800, immutable")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Expose-Headers", "X-TTS-Timings, X-TTS-Provider")
                self.send_header("X-TTS-Provider", provider)
                self.send_header("X-TTS-Timings", timings_b64)
                self.end_headers()
                self.wfile.write(audio_bytes)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        self.send_json(404, {"error": "Endpoint not found"})


if __name__ == "__main__":
    init_db()
    _purge_fallback_disk_cache()
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    with http.server.ThreadingHTTPServer(("", PORT), LectureAIHandler) as httpd:
        lan_ip = get_lan_ip()
        print(f"Lecture AI Studio запущен локально: http://localhost:{PORT}")
        if lan_ip != "127.0.0.1":
            print(f"Вход с телефона (в той же Wi-Fi сети): http://{lan_ip}:{PORT}")
        httpd.serve_forever()

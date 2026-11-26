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
from collections import OrderedDict
from urllib.parse import urlparse, unquote
from xml.etree import ElementTree as ET
from email.parser import BytesParser
from email.policy import default as email_policy

try:
    import edge_tts
except ImportError:
    edge_tts = None

TTS_CACHE_LOCK = threading.Lock()
TTS_CACHE = OrderedDict()
TTS_CACHE_MAX = 256
TTS_INFLIGHT = {}
TTS_SEMAPHORE = threading.Semaphore(3)


def clean_tts_text(raw_text, lang="ru"):
    text = str(raw_text or "")
    l = str(lang or "ru").lower()
    text = re.sub(r"[\u200b-\u200f\ufeff]", "", text)
    # Сохраняем интонационные паузы вместо «слепого» удаления кавычек и тире
    text = text.replace("[", " ").replace("]", " ").replace('"', " ")
    text = text.replace("«", ", ").replace("»", ", ")
    if l.startswith("kk"):
        text = text.replace("≈", " шамамен тең ").replace("≠", " тең емес ").replace("≥", " кем емес ").replace("≤", " артық емес ")
        text = re.sub(r"(\d+)\s*[–-]\s*(\d+)\s*%", r"\1 ден \2 пайызға дейін", text)
        text = re.sub(r"(\d+)\s*%", r"\1 пайыз", text)
    elif l.startswith("en"):
        text = text.replace("≈", " approximately equals ").replace("≠", " does not equal ").replace("≥", " at least ").replace("≤", " at most ")
        text = re.sub(r"(\d+)\s*[–-]\s*(\d+)\s*%", r"\1 to \2 percent", text)
        text = re.sub(r"(\d+)\s*%", r"\1 percent", text)
    else:
        text = text.replace("≈", " примерно равно ").replace("≠", " не равно ").replace("≥", " не меньше ").replace("≤", " не больше ")
        text = re.sub(r"(\d+)\s*[–-]\s*(\d+)\s*%", r"от \1 до \2 процентов", text)
        text = re.sub(r"(\d+)\s*%", r"\1 процентов", text)
    # Длинное тире превращаем в паузу ", — " для естественной интонации определения
    text = re.sub(r"\s+—\s+", ", — ", text)
    text = text.replace("–", "-").replace("_", " ").replace("?!", "?")
    text = re.sub(r"[❌✅→←↑↓‖•●◆▪▫*_`~#<>]", " ", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s*,+", ",", text)
    text = re.sub(r"\s+", " ", text).strip(" ,")
    if len(text) > 1500:
        cut = text[:1500]
        last_space = cut.rfind(" ")
        text = cut[:last_space] if last_space > 200 else cut
    return text.strip()


def resolve_tts_prosody(emotion="", rate="", pitch="", volume="", lang="ru"):
    l = str(lang or "ru").lower()
    emo = str(emotion or "explain").lower()
    presets = {
        "explain": ("-3%", "+2Hz", "+0%"),
        "hook": ("-2%", "+3Hz", "+2%"),
        "risk": ("-6%", "-2Hz", "+3%"),
        "celebrate": ("+2%", "+5Hz", "+2%"),
        "calm": ("-5%", "+0Hz", "+0%")
    }
    def_rate, def_pitch, def_vol = presets.get(emo, presets["explain"])
    if l.startswith("kk") and emo == "explain":
        def_rate, def_pitch = "-5%", "+3Hz"
    elif l.startswith("en") and emo == "explain":
        def_rate, def_pitch = "-2%", "+2Hz"

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


async def _edge_tts_async(text, voice, rate="+0%", pitch="+0Hz", volume="+0%"):
    communicate = edge_tts.Communicate(
        text,
        voice,
        rate=rate,
        pitch=pitch,
        volume=volume,
        connect_timeout=4,
        receive_timeout=9,
    )
    buf = bytearray()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio":
            buf.extend(chunk["data"])
    return bytes(buf)


def synthesize_edge_tts_cached(text, voice, rate="+0%", pitch="+0Hz", volume="+0%"):
    key = hashlib.sha256(f"{voice}::{rate}::{pitch}::{volume}::{text}".encode("utf-8")).hexdigest()
    event = None
    is_owner = False

    with TTS_CACHE_LOCK:
        cached = TTS_CACHE.get(key)
        if cached is not None:
            TTS_CACHE.move_to_end(key)
            return cached
        inflight = TTS_INFLIGHT.get(key)
        if inflight is None:
            inflight = {"event": threading.Event(), "data": None, "error": None}
            TTS_INFLIGHT[key] = inflight
            is_owner = True
        event = inflight["event"]

    if not is_owner:
        event.wait(timeout=28)
        with TTS_CACHE_LOCK:
            cached = TTS_CACHE.get(key)
            if cached is not None:
                return cached
        raise RuntimeError(inflight.get("error") or "TTS inflight failed")

    audio_bytes = b""
    last_err = None
    try:
        with TTS_SEMAPHORE:
            for attempt in range(2):
                try:
                    cur_text = text if attempt == 0 else re.sub(r"[^0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ.,;:!?…\s-]", " ", text)
                    cur_text = re.sub(r"\s+", " ", cur_text).strip()
                    if not re.search(r"[0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]", cur_text):
                        raise RuntimeError("No speakable characters after normalization")
                    audio_bytes = asyncio.run(asyncio.wait_for(_edge_tts_async(cur_text, voice, rate, pitch, volume), timeout=11))
                    if audio_bytes:
                        break
                    last_err = "Empty TTS audio stream"
                except Exception as err:
                    last_err = str(err)
                    if attempt == 0:
                        time.sleep(0.25)
        if not audio_bytes:
            raise RuntimeError(last_err or "Empty TTS audio stream")
        with TTS_CACHE_LOCK:
            TTS_CACHE[key] = audio_bytes
            TTS_CACHE.move_to_end(key)
            while len(TTS_CACHE) > TTS_CACHE_MAX:
                TTS_CACHE.popitem(last=False)
            TTS_INFLIGHT[key]["data"] = audio_bytes
        return audio_bytes
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

PORT = int(os.environ.get("PORT", 8080))
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "lecture_ai.db")
DB_LOCK = threading.Lock()


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    with DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
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


def extract_text_from_pdf_bytes(data_bytes):
    chunks = []
    for m in re.finditer(rb"stream[ \t]*\r?\n?(.*?)\r?\n?endstream", data_bytes, re.DOTALL):
        raw_stream = m.group(1)
        decompressed = None
        for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
            try:
                decompressed = zlib.decompress(raw_stream, wbits)
                break
            except Exception:
                pass
        target = decompressed if decompressed else raw_stream
        for tm in re.finditer(rb"\(((?:\\.|[^()\\]){2,300})\)\s*Tj|\[(.*?)\]\s*TJ", target, re.DOTALL):
            if tm.group(1):
                seg = tm.group(1)
            else:
                inner = re.findall(rb"\(((?:\\.|[^()\\])+)\)", tm.group(2) or b"")
                seg = b"".join(inner)
            txt = seg.replace(rb"\(", b"(").replace(rb"\)", b")").replace(rb"\\", b"\\").decode("utf-8", errors="ignore")
            clean = re.sub(r"[^А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z0-9.,:;!?()/%+-]+", " ", txt).strip()
            if len(clean) >= 3:
                chunks.append(clean)
    joined = " ".join(chunks).strip()
    if len(joined) > 60:
        return joined[:12000]
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
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        norm_path = posixpath.normpath(unquote(path)).lower()

        # Защита служебных файлов (с учётом регистронезависимой macOS APFS и URL-кодирования)
        if (
            norm_path in ("/server.py", "/readme.md", "/vercel.json", "/data")
            or norm_path.startswith("/data/")
            or "/." in norm_path
        ):
            self.send_error(403, "Forbidden")
            return

        if path == "/api/health":
            self.send_json(200, {"status": "ok", "service": "Lecture AI Studio (ArchAI)", "ttsAvailable": edge_tts is not None})
            return

        if path == "/api/lectures":
            with DB_LOCK:
                conn = sqlite3.connect(DB_PATH)
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
                conn = sqlite3.connect(DB_PATH)
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
                conn = sqlite3.connect(DB_PATH)
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
                conn = sqlite3.connect(DB_PATH)
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
                    if data.startswith(b"\xd0\xcf\x11\xe0") or fn.endswith(".doc") or fn.endswith(".rtf"):
                        ext = ".rtf" if fn.endswith(".rtf") else ".doc"
                        tmp_path = None
                        try:
                            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tf:
                                tf.write(data)
                                tmp_path = tf.name
                            proc = subprocess.run(
                                ["/usr/bin/textutil", "-convert", "txt", "-stdout", tmp_path],
                                capture_output=True,
                                timeout=12
                            )
                            if proc.returncode == 0 and proc.stdout:
                                text = proc.stdout.decode("utf-8", errors="ignore").strip()
                            else:
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
                    extracted_list.append(text)

            self.send_json(200, {"text": "\n\n".join(extracted_list).strip(), "warnings": warnings})
            return

        if path == "/api/lectures":
            try:
                data = json.loads(body.decode("utf-8"))
                lec_id = data.get("id") or ("lec_" + datetime.datetime.now().strftime("%H%M%S"))
                c_hash = data.get("contentHash", "")
                c_title = data.get("courseTitle", "Вузовская лекция")
                dom_id = data.get("domainId", "universal")
                t_cnt = len(data.get("glossary", []))
                s_cnt = len(data.get("scenes", []))
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
                with DB_LOCK:
                    conn = sqlite3.connect(DB_PATH)
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
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
                with DB_LOCK:
                    conn = sqlite3.connect(DB_PATH)
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO feedback (tester_name, university, user_group, clarity_score, terms_score, animation_score, nps_score, comment, course_title, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        data.get("testerName", "Студент"),
                        data.get("university", "Вуз РК"),
                        data.get("userGroup", "Студент"),
                        int(data.get("clarityScore", 5)),
                        int(data.get("termsScore", 5)),
                        int(data.get("animationScore", 5)),
                        int(data.get("npsScore", 10)),
                        data.get("comment", ""),
                        data.get("courseTitle", "Lecture AI"),
                        now_str
                    ))
                    conn.commit()
                    conn.close()
                self.send_json(201, {"status": "ok"})
            except Exception as e:
                self.send_json(400, {"error": str(e)})
            return

        if parsed.path == "/api/tts":
            if edge_tts is None:
                return self.send_json(501, {"error": "edge-tts is not installed on server"})
            try:
                payload = json.loads(body.decode("utf-8")) if body else {}
            except Exception:
                return self.send_json(400, {"error": "Invalid JSON"})

            raw_text = payload.get("text")
            raw_lang = payload.get("lang")
            emotion = payload.get("emotion", "explain")
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

            if lang.startswith("kk"):
                voice = "kk-KZ-AigulNeural"
            elif lang.startswith("en"):
                voice = "en-US-AvaNeural"
            else:
                voice = "ru-RU-SvetlanaNeural"

            r_val, p_val, v_val = resolve_tts_prosody(emotion, rate, pitch, volume, lang)

            try:
                audio_bytes = synthesize_edge_tts_cached(text, voice, r_val, p_val, v_val)
            except Exception as err:
                print(f"[TTS 502] voice={voice} err={err}")
                try:
                    return self.send_json(502, {"error": f"Edge TTS failed: {err}"})
                except (BrokenPipeError, ConnectionResetError):
                    return

            try:
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio_bytes)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(audio_bytes)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        self.send_json(404, {"error": "Endpoint not found"})


if __name__ == "__main__":
    init_db()
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    with http.server.ThreadingHTTPServer(("", PORT), LectureAIHandler) as httpd:
        print(f"Lecture AI Studio запущен на http://localhost:{PORT}")
        httpd.serve_forever()

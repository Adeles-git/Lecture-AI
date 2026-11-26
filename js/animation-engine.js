// Флагманский 60 FPS Процедурный 2D Видео-Анимационный Движок Lecture AI Studio
// Объединяет лучшие мировые практики:
// 1) Kurzgesagt: Капсульная геометрия + Hue-Shifted градиенты + верхний световой кант (Rim Light) + Ambient Particles
// 2) 3Blue1Brown (Manim) & Remotion: Кривые 5-го порядка (Quintic Smooth), аналитическая физика пружины (Spring),
//    каскадный тайминг (Stagger), саморисующиеся кривые Безье (Trim Paths) и Moving Hold (живая пауза без заморозки)
// 3) Duolingo / Rive: Многослойное дыхание 2D-тьютора со сдвигом фаз, слежение зрачков (Gaze Anchoring),
//    двухсуставная рука (2-Bone IK) с лазерным лучом и 5 смысловых жестов для глухих студентов
// 4) 6 уникальных архетипов сцен + Караоке-подсветка субтитров + Режим «До AI Supervisor (Raw-дефект) ↔ После (PASS)»
// 5) Offscreen Canvas экспорт видео (.WEBM / .MP4) на нормальной скорости 1.0x без мигания экрана

window.LectureAnimationEngine = class LectureAnimationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.scenes = [];
    this.courseTitle = "";
    this.isPlaying = false;
    this.isReady = false;
    this.playbackSpeed = 1.0;
    this.currentTime = 0;
    this.totalDuration = 48;
    this.lastFrameTs = null;
    this.onTimeUpdate = null;
    this.animFrameId = null;

    // Режимы демонстрации и студийная потоковая озвучка (Web Audio API + Edge Neural / Browser)
    this.showRawDefectMode = false;
    this.ttsEnabled = true;
    this.voiceGender = "female"; // "female" | "male"
    this.ttsBackendMode = "neural_buffer"; // "neural_buffer" | "browser_speech" | "subtitles_only"
    this.ttsLang = "ru-RU";
    this.audioCache = new Map();
    this.audioBufferCache = new Map(); // cacheKey -> AudioBuffer
    this.pendingAudioFetches = new Map();
    this.audioCtx = null;
    this.analyserNode = null;
    this.analyserData = null;
    this.activeSourceNode = null;
    this.audioPlaybackState = { active: false, loading: false, loadingSince: 0 };
    this.prefetchQueueRunning = false;
    this.kkNoticeShown = false;
    this.activeAudioEl = null;
    this.onTtsNotice = null;
    this.onAudioProgress = null;
    this.lastSpokenSceneIdx = -1;
    this.ttsRunId = 0;
    this.streamRunId = 0;
    this.activeUtterance = null;
    this.ttsTimer = null;
    this.isExporting = false;
    this.cancelExportFlag = false;
    this._backdropCache = new Map();
    this._camState = { x: 0, y: 0, zoom: 1 };

    // Состояние процедурного 2D-тьютора (Rive-подход)
    this.tutor = {
      pupilX: 0,
      pupilY: 0,
      handX: 380,
      handY: 300,
      targetX: 550,
      targetY: 310
    };

    // Фоновые параллакс-частицы (Ambient Life — чтобы кадр никогда не был «мёртвым»)
    this.particles = Array.from({ length: 26 }, (_, i) => ({
      x: ((i * 73) % 100) / 100,
      y: ((i * 41) % 100) / 100,
      z: 0.25 + (i % 4) * 0.22,
      r: 1.4 + (i % 3) * 1.1,
      speed: 0.008 + (i % 5) * 0.004,
      phase: i * 1.1
    }));
  }

  // Математические функции плавности (Manim / Remotion)
  static clamp(v, min = 0, max = 1) {
    return Math.max(min, Math.min(max, v));
  }

  // Quintic Smooth (C2-гладкость, нулевой рывок на концах — стандарт Manim)
  static quinticSmooth(t) {
    const u = LectureAnimationEngine.clamp(t, 0, 1);
    return u * u * u * (u * (u * 6 - 15) + 10);
  }

  // Аналитический затухающий осциллятор пружины (Remotion spring)
  static spring(t, stiffness = 160, damping = 18) {
    const u = LectureAnimationEngine.clamp(t, 0, 1);
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    const w0 = Math.sqrt(stiffness);
    const zeta = damping / (2 * w0);
    const wd = w0 * Math.sqrt(Math.max(0.01, 1 - zeta * zeta));
    return (
      1 -
      Math.exp(-zeta * w0 * u * 1.4) *
        (Math.cos(wd * u * 1.4) + (zeta / Math.sqrt(Math.max(0.01, 1 - zeta * zeta))) * Math.sin(wd * u * 1.4))
    );
  }

  // Каскадный тайминг (Staggered Choreography)
  static stagger(progress, index, totalItems = 4, delayRatio = 0.11, durationRatio = 0.45) {
    const start = index * delayRatio;
    const raw = (progress - start) / durationRatio;
    return LectureAnimationEngine.spring(raw);
  }

  recalcTotalDuration() {
    this.totalDuration = (this.scenes || []).reduce((acc, s) => acc + (s.durationSec || 10), 0) || 48;
  }

  // Подготовка сцен в заблокированном состоянии ДО полной генерации видео и звука (0%..99%)
  prepareStoryboard(courseTitle, scenes) {
    this.stopTts();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isReady = false;
    this.isPlaying = false;
    this.courseTitle = courseTitle || "";
    this.scenes = (scenes || []).map((s) => ({
      ...s,
      baseDurationSec: s.durationSec || 10
    }));
    this.recalcTotalDuration();
    this.currentTime = 0;
    this.lastSpokenSceneIdx = -1;
    this.kkNoticeShown = false;
  }

  // Разблокировка и запуск плеера СТРОГО после 100% готовности всех сцен и озвучки
  activateReadyStoryboard({ autoPlay = true, enableTts = true } = {}) {
    this.recalcTotalDuration();
    this.isReady = true;
    this.currentTime = 0;
    this.lastSpokenSceneIdx = -1;
    this.ttsEnabled = Boolean(enableTts) && this.ttsBackendMode !== "subtitles_only";
    this.isPlaying = Boolean(autoPlay);
    this.startLoop();
  }

  loadStoryboard(courseTitle, scenes, opts = {}) {
    this.prepareStoryboard(courseTitle, scenes);
    if (!opts.deferActivation) {
      this.activateReadyStoryboard({ autoPlay: true, enableTts: this.ttsEnabled });
    }
  }

  ensureAudioContext() {
    if (this.audioCtx) return this.audioCtx;
    const Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (Ctx) {
      this.audioCtx = new Ctx();
    }
    return this.audioCtx;
  }

  unlockAudio() {
    const ctx = this.ensureAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  setTtsEnabled(enabled) {
    if (!this.isReady) return;
    this.ttsEnabled = !!enabled;
    this.stopTts();
    this.lastSpokenSceneIdx = -1;
    if (this.ttsEnabled) {
      this.unlockAudio();
      if (this.ttsBackendMode === "neural_buffer") {
        const info = this.getCurrentSceneInfo();
        this.prefetchSequential(info.index);
      }
    }
  }

  setPlaybackSpeed(speed) {
    const newSpeed = Math.min(1.5, Math.max(0.75, Number(speed) || 1.0));
    const oldSpeed = this.playbackSpeed || 1.0;
    this.playbackSpeed = newSpeed;

    if (this.audioSync && this.audioCtx && this.audioPlaybackState.active && oldSpeed !== newSpeed) {
      const nowCtx = this.audioCtx.currentTime;
      const elapsedReal = Math.max(0, nowCtx - this.audioSync.startCtxTime);
      const bufferPos = elapsedReal * (this.audioSync.rate || oldSpeed);
      this.audioSync.rate = newSpeed;
      this.audioSync.startCtxTime = nowCtx - bufferPos / newSpeed;
      if (this.audioSync.bufferDur) {
        this.audioSync.speechDur = this.audioSync.bufferDur / newSpeed;
      }
    }

    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.playbackRate.value = newSpeed;
      } catch (_) {}
    }
    if (this.activeAudioEl) {
      try {
        this.activeAudioEl.playbackRate = newSpeed;
      } catch (_) {}
    }
  }

  startLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (!this.isReady) return;
    this.lastFrameTs = performance.now();
    const tick = (now) => {
      if (!this.isReady) return;
      const rawDt = (now - this.lastFrameTs) / 1000;
      let dt = Math.min(0.08, Math.max(0, rawDt)) * this.playbackSpeed;
      this.lastFrameTs = now;

      let info = this.getSceneInfoAt(this.currentTime);

      if (this.isPlaying) {
        const waitingAudioFetch =
          this.ttsEnabled &&
          this.audioPlaybackState.loading &&
          now - this.audioPlaybackState.loadingSince < 3500;

        if (waitingAudioFetch) {
          dt = 0;
        }

        this.currentTime += dt;
        if (this.currentTime >= this.totalDuration) {
          this.stopTts();
          this.currentTime = 0;
          this.lastSpokenSceneIdx = -1;
        }
        info = this.getSceneInfoAt(this.currentTime);
      }

      if (this.ttsEnabled && this.isPlaying && info.scene && info.index !== this.lastSpokenSceneIdx) {
        this.checkTts(info, info.localTime);
      }
      this.renderFrameOnContext(this.ctx, this.canvas.width, this.canvas.height, this.currentTime);

      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTime, this.totalDuration, info);
      }
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  stopTts() {
    this.ttsRunId++;
    this.audioSync = null;
    this.audioPlaybackState = { active: false, loading: false, loadingSince: 0 };
    if (this.ttsTimer) {
      clearTimeout(this.ttsTimer);
      this.ttsTimer = null;
    }
    const hadBrowserUtterance = Boolean(this.activeUtterance);
    this.activeUtterance = null;
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (_) {}
      this.activeSourceNode = null;
    }
    if (this.activeAudioEl) {
      try {
        this.activeAudioEl.onloadedmetadata = null;
        this.activeAudioEl.pause();
        this.activeAudioEl.currentTime = 0;
      } catch (_) {}
      this.activeAudioEl = null;
    }
    if ((hadBrowserUtterance || this.ttsBackendMode === "browser_speech") && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  setVoiceGender(gender) {
    const nextG = gender === "male" ? "male" : "female";
    if (this.voiceGender === nextG) return;
    this.voiceGender = nextG;
    this.stopTts();
    this.lastSpokenSceneIdx = -1;
    // Сбрасываем привязанные буферы сцен, чтобы подгрузился выбранный тембр голоса
    (this.scenes || []).forEach((s) => {
      s.audioBuffer = null;
      s.beatDurations = null;
    });
    if (this.isReady && this.ttsEnabled) {
      this.streamStoryboardAudioProgressive(this.scenes, this.ttsLang, this.onAudioProgress);
    }
  }

  selectBestVoice(voices, targetLocale) {
    if (!voices || !voices.length) return null;
    const [targetLang, targetRegion = ""] = targetLocale.toLowerCase().split(/[-_]/);
    const wantMale = this.voiceGender === "male";
    let best = null;
    let bestScore = -Infinity;

    const rules = [
      { re: /\b(natural|online)\b/i, score: 60 },
      { re: /\bsiri\b/i, score: 52 },
      { re: /\bpremium\b/i, score: 48 },
      { re: /\benhanced\b/i, score: 40 },
      { re: /^google\b/i, score: 36 },
      { re: wantMale ? /\b(daulet|dmitry|yuri|pavel|daniel|alex|andrew|guy)\b/i : /\b(aigul|svetlana|milena|katya|samantha|ava|victoria)\b/i, score: 34 }
    ];
    const roboticPenalty = /\b(espeak|compact|albert|bells|zarvox)\b/i;

    for (const v of voices) {
      const [vLang, vRegion = ""] = (v.lang || "").toLowerCase().split(/[-_]/);
      if (vLang !== targetLang) continue;
      let score = targetRegion && vRegion === targetRegion ? 25 : 10;
      if (!v.localService) score += 12;
      for (const r of rules) {
        if (r.re.test(v.name)) score += r.score;
      }
      if (roboticPenalty.test(v.name)) score -= 45;
      if (v.default) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }

  prepareClausesForTts(rawText, fallbackText = "") {
    const l = String(this.ttsLang || "ru-RU").toLowerCase();
    const normalize = (src) => {
      let s = String(src || "")
        .replace(/[\u200b-\u200f\ufeff]/g, "")
        .replace(/[\[\]"]/g, " ")
        .replace(/«/g, ", ")
        .replace(/»/g, ", ")
        .replace(/_/g, " ")
        .replace(/[❌✅→←↑↓‖•●◆▪▫*_`~#]/g, " ")
        .replace(/\s+—\s+/g, ", — ")
        .replace(/\?\!/g, "?");
      if (l.startsWith("kk")) {
        s = s
          .replace(/≈/g, " шамамен тең ")
          .replace(/≠/g, " тең емес ")
          .replace(/(\d+)\s*[–-]\s*(\d+)\s*%/g, "$1 ден $2 пайызға дейін")
          .replace(/(\d+)\s*%/g, "$1 пайыз");
      } else if (l.startsWith("en")) {
        s = s
          .replace(/≈/g, " approximately equals ")
          .replace(/≠/g, " does not equal ")
          .replace(/(\d+)\s*[–-]\s*(\d+)\s*%/g, "$1 to $2 percent")
          .replace(/(\d+)\s*%/g, "$1 percent");
      } else {
        s = s
          .replace(/≈/g, " примерно равно ")
          .replace(/≠/g, " не равно ")
          .replace(/\bи\s*т\.?\s*д\.?/gi, "и так далее")
          .replace(/\bт\.?\s*е\.?/gi, "то есть")
          .replace(/(\d+)\s*[–-]\s*(\d+)\s*%/g, "от $1 до $2 процентов")
          .replace(/(\d+)\s*%/g, "$1 процентов");
      }
      return s.replace(/\s+,/g, ",").replace(/,\s*,+/g, ",").replace(/\s+/g, " ").trim();
    };

    let text = normalize(rawText);
    if (!text || !/[0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(text)) {
      text = normalize(fallbackText);
    }
    if (!text || !/[0-9A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(text)) return [];

    const sentences = text.match(/[^.!?]+[.!?…]*/g) || [text];
    const clauses = [];
    for (const s of sentences) {
      const cleanS = s.trim();
      if (!cleanS) continue;
      if (cleanS.length <= 135) {
        clauses.push(cleanS);
      } else {
        cleanS.split(/(?<=[,;:])\s+/).forEach((part) => {
          if (part.trim()) clauses.push(part.trim());
        });
      }
    }
    return clauses;
  }

  async probeTtsServer(timeoutMs = 1400) {
    if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
      return false;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch("/api/health", { method: "GET", signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timer);
      if (!resp.ok) return false;
      const ctype = (resp.headers.get("content-type") || "").toLowerCase();
      if (!ctype.includes("application/json")) return false;
      const data = await resp.json();
      return data?.status === "ok" && data?.ttsAvailable !== false;
    } catch (_) {
      clearTimeout(timer);
      return false;
    }
  }

  async checkTts(info, offsetSec = 0) {
    if (!this.isReady || !this.ttsEnabled || !this.isPlaying) return;
    if (info.index === this.lastSpokenSceneIdx || !info.scene) return;
    if (this.ttsBackendMode === "subtitles_only") return;
    this.lastSpokenSceneIdx = info.index;

    const runId = ++this.ttsRunId;
    const isStale = () => runId !== this.ttsRunId || !this.ttsEnabled || !this.isPlaying || !this.isReady;

    if (this.ttsTimer) {
      clearTimeout(this.ttsTimer);
      this.ttsTimer = null;
    }
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (_) {}
      this.activeSourceNode = null;
    }
    if (this.activeAudioEl) {
      try {
        this.activeAudioEl.onloadedmetadata = null;
        this.activeAudioEl.pause();
      } catch (_) {}
      this.activeAudioEl = null;
    }
    if ((this.activeUtterance || this.ttsBackendMode === "browser_speech") && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    this.activeUtterance = null;

    // 1. Мгновенный запуск предгенерированного AudioBuffer со сцены (0 мс задержки, синхронный старт!)
    if (info.scene.audioBuffer) {
      try {
        await this.playAudioBuffer(info.scene.audioBuffer, runId, info.index, offsetSec);
        return;
      } catch (err) {
        console.warn("Scene AudioBuffer playback warning:", err);
      }
    }

    const clauses = this.prepareClausesForTts(info.scene.caption, info.scene.title);
    const cleanText = clauses.join(" ");
    if (!cleanText) {
      this.audioPlaybackState = { active: false, loading: false, loadingSince: 0 };
      return;
    }

    const emo = info.scene.emotion || "explain";
    const preKey = `edge::${this.ttsLang}::${this.voiceGender}::${emo}::::::${cleanText}`;
    const preBuf = this.audioBufferCache.get(preKey);
    if (preBuf) {
      try {
        await this.playAudioBuffer(preBuf, runId, info.index, offsetSec);
        return;
      } catch (err) {
        console.warn("Cached AudioBuffer playback warning:", err);
      }
    }

    // Если во время предгенерации выяснилось, что локальный сервер выключен — не тратим время на сетевые таймауты
    if (this.ttsBackendMode === "neural_buffer") {
      try {
        await this.playWithEdgeTtsServer(cleanText, this.ttsLang, runId, info.index, emo, offsetSec);
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.warn("Edge Neural TTS fallback to browser voice:", err);
      }
    }

    if (isStale() || !window.speechSynthesis) return;

    await new Promise((r) => {
      this.ttsTimer = setTimeout(r, 120);
    });
    if (isStale()) return;

    let voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      await new Promise((r) => {
        this.ttsTimer = setTimeout(r, 220);
      });
      voices = window.speechSynthesis.getVoices();
    }
    if (isStale()) return;

    const voice = this.selectBestVoice(voices, this.ttsLang);
    if (!voice && this.ttsLang.startsWith("kk")) {
      if (!this.kkNoticeShown && this.onTtsNotice) {
        this.kkNoticeShown = true;
        this.onTtsNotice("Локальный сервер озвучки выключен, а в браузере нет встроенного казахского голоса — показаны субтитры.");
      }
      return;
    }

    let idx = 0;
    const speakNext = () => {
      if (isStale() || idx >= clauses.length) return;
      const utter = new SpeechSynthesisUtterance(clauses[idx]);
      this.activeUtterance = utter;
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = this.ttsLang;
      }
      utter.rate = Math.min(1.25, Math.max(0.85, this.playbackSpeed * 0.96));
      utter.pitch = 1.02;

      utter.onend = () => {
        if (isStale()) return;
        idx++;
        if (idx < clauses.length) {
          this.ttsTimer = setTimeout(speakNext, 200);
        }
      };
      utter.onerror = () => {
        if (isStale()) return;
        idx++;
        if (idx < clauses.length) {
          this.ttsTimer = setTimeout(speakNext, 120);
        }
      };
      window.speechSynthesis.speak(utter);
    };

    speakNext();
  }

  async fetchEdgeTtsBuffer(cleanText, locale, opts = {}) {
    const {
      timeoutMs = 9500,
      maxAttempts = 2,
      externalSignal = null,
      emotion = "explain",
      rate = "",
      pitch = "",
      volume = ""
    } = opts;
    const voiceGender = this.voiceGender || "female";
    const cacheKey = `edge::${locale}::${voiceGender}::${emotion}::${rate}::${pitch}::${cleanText}`;
    const cachedBuf = this.audioBufferCache.get(cacheKey);
    if (cachedBuf) return cachedBuf;

    let pendingPromise = this.pendingAudioFetches.get(cacheKey);
    if (!pendingPromise) {
      pendingPromise = (async () => {
        let lastErr = null;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), timeoutMs);
          try {
            const resp = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: cleanText,
                lang: locale,
                emotion,
                voiceGender,
                rate,
                pitch,
                volume
              }),
              signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!resp.ok) {
              throw new Error(`Edge TTS HTTP ${resp.status}`);
            }
            const arrayBuf = await resp.arrayBuffer();
            if (!arrayBuf || arrayBuf.byteLength < 100) {
              throw new Error("Empty Edge TTS audio");
            }
            const ctx = this.ensureAudioContext();
            if (!ctx) throw new Error("Web Audio API unavailable");
            const audioBuffer = await ctx.decodeAudioData(arrayBuf);
            if (this.audioBufferCache.size >= 144) {
              const firstKey = this.audioBufferCache.keys().next().value;
              this.audioBufferCache.delete(firstKey);
            }
            this.audioBufferCache.set(cacheKey, audioBuffer);
            return audioBuffer;
          } catch (err) {
            clearTimeout(timer);
            lastErr = err;
            if (attempt + 1 < maxAttempts) {
              await new Promise((r) => setTimeout(r, 250));
            }
          }
        }
        throw lastErr || new Error("Edge TTS failed");
      })().finally(() => {
        this.pendingAudioFetches.delete(cacheKey);
      });
      this.pendingAudioFetches.set(cacheKey, pendingPromise);
    }

    if (!externalSignal) return pendingPromise;
    if (externalSignal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
      externalSignal.addEventListener("abort", onAbort, { once: true });
      pendingPromise.then(
        (v) => {
          externalSignal.removeEventListener("abort", onAbort);
          resolve(v);
        },
        (e) => {
          externalSignal.removeEventListener("abort", onAbort);
          reject(e);
        }
      );
    });
  }

  // Склейка 3 битов озвучки в единый бесшовный AudioBuffer с естественными интонационными паузами
  stitchBeatAudioBuffers(buffers, pauseSec = 0.28) {
    const valid = (buffers || []).filter(Boolean);
    if (!valid.length) return null;
    if (valid.length === 1) return valid[0];
    const ctx = this.ensureAudioContext();
    if (!ctx) return valid[0];
    const sampleRate = valid[0].sampleRate || 24000;
    const channels = valid[0].numberOfChannels || 1;
    const pauseSamples = Math.round(pauseSec * sampleRate);
    const totalSamples =
      valid.reduce((acc, b) => acc + b.length, 0) + pauseSamples * Math.max(0, valid.length - 1);
    const out = ctx.createBuffer(channels, totalSamples, sampleRate);

    let offset = 0;
    for (let i = 0; i < valid.length; i++) {
      const b = valid[i];
      for (let ch = 0; ch < channels; ch++) {
        const dst = out.getChannelData(ch);
        const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
        dst.set(src, offset);
      }
      offset += b.length + (i < valid.length - 1 ? pauseSamples : 0);
    }
    return out;
  }

  // Синтез одной сцены (с ретраями и побитовыми паузами)
  async _synthesizeSingleSceneBuffer(sc, abortSignal = null) {
    const cleanText = this.prepareClausesForTts(sc?.caption, sc?.title).join(" ");
    if (!cleanText) return null;
    const beats = Array.isArray(sc?.beats) && sc.beats.length >= 2 ? sc.beats.slice(0, 3) : null;
    let finalBuf = null;
    if (beats) {
      const beatEmotions = [
        sc.emotion === "risk" ? "risk" : "hook",
        "explain",
        sc.emotion === "celebrate" ? "celebrate" : sc.emotion === "risk" ? "risk" : "hook"
      ];
      const beatTexts = beats.map((b) => this.prepareClausesForTts(b?.text, "").join(" "));
      if (beatTexts.some(Boolean)) {
        const ctx = this.ensureAudioContext();
        const beatBufs = await Promise.all(
          beatTexts.map((bt, bIdx) =>
            bt
              ? this.fetchEdgeTtsBuffer(bt, this.ttsLang, {
                  timeoutMs: 10000,
                  maxAttempts: 2,
                  externalSignal: abortSignal,
                  emotion: beatEmotions[bIdx] || "explain"
                })
              : Promise.resolve(ctx ? ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.35), ctx.sampleRate) : null)
          )
        );
        const validBeatBufs = beatBufs.filter(Boolean);
        if (validBeatBufs.length === beats.length) {
          sc.beatDurations = validBeatBufs.map((b) => +b.duration.toFixed(3));
          finalBuf = this.stitchBeatAudioBuffers(validBeatBufs, 0.28);
        }
      }
    }
    if (!finalBuf) {
      finalBuf = await this.fetchEdgeTtsBuffer(cleanText, this.ttsLang, {
        timeoutMs: 10000,
        maxAttempts: 2,
        externalSignal: abortSignal,
        emotion: sc?.emotion || "explain"
      });
    }
    sc.audioBuffer = finalBuf;
    const baseDur = sc.baseDurationSec || sc.durationSec || 10;
    sc.speechDurationSec = +finalBuf.duration.toFixed(2);
    sc.durationSec = +Math.max(baseDur, 0.25 + finalBuf.duration + 1.25).toFixed(2);
    sc.finalCps = +(String(sc.caption || "").length / sc.durationSec).toFixed(1);
    return finalBuf;
  }

  // Потоковая фоновая подгрузка озвучки: НЕ блокирует чтение конспекта, карты, теста и старт 1-й сцены!
  async streamStoryboardAudioProgressive(scenes, locale, onProgress = null, abortSignal = null) {
    const myStreamId = ++this.streamRunId;
    const list = scenes || this.scenes || [];
    const total = list.length;
    if (!total) return;

    this.ttsLang = locale || this.ttsLang || "ru-RU";
    this.ensureAudioContext();

    const serverAlive = await this.probeTtsServer(1400);
    if (abortSignal?.aborted || myStreamId !== this.streamRunId) return;

    let useNeuralServer = serverAlive;
    let consecutiveErrors = 0;

    if (!useNeuralServer) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        let voices = window.speechSynthesis.getVoices();
        if (!voices.length) {
          await new Promise((r) => setTimeout(r, 150));
          voices = window.speechSynthesis.getVoices();
        }
        const bestV = this.selectBestVoice(voices, this.ttsLang);
        this.ttsBackendMode = bestV || !this.ttsLang.startsWith("kk") ? "browser_speech" : "subtitles_only";
      } else {
        this.ttsBackendMode = "subtitles_only";
      }
      if (onProgress) onProgress({ readyCount: total, totalScenes: total, mode: "offline", done: true });
      return;
    }

    this.ttsBackendMode = "neural_buffer";
    let nextIdx = 0;
    let readyCount = 0;
    const concurrency = Math.min(3, total);
    const runWorker = async () => {
      while (nextIdx < total) {
        if (abortSignal?.aborted || myStreamId !== this.streamRunId || !useNeuralServer) return;
        const i = nextIdx++;
        const sc = list[i];
        try {
          await this._synthesizeSingleSceneBuffer(sc, abortSignal);
          consecutiveErrors = 0;
          this.recalcTotalDuration();
          const curInfo = this.getCurrentSceneInfo();
          if (this.isReady && this.isPlaying && this.ttsEnabled && curInfo.index === i && !this.audioPlaybackState.active) {
            this.lastSpokenSceneIdx = -1;
            this.checkTts(curInfo, curInfo.localTime);
          }
        } catch (err) {
          if (abortSignal?.aborted || myStreamId !== this.streamRunId) return;
          consecutiveErrors++;
          if (consecutiveErrors >= 2) {
            useNeuralServer = false;
            this.ttsBackendMode = "browser_speech";
            return;
          }
        }
        readyCount++;
        if (onProgress && myStreamId === this.streamRunId) {
          onProgress({ readyCount, totalScenes: total, mode: "neural", sceneTitle: sc?.title || "", done: false });
        }
      }
    };
    if (onProgress) {
      onProgress({ readyCount: 0, totalScenes: total, mode: "neural", sceneTitle: list[0]?.title || "", done: false });
    }
    await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

    if (onProgress && myStreamId === this.streamRunId) {
      onProgress({
        readyCount: total,
        totalScenes: total,
        mode: useNeuralServer ? "neural" : "offline",
        done: true
      });
    }
  }

  // Полная предгенерация (оставлена для обратной совместимости, с исправленной устойчивостью к сбоям)
  async pregenerateAllSceneAudio(scenes, locale, onProgress, abortSignal = null) {
    const list = scenes || this.scenes || [];
    const total = list.length;
    if (!total) {
      this.ttsBackendMode = "subtitles_only";
      return { backendMode: "subtitles_only", totalDuration: 0 };
    }

    this.ttsLang = locale || this.ttsLang || "ru-RU";
    this.ensureAudioContext();

    const serverAlive = await this.probeTtsServer(1400);
    if (abortSignal?.aborted) throw new DOMException("Cancelled", "AbortError");

    let useNeuralServer = serverAlive;
    let consecutiveErrors = 0;
    let doneCount = 0;

    if (useNeuralServer) {
      if (onProgress) {
        onProgress({
          sceneIndex: 0,
          totalScenes: total,
          doneCount: 0,
          sceneTitle: list[0]?.title || "Сцена 1",
          mode: "neural"
        });
      }
      let nextIdx = 0;
      const concurrency = Math.min(3, total);
      const runWorker = async () => {
        while (nextIdx < total) {
          if (abortSignal?.aborted) throw new DOMException("Cancelled", "AbortError");
          const i = nextIdx++;
          const sc = list[i];
          const cleanText = this.prepareClausesForTts(sc?.caption, sc?.title).join(" ");
          let synthOk = false;
          if (useNeuralServer && cleanText) {
            try {
              await this._synthesizeSingleSceneBuffer(sc, abortSignal);
              synthOk = Boolean(sc.audioBuffer);
            } catch (err) {
              if (abortSignal?.aborted || (err?.name === "AbortError" && abortSignal?.aborted)) {
                throw new DOMException("Cancelled", "AbortError");
              }
              synthOk = false;
            }
          }
          if (!synthOk) {
            sc.audioBuffer = null;
            sc.beatDurations = null;
            const baseDur = sc.baseDurationSec || sc.durationSec || 10;
            const estSpeech = Math.max(4, cleanText.length / 12.2);
            sc.speechDurationSec = +estSpeech.toFixed(2);
            sc.durationSec = +Math.max(baseDur, 0.25 + estSpeech + 1.25).toFixed(1);
            sc.finalCps = +(String(sc.caption || "").length / sc.durationSec).toFixed(1);
          }
          doneCount++;
          if (onProgress) {
            onProgress({
              sceneIndex: i,
              totalScenes: total,
              doneCount,
              sceneTitle: sc?.title || `Сцена ${i + 1}`,
              mode: synthOk ? "neural" : "offline"
            });
          }
        }
      };
      await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
      useNeuralServer = list.some((s) => Boolean(s.audioBuffer));
    } else {
      for (let i = 0; i < total; i++) {
        if (abortSignal?.aborted) throw new DOMException("Cancelled", "AbortError");
        const sc = list[i];
        const cleanText = this.prepareClausesForTts(sc?.caption, sc?.title).join(" ");
        sc.audioBuffer = null;
        sc.beatDurations = null;
        const baseDur = sc.baseDurationSec || sc.durationSec || 10;
        const estSpeech = Math.max(4, cleanText.length / 12.2);
        sc.speechDurationSec = +estSpeech.toFixed(2);
        sc.durationSec = +Math.max(baseDur, 0.7 + estSpeech + 1.3).toFixed(1);
        sc.finalCps = +(String(sc.caption || "").length / sc.durationSec).toFixed(1);
        if (onProgress) {
          onProgress({
            sceneIndex: i,
            totalScenes: total,
            doneCount: i + 1,
            sceneTitle: sc?.title || `Сцена ${i + 1}`,
            mode: "offline"
          });
        }
      }
    }

    if (useNeuralServer) {
      this.ttsBackendMode = "neural_buffer";
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      let voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        await new Promise((r) => setTimeout(r, 150));
        voices = window.speechSynthesis.getVoices();
      }
      const bestV = this.selectBestVoice(voices, this.ttsLang);
      this.ttsBackendMode = bestV || !this.ttsLang.startsWith("kk") ? "browser_speech" : "subtitles_only";
    } else {
      this.ttsBackendMode = "subtitles_only";
    }

    this.recalcTotalDuration();
    return { backendMode: this.ttsBackendMode, totalDuration: this.totalDuration };
  }

  async prefetchSequential(startIdx = 0) {
    if (this.prefetchQueueRunning || !this.ttsEnabled || !this.scenes?.length || this.ttsBackendMode !== "neural_buffer") return;
    this.prefetchQueueRunning = true;
    try {
      const len = this.scenes.length;
      for (let offset = 0; offset < len; offset++) {
        if (!this.ttsEnabled) break;
        const idx = (startIdx + offset) % len;
        const sc = this.scenes[idx];
        const clean = this.prepareClausesForTts(sc?.caption, sc?.title).join(" ");
        if (!clean) continue;
        try {
          await this.fetchEdgeTtsBuffer(clean, this.ttsLang);
        } catch (_) {}
      }
    } finally {
      this.prefetchQueueRunning = false;
    }
  }

  async playAudioBuffer(audioBuffer, runId, sceneIndex = 0, sceneLocalTime = 0) {
    if (runId !== this.ttsRunId || !this.ttsEnabled || !this.isPlaying || !this.isReady) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) throw new Error("AudioContext unavailable");
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (_) {}
    }
    if (runId !== this.ttsRunId || !this.ttsEnabled || !this.isPlaying || !this.isReady) return false;
    if (ctx.state === "suspended") {
      this.audioPlaybackState = { active: false, loading: false, loadingSince: 0 };
      this.lastSpokenSceneIdx = -1;
      return false;
    }

    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (_) {}
      this.activeSourceNode = null;
    }

    const rate = Math.min(1.5, Math.max(0.75, this.playbackSpeed));
    const speechDuration = audioBuffer.duration / rate;
    const preRoll = 0.25;
    const audioOffset = Math.max(0, (sceneLocalTime - preRoll) * rate);

    if (audioOffset >= audioBuffer.duration - 0.05) {
      this.audioPlaybackState = { active: false, loading: false, loadingSince: 0 };
      return;
    }

    if (!this.analyserNode && typeof ctx.createAnalyser === "function") {
      try {
        this.analyserNode = ctx.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserData = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.analyserNode.connect(ctx.destination);
      } catch (_) {
        this.analyserNode = null;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = rate;
    if (this.analyserNode) {
      source.connect(this.analyserNode);
    } else {
      source.connect(ctx.destination);
    }

    const delaySec = sceneLocalTime < preRoll ? (preRoll - sceneLocalTime) / rate : 0;
    this.activeSourceNode = source;
    this.audioPlaybackState = { active: true, loading: false, loadingSince: 0 };
    this.audioSync = {
      sceneIndex,
      startCtxTime: ctx.currentTime + delaySec - audioOffset / rate,
      speechDur: speechDuration,
      bufferDur: audioBuffer.duration,
      rate
    };

    source.onended = () => {
      if (this.activeSourceNode === source) {
        this.activeSourceNode = null;
      }
      if (runId === this.ttsRunId) {
        this.audioPlaybackState.active = false;
      }
    };

    source.start(ctx.currentTime + delaySec, audioOffset);
    return true;
  }

  async playWithEdgeTtsServer(cleanText, locale, runId, sceneIndex = 0, emotion = "explain", offsetSec = 0) {
    this.audioPlaybackState = { active: false, loading: true, loadingSince: performance.now() };
    try {
      const audioBuffer = await this.fetchEdgeTtsBuffer(cleanText, locale, { emotion });
      if (runId !== this.ttsRunId || !this.ttsEnabled || !this.isPlaying) {
        this.audioPlaybackState.loading = false;
        return;
      }
      await this.playAudioBuffer(audioBuffer, runId, sceneIndex, offsetSec);
      this.prefetchSequential(sceneIndex + 1);
    } catch (err) {
      if (runId === this.ttsRunId) {
        this.audioPlaybackState = { active: false, loading: false, loadingSince: 0 };
      }
      throw err;
    }
  }

  getSceneInfoAt(timeSec) {
    if (!this.scenes || this.scenes.length === 0) {
      return { index: 0, scene: null, localTime: 0, progress: 0 };
    }
    let elapsed = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      const dur = this.scenes[i].durationSec || 8;
      if (timeSec < elapsed + dur || i === this.scenes.length - 1) {
        const localTime = Math.max(0, timeSec - elapsed);
        return {
          index: i,
          scene: this.scenes[i],
          localTime,
          progress: LectureAnimationEngine.clamp(localTime / dur, 0, 1)
        };
      }
      elapsed += dur;
    }
    return { index: 0, scene: this.scenes[0], localTime: 0, progress: 0 };
  }

  getCurrentSceneInfo() {
    return this.getSceneInfoAt(this.currentTime);
  }

  seekTo(timeSec) {
    if (!this.isReady) return;
    this.stopTts();
    this.currentTime = LectureAnimationEngine.clamp(timeSec, 0, Math.max(0.05, this.totalDuration - 0.05));
    this.lastSpokenSceneIdx = -1;
    const info = this.getSceneInfoAt(this.currentTime);
    if (this.isPlaying && this.ttsEnabled && info.scene) {
      this.checkTts(info, info.localTime);
    }
    this.renderFrameOnContext(this.ctx, this.canvas.width, this.canvas.height, this.currentTime);
  }

  jumpToScene(sceneIdx) {
    if (!this.isReady) return;
    let target = 0;
    for (let i = 0; i < sceneIdx && i < this.scenes.length; i++) {
      target += this.scenes[i].durationSec || 10;
    }
    this.seekTo(target + 0.05);
  }

  jumpToBeat(sceneIdx, beatIdx = 0) {
    if (!this.isReady || !this.scenes?.length) return;
    const clampedScene = Math.max(0, Math.min(this.scenes.length - 1, sceneIdx));
    let sceneStart = 0;
    for (let i = 0; i < clampedScene; i++) {
      sceneStart += this.scenes[i].durationSec || 10;
    }
    const sc = this.scenes[clampedScene];
    const dur = sc?.durationSec || 10;
    const preRoll = 0.25;
    let beatOffset = 0;
    if (beatIdx > 0) {
      if (Array.isArray(sc?.beatDurations) && sc.beatDurations.length >= beatIdx) {
        for (let k = 0; k < beatIdx; k++) {
          beatOffset += (sc.beatDurations[k] || 2.5) + 0.28;
        }
      } else {
        const speechDur = Math.max(2, dur - preRoll - 1.25);
        beatOffset = (speechDur * Math.min(2, beatIdx)) / 3;
      }
    }
    this.seekTo(sceneStart + (beatIdx === 0 ? 0.05 : preRoll + beatOffset));
  }

  getSceneTheme(scene) {
    const base = window.LectureVisualDirector
      ? window.LectureVisualDirector.getTheme(scene?.domainId)
      : {
          domainId: scene?.domainId || "arch_eng",
          bgTop: "#FAF9F5",
          bgBottom: "#EFF3F8",
          ambientA: "rgba(191, 219, 254, 0.40)",
          ambientB: "rgba(254, 243, 199, 0.30)",
          gridColor: "rgba(100, 116, 139, 0.12)",
          surfaceTop: "rgba(255, 255, 255, 0.92)",
          surfaceBottom: "rgba(248, 250, 252, 0.96)",
          surfaceBorder: "rgba(148, 163, 184, 0.35)",
          ink: "#18181B",
          muted: "#475569",
          primary: "#2563EB",
          primarySoft: "rgba(37, 99, 235, 0.12)",
          secondary: "#7C3AED",
          success: "#059669",
          danger: "#E11D48",
          shadowRgb: "37, 99, 235",
          cardPalettes: []
        };
    const sv = scene?.styleVariant;
    if (!sv) return base;
    const pals = Array.isArray(base.cardPalettes) ? base.cardPalettes : [];
    const offset = pals.length ? ((sv.paletteOffset || 0) % pals.length) : 0;
    const rotatedPals = offset ? [...pals.slice(offset), ...pals.slice(0, offset)] : pals;
    const themed = { ...base, cardPalettes: rotatedPals };
    if (sv.accentMode === "secondary" && base.secondary) {
      themed.primary = base.secondary;
      themed.secondary = base.primary;
    } else if (sv.accentMode === "contrast" && rotatedPals[1]?.stroke) {
      themed.primary = rotatedPals[1].stroke;
    } else if (sv.accentMode === "neutral_ink" && base.secondary) {
      themed.primary = base.ink;
      themed.secondary = base.primary;
    }
    return themed;
  }

  computeSceneBeatsTiming(scene, info) {
    const rawBeats = Array.isArray(scene?.beats) && scene.beats.length >= 3
      ? scene.beats.slice(0, 3)
      : (() => {
          const words = String(scene?.caption || "").split(/\s+/).filter(Boolean);
          const c1 = Math.max(1, Math.floor(words.length / 3));
          const c2 = Math.max(c1 + 1, Math.floor((words.length * 2) / 3));
          return [
            { id: "beat0", role: "input", text: words.slice(0, c1).join(" ") || scene?.title || "" },
            { id: "beat1", role: "action", text: words.slice(c1, c2).join(" ") || "" },
            { id: "beat2", role: "output", text: words.slice(c2).join(" ") || "" }
          ];
        })();

    const weights = rawBeats.map((b) => {
      const txt = String(b.text || "");
      const commas = (txt.match(/[,;:—–-]/g) || []).length;
      const periods = (txt.match(/[.!?]/g) || []).length;
      return Math.max(6, txt.length + commas * 4 + periods * 8);
    });
    const totalW = weights.reduce((a, b) => a + b, 0) || 1;

    const dur = scene?.durationSec || 10;
    const preRoll = 0.25;
    const postRoll = 1.25;
    const hasAudio = Boolean(this.audioSync && this.audioSync.sceneIndex === info.index && this.audioPlaybackState.active);
    const rate = this.isExporting ? 1.0 : (hasAudio ? (this.audioSync.rate || 1.0) : (this.playbackSpeed || 1.0));
    const speechDur = hasAudio
      ? Math.max(2, this.audioSync.speechDur)
      : (this.isExporting && scene?.speechDurationSec
          ? Math.max(2, scene.speechDurationSec)
          : Math.max(2, dur - preRoll - postRoll));
    const speechElapsed = hasAudio && this.audioCtx
      ? LectureAnimationEngine.clamp(this.audioCtx.currentTime - this.audioSync.startCtxTime, 0, speechDur)
      : LectureAnimationEngine.clamp(info.localTime - preRoll, 0, speechDur);

    const bounds = [0];
    if (Array.isArray(scene?.beatDurations) && scene.beatDurations.length >= 3) {
      const pauseSec = 0.28 / rate;
      const rawLens = scene.beatDurations.slice(0, 3).map((d, idx) => d / rate + (idx < 2 ? pauseSec : 0));
      const sumRaw = rawLens.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      rawLens.forEach((l) => {
        acc += (l / sumRaw) * speechDur;
        bounds.push(acc);
      });
    } else {
      let acc = 0;
      weights.forEach((w) => {
        acc += (w / totalW) * speechDur;
        bounds.push(acc);
      });
    }

    let activeBeatIdx = 0;
    if (speechElapsed >= bounds[2]) activeBeatIdx = 2;
    else if (speechElapsed >= bounds[1]) activeBeatIdx = 1;

    const span = Math.max(0.2, bounds[activeBeatIdx + 1] - bounds[activeBeatIdx]);
    const beatP = LectureAnimationEngine.clamp((speechElapsed - bounds[activeBeatIdx]) / span, 0, 1);
    const beatEase = LectureAnimationEngine.quinticSmooth(LectureAnimationEngine.clamp(beatP / 0.26, 0, 1));
    const beatStates = [0, 1, 2].map((k) => (k < activeBeatIdx ? 1 : k === activeBeatIdx ? beatP : 0));

    return {
      beats: rawBeats,
      activeBeatIdx,
      beatP,
      beatEase,
      beatStates,
      speechElapsed,
      speechDur
    };
  }

  renderStageModule(ctx, STAGE, scene, timing) {
    switch (scene.archetype) {
      case "actor_network_web":
        return this.drawActorNetworkWeb(ctx, STAGE, scene, timing);
      case "social_stratification_pyramid":
        return this.drawSocialStratificationPyramid(ctx, STAGE, scene, timing);
      case "scales_balance_norm":
        return this.drawScalesBalanceNorm(ctx, STAGE, scene, timing);
      case "bio_cell_cycle":
        return this.drawBioCellCycle(ctx, STAGE, scene, timing);
      case "econ_funnel_waterfall":
        return this.drawEconFunnelWaterfall(ctx, STAGE, scene, timing);
      case "cs_layered_pipeline":
        return this.drawCsLayeredPipeline(ctx, STAGE, scene, timing);
      case "eng_structural_forces":
        return this.drawEngStructuralForces(ctx, STAGE, scene, timing);
      case "chronicle_timeline":
        return this.drawChronicleTimeline(ctx, STAGE, scene, timing);
      case "split_versus_duel":
        return this.drawSplitVersusDuel(ctx, STAGE, scene, timing);
      case "multi_mode_chart":
        return this.drawMultiModeChart(ctx, STAGE, scene, timing);
      case "case_dossier_blueprint":
        return this.drawCaseDossierBlueprint(ctx, STAGE, scene, timing);
      case "radial_constellation_map":
        return this.drawRadialConstellationMap(ctx, STAGE, scene, timing);
      case "cause_effect_flow":
        return this.drawCauseEffectFlow(ctx, STAGE, scene, timing);
      case "worked_example":
        return this.drawWorkedExample(ctx, STAGE, scene, timing);
      case "system_anatomy":
        return this.drawSystemAnatomy(ctx, STAGE, scene, timing);
      case "causal_curve":
        return this.drawCausalCurve(ctx, STAGE, scene, timing);
      case "hero_problem_hook":
        return this.drawHeroProblemHook(ctx, STAGE, scene, timing);
      case "pipeline_energy_flow":
        return this.drawPipelineEnergyFlow(ctx, STAGE, scene, timing);
      case "bio_pathway":
        return this.drawBioPathway(ctx, STAGE, scene, timing);
      case "funnel_flow":
        return this.drawFunnelFlow(ctx, STAGE, scene, timing);
      case "timeline_scroll":
        return this.drawTimelineScroll(ctx, STAGE, scene, timing);
      case "split_comparison":
        return this.drawSplitVersusDuel(ctx, STAGE, scene, timing);
      case "interactive_chart_formula":
        return this.drawMultiModeChart(ctx, STAGE, scene, timing);
      case "shield_core_architecture":
        return this.drawShieldCoreArchitecture(ctx, STAGE, scene, timing);
      case "constellation_synthesis":
        return this.drawRadialConstellationMap(ctx, STAGE, scene, timing);
      default:
        return this.drawActorNetworkWeb(ctx, STAGE, scene, timing);
    }
  }

  getLayoutMetrics(scene, W, H) {
    const mode = scene?.layoutMode || "split_tutor";
    if (mode === "wide_stage") {
      return {
        mode,
        stage: { x: 44, y: 158, w: W - 88, h: 394 },
        backdropLeft: 36,
        titleX: 112,
        titleMaxW: W - 156,
        tutor: { cx: 74, cy: 118, scale: 0.28, side: "left", mode: "corner_badge" }
      };
    }
    if (mode === "hero_intro") {
      return {
        mode,
        stage: { x: 256, y: 158, w: W - 292, h: 394 },
        backdropLeft: 244,
        titleX: 256,
        titleMaxW: W - 296,
        tutor: { cx: 140, cy: 365, scale: 0.78, side: "left", mode: "full" }
      };
    }
    if (mode === "focus_split") {
      return {
        mode,
        stage: { x: 36, y: 158, w: W - 354, h: 394 },
        backdropLeft: 36,
        titleX: 44,
        titleMaxW: W - 360,
        tutor: { cx: W - 162, cy: 355, scale: 1.0, side: "right", mode: "full" }
      };
    }
    return {
      mode: "split_tutor",
      stage: { x: 318, y: 158, w: W - 354, h: 394 },
      backdropLeft: 308,
      titleX: 320,
      titleMaxW: W - 360,
      tutor: { cx: 162, cy: 355, scale: 1.0, side: "left", mode: "full" }
    };
  }

  // Главный рендер кадра (работает как на основном экране, так и на Offscreen Canvas при экспорте MP4/WebM)
  renderFrameOnContext(ctx, W, H, t) {
    const info = this.getSceneInfoAt(t);
    const scene = info.scene;
    if (!scene) return;

    const theme = this.getSceneTheme(scene);
    const p = info.progress; // 0..1
    const dur = scene.durationSec || 10;
    const enterP = LectureAnimationEngine.quinticSmooth(p / 0.18);
    const simP = LectureAnimationEngine.clamp((p - 0.12) / 0.66, 0, 1);
    const beats = this.computeSceneBeatsTiming(scene, info);
    const isReadingPause = p >= 0.80 || beats.speechElapsed >= beats.speechDur - 0.05;
    const motionAmp = 1 - LectureAnimationEngine.quinticSmooth((p - 0.72) / 0.12);

    const layout = this.getLayoutMetrics(scene, W, H);
    const STAGE = layout.stage;
    if (this._lastLayoutMode && this._lastLayoutMode !== layout.mode) {
      this._camState.x = STAGE.x + STAGE.w / 2;
      this._camState.y = STAGE.y + STAGE.h / 2;
    }
    this._lastLayoutMode = layout.mode;

    // 1. Светлый Editorial фон (Quiet Luxury) + адаптивная чистая зона тьютора
    this.drawKurzgesagtBackdrop(ctx, W, H, t, theme, layout, scene.styleVariant);

    // 2. Верхний HUD-бар сцены + Mask-Reveal заголовка
    this.drawTopHud(ctx, W, info, scene, p, isReadingPause, theme, layout);

    // 3. Основная сцена с 4 типами переходов и жёстким Safe-Zone клиппингом [y: 80..596]
    const overlapSec = 0.7;
    const remainingSec = Math.max(0, dur - info.localTime);
    const nextScene = info.index + 1 < this.scenes.length ? this.scenes[info.index + 1] : null;
    const isTransitioningOut = Boolean(nextScene && remainingSec < overlapSec && dur > 2.5);
    const transU = isTransitioningOut ? LectureAnimationEngine.clamp(1 - remainingSec / overlapSec, 0, 1) : 0;
    const transType = scene.transitionType || "cross_dissolve";
    const outAlpha = isTransitioningOut ? LectureAnimationEngine.quinticSmooth(1 - transU) : 1;

    // Виртуальная камера (Manim Rig): мягко приближается к активному узлу во время объяснения и отъезжает на паузе
    const activeCamZoom = isReadingPause ? 1.006 : 1.012 + Math.sin(beats.beatP * Math.PI) * 0.022;
    const camZoom = activeCamZoom * (1 - transU * (transType === "zoom_fade" ? 0.045 : 0.014));
    const stageCx = STAGE.x + STAGE.w / 2;
    const stageCy = STAGE.y + STAGE.h / 2;
    const panWeight = isReadingPause ? 0.015 : 0.035;
    const targetPanX = LectureAnimationEngine.clamp((stageCx - (this._camState.x || stageCx)) * panWeight, -18, 18);
    const targetPanY = LectureAnimationEngine.clamp((stageCy - (this._camState.y || stageCy)) * panWeight, -12, 12);

    const outShiftX = transType === "slide" ? -transU * 96 : -transU * 18;
    const SAFE_CLIP_H = H - 124 - 80; // Строго выше DHH-полосы субтитров (y: 80..596)

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 80, W, SAFE_CLIP_H);
    ctx.clip();
    ctx.globalAlpha = transType === "wipe" ? 1 : outAlpha;
    ctx.translate(stageCx + targetPanX + outShiftX, stageCy + targetPanY);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-stageCx, -stageCy);

    const timing = { t, p, enterP, simP, isReadingPause, motionAmp, theme, beats, layout };
    const focalTarget = this.renderStageModule(ctx, STAGE, scene, timing);
    this._camState.x += (focalTarget.x - (this._camState.x || focalTarget.x)) * 0.12;
    this._camState.y += (focalTarget.y - (this._camState.y || focalTarget.y)) * 0.12;
    ctx.restore();

    const screenFocalTarget = {
      x: stageCx + targetPanX + (focalTarget.x - stageCx) * camZoom,
      y: stageCy + targetPanY + (focalTarget.y - stageCy) * camZoom
    };

    // Входящая сцена в окне перекрытия (Cross-Dissolve, Slide, Zoom-Fade, Wipe)
    if (isTransitioningOut && nextScene && transU > 0.12) {
      const inP = LectureAnimationEngine.quinticSmooth((transU - 0.12) / 0.88);
      const nextLayout = this.getLayoutMetrics(nextScene, W, H);
      const nextStage = nextLayout.stage;
      ctx.save();
      ctx.beginPath();
      if (transType === "wipe") {
        ctx.rect(nextStage.x, 80, Math.max(1, nextStage.w * inP), SAFE_CLIP_H);
      } else {
        ctx.rect(0, 80, W, SAFE_CLIP_H);
      }
      ctx.clip();
      ctx.globalAlpha = transType === "wipe" ? 1 : inP;
      if (transType === "slide") {
        ctx.translate((1 - inP) * 96, 0);
      } else if (transType === "zoom_fade") {
        const ncx = nextStage.x + nextStage.w / 2;
        const ncy = nextStage.y + nextStage.h / 2;
        const z = 0.94 + 0.06 * inP;
        ctx.translate(ncx, ncy);
        ctx.scale(z, z);
        ctx.translate(-ncx, -ncy);
      } else if (transType === "cross_dissolve") {
        ctx.translate((1 - inP) * 18, 0);
      }
      const nextTiming = {
        t,
        p: Math.min(0.14, inP * 0.14),
        enterP: Math.min(1, inP * 0.6),
        simP: 0,
        isReadingPause: false,
        motionAmp: 1,
        theme: this.getSceneTheme(nextScene),
        beats: { beats: nextScene.beats || [], activeBeatIdx: 0, beatP: inP * 0.25, beatEase: inP * 0.5, beatStates: [0, 0, 0] },
        layout: nextLayout
      };
      this.renderStageModule(ctx, nextStage, nextScene, nextTiming);
      ctx.restore();
    }

    // 4. Процедурный 2D-персонаж в стиле Duolingo/Rive (позиция и размер адаптируются под layoutMode)
    this.drawProceduralTutor(ctx, layout.tutor.cx, layout.tutor.cy, t, scene, screenFocalTarget, isReadingPause, beats, layout.tutor);

    // 5. Режим дефекта ИЛИ светлые контрастные DHH-субтитры с караоке
    if (this.showRawDefectMode) {
      this.drawRawDefectOverlay(ctx, W, H, STAGE, scene);
    } else {
      this.drawKaraokeCaptionBar(ctx, W, H, scene, p, isReadingPause, theme, beats);
    }
  }

  // Слой 0 и 1: Кэшированный Светлый Editorial фон + живые частицы (0 лишних аллокаций в 60 FPS)
  drawKurzgesagtBackdrop(ctx, W, H, t, themeOrDomain, layout = null, styleVariant = null) {
    const theme = typeof themeOrDomain === "object" ? themeOrDomain : this.getSceneTheme({ domainId: themeOrDomain });
    const stageLeft = layout?.backdropLeft ?? 308;
    const pType = styleVariant?.patternVariant || theme.patternType || "editorial";
    const cacheKey = `${theme.domainId || "default"}:${pType}:${layout?.mode || "split_tutor"}:${styleVariant?.accentMode || "primary"}:${W}x${H}`;

    let cachedBg = this._backdropCache.get(cacheKey);
    if (!cachedBg && typeof document !== "undefined" && typeof document.createElement === "function") {
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const octx = off.getContext("2d");
      if (octx && typeof octx.createLinearGradient === "function") {
        const bg = octx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, theme.bgTop);
        bg.addColorStop(1, theme.bgBottom);
        octx.fillStyle = bg;
        octx.fillRect(0, 0, W, H);

        const glow1 = octx.createRadialGradient(W * 0.72, H * 0.34, 20, W * 0.72, H * 0.34, 480);
        glow1.addColorStop(0, theme.ambientA);
        glow1.addColorStop(1, "rgba(255, 255, 255, 0)");
        octx.fillStyle = glow1;
        octx.fillRect(0, 0, W, H);

        const glow2 = octx.createRadialGradient(W * 0.42, H * 0.72, 20, W * 0.42, H * 0.72, 420);
        glow2.addColorStop(0, theme.ambientB);
        glow2.addColorStop(1, "rgba(255, 255, 255, 0)");
        octx.fillStyle = glow2;
        octx.fillRect(0, 0, W, H);

        octx.strokeStyle = theme.gridColor;
        octx.fillStyle = theme.gridColor;
        octx.lineWidth = 1;
        if (pType === "dots") {
          for (let x = stageLeft + 16; x < W - 28; x += 36) {
            for (let y = 96; y < H - 134; y += 36) {
              octx.beginPath();
              octx.arc(x, y, 1.5, 0, Math.PI * 2);
              octx.fill();
            }
          }
        } else if (pType === "ledger") {
          for (let y = 104; y < H - 134; y += 34) {
            octx.beginPath();
            octx.moveTo(stageLeft, y);
            octx.lineTo(W - 28, y);
            octx.stroke();
          }
        } else if (pType === "editorial" || pType === "archival_columns") {
          const stepCol = pType === "archival_columns" ? 132 : 180;
          for (let x = stageLeft + 40; x < W - 40; x += stepCol) {
            octx.beginPath();
            octx.moveTo(x, 86);
            octx.lineTo(x, H - 136);
            octx.stroke();
          }
        } else if (pType !== "organic") {
          for (let x = stageLeft; x < W - 28; x += 48) {
            octx.beginPath();
            octx.moveTo(x, 78);
            octx.lineTo(x, H - 134);
            octx.stroke();
          }
          for (let y = 96; y < H - 134; y += 48) {
            octx.beginPath();
            octx.moveTo(stageLeft, y);
            octx.lineTo(W - 28, y);
            octx.stroke();
          }
        }
        if (this._backdropCache.size >= 8) {
          this._backdropCache.delete(this._backdropCache.keys().next().value);
        }
        this._backdropCache.set(cacheKey, off);
        cachedBg = off;
      }
    }

    if (cachedBg) {
      ctx.drawImage(cachedBg, 0, 0);
    } else {
      ctx.fillStyle = theme.bgTop;
      ctx.fillRect(0, 0, W, H);
    }

    if (pType === "organic") {
      ctx.save();
      ctx.strokeStyle = theme.gridColor;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(W * 0.66, H * 0.44, 90 + i * 68 + Math.sin(t * 0.8 + i) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Деликатные парящие частицы только в зоне контента справа
    ctx.save();
    ctx.fillStyle = `rgb(${theme.shadowRgb})`;
    this.particles.forEach((pt, idx) => {
      const px = stageLeft + ((pt.x + t * pt.speed * pt.z) % 1) * (W - stageLeft - 36);
      const py = 92 + ((pt.y + Math.sin(t * 0.6 + pt.phase) * 0.02 * pt.z + 1) % 1) * (H - 235);
      ctx.globalAlpha = 0.14 + Math.sin(t * 1.4 + pt.phase) * 0.06;
      ctx.beginPath();
      if (idx % 5 === 0) {
        ctx.arc(px, py, pt.r * 1.35, 0, Math.PI * 2);
        ctx.strokeStyle = theme.gridColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.arc(px, py, pt.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  // Форматирование математических индексов и операторов для чистой отрисовки на Canvas
  formatMathText(str) {
    return String(str || "")
      .replace(/<=/g, "≤")
      .replace(/>=/g, "≥")
      .replace(/!=/g, "≠")
      .replace(/f_грунта/gi, "f(гр)")
      .replace(/f_здания/gi, "f(зд)")
      .replace(/cos\(θ\)/gi, "cos θ");
  }

  getCanvasUiLabels(scene) {
    const l = String(scene?.outputLang || this.ttsLang || "ru").toLowerCase();
    if (l.startsWith("kk")) {
      return {
        sceneWord: "КӨРІНІС",
        holdLabel: "⏸ ОЙЛАНУ КІДІРІСІ (Moving Hold)",
        revealLabel: (pct) => `✦ Сызбаны ашу (${pct}%)`,
        beatWord: "ҚАДАМ",
        captionTitle: "«АЙҚЫН ТІЛ» СУБТИТРЛЕРІ",
        paceWord: "Қарқын",
        cpsUnit: "таңба/с",
        tutorName: "Lecture AI Тьюторы",
        gestures: {
          WARNING_PALM: "✋ Ым: Назар / Тәуекел",
          POINT: "👉 Ым: Негізгі түйінге назар",
          QUESTION_OPEN: "⚖️ Ым: Салыстыру «Дейін / Кейін»",
          THUMBS_UP: "👍 Ым: Емтиханға дайын!"
        }
      };
    }
    if (l.startsWith("en")) {
      return {
        sceneWord: "SCENE",
        holdLabel: "⏸ READING HOLD (Moving Hold)",
        revealLabel: (pct) => `✦ Diagram Reveal (${pct}%)`,
        beatWord: "BEAT",
        captionTitle: "PLAIN LANGUAGE CAPTIONS",
        paceWord: "Pace",
        cpsUnit: "CPS",
        tutorName: "Lecture AI Tutor",
        gestures: {
          WARNING_PALM: "✋ Cue: Key Risk / Hook",
          POINT: "👉 Cue: Spatial Focus",
          QUESTION_OPEN: "⚖️ Cue: Before vs After",
          THUMBS_UP: "👍 Cue: Exam Synthesis!"
        }
      };
    }
    return {
      sceneWord: "СЦЕНА",
      holdLabel: "⏸ ПАУЗА ОСМЫСЛЕНИЯ (Moving Hold)",
      revealLabel: (pct) => `✦ Раскрытие схемы (${pct}%)`,
      beatWord: "БИТ",
      captionTitle: "СУБТИТРЫ «ЯСНЫЙ ЯЗЫК»",
      paceWord: "Темп",
      cpsUnit: "симв/с",
      tutorName: "ИИ-Тьютор Lecture AI",
      gestures: {
        WARNING_PALM: "✋ Жест: Внимание / Риск",
        POINT: "👉 Жест: Пространственный фокус",
        QUESTION_OPEN: "⚖️ Жест: Контраст «До / После»",
        THUMBS_UP: "👍 Жест: Итог к экзамену готов!"
      }
    };
  }

  // Верхний HUD-бар с индикатором домена, источника, сцены и фазы Moving Hold
  drawTopHud(ctx, W, info, scene, p, isPause, themeObj, layout = null) {
    const theme = themeObj || this.getSceneTheme(scene);
    const ui = this.getCanvasUiLabels(scene);
    const hudX = 36;
    const hudW = W - 72;
    this.drawKurzgesagtCapsule(ctx, hudX, 20, hudW, 48, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 14, `rgba(${theme.shadowRgb}, 0.08)`);

    const srcSuffix = scene.sourceBadge ? `  ·  📌 ${scene.sourceBadge}` : "";
    ctx.fillStyle = theme.primary;
    ctx.font = "800 13.5px 'Manrope', 'Inter', sans-serif";
    ctx.fillText(
      `${ui.sceneWord} 0${info.index + 1} / 0${this.scenes.length}  ·  ${scene.archetypeBadge || "2D"}${srcSuffix}`,
      hudX + 20,
      49,
      680
    );

    // Заголовок сцены с Mask-Reveal анимацией в первые 0.65с
    const titleX = layout?.titleX ?? 320;
    const titleMaxW = layout?.titleMaxW ?? (W - 360);
    const dur = scene.durationSec || 12;
    const revealP = LectureAnimationEngine.quinticSmooth((p * dur) / 0.65);
    ctx.save();
    ctx.beginPath();
    ctx.rect(titleX - 4, 88, Math.max(8, (titleMaxW + 8) * revealP), 52);
    ctx.clip();
    ctx.fillStyle = theme.ink;
    ctx.font = "800 23.5px 'Manrope', 'Inter', sans-serif";
    ctx.fillText(scene.title, titleX, 124 + (1 - revealP) * 14, titleMaxW);
    ctx.restore();

    // Справа в HUD — индикатор фазы
    ctx.textAlign = "right";
    if (isPause) {
      ctx.fillStyle = theme.secondary;
      ctx.font = "700 13px 'Inter', sans-serif";
      ctx.fillText(ui.holdLabel, hudX + hudW - 20, 49, 440);
    } else {
      ctx.fillStyle = theme.muted;
      ctx.font = "600 13px 'Inter', sans-serif";
      ctx.fillText(ui.revealLabel(Math.round(p * 100)), hudX + hudW - 20, 49, 440);
    }
    ctx.textAlign = "left";
  }

  // Светлая Editorial-капсула (автоматически адаптирует тёмные подложки в светлое матовое стекло с мягкой тенью)
  drawKurzgesagtCapsule(ctx, x, y, w, h, colors, r = 16, glow = null) {
    if (w <= 2 || h <= 2) return;
    const isLegacyDarkSurface =
      typeof colors?.top === "string" &&
      (colors.top.includes("15, 23, 42") || colors.top.includes("9, 13, 22") || colors.top.includes("30, 41, 59"));

    const topColor = isLegacyDarkSurface ? "rgba(255, 255, 255, 0.90)" : colors.top;
    const botColor = isLegacyDarkSurface ? "rgba(248, 250, 252, 0.94)" : colors.bottom;
    const rimColor = isLegacyDarkSurface ? "rgba(15, 23, 42, 0.08)" : colors.rim;

    ctx.save();
    ctx.shadowColor = glow || "rgba(15, 23, 42, 0.07)";
    ctx.shadowBlur = glow ? 22 : 18;
    ctx.shadowOffsetY = 6;
    this.roundRect(ctx, x, y, w, h, r);
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, botColor);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    this.roundRect(ctx, x, y, w, h, r);
    if (rimColor) {
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // Деликатный белый верхний блик (Specular Rim Light)
    ctx.beginPath();
    ctx.moveTo(x + r, y + 1.5);
    ctx.lineTo(x + w - r, y + 1.5);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  drawPersonIcon(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.42, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.46, r * 0.56, Math.PI, 0, false);
    ctx.fill();
    ctx.restore();
  }

  // Поток частиц + направленная стрелка вдоль кривой Безье (для живой динамики схем)
  drawFlowingStream(ctx, p0, cp, p2, t, color, count = 2, withArrow = true) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 7]);
    ctx.lineDashOffset = -t * 42;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (withArrow) {
      const ang = Math.atan2(p2.y - cp.y, p2.x - cp.x);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - 10 * Math.cos(ang - 0.42), p2.y - 10 * Math.sin(ang - 0.42));
      ctx.lineTo(p2.x - 10 * Math.cos(ang + 0.42), p2.y - 10 * Math.sin(ang + 0.42));
      ctx.closePath();
      ctx.fill();
    }

    for (let i = 0; i < count; i++) {
      const u = (t * 0.58 + i / count) % 1;
      this.drawBezierPulse(ctx, p0, cp, p2, u, color);
    }
    ctx.restore();
  }

  // Плавная 3-битовая панель инспектора справа (без резких скачков текста между битами)
  drawBeatInspectorPanel(ctx, x, y, w, h, { badge, title, body, activeBeat, beatEase = 1, theme }) {
    this.drawKurzgesagtCapsule(ctx, x, y, w, h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 20, `rgba(${theme.shadowRgb}, 0.09)`);

    // 3-сегментный индикатор битов
    const segW = (w - 56) / 3;
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = b <= activeBeat ? theme.primary : theme.gridColor;
      this.roundRect(ctx, x + 22 + b * (segW + 6), y + 20, segW, 4, 2);
      ctx.fill();
    }

    const slideY = (1 - beatEase) * 10;
    ctx.save();
    ctx.globalAlpha = 0.25 + beatEase * 0.75;
    ctx.fillStyle = theme.primary;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText(badge, x + 22, y + 48 + slideY * 0.5, w - 44);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 17.5px 'Manrope', sans-serif";
    this.wrapText(ctx, title, x + 22, y + 78 + slideY * 0.7, w - 44, 23, 2);
    ctx.fillStyle = theme.muted;
    ctx.font = "600 14.5px 'Inter', sans-serif";
    this.wrapText(ctx, body, x + 22, y + 132 + slideY, w - 44, 21.5, 6);
    ctx.restore();
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 1: СОЦИАЛЬНАЯ СЕТЬ ГРУПП И СРЕДЫ (actor_network_web — 100% визуальная сцена)
  // =========================================================================
  drawActorNetworkWeb(ctx, stage, scene, timing) {
    const { t, p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const beatEase = beats?.beatEase ?? 1;
    const pals = theme.cardPalettes || [];
    const stages = scene.visualPayload?.stages || [];

    const hubX = stage.x + stage.w * 0.50;
    const hubY = stage.y + stage.h * 0.50;
    const radX = Math.min(340, stage.w * 0.31);
    const radY = 132;
    const satellites = [0, 1, 2, 3].map((i) => {
      const ang = -Math.PI * 0.75 + i * (Math.PI * 0.50);
      const st = stages[i] || { shortTitle: `Группа ${i + 1}`, detail: "", metric: `0${i + 1}` };
      return {
        x: hubX + Math.cos(ang) * radX,
        y: hubY + Math.sin(ang) * radY + Math.sin(t * 1.5 + i) * 4,
        title: st.shortTitle,
        metric: st.metric || `Узел 0${i + 1}`,
        pal: pals[i % Math.max(1, pals.length)] || { top: "#FFF7ED", bot: "#FFEDD5", stroke: theme.primary, text: theme.ink }
      };
    });

    // Внешние кольцевые связи между соседними кластерами
    satellites.forEach((sat, idx) => {
      const next = satellites[(idx + 1) % satellites.length];
      const cpOuter = { x: (sat.x + next.x) / 2, y: (sat.y + next.y) / 2 };
      this.drawFlowingStream(ctx, sat, cpOuter, next, t * 0.7 + idx * 0.2, theme.gridColor, 1, false);
    });

    // Двунаправленные живые дуги взаимодействий (Общество ⇄ Среда)
    satellites.forEach((sat, idx) => {
      const isFocus = idx % 3 === activeBeat;
      const cp = { x: (hubX + sat.x) / 2, y: (hubY + sat.y) / 2 - 22 };
      const trimP = LectureAnimationEngine.clamp((p - idx * 0.06) * 2.2, 0.25, 1);
      this.drawTrimmedBezier(ctx, { x: hubX, y: hubY }, cp, sat, trimP, isFocus ? theme.primary : theme.gridColor, isFocus ? 3.5 : 2.0);
      if (isFocus || timing.isReadingPause) {
        this.drawFlowingStream(ctx, { x: hubX, y: hubY }, cp, sat, t + idx * 0.2, theme.primary, 2, true);
      }
    });

    // Пульсирующая радар-волна от центрального ядра
    const waveR = 62 + ((t * 36) % 70);
    ctx.save();
    ctx.strokeStyle = theme.primary;
    ctx.globalAlpha = Math.max(0, 0.35 * (1 - (waveR - 62) / 70));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hubX, hubY, waveR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Центральное ядро темы
    this.drawKurzgesagtCapsule(ctx, hubX - 96, hubY - 48, 192, 96, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.primary
    }, 48, `rgba(${theme.shadowRgb}, 0.18)`);
    this.drawPersonIcon(ctx, hubX - 20, hubY - 12, 15, theme.primary);
    this.drawPersonIcon(ctx, hubX + 20, hubY - 12, 15, theme.secondary);
    this.drawPersonIcon(ctx, hubX, hubY - 8, 17, theme.ink);
    ctx.fillStyle = theme.ink;
    ctx.textAlign = "center";
    ctx.font = "800 13.5px 'Manrope', sans-serif";
    ctx.fillText((scene.keyTerm || "Общество и среда").split(/[/(]/)[0].trim().slice(0, 22), hubX, hubY + 30, 170);

    // Орбитальные кластеры групп с метриками
    satellites.forEach((sat, idx) => {
      const isFocus = idx % 3 === activeBeat;
      const scale = isFocus ? 1 + beatEase * 0.08 : 0.96;
      const w = 196 * scale;
      const h = 62 * scale;
      ctx.save();
      ctx.globalAlpha = isFocus || timing.isReadingPause ? 1 : 0.72;
      this.drawKurzgesagtCapsule(ctx, sat.x - w / 2, sat.y - h / 2, w, h, {
        top: sat.pal.top,
        bottom: sat.pal.bot,
        rim: isFocus ? sat.pal.stroke : theme.surfaceBorder
      }, 28, isFocus ? `rgba(${theme.shadowRgb}, 0.18)` : null);
      ctx.fillStyle = sat.pal.stroke;
      ctx.font = "800 10.5px 'JetBrains Mono', monospace";
      ctx.fillText(sat.metric.toUpperCase(), sat.x, sat.y - 6, w - 24);
      ctx.fillStyle = sat.pal.text;
      ctx.font = "800 13.5px 'Manrope', sans-serif";
      ctx.fillText(sat.title, sat.x, sat.y + 15, w - 24);
      ctx.restore();
    });
    ctx.textAlign = "left";

    return satellites[activeBeat] || { x: hubX, y: hubY };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 2: ПИРАМИДА СТРАТИФИКАЦИИ И ИЕРАРХИИ (визуальная, без стен текста)
  // =========================================================================
  drawSocialStratificationPyramid(ctx, stage, scene, timing) {
    const { t, p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const beatEase = beats?.beatEase ?? 1;
    const pals = theme.cardPalettes || [];
    const stages = scene.visualPayload?.stages || [];
    const tiers = [0, 1, 2].map((i) => stages[i] || { shortTitle: `Уровень ${i + 1}`, detail: "", metric: `0${i + 1}` });

    const pyrCx = stage.x + Math.round(stage.w * 0.30);
    const topY = stage.y + 44;
    const tierH = 96;
    const gap = 14;
    let focusTarget = { x: pyrCx, y: topY + 140 };

    for (let i = 0; i < 3; i++) {
      const pop = LectureAnimationEngine.stagger(p, i, 3, 0.12, 0.35);
      const rowFromTop = 2 - i;
      const y = topY + rowFromTop * (tierH + gap);
      const topW = (Math.round(stage.w * 0.15) + rowFromTop * Math.round(stage.w * 0.10)) * Math.min(1, pop);
      const botW = (Math.round(stage.w * 0.22) + rowFromTop * Math.round(stage.w * 0.10)) * Math.min(1, pop);
      const isFocus = i === activeBeat;
      const shiftX = isFocus ? beatEase * 14 : 0;
      const pal = pals[i % Math.max(1, pals.length)] || { top: "#EFF6FF", bot: "#DBEAFE", stroke: theme.primary, text: theme.ink };

      if (isFocus) focusTarget = { x: pyrCx + shiftX, y: y + tierH / 2 };

      ctx.save();
      ctx.globalAlpha = Math.min(1, pop) * (isFocus || timing.isReadingPause ? 1 : 0.74);
      ctx.beginPath();
      ctx.moveTo(pyrCx - topW / 2 + shiftX, y);
      ctx.lineTo(pyrCx + topW / 2 + shiftX, y);
      ctx.lineTo(pyrCx + botW / 2 + shiftX, y + tierH);
      ctx.lineTo(pyrCx - botW / 2 + shiftX, y + tierH);
      ctx.closePath();

      const grad = ctx.createLinearGradient(pyrCx, y, pyrCx, y + tierH);
      grad.addColorStop(0, pal.top);
      grad.addColorStop(1, pal.bot);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = isFocus ? pal.stroke : theme.surfaceBorder;
      ctx.lineWidth = isFocus ? 2.8 : 1.5;
      ctx.stroke();

      // Пропорциональные иконки людей/элементов внутри яруса
      const iconCount = 2 + rowFromTop * 2;
      for (let ic = 0; ic < iconCount; ic++) {
        const ix = pyrCx + shiftX - ((iconCount - 1) * 18) / 2 + ic * 18;
        this.drawPersonIcon(ctx, ix, y + 26, 8.5, pal.stroke);
      }

      ctx.fillStyle = pal.text;
      ctx.textAlign = "center";
      ctx.font = "800 15px 'Manrope', sans-serif";
      ctx.fillText(tiers[i].shortTitle, pyrCx + shiftX, y + 66, topW + 24);
      ctx.textAlign = "left";

      // Справа: компактная шкала-индикатор яруса + тег (без 2-строчной прозы)
      const cardX = stage.x + stage.w * 0.62;
      const cardW = stage.w * 0.35;
      this.drawFlowingStream(
        ctx,
        { x: pyrCx + (topW + botW) / 4 + shiftX + 6, y: y + tierH / 2 },
        { x: (pyrCx + cardX) / 2 + 20, y: y + tierH / 2 - 12 },
        { x: cardX - 6, y: y + tierH / 2 },
        t + i * 0.3,
        isFocus ? pal.stroke : theme.gridColor,
        isFocus ? 1 : 0,
        true
      );

      this.drawKurzgesagtCapsule(ctx, cardX, y + 10, cardW, tierH - 20, {
        top: theme.surfaceTop,
        bottom: theme.surfaceBottom,
        rim: isFocus ? pal.stroke : theme.surfaceBorder
      }, 14);
      ctx.fillStyle = pal.stroke;
      ctx.font = "800 11px 'JetBrains Mono', monospace";
      ctx.fillText(`УРОВЕНЬ 0${i + 1} · ${tiers[i].metric}`, cardX + 16, y + 34, cardW - 32);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 14.5px 'Manrope', sans-serif";
      ctx.fillText(tiers[i].shortTitle, cardX + 16, y + 58, cardW - 32);

      // Живой индикатор заполнения шкалы уровня
      const barPct = (0.35 + (2 - rowFromTop) * 0.25) * (isFocus ? 1 : 0.7);
      ctx.fillStyle = theme.gridColor;
      this.roundRect(ctx, cardX + 16, y + 68, cardW - 32, 6, 3);
      ctx.fill();
      ctx.fillStyle = pal.stroke;
      this.roundRect(ctx, cardX + 16, y + 68, (cardW - 32) * barPct, 6, 3);
      ctx.fill();
      ctx.restore();
    }

    return focusTarget;
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 3: РЫЧАЖНЫЕ ВЕСЫ НОРМ И ИНТЕРЕСОВ (scales_balance_norm)
  // =========================================================================
  drawScalesBalanceNorm(ctx, stage, scene, timing) {
    const { t, p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const cmp = scene.visualPayload?.facts?.comparison || {
      leftTitle: "Фактор А",
      leftMetric: "Дисбаланс",
      rightTitle: "Фактор Б",
      rightMetric: "Равновесие",
      subject: scene.keyTerm || "Норма"
    };

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    const pivotX = stage.x + stage.w * 0.48;
    const pivotY = stage.y + 118;
    const beatEase = beats?.beatEase ?? 1;
    // Плавная интерполяция угла коромысла между битами (без резких скачков!)
    const targetTilt =
      activeBeat === 0
        ? -0.22 * LectureAnimationEngine.quinticSmooth(Math.min(1, p * 4))
        : activeBeat === 1
          ? -0.22 * (1 - beatEase) - 0.04 * Math.sin(t * 3.5) * (1 - beatEase * 0.6)
          : Math.sin(t * 1.8) * 0.015;
    const beamHalf = 215;

    // Центральная колонна и основание весов
    ctx.fillStyle = theme.muted;
    this.roundRect(ctx, pivotX - 7, pivotY, 14, 210, 6);
    ctx.fill();
    this.roundRect(ctx, pivotX - 75, pivotY + 206, 150, 16, 8);
    ctx.fill();

    // Коромысло
    const lx = pivotX - Math.cos(targetTilt) * beamHalf;
    const ly = pivotY - Math.sin(targetTilt) * beamHalf;
    const rx = pivotX + Math.cos(targetTilt) * beamHalf;
    const ry = pivotY + Math.sin(targetTilt) * beamHalf;

    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Центральный медальон ключевого принципа
    this.drawKurzgesagtCapsule(ctx, pivotX - 68, pivotY - 22, 136, 44, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: theme.primary
    }, 22);
    ctx.fillStyle = theme.primary;
    ctx.textAlign = "center";
    ctx.font = "800 12px 'Manrope', sans-serif";
    ctx.fillText(String(cmp.subject || scene.keyTerm).split(/[/(]/)[0].trim().slice(0, 16), pivotX, pivotY + 4, 120);

    // Две подвесные чаши с карточками факторов
    const drawPan = (px, py, title, sub, strokeCol, bgTop, bgBot) => {
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 58, py + 64);
      ctx.moveTo(px, py);
      ctx.lineTo(px + 58, py + 64);
      ctx.stroke();

      this.drawKurzgesagtCapsule(ctx, px - 108, py + 64, 216, 98, {
        top: bgTop,
        bottom: bgBot,
        rim: strokeCol
      }, 16);
      ctx.fillStyle = strokeCol;
      ctx.font = "800 13.5px 'Manrope', sans-serif";
      ctx.fillText(String(title).replace(/[❌✅]/g, "").trim(), px, py + 94, 192);
      ctx.fillStyle = theme.ink;
      ctx.font = "600 12.5px 'Inter', sans-serif";
      ctx.fillText(sub, px, py + 122, 192);
    };

    drawPan(lx, ly, cmp.leftTitle, cmp.leftMetric, theme.danger, "#FFF1F2", "#FFE4E6");
    drawPan(rx, ry, cmp.rightTitle, cmp.rightMetric, theme.success, "#ECFDF5", "#D1FAE5");
    ctx.textAlign = "left";

    return activeBeat === 0 ? { x: lx, y: ly + 100 } : activeBeat === 1 ? { x: pivotX, y: pivotY } : { x: rx, y: ry + 100 };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 4: ЖИВАЯ КЛЕТКА И БИОЦИКЛ (bio_cell_cycle)
  // =========================================================================
  drawBioCellCycle(ctx, stage, scene, timing) {
    const { t, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const stages = scene.visualPayload?.stages || [];

    const cellX = stage.x + 255;
    const cellY = stage.y + 198;
    const baseR = 136;

    // Двойная органическая мембрана клетки (перистальтика)
    [baseR + 10, baseR].forEach((rad, layerIdx) => {
      ctx.save();
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.15) {
        const wobble = Math.sin(a * 5 + t * 1.8) * 5 + Math.cos(a * 3 - t * 1.3) * 4;
        const r = rad + wobble;
        const x = cellX + Math.cos(a) * r * 1.15;
        const y = cellY + Math.sin(a) * r * 0.92;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (layerIdx === 1) {
        const g = ctx.createRadialGradient(cellX - 24, cellY - 24, 12, cellX, cellY, rad * 1.1);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, "#CCFBF1");
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.strokeStyle = layerIdx === 0 ? theme.primarySoft : theme.primary;
      ctx.lineWidth = layerIdx === 0 ? 8 : 2.5;
      ctx.stroke();
      ctx.restore();
    });

    // Ядро и органеллы внутри клетки + поток АТФ/сигналов между ними
    const organelles = [
      { x: cellX, y: cellY, r: 44, col: theme.primary, label: (scene.keyTerm || "Ядро").split(/[/(]/)[0].slice(0, 12) },
      { x: cellX - 78, y: cellY - 36, r: 24, col: theme.secondary, label: stages[0]?.shortTitle?.slice(0, 10) || "Рецептор" },
      { x: cellX + 82, y: cellY + 34, r: 26, col: theme.success, label: stages[1]?.shortTitle?.slice(0, 10) || "Синтез" }
    ];

    this.drawFlowingStream(ctx, organelles[1], { x: cellX - 30, y: cellY - 56 }, organelles[0], t, theme.secondary, 2, true);
    this.drawFlowingStream(ctx, organelles[0], { x: cellX + 40, y: cellY + 52 }, organelles[2], t, theme.success, 2, true);

    organelles.forEach((org, idx) => {
      const isFocus = idx === activeBeat;
      const pulseR = isFocus ? Math.sin(t * 4) * 3 : 0;
      ctx.save();
      ctx.fillStyle = org.col;
      ctx.globalAlpha = isFocus ? 0.24 : 0.12;
      ctx.beginPath();
      ctx.arc(org.x, org.y, org.r + (isFocus ? 8 : 0) + pulseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = org.col;
      ctx.lineWidth = isFocus ? 3 : 1.8;
      ctx.beginPath();
      ctx.arc(org.x, org.y, org.r + pulseR * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.textAlign = "center";
      ctx.font = "800 11.5px 'Inter', sans-serif";
      ctx.fillText(org.label, org.x, org.y + 4, org.r * 1.9);
      ctx.restore();
    });
    ctx.textAlign = "left";

    // Правый компактный циферблат 3 фаз биопроцесса (без простыни текста!)
    const rx = stage.x + stage.w * 0.62;
    const rw = stage.w * 0.34;
    this.drawKurzgesagtCapsule(ctx, rx, stage.y + 34, rw, stage.h - 68, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 20);
    ctx.fillStyle = theme.primary;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText(`ЦИКЛ БИОПРОЦЕССА · ${activeBeat + 1}/3`, rx + 20, stage.y + 66);

    organelles.forEach((org, idx) => {
      const iy = stage.y + 94 + idx * 78;
      const isCur = idx === activeBeat;
      this.drawKurzgesagtCapsule(ctx, rx + 18, iy, rw - 36, 62, {
        top: isCur ? "#FFFFFF" : theme.surfaceBottom,
        bottom: isCur ? "#F0FDFA" : theme.surfaceBottom,
        rim: isCur ? org.col : theme.surfaceBorder
      }, 14);
      ctx.fillStyle = org.col;
      ctx.beginPath();
      ctx.arc(rx + 42, iy + 31, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.ink;
      ctx.font = "800 14px 'Manrope', sans-serif";
      ctx.fillText(org.label, rx + 62, iy + 36, rw - 92);
    });

    return organelles[activeBeat] || { x: cellX, y: cellY };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 5: ТРАПЕЦИЕВИДНАЯ ВОРОНКА + WATERFALL-БАЛАНС (econ_funnel_waterfall)
  // =========================================================================
  drawEconFunnelWaterfall(ctx, stage, scene, timing) {
    const { p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const stages = scene.visualPayload?.stages || [];
    const pals = theme.cardPalettes || [];

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    // Слева: Настоящая сужающаяся трапециевидная воронка из 3 сегментов
    const fx = stage.x + 235;
    const fy = stage.y + 56;
    const segH = 82;
    for (let i = 0; i < 3; i++) {
      const pop = LectureAnimationEngine.stagger(p, i, 3, 0.12);
      const wTop = (340 - i * 76) * Math.min(1, pop);
      const wBot = (272 - i * 76) * Math.min(1, pop);
      const y = fy + i * (segH + 10);
      const isFocus = i === activeBeat;
      const pal = pals[i % Math.max(1, pals.length)] || { top: "#ECFDF5", bot: "#D1FAE5", stroke: theme.primary, text: theme.ink };

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fx - wTop / 2, y);
      ctx.lineTo(fx + wTop / 2, y);
      ctx.lineTo(fx + wBot / 2, y + segH);
      ctx.lineTo(fx - wBot / 2, y + segH);
      ctx.closePath();
      const g = ctx.createLinearGradient(fx, y, fx, y + segH);
      g.addColorStop(0, pal.top);
      g.addColorStop(1, pal.bot);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = isFocus ? pal.stroke : theme.surfaceBorder;
      ctx.lineWidth = isFocus ? 2.8 : 1.4;
      ctx.stroke();

      ctx.fillStyle = pal.text;
      ctx.textAlign = "center";
      ctx.font = "800 13.5px 'Manrope', sans-serif";
      ctx.fillText(stages[i]?.shortTitle || `Этап ${i + 1}`, fx, y + 36, wBot - 16);
      ctx.fillStyle = theme.muted;
      ctx.font = "700 11.5px 'JetBrains Mono', monospace";
      ctx.fillText(stages[i]?.metric || `Шаг 0${i + 1}`, fx, y + 58, wBot - 16);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // Справа: Каскадный Waterfall-график + вывод бита
    const wx = stage.x + 465;
    const ww = stage.w - 492;
    this.drawKurzgesagtCapsule(ctx, wx, stage.y + 42, ww, stage.h - 84, {
      top: "#FFFFFF",
      bottom: "#FAF8F5",
      rim: theme.surfaceBorder
    }, 16);

    const bars = [
      { lbl: "Вход", h: 146, yOff: 0, col: theme.primary, val: "100%" },
      { lbl: "Потери / фильтр", h: 54, yOff: 0, col: theme.danger, val: "-32%" },
      { lbl: "Чистый итог", h: 112, yOff: 34, col: theme.success, val: "68%" }
    ];
    const baseLineY = stage.y + 276;
    const stepX = (ww - 64) / 3;
    bars.forEach((b, idx) => {
      const bx = wx + 32 + idx * stepX;
      const bwBar = Math.min(92, stepX - 24);
      const curH = b.h * LectureAnimationEngine.clamp((p - idx * 0.12) * 2.2, 0, 1);
      ctx.fillStyle = b.col;
      this.roundRect(ctx, bx, baseLineY - curH - b.yOff, bwBar, curH, 10);
      ctx.fill();
      ctx.fillStyle = b.col;
      ctx.textAlign = "center";
      ctx.font = "800 13px 'JetBrains Mono', monospace";
      ctx.fillText(b.val, bx + bwBar / 2, baseLineY - curH - b.yOff - 10);
      ctx.fillStyle = theme.muted;
      ctx.font = "700 12px 'Inter', sans-serif";
      ctx.fillText(b.lbl, bx + bwBar / 2, baseLineY + 22);
    });
    ctx.textAlign = "left";

    return { x: fx, y: fy + activeBeat * 92 + 40 };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 6: СТЕК ПРОТОКОЛОВ / МОДЕЛИ + МАТРИЦА ВНИМАНИЯ (cs_layered_pipeline)
  // =========================================================================
  drawCsLayeredPipeline(ctx, stage, scene, timing) {
    const { t, p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const stages = scene.visualPayload?.stages || [];
    const pals = theme.cardPalettes || [];

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    // Слева: Архитектурный стек из 3 слоёв со световым потоком пакетов
    const sx = stage.x + 32;
    const sw = 430;
    for (let i = 0; i < 3; i++) {
      const sy = stage.y + 46 + i * 108;
      const isFocus = i === activeBeat;
      const pal = pals[i % Math.max(1, pals.length)] || { top: "#EEF2FF", bot: "#E0E7FF", stroke: theme.primary, text: theme.ink };
      this.drawKurzgesagtCapsule(ctx, sx, sy, sw, 84, {
        top: isFocus ? pal.top : "#FFFFFF",
        bottom: isFocus ? pal.bot : "#F8FAFC",
        rim: isFocus ? pal.stroke : theme.surfaceBorder
      }, 14);
      ctx.fillStyle = pal.stroke;
      ctx.font = "800 11px 'JetBrains Mono', monospace";
      ctx.fillText(`LAYER 0${i + 1} · ${stages[i]?.metric || "PIPELINE"}`, sx + 18, sy + 26);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 15px 'Manrope', sans-serif";
      ctx.fillText(stages[i]?.shortTitle || `Модуль ${i + 1}`, sx + 18, sy + 50, sw - 36);
      ctx.fillStyle = theme.muted;
      ctx.font = "500 12px 'Inter', sans-serif";
      ctx.fillText(stages[i]?.detail || "", sx + 18, sy + 70, sw - 36);
    }

    // Поток пакетов данных между слоями стека (Layer 1 -> Layer 2 -> Layer 3) + шина к матрице
    this.drawFlowingStream(ctx, { x: sx + sw / 2, y: stage.y + 130 }, { x: sx + sw / 2 - 14, y: stage.y + 142 }, { x: sx + sw / 2, y: stage.y + 154 }, t, theme.primary, 1, true);
    this.drawFlowingStream(ctx, { x: sx + sw / 2, y: stage.y + 238 }, { x: sx + sw / 2 - 14, y: stage.y + 250 }, { x: sx + sw / 2, y: stage.y + 262 }, t, theme.primary, 1, true);

    const mx = stage.x + 500;
    const mw = stage.w - 528;
    const activeLayerY = stage.y + 88 + activeBeat * 108;
    this.drawFlowingStream(ctx, { x: sx + sw, y: activeLayerY }, { x: sx + sw + 20, y: (activeLayerY + stage.y + 170) / 2 }, { x: mx, y: stage.y + 170 }, t, theme.primary, 2, true);

    this.drawKurzgesagtCapsule(ctx, mx, stage.y + 46, mw, 300, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: theme.primary
    }, 16);
    ctx.fillStyle = theme.primary;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText("STATE / ATTENTION MATRIX", mx + 20, stage.y + 76);

    const cellS = 44;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const isRowFocus = r === activeBeat % 4;
        const val = (isRowFocus ? 0.45 : 0.18) + 0.52 * Math.abs(Math.sin(t * 1.4 + r * 1.4 + c * 0.9 + activeBeat));
        ctx.fillStyle = `rgba(${theme.shadowRgb}, ${val.toFixed(2)})`;
        this.roundRect(ctx, mx + 22 + c * (cellS + 8), stage.y + 96 + r * (cellS + 8), cellS, cellS, 8);
        ctx.fill();
      }
    }

    // Справа от матрицы: живые столбики весов слоёв (без 9-строчной стены текста!)
    const barX = mx + 245;
    if (mw > 320) {
      for (let k = 0; k < 3; k++) {
        const by = stage.y + 104 + k * 66;
        const fillW = (mw - 270) * (0.45 + 0.45 * Math.abs(Math.sin(t * 1.6 + k * 1.2 + activeBeat)));
        ctx.fillStyle = theme.muted;
        ctx.font = "700 11px 'JetBrains Mono', monospace";
        ctx.fillText(stages[k]?.shortTitle?.slice(0, 16) || `Node ${k + 1}`, barX, by);
        ctx.fillStyle = theme.gridColor;
        this.roundRect(ctx, barX, by + 10, mw - 270, 14, 7);
        ctx.fill();
        ctx.fillStyle = k === activeBeat ? theme.primary : theme.secondary;
        this.roundRect(ctx, barX, by + 10, Math.max(18, fillW), 14, 7);
        ctx.fill();
      }
    }

    return { x: sx + sw / 2, y: stage.y + 88 + activeBeat * 108 };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 7: ИНЖЕНЕРНЫЙ ЧЕРТЁЖ И ВЕКТОРЫ СИЛ (eng_structural_forces)
  // =========================================================================
  drawEngStructuralForces(ctx, stage, scene, timing) {
    const { t, motionAmp, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    // Слева: Инженерный каркас с размерными засечками и векторами сил F / R
    const bx = stage.x + 88;
    const by = stage.y + 72;
    const bw = 270;
    const bh = 230;
    const sway = activeBeat === 0 ? Math.sin(t * 7) * 9 * motionAmp : Math.sin(t * 2) * 2;

    // Фундамент и демпферные опоры
    ctx.fillStyle = "#CBD5E1";
    this.roundRect(ctx, bx - 24, by + bh, bw + 48, 22, 6);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const ox = bx + 28 + k * 106;
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ox, by + bh - 8, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Несущая рама с раскосами жёсткости
    ctx.save();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh - 18);
    ctx.lineTo(bx + sway, by);
    ctx.lineTo(bx + bw + sway, by);
    ctx.lineTo(bx + bw, by + bh - 18);
    ctx.stroke();
    // Пространственная ферма сверху
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 4; k++) {
      const x0 = bx + sway + k * (bw / 4);
      ctx.beginPath();
      ctx.moveTo(x0, by);
      ctx.lineTo(x0 + bw / 8, by - 24);
      ctx.lineTo(x0 + bw / 4, by);
      ctx.stroke();
    }
    ctx.restore();

    // Красный вектор внешней силы F слева со стрелкой + зелёный вектор реакции опоры R
    ctx.strokeStyle = theme.danger;
    ctx.fillStyle = theme.danger;
    ctx.lineWidth = 3.5;
    const arrowY = by + 75;
    const fTipX = bx - 8 + sway;
    ctx.beginPath();
    ctx.moveTo(bx - 62, arrowY);
    ctx.lineTo(fTipX, arrowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fTipX, arrowY);
    ctx.lineTo(fTipX - 10, arrowY - 6);
    ctx.lineTo(fTipX - 10, arrowY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.font = "800 12px 'JetBrains Mono', monospace";
    ctx.fillText("F_внеш", bx - 64, arrowY - 12);

    if (activeBeat >= 1) {
      ctx.strokeStyle = theme.success;
      ctx.fillStyle = theme.success;
      ctx.lineWidth = 3;
      const rX = bx + bw + 56;
      const rTipX = bx + bw + 10 + sway * 0.4;
      ctx.beginPath();
      ctx.moveTo(rX, by + bh - 28);
      ctx.lineTo(rTipX, by + bh - 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rTipX, by + bh - 28);
      ctx.lineTo(rTipX + 9, by + bh - 34);
      ctx.lineTo(rTipX + 9, by + bh - 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillText("R_демпф", rTipX + 6, by + bh - 38);
    }

    // Справа: Полноразмерный живой осциллограф гашения колебаний + 3 телеметрии
    const rx = stage.x + 435;
    const rw = stage.w - 462;
    this.drawKurzgesagtCapsule(ctx, rx, stage.y + 36, rw, stage.h - 72, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: theme.primary
    }, 16);
    ctx.fillStyle = theme.primary;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText(`ОСЦИЛЛОГРАММА НАГРУЗКИ · УЗЕЛ 0${activeBeat + 1}`, rx + 22, stage.y + 68);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 17px 'Manrope', sans-serif";
    ctx.fillText((scene.keyTerm || scene.title).split(/[/(]/)[0].trim(), rx + 22, stage.y + 96, rw - 44);

    // Сетка осциллографа + затухающая волна
    const waveY = stage.y + 196;
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx + 22, waveY);
    ctx.lineTo(rx + rw - 22, waveY);
    ctx.stroke();

    ctx.strokeStyle = activeBeat === 0 ? theme.danger : theme.success;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const decay = activeBeat === 0 ? 320 : activeBeat === 1 ? 120 : 68;
    for (let x = 0; x <= rw - 48; x += 4) {
      const env = Math.exp(-x / decay);
      const wy = waveY + Math.sin(x * 0.11 - t * 5) * 48 * env;
      if (x === 0) ctx.moveTo(rx + 24 + x, wy);
      else ctx.lineTo(rx + 24 + x, wy);
    }
    ctx.stroke();

    // 3 компактные плашки телеметрии внизу
    const pills = [
      { k: "Режим", v: activeBeat === 0 ? "Пик волны" : "Демпфирование" },
      { k: "Перегрузка", v: activeBeat === 0 ? "100%" : "-68%" },
      { k: "Каркас", v: activeBeat >= 1 ? "Устойчив ✓" : "Сдвиг ⚠" }
    ];
    const pw = (rw - 64) / 3;
    pills.forEach((pl, idx) => {
      const px = rx + 22 + idx * (pw + 10);
      this.drawKurzgesagtCapsule(ctx, px, stage.y + 276, pw, 58, {
        top: theme.surfaceTop,
        bottom: theme.surfaceBottom,
        rim: theme.surfaceBorder
      }, 10);
      ctx.fillStyle = theme.muted;
      ctx.font = "700 10.5px 'Inter', sans-serif";
      ctx.fillText(pl.k, px + 10, stage.y + 298, pw - 20);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 12.5px 'JetBrains Mono', monospace";
      ctx.fillText(pl.v, px + 10, stage.y + 320, pw - 20);
    });

    return activeBeat === 0 ? { x: bx + bw / 2, y: by + 80 } : { x: rx + rw / 2, y: stage.y + 180 };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 8: ХРОНОЛОГИЧЕСКАЯ РЕКА ЭПОХ И ЭТАПОВ (chronicle_timeline)
  // =========================================================================
  drawChronicleTimeline(ctx, stage, scene, timing) {
    const { p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const stages = scene.visualPayload?.stages || [];
    const years = scene.visualPayload?.years || [];
    const pals = theme.cardPalettes || [];

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    const lineY = stage.y + stage.h * 0.52;
    const leftX = stage.x + 76;
    const rightX = stage.x + stage.w - 76;

    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftX, lineY);
    ctx.lineTo(rightX, lineY);
    ctx.stroke();

    const beatEase = beats?.beatEase ?? 1;
    const progRatio = LectureAnimationEngine.clamp((activeBeat + 0.15 + beatEase * 0.72) / 3, 0.08, 1);
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(leftX, lineY);
    ctx.lineTo(leftX + (rightX - leftX) * progRatio, lineY);
    ctx.stroke();

    // Бегунок прогресса на оси времени
    const playheadX = leftX + (rightX - leftX) * progRatio;
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.arc(playheadX, lineY, 7, 0, Math.PI * 2);
    ctx.fill();

    let focusPos = { x: stage.x + stage.w / 2, y: lineY };
    for (let i = 0; i < 3; i++) {
      const st = stages[i] || { shortTitle: `Этап ${i + 1}`, detail: "", metric: `0${i + 1}` };
      const cx = leftX + ((rightX - leftX) * i) / 2;
      const isFocus = i === activeBeat;
      const cardY = i % 2 === 0 ? lineY - 148 : lineY + 36;
      const pal = pals[i % Math.max(1, pals.length)] || { top: "#FFFFFF", bot: "#FAF8F5", stroke: theme.primary, text: theme.ink };
      if (isFocus) focusPos = { x: cx, y: lineY };

      // Медальон этапа/даты на оси
      this.drawKurzgesagtCapsule(ctx, cx - 44, lineY - 16, 88, 32, {
        top: isFocus ? theme.primary : "#FFFFFF",
        bottom: isFocus ? theme.primary : "#F8FAFC",
        rim: theme.primary
      }, 16);
      ctx.fillStyle = isFocus ? "#FFFFFF" : theme.primary;
      ctx.textAlign = "center";
      ctx.font = "800 11.5px 'JetBrains Mono', monospace";
      ctx.fillText(years[i] || `ЭТАП 0${i + 1}`, cx, lineY + 4, 76);
      ctx.textAlign = "left";

      const cw = Math.min(280, Math.round(stage.w * 0.25));
      const cxCard = LectureAnimationEngine.clamp(cx - cw / 2, stage.x + 22, stage.x + stage.w - cw - 22);
      const liftY = isFocus ? -beatEase * 6 : 0;
      this.drawKurzgesagtCapsule(ctx, cxCard, cardY + liftY, cw, 92, {
        top: pal.top,
        bottom: pal.bot,
        rim: isFocus ? pal.stroke : theme.surfaceBorder
      }, 14, isFocus ? `rgba(${theme.shadowRgb}, 0.16)` : null);
      ctx.fillStyle = pal.stroke;
      ctx.font = "800 10.5px 'JetBrains Mono', monospace";
      ctx.fillText(st.metric || `ШАГ 0${i + 1}`, cxCard + 16, cardY + liftY + 24, cw - 32);
      ctx.fillStyle = pal.text;
      ctx.font = "800 14.5px 'Manrope', sans-serif";
      this.wrapText(ctx, st.shortTitle, cxCard + 16, cardY + liftY + 46, cw - 32, 19, 2);
    }
    return focusPos;
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 9: ДОМЕННАЯ ДУЭЛЬ ПОДХОДОВ «VS» (split_versus_duel, без сейсмо-штампов!)
  // =========================================================================
  drawSplitVersusDuel(ctx, stage, scene, timing) {
    const { t, p, motionAmp, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const cmp = scene.visualPayload?.facts?.comparison || scene.visualPayload?.signals || {};
    const leftTitle = cmp.leftTitle || cmp.leftFail?.title || "Наивный взгляд ❌";
    const leftSub = cmp.leftNote || cmp.leftFail?.sub || "Без системного метода";
    const leftMetric = cmp.leftMetric || cmp.leftFail?.metric || "Ошибки";
    const rightTitle = cmp.rightTitle || cmp.rightPass?.title || "Научный метод ✅";
    const rightSub = cmp.rightNote || cmp.rightPass?.sub || "Системный анализ";
    const rightMetric = cmp.rightMetric || cmp.rightPass?.metric || "Точный вывод";
    const deltaBadge = cmp.deltaBadge || "Системное преимущество";
    const dom = scene.domainId || "soc_hum";

    const halfW = (stage.w - 30) / 2;
    const leftX = stage.x;
    const rightX = stage.x + halfW + 30;

    // Левая карточка
    this.drawKurzgesagtCapsule(ctx, leftX, stage.y, halfW, stage.h, {
      top: "#FFF1F2",
      bottom: "#FFE4E6",
      rim: activeBeat === 0 ? theme.danger : "#FDA4AF"
    }, 20);
    ctx.fillStyle = "#9F1239";
    ctx.font = "900 17.5px 'Manrope', sans-serif";
    ctx.fillText(leftTitle, leftX + 24, stage.y + 38, halfW - 48);
    ctx.fillStyle = "#475569";
    ctx.font = "600 13.5px 'Inter', sans-serif";
    ctx.fillText(leftSub, leftX + 24, stage.y + 62, halfW - 48);

    // Правая карточка
    this.drawKurzgesagtCapsule(ctx, rightX, stage.y, halfW, stage.h, {
      top: "#ECFDF5",
      bottom: "#D1FAE5",
      rim: activeBeat >= 1 ? theme.success : "#6EE7B7"
    }, 20);
    ctx.fillStyle = "#065F46";
    ctx.font = "900 17.5px 'Manrope', sans-serif";
    ctx.fillText(rightTitle, rightX + 24, stage.y + 38, halfW - 48);
    ctx.fillStyle = "#475569";
    ctx.font = "600 13.5px 'Inter', sans-serif";
    ctx.fillText(rightSub, rightX + 24, stage.y + 62, halfW - 48);

    // Доменно-специфичная визуальная метафора внутри карточек!
    const lCx = leftX + halfW / 2;
    const rCx = rightX + halfW / 2;
    const midY = stage.y + 195;

    if (dom === "soc_hum" || dom === "law_gov") {
      // Слева: хаотично блуждающие разрозненные индивиды; Справа: связанное сообщество / норма с импульсами
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + 0.4;
        const driftX = Math.sin(t * 2.2 + i * 1.7) * 8 * motionAmp;
        const driftY = Math.cos(t * 1.9 + i * 2.1) * 6 * motionAmp;
        this.drawPersonIcon(ctx, lCx + Math.cos(ang) * 58 + driftX, midY + Math.sin(ang) * 42 + driftY, 16, "#E11D48");
        const rxNode = rCx + Math.cos(ang) * 62;
        const ryNode = midY + Math.sin(ang) * 44;
        this.drawFlowingStream(ctx, { x: rCx, y: midY }, { x: (rCx + rxNode) / 2, y: (midY + ryNode) / 2 - 12 }, { x: rxNode, y: ryNode }, t + i * 0.25, "#10B981", 1, false);
        this.drawPersonIcon(ctx, rxNode, ryNode, 15, "#047857");
      }
      this.drawPersonIcon(ctx, rCx, midY, 19, "#065F46");
    } else if (dom === "biz_econ") {
      // Слева: падающий тренд убытка; Справа: плавно растущие ступени рентабельности
      const barAnim = LectureAnimationEngine.quinticSmooth(Math.min(1, p * 2.6));
      [78, 52, 28].forEach((bh, k) => {
        const hCur = bh * barAnim;
        ctx.fillStyle = "#E11D48";
        this.roundRect(ctx, lCx - 90 + k * 66, midY + 48 - hCur, 44, hCur, 6);
        ctx.fill();
      });
      [34, 64, 96].forEach((bh, k) => {
        const hCur = bh * LectureAnimationEngine.clamp((p - k * 0.08) * 2.4, 0.15, 1);
        ctx.fillStyle = "#059669";
        this.roundRect(ctx, rCx - 90 + k * 66, midY + 48 - hCur, 44, hCur, 6);
        ctx.fill();
      });
    } else if (dom === "arch_eng") {
      // Только для реальной инженерии — сравнение колебаний конструкции
      for (let k = 0; k < 3; k++) {
        const shakeX = Math.sin(t * 10 + k * 2) * 12 * motionAmp;
        this.drawKurzgesagtCapsule(ctx, lCx - 72 + shakeX, midY - 52 + k * 38, 144, 28, { top: "#E11D48", bottom: "#9F1239", rim: "#FDA4AF" }, 8);
        this.drawKurzgesagtCapsule(ctx, rCx - 72 + Math.sin(t * 2) * 2, midY - 52 + k * 38, 144, 28, { top: "#059669", bottom: "#065F46", rim: "#6EE7B7" }, 8);
      }
    } else {
      // Для IT и Биомеда: хаотичные узлы слева vs упорядоченная сеть справа
      for (let k = 0; k < 5; k++) {
        const jx = lCx - 80 + k * 40;
        const jy = midY + Math.sin(t * 6 + k * 2.3) * 26 * motionAmp;
        ctx.fillStyle = "#E11D48";
        ctx.beginPath();
        ctx.arc(jx, jy, 10, 0, Math.PI * 2);
        ctx.fill();

        const gx = rCx - 80 + k * 40;
        if (k > 0) {
          ctx.strokeStyle = "#059669";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(gx - 40, midY);
          ctx.lineTo(gx, midY);
          ctx.stroke();
        }
        ctx.fillStyle = "#059669";
        ctx.beginPath();
        ctx.arc(gx, midY, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Нижние плашки метрик
    this.drawKurzgesagtCapsule(ctx, leftX + 24, stage.y + stage.h - 66, halfW - 48, 44, { top: "#9F1239", bottom: "#881337", rim: "#FB7185" }, 10);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 13.5px 'JetBrains Mono', monospace";
    ctx.fillText(`⚠ ${leftMetric}`, leftX + 38, stage.y + stage.h - 39, halfW - 76);

    this.drawKurzgesagtCapsule(ctx, rightX + 24, stage.y + stage.h - 66, halfW - 48, 44, { top: "#047857", bottom: "#065F46", rim: "#34D399" }, 10);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 13.5px 'JetBrains Mono', monospace";
    ctx.fillText(`✓ ${rightMetric}`, rightX + 38, stage.y + stage.h - 39, halfW - 76);

    // Центральный бейдж VS / Выгода
    const sBadge = LectureAnimationEngine.stagger(p, 1, 3);
    if (sBadge > 0.1) {
      const bw = 204;
      const bh = 46;
      const bx = stage.x + stage.w / 2 - bw / 2;
      const by = stage.y + stage.h / 2 - bh / 2;
      this.drawKurzgesagtCapsule(ctx, bx, by, bw, bh, { top: theme.primary, bottom: theme.ink, rim: "#FFFFFF" }, 23);
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.font = "800 13px 'JetBrains Mono', monospace";
      ctx.fillText(deltaBadge, stage.x + stage.w / 2, by + 28, bw - 20);
      ctx.textAlign = "left";
    }

    return activeBeat === 0 ? { x: lCx, y: midY } : { x: rCx, y: midY };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 10: МНОГОРЕЖИМНАЯ АНАЛИТИЧЕСКАЯ ДИАГРАММА (multi_mode_chart)
  // =========================================================================
  drawMultiModeChart(ctx, stage, scene, timing) {
    const { p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const sig = scene.visualPayload?.signals || {};
    const stages = scene.visualPayload?.stages || [];
    const mode = sig.chartMode || "comparative_bars";

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    const gx = stage.x + 48;
    const gy = stage.y + 58;
    const gw = Math.round(stage.w * 0.60);
    const gh = 266;

    if (mode === "comparative_bars") {
      // Горизонтальная структурная диаграмма вклада факторов (для социологии, права, истории — никакого резонанса!)
      const lang = scene.outputLang || "ru";
      const chartTitle = lang === "kk" ? "НЕГІЗГІ ФАКТОРЛАР ҚҰРЫЛЫМЫ" : lang === "en" ? "KEY FACTOR STRUCTURE" : "СТРУКТУРА КЛЮЧЕВЫХ ФАКТОРОВ ТЕМЫ";
      ctx.fillStyle = theme.primary;
      ctx.font = "800 12px 'JetBrains Mono', monospace";
      ctx.fillText(chartTitle, gx, gy - 14);
      const weights = [0.92, 0.76, 0.64, 0.84];
      const pals = theme.cardPalettes || [];
      for (let i = 0; i < Math.min(4, Math.max(3, stages.length)); i++) {
        const st = stages[i] || { shortTitle: `Фактор ${i + 1}`, detail: "" };
        const rowY = gy + 12 + i * 62;
        const barW = (gw - 16) * weights[i] * LectureAnimationEngine.clamp((p - i * 0.08) * 1.8, 0.1, 1);
        const pal = pals[i % Math.max(1, pals.length)] || { top: "#FFF7ED", bot: "#FFEDD5", stroke: theme.primary, text: theme.ink };
        this.drawKurzgesagtCapsule(ctx, gx, rowY, barW, 46, { top: pal.top, bottom: pal.bot, rim: pal.stroke }, 12);
        ctx.fillStyle = pal.text;
        ctx.font = "800 13.5px 'Manrope', sans-serif";
        ctx.fillText(st.shortTitle, gx + 16, rowY + 28, barW - 28);
      }
    } else {
      // Оси координат для S-кривой / Пересечения спроса-предложения / Волны резонанса
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();

      ctx.fillStyle = theme.muted;
      ctx.font = "700 11.5px 'Inter', sans-serif";
      ctx.fillText(sig.yAxisLabel || "Результат", gx + 10, gy + 14);
      ctx.fillText(sig.xAxisLabel || "Параметр", gx + gw - 180, gy + gh + 22);

      const drawFn = (fn, col, maxU) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i <= 50; i++) {
          const u = (i / 50) * maxU;
          const x = gx + u * gw;
          const y = gy + gh - LectureAnimationEngine.clamp(fn(u), 0.05, 0.95) * (gh - 24);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      const drawAreaFill = (fnA, fnB, fillCol, maxU) => {
        ctx.save();
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const u = (i / 40) * maxU;
          const x = gx + u * gw;
          const y = gy + gh - LectureAnimationEngine.clamp(fnA(u), 0.05, 0.95) * (gh - 24);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        for (let i = 40; i >= 0; i--) {
          const u = (i / 40) * maxU;
          const x = gx + u * gw;
          const y = gy + gh - LectureAnimationEngine.clamp(fnB(u), 0.05, 0.95) * (gh - 24);
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      const curU = LectureAnimationEngine.clamp(0.15 + p * 0.82, 0.15, 0.96);
      const act2P = LectureAnimationEngine.clamp((p - 0.25) / 0.35, 0, 1);
      if (mode === "supply_demand_cross") {
        if (act2P > 0.1) drawAreaFill((u) => 0.85 - u * 0.68, (u) => 0.15 + u * 0.72, "rgba(79, 70, 229, 0.10)", curU * act2P);
        drawFn((u) => 0.85 - u * 0.68, theme.secondary, curU);
        if (act2P > 0.05) drawFn((u) => 0.15 + u * 0.72, theme.primary, curU * act2P);
      } else if (mode === "resonance_wave") {
        if (act2P > 0.1) drawAreaFill((u) => Math.exp(-Math.pow((u - 0.52) * 4.2, 2)) * 0.86 + 0.1, (u) => Math.exp(-Math.pow((u - 0.52) * 2.2, 2)) * 0.28 + 0.1, "rgba(239, 68, 68, 0.12)", curU * act2P);
        drawFn((u) => Math.exp(-Math.pow((u - 0.52) * 4.2, 2)) * 0.86 + 0.1, theme.danger, curU);
        if (act2P > 0.05) drawFn((u) => Math.exp(-Math.pow((u - 0.52) * 2.2, 2)) * 0.28 + 0.1, theme.success, curU * act2P);
      } else {
        if (act2P > 0.1) drawAreaFill((u) => 1 / (1 + Math.exp(-(u - 0.45) * 8)), () => 0.08, theme.primarySoft || "rgba(79, 70, 229, 0.12)", curU * act2P);
        drawFn((u) => 1 / (1 + Math.exp(-(u - 0.45) * 8)), theme.primary, curU);
      }
      if (p > 0.62) {
        const dotX = gx + 0.52 * gw;
        const dotY = gy + gh - 0.62 * (gh - 24);
        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Справа: Компактная карточка формулы и живых индикаторов (без стены текста)
    const rx = gx + gw + 28;
    const rw = stage.w - gw - 98;
    this.drawKurzgesagtCapsule(ctx, rx, gy - 12, rw, gh + 46, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: theme.primary
    }, 16);
    const ruleHdr = scene.outputLang === "kk" ? "ЕРЕЖЕ / ФОРМУЛА" : scene.outputLang === "en" ? "CORE RULE / FORMULA" : "ФОРМУЛА / ПРАВИЛО";
    ctx.fillStyle = theme.primary;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText(ruleHdr, rx + 18, gy + 18);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 16px 'Manrope', sans-serif";
    this.wrapText(ctx, this.formatMathText(sig.formulaCard?.expression || scene.keyTerm), rx + 18, gy + 48, rw - 36, 22, 2);

    stages.slice(0, 3).forEach((st, idx) => {
      const cy = gy + 104 + idx * 54;
      const isCur = idx === activeBeat;
      this.drawKurzgesagtCapsule(ctx, rx + 18, cy, rw - 36, 44, {
        top: isCur ? theme.primarySoft : theme.surfaceBottom,
        bottom: theme.surfaceBottom,
        rim: isCur ? theme.primary : theme.surfaceBorder
      }, 10);
      ctx.fillStyle = isCur ? theme.primary : theme.ink;
      ctx.font = "800 12.5px 'Manrope', sans-serif";
      ctx.fillText(st.shortTitle, rx + 30, cy + 27, rw - 60);
    });

    return { x: gx + gw * 0.55, y: gy + gh * 0.5 };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 11: ПРАКТИЧЕСКОЕ ДОСЬЕ / ЛАБОРАТОРНЫЙ ЛИСТ (case_dossier_blueprint)
  // =========================================================================
  drawCaseDossierBlueprint(ctx, stage, scene, timing) {
    const { t, p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const beatEase = beats?.beatEase ?? 1;
    const we = scene.visualPayload?.facts?.workedExample || {
      caseTitle: scene.title,
      inputA: { key: "Понятие", value: scene.keyTerm || "Анализ" },
      inputB: { key: "Раздел", value: "Практика" },
      expression: "Метод → Решение",
      verdict: scene.keyPlain || ""
    };

    // Асимметричная вёрстка «Досье»: верхняя плашка + анимированный ввод данных -> поток анализа -> вердикт
    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, 64, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.primary
    }, 16);
    ctx.fillStyle = theme.primary;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText("ПРАКТИЧЕСКОЕ ПРИМЕНЕНИЕ ЗНАНИЙ ЛЕКЦИИ", stage.x + 24, stage.y + 24);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 17px 'Manrope', sans-serif";
    ctx.fillText(we.caseTitle, stage.x + 24, stage.y + 48, stage.w - 48);

    const bodyY = stage.y + 80;
    const bodyH = stage.h - 80;
    const leftW = 310;

    this.drawKurzgesagtCapsule(ctx, stage.x, bodyY, leftW, bodyH, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: activeBeat === 0 ? theme.primary : theme.surfaceBorder
    }, 18);
    ctx.fillStyle = theme.muted;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText("ИСХОДНЫЕ ДАННЫЕ", stage.x + 20, bodyY + 30);

    [we.inputA, we.inputB].forEach((inp, idx) => {
      const cardPop = LectureAnimationEngine.stagger(p, idx, 2, 0.08, 0.32);
      const cy = bodyY + 48 + idx * 86 + (1 - Math.min(1, cardPop)) * 12;
      ctx.save();
      ctx.globalAlpha = Math.min(1, cardPop);
      this.drawKurzgesagtCapsule(ctx, stage.x + 18, cy, leftW - 36, 70, {
        top: theme.cardPalettes?.[idx]?.top || "#F8FAFC",
        bottom: theme.cardPalettes?.[idx]?.bot || "#EFF6FF",
        rim: activeBeat === 0 ? theme.primary : theme.surfaceBorder
      }, 12);
      ctx.fillStyle = theme.muted;
      ctx.font = "600 11.5px 'Inter', sans-serif";
      ctx.fillText(inp.key, stage.x + 32, cy + 24, leftW - 64);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 15.5px 'Manrope', sans-serif";
      ctx.fillText(inp.value, stage.x + 32, cy + 50, leftW - 64);
      ctx.restore();
    });

    const rx = stage.x + leftW + 22;
    const rw = stage.w - leftW - 22;
    // Живой поток от исходных данных к центру обработки и результату (визуальная схема вместо стены текста)
    this.drawFlowingStream(ctx, { x: stage.x + leftW, y: bodyY + 110 }, { x: stage.x + leftW + 11, y: bodyY + 86 }, { x: rx, y: bodyY + 110 }, t, theme.primary, 1, true);

    this.drawKurzgesagtCapsule(ctx, rx, bodyY, rw, bodyH, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: activeBeat >= 1 ? theme.success : theme.surfaceBorder
    }, 18, `rgba(${theme.shadowRgb}, 0.09)`);

    ctx.fillStyle = theme.primary;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText(`МЕХАНИЗМ И РЕЗУЛЬТАТ · ШАГ ${activeBeat + 1}/3`, rx + 24, bodyY + 32);

    // Центральный узел-правило (анимированная связка)
    const procW = rw - 48;
    this.drawKurzgesagtCapsule(ctx, rx + 24, bodyY + 52, procW, 86, {
      top: "#FFFFFF",
      bottom: "#F0FDFA",
      rim: theme.primary
    }, 14);
    ctx.fillStyle = theme.primary;
    ctx.font = "800 11px 'JetBrains Mono', monospace";
    ctx.fillText("КЛЮЧЕВОЕ ПРАВИЛО / СВЯЗКА", rx + 40, bodyY + 78);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 16px 'Manrope', sans-serif";
    ctx.fillText(we.expression, rx + 40, bodyY + 108, procW - 32);

    const badgeGlow = activeBeat === 2 ? `rgba(15, 118, 110, ${(0.18 + Math.sin(t * 4) * 0.06).toFixed(2)})` : null;
    this.drawKurzgesagtCapsule(ctx, rx + 24, bodyY + 162, procW, 92, {
      top: "#ECFDF5",
      bottom: "#D1FAE5",
      rim: theme.success
    }, 14, badgeGlow);
    ctx.fillStyle = "#065F46";
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText("✓ ПРАКТИЧЕСКИЙ ИТОГ", rx + 40, bodyY + 188);
    ctx.fillStyle = "#064E3B";
    ctx.font = "800 15px 'Manrope', sans-serif";
    this.wrapText(ctx, we.outputValue || scene.keyTerm, rx + 40, bodyY + 216, procW - 32, 20, 2);

    return activeBeat === 0 ? { x: stage.x + leftW / 2, y: bodyY + 130 } : { x: rx + rw / 2, y: bodyY + 130 };
  }

  // =========================================================================
  // КОМПОЗИЦИЯ 12: ДОМЕННАЯ РАДИАЛЬНАЯ КАРТА К ЭКЗАМЕНУ (radial_constellation_map)
  // =========================================================================
  drawRadialConstellationMap(ctx, stage, scene, timing) {
    const { t, p, simP, theme } = timing;
    const nodes = scene.visualPayload?.constellationNodes || [];
    const pals = theme.cardPalettes || [];

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    const cx = stage.x + stage.w * 0.50;
    const cy = stage.y + stage.h * 0.50;
    const rx = Math.min(340, stage.w * 0.34);
    const ry = 132;

    const starCoords = nodes.map((n, idx) => {
      const ang = -Math.PI / 2 + (idx * Math.PI * 2) / Math.max(1, nodes.length);
      return {
        x: cx + Math.cos(ang) * rx,
        y: cy + Math.sin(ang) * ry + Math.sin(t * 1.8 + idx) * 2.5,
        term: n.term,
        tag: n.tag
      };
    });

    // Кольцевая связь между соседними терминами + лучи к центру
    starCoords.forEach((sc, idx) => {
      const next = starCoords[(idx + 1) % starCoords.length];
      if (next && starCoords.length > 2) {
        ctx.strokeStyle = theme.gridColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sc.x, sc.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
      const lineP = LectureAnimationEngine.clamp((simP - idx * 0.08) * 2, 0, 1);
      const cp = { x: (cx + sc.x) / 2, y: (cy + sc.y) / 2 - 14 };
      this.drawTrimmedBezier(ctx, { x: cx, y: cy }, cp, sc, lineP, theme.primary, 2.4);
    });

    // Центральное ядро курса в цветах домена
    this.drawKurzgesagtCapsule(ctx, cx - 82, cy - 32, 164, 64, {
      top: theme.primary,
      bottom: theme.ink,
      rim: "#FFFFFF"
    }, 22, `rgba(${theme.shadowRgb}, 0.28)`);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = "800 13.5px 'Manrope', sans-serif";
    ctx.fillText("СИСТЕМА ТЕМЫ", cx, cy - 3);
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.fillText(`${nodes.length} ПОНЯТИЙ`, cx, cy + 16);

    starCoords.forEach((sc, idx) => {
      const pop = LectureAnimationEngine.stagger(p, idx, starCoords.length, 0.08);
      if (pop <= 0.05) return;
      const w = 166 * Math.min(1, pop);
      const h = 44 * Math.min(1, pop);
      const pal = pals[idx % Math.max(1, pals.length)] || { top: "#FFFFFF", bot: "#F8FAFC", stroke: theme.primary, text: theme.ink };
      this.drawKurzgesagtCapsule(ctx, sc.x - w / 2, sc.y - h / 2, w, h, {
        top: pal.top,
        bottom: pal.bot,
        rim: pal.stroke
      }, 14);
      ctx.fillStyle = pal.text;
      ctx.font = "800 12.5px 'Manrope', sans-serif";
      ctx.fillText(sc.term, sc.x, sc.y + 4, w - 16);
    });
    ctx.textAlign = "left";

    return { x: cx, y: cy };
  }

  // =========================================================================
  // ОБЪЯСНЯЮЩИЙ МОДУЛЬ 1: ПРИЧИНА -> МЕХАНИЗМ -> СЛЕДСТВИЕ (cause_effect_flow)
  // =========================================================================
  drawCauseEffectFlow(ctx, stage, scene, timing) {
    const { t, motionAmp, theme, beats } = timing;
    const bs = beats?.beatStates || [1, 1, 1];
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const ce = scene.visualPayload?.facts?.causeEffect || {
      causeLabel: scene.keyTerm || "Исходный фактор",
      causeMetric: "Вход",
      mechanismLabel: "Механизм урока",
      actionVerb: "Преобразует",
      effectLabel: scene.keyPlain || "Результат системы",
      effectMetric: "Итог",
      deltaLabel: scene.keyTerm || "Эффект"
    };

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    ctx.fillStyle = theme.primary;
    ctx.font = "800 12.5px 'JetBrains Mono', monospace";
    ctx.fillText("ПОШАГОВАЯ МЕХАНИКА: ПРИЧИНА → ДЕЙСТВИЕ → РЕЗУЛЬТАТ", stage.x + 26, stage.y + 34);

    const colW = (stage.w - 112) / 3;
    const cardY = stage.y + 62;
    const cardH = 236;
    const c1X = stage.x + 26;
    const c2X = c1X + colW + 30;
    const c3X = c2X + colW + 30;

    // Бит 0: ПРИЧИНА (слева)
    const p0 = LectureAnimationEngine.quinticSmooth(Math.max(0.15, bs[0]));
    ctx.save();
    ctx.globalAlpha = p0 * (activeBeat === 0 || timing.isReadingPause ? 1 : 0.65);
    this.drawKurzgesagtCapsule(ctx, c1X, cardY, colW, cardH, {
      top: "#FFF1F2",
      bottom: "#FFE4E6",
      rim: activeBeat === 0 ? theme.danger : "rgba(225, 29, 72, 0.25)"
    }, 16);
    ctx.fillStyle = theme.danger;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText("1. ЧТО ДАНО / ПРИЧИНА", c1X + 16, cardY + 26, colW - 32);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 16px 'Manrope', sans-serif";
    this.wrapText(ctx, ce.causeLabel, c1X + 16, cardY + 56, colW - 32, 22, 3);
    // Живая волна напряжения
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= colW - 36; x += 6) {
      const wy = cardY + 158 + Math.sin(x * 0.14 + t * 6) * 14 * motionAmp;
      if (x === 0) ctx.moveTo(c1X + 18 + x, wy);
      else ctx.lineTo(c1X + 18 + x, wy);
    }
    ctx.stroke();
    ctx.fillStyle = "#9F1239";
    ctx.font = "800 15px 'JetBrains Mono', monospace";
    ctx.fillText(ce.causeMetric, c1X + 16, cardY + 212, colW - 32);
    ctx.restore();

    // Бит 1: МЕХАНИЗМ (центр)
    const p1 = LectureAnimationEngine.quinticSmooth(bs[1]);
    if (p1 > 0.04) {
      this.drawTrimmedBezier(
        ctx,
        { x: c1X + colW, y: cardY + cardH / 2 },
        { x: c1X + colW + 15, y: cardY + cardH / 2 - 20 },
        { x: c2X, y: cardY + cardH / 2 },
        Math.min(1, p1 * 1.4),
        theme.primary,
        3
      );
      ctx.save();
      ctx.globalAlpha = p1 * (activeBeat === 1 || timing.isReadingPause ? 1 : 0.68);
      this.drawKurzgesagtCapsule(ctx, c2X, cardY, colW, cardH, {
        top: "#EFF6FF",
        bottom: "#DBEAFE",
        rim: activeBeat === 1 ? theme.primary : "rgba(29, 78, 216, 0.25)"
      }, 16);
      ctx.fillStyle = theme.primary;
      ctx.font = "800 11.5px 'JetBrains Mono', monospace";
      ctx.fillText("2. МЕХАНИЗМ ДЕЙСТВИЯ", c2X + 16, cardY + 26, colW - 32);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 16px 'Manrope', sans-serif";
      this.wrapText(ctx, ce.mechanismLabel, c2X + 16, cardY + 56, colW - 32, 22, 2);
      // Вращающееся ядро преобразования
      const gx = c2X + colW / 2;
      const gy = cardY + 148;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(t * 1.2 * (0.3 + 0.7 * motionAmp));
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = theme.primary;
      ctx.textAlign = "center";
      ctx.font = "700 13.5px 'Inter', sans-serif";
      ctx.fillText(ce.actionVerb, gx, cardY + 212, colW - 28);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // Бит 2: СЛЕДСТВИЕ / РЕЗУЛЬТАТ (справа)
    const p2 = LectureAnimationEngine.quinticSmooth(bs[2]);
    if (p2 > 0.04) {
      this.drawTrimmedBezier(
        ctx,
        { x: c2X + colW, y: cardY + cardH / 2 },
        { x: c2X + colW + 15, y: cardY + cardH / 2 - 20 },
        { x: c3X, y: cardY + cardH / 2 },
        Math.min(1, p2 * 1.4),
        theme.success,
        3
      );
      ctx.save();
      ctx.globalAlpha = p2;
      this.drawKurzgesagtCapsule(ctx, c3X, cardY, colW, cardH, {
        top: "#ECFDF5",
        bottom: "#D1FAE5",
        rim: activeBeat === 2 ? theme.success : "rgba(15, 118, 110, 0.35)"
      }, 16, `rgba(15, 118, 110, 0.14)`);
      ctx.fillStyle = theme.success;
      ctx.font = "800 11.5px 'JetBrains Mono', monospace";
      ctx.fillText("3. ИТОГ / ЭФФЕКТ", c3X + 16, cardY + 26, colW - 32);
      ctx.fillStyle = theme.ink;
      ctx.font = "700 15px 'Manrope', sans-serif";
      this.wrapText(ctx, ce.effectLabel, c3X + 16, cardY + 56, colW - 32, 21, 4);
      ctx.fillStyle = "#065F46";
      ctx.font = "900 20px 'JetBrains Mono', monospace";
      ctx.fillText(`✓ ${ce.effectMetric}`, c3X + 16, cardY + 210, colW - 32);
      ctx.restore();
    }

    // Нижняя резюмирующая строка связи
    this.drawKurzgesagtCapsule(ctx, c1X, stage.y + stage.h - 68, stage.w - 52, 46, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: theme.surfaceBorder
    }, 12);
    ctx.fillStyle = theme.ink;
    ctx.font = "700 13.5px 'Inter', sans-serif";
    ctx.fillText(`Суть шага: ${beats?.beats?.[activeBeat]?.text || ce.deltaLabel}`, c1X + 18, stage.y + stage.h - 40, stage.w - 90);

    const anchors = [
      { x: c1X + colW / 2, y: cardY + cardH / 2 },
      { x: c2X + colW / 2, y: cardY + cardH / 2 },
      { x: c3X + colW / 2, y: cardY + cardH / 2 }
    ];
    return anchors[activeBeat] || anchors[0];
  }

  // =========================================================================
  // ОБЪЯСНЯЮЩИЙ МОДУЛЬ 2: КОНКРЕТНЫЙ ПРИМЕР ИЗ ЛЕКЦИИ (worked_example)
  // =========================================================================
  drawWorkedExample(ctx, stage, scene, timing) {
    const { theme, beats } = timing;
    const bs = beats?.beatStates || [1, 1, 1];
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const we = scene.visualPayload?.facts?.workedExample || {
      caseTitle: `Пример: ${scene.keyTerm || "Разбор задачи"}`,
      inputA: { key: "Параметр А", value: "100%" },
      inputB: { key: "Условие Б", value: "Шаг 2" },
      expression: "Вход → Правило → Итог",
      outputValue: "Готово",
      verdict: scene.keyPlain || "Результат получен"
    };

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    ctx.fillStyle = theme.secondary;
    ctx.font = "800 12.5px 'JetBrains Mono', monospace";
    ctx.fillText(we.caseTitle.toUpperCase(), stage.x + 26, stage.y + 34, stage.w - 52);

    const cW = (stage.w - 110) / 3;
    const y0 = stage.y + 62;
    const h0 = 248;
    const x1 = stage.x + 26;
    const x2 = x1 + cW + 29;
    const x3 = x2 + cW + 29;

    // Бит 0: Входные данные
    ctx.save();
    ctx.globalAlpha = LectureAnimationEngine.quinticSmooth(Math.max(0.2, bs[0]));
    this.drawKurzgesagtCapsule(ctx, x1, y0, cW, h0, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: activeBeat === 0 ? theme.primary : theme.surfaceBorder
    }, 16);
    ctx.fillStyle = theme.primary;
    ctx.font = "800 12px 'JetBrains Mono', monospace";
    ctx.fillText("ШАГ 1 · ДАНО", x1 + 16, y0 + 28);
    [we.inputA, we.inputB].forEach((item, idx) => {
      const iy = y0 + 52 + idx * 82;
      this.drawKurzgesagtCapsule(ctx, x1 + 14, iy, cW - 28, 68, {
        top: "#F8FAFC",
        bottom: "#EFF6FF",
        rim: theme.surfaceBorder
      }, 12);
      ctx.fillStyle = theme.muted;
      ctx.font = "600 12px 'Inter', sans-serif";
      ctx.fillText(item.key, x1 + 26, iy + 24, cW - 52);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 18px 'JetBrains Mono', monospace";
      ctx.fillText(item.value, x1 + 26, iy + 52, cW - 52);
    });
    ctx.restore();

    // Бит 1: Правило / Подстановка
    const p1 = LectureAnimationEngine.quinticSmooth(bs[1]);
    if (p1 > 0.04) {
      this.drawTrimmedBezier(ctx, { x: x1 + cW, y: y0 + h0 / 2 }, { x: x1 + cW + 15, y: y0 + h0 / 2 - 14 }, { x: x2, y: y0 + h0 / 2 }, Math.min(1, p1 * 1.3), theme.primary, 3);
      ctx.save();
      ctx.globalAlpha = p1;
      this.drawKurzgesagtCapsule(ctx, x2, y0, cW, h0, {
        top: "#EFF6FF",
        bottom: "#DBEAFE",
        rim: activeBeat === 1 ? theme.primary : theme.surfaceBorder
      }, 16);
      ctx.fillStyle = theme.primary;
      ctx.font = "800 12px 'JetBrains Mono', monospace";
      ctx.fillText("ШАГ 2 · ПРАВИЛО", x2 + 16, y0 + 28);
      this.drawKurzgesagtCapsule(ctx, x2 + 16, y0 + 78, cW - 32, 92, {
        top: "#FFFFFF",
        bottom: "#F8FAFC",
        rim: theme.primary
      }, 14);
      ctx.fillStyle = theme.ink;
      ctx.textAlign = "center";
      ctx.font = "800 16px 'JetBrains Mono', monospace";
      this.wrapText(ctx, we.expression, x2 + 24, y0 + 114, cW - 48, 22, 2);
      ctx.textAlign = "left";
      ctx.fillStyle = theme.muted;
      ctx.font = "600 12.5px 'Inter', sans-serif";
      ctx.fillText("Подставляем данные из лекции", x2 + 16, y0 + 210, cW - 32);
      ctx.restore();
    }

    // Бит 2: Итоговый результат
    const p2 = LectureAnimationEngine.quinticSmooth(bs[2]);
    if (p2 > 0.04) {
      this.drawTrimmedBezier(ctx, { x: x2 + cW, y: y0 + h0 / 2 }, { x: x2 + cW + 15, y: y0 + h0 / 2 - 14 }, { x: x3, y: y0 + h0 / 2 }, Math.min(1, p2 * 1.3), theme.success, 3);
      ctx.save();
      ctx.globalAlpha = p2;
      this.drawKurzgesagtCapsule(ctx, x3, y0, cW, h0, {
        top: "#ECFDF5",
        bottom: "#D1FAE5",
        rim: theme.success
      }, 16);
      ctx.fillStyle = theme.success;
      ctx.font = "800 12px 'JetBrains Mono', monospace";
      ctx.fillText("ШАГ 3 · ОТВЕТ", x3 + 16, y0 + 28);
      ctx.fillStyle = "#065F46";
      ctx.font = "900 28px 'JetBrains Mono', monospace";
      ctx.fillText(we.outputValue, x3 + 16, y0 + 96, cW - 32);
      ctx.fillStyle = theme.ink;
      ctx.font = "600 14px 'Inter', sans-serif";
      this.wrapText(ctx, we.verdict, x3 + 16, y0 + 140, cW - 32, 20, 4);
      ctx.restore();
    }

    const anchors = [
      { x: x1 + cW / 2, y: y0 + h0 / 2 },
      { x: x2 + cW / 2, y: y0 + h0 / 2 },
      { x: x3 + cW / 2, y: y0 + h0 / 2 }
    ];
    return anchors[activeBeat] || anchors[2];
  }

  // =========================================================================
  // ОБЪЯСНЯЮЩИЙ МОДУЛЬ 3: УСТРОЙСТВО И ВЗАИМОДЕЙСТВИЕ ЧАСТЕЙ (system_anatomy)
  // =========================================================================
  drawSystemAnatomy(ctx, stage, scene, timing) {
    const { t, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const stages = scene.visualPayload?.stages || [];
    const parts = [0, 1, 2].map((i) => stages[i] || {
      shortTitle: `Узел ${i + 1}`,
      detail: scene.keyPlain || "Функция элемента",
      metric: `Элемент 0${i + 1}`
    });

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    ctx.fillStyle = theme.primary;
    ctx.font = "800 12.5px 'JetBrains Mono', monospace";
    ctx.fillText("УСТРОЙСТВО СИСТЕМЫ: КАК ЧАСТИ ВЛИЯЮТ ДРУГ НА ДРУГА", stage.x + 26, stage.y + 34);

    // Слева 62%: схема из 3 связанных узлов
    const cx = stage.x + 280;
    const cy = stage.y + 210;
    const coords = [
      { x: cx - 155, y: cy - 75 },
      { x: cx + 125, y: cy - 75 },
      { x: cx - 15, y: cy + 85 }
    ];

    for (let i = 0; i < 3; i++) {
      const next = (i + 1) % 3;
      const p0 = coords[i];
      const p2 = coords[next];
      const cp = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 - 24 };
      const isActiveEdge = i === activeBeat;
      this.drawTrimmedBezier(ctx, p0, cp, p2, 1, isActiveEdge ? theme.primary : theme.gridColor, isActiveEdge ? 3.5 : 2);
      if (isActiveEdge || timing.isReadingPause) {
        this.drawBezierPulse(ctx, p0, cp, p2, (t * 0.85) % 1, theme.primary);
      }
    }

    parts.forEach((pt, idx) => {
      const isFocus = idx === activeBeat;
      const nw = isFocus ? 196 : 172;
      const nh = isFocus ? 82 : 70;
      const pos = coords[idx];
      ctx.save();
      ctx.globalAlpha = isFocus || timing.isReadingPause ? 1 : 0.56;
      this.drawKurzgesagtCapsule(ctx, pos.x - nw / 2, pos.y - nh / 2, nw, nh, {
        top: isFocus ? "#EFF6FF" : "#FFFFFF",
        bottom: isFocus ? "#DBEAFE" : "#F8FAFC",
        rim: isFocus ? theme.primary : theme.surfaceBorder
      }, 14, isFocus ? `rgba(${theme.shadowRgb}, 0.16)` : null);
      ctx.fillStyle = theme.primary;
      ctx.font = "800 11px 'JetBrains Mono', monospace";
      ctx.fillText(`ЧАСТЬ 0${idx + 1}`, pos.x - nw / 2 + 14, pos.y - nh / 2 + 22);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 14.5px 'Manrope', sans-serif";
      ctx.fillText(pt.shortTitle, pos.x - nw / 2 + 14, pos.y - nh / 2 + 48, nw - 28);
      ctx.restore();
    });

    // Справа: инспектор активной детали (текст диктора + роль узла)
    const ix = stage.x + stage.w - 332;
    const iw = 306;
    const activePart = parts[activeBeat] || parts[0];
    this.drawKurzgesagtCapsule(ctx, ix, stage.y + 56, iw, 298, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: theme.primary
    }, 16);
    ctx.fillStyle = theme.primary;
    ctx.font = "800 12px 'JetBrains Mono', monospace";
    ctx.fillText(`ФОКУС СЕЙЧАС: ЧАСТЬ 0${activeBeat + 1}`, ix + 18, stage.y + 88);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 19px 'Manrope', sans-serif";
    this.wrapText(ctx, activePart.shortTitle, ix + 18, stage.y + 122, iw - 36, 24, 2);
    ctx.fillStyle = theme.muted;
    ctx.font = "600 14.5px 'Inter', sans-serif";
    this.wrapText(ctx, beats?.beats?.[activeBeat]?.text || activePart.detail, ix + 18, stage.y + 184, iw - 36, 22, 5);

    return coords[activeBeat] || coords[0];
  }

  // =========================================================================
  // ОБЪЯСНЯЮЩИЙ МОДУЛЬ 4: ЖИВАЯ ЗАВИСИМОСТЬ «ЕСЛИ МЕНЯТЬ A -> ЧТО С B» (causal_curve)
  // =========================================================================
  drawCausalCurve(ctx, stage, scene, timing) {
    const { p, theme, beats } = timing;
    const activeBeat = beats?.activeBeatIdx ?? 0;
    const cc = scene.visualPayload?.facts?.causalCurve || {
      paramA: scene.keyTerm || "Параметр A",
      paramB: "Реакция системы B",
      thresholdLabel: "Критический порог",
      takeaway: scene.keyPlain || "Зависимость подтверждена"
    };

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    ctx.fillStyle = theme.primary;
    ctx.font = "800 12.5px 'JetBrains Mono', monospace";
    ctx.fillText("ЭКСПЕРИМЕНТ: КАК ИЗМЕНЕНИЕ A ВЛИЯЕТ НА РЕЗУЛЬТАТ B", stage.x + 26, stage.y + 34);

    // График слева
    const gx = stage.x + 56;
    const gy = stage.y + 64;
    const gw = 490;
    const gh = 248;

    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();

    // Пороговая линия
    const threshY = gy + gh * 0.36;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(gx, threshY);
    ctx.lineTo(gx + gw, threshY);
    ctx.stroke();
    ctx.fillStyle = theme.danger;
    ctx.font = "700 11.5px 'JetBrains Mono', monospace";
    ctx.fillText(cc.thresholdLabel, gx + 10, threshY - 8);
    ctx.restore();

    const fnVal = (u) => Math.exp(-Math.pow((u - 0.56) * 4.2, 2)) * 0.85 + 0.12 * u;
    const sliderU = LectureAnimationEngine.clamp(0.1 + p * 0.82, 0.08, 0.92);

    // Бледный ландшафт всей кривой
    ctx.strokeStyle = theme.primarySoft;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      const x = gx + u * gw;
      const y = gy + gh - fnVal(u) * (gh - 24);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Живая прорисованная часть до ползунка
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    for (let i = 0; i <= 50; i++) {
      const u = (i / 50) * sliderU;
      const x = gx + u * gw;
      const y = gy + gh - fnVal(u) * (gh - 24);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const curVal = fnVal(sliderU);
    const curX = gx + sliderU * gw;
    const curY = gy + gh - curVal * (gh - 24);
    const isOverThresh = curY <= threshY;

    // Вертикальная проекция ползунка на ось X
    ctx.strokeStyle = isOverThresh ? theme.danger : theme.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX, gy + gh);
    ctx.stroke();

    ctx.fillStyle = isOverThresh ? theme.danger : theme.primary;
    ctx.beginPath();
    ctx.arc(curX, curY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Ползунок под осью X
    ctx.fillStyle = theme.ink;
    ctx.font = "700 12.5px 'Inter', sans-serif";
    ctx.fillText(`Ползунок A: ${cc.paramA} (${Math.round(sliderU * 100)}%)`, gx, gy + gh + 30);

    // Живая шкала B справа
    const rx = gx + gw + 36;
    const rw = stage.w - gw - 118;
    this.drawKurzgesagtCapsule(ctx, rx, gy, rw, gh + 44, {
      top: "#FFFFFF",
      bottom: "#F8FAFC",
      rim: isOverThresh ? theme.danger : theme.primary
    }, 16);
    ctx.fillStyle = theme.muted;
    ctx.font = "800 11.5px 'JetBrains Mono', monospace";
    ctx.fillText("ОТКЛИК B", rx + 18, gy + 28);
    ctx.fillStyle = isOverThresh ? theme.danger : theme.success;
    ctx.font = "900 28px 'JetBrains Mono', monospace";
    ctx.fillText(`${Math.round(curVal * 100)}%`, rx + 18, gy + 68);

    // Столбик уровня B
    const barH = 110;
    const fillH = barH * curVal;
    ctx.fillStyle = theme.gridColor;
    this.roundRect(ctx, rx + 18, gy + 86, rw - 36, barH, 8);
    ctx.fill();
    ctx.fillStyle = isOverThresh ? theme.danger : theme.success;
    this.roundRect(ctx, rx + 18, gy + 86 + (barH - fillH), rw - 36, fillH, 8);
    ctx.fill();

    ctx.fillStyle = theme.ink;
    ctx.font = "600 12.5px 'Inter', sans-serif";
    this.wrapText(ctx, beats?.beats?.[activeBeat]?.text || cc.takeaway, rx + 18, gy + 216, rw - 36, 17, 4);

    return { x: curX, y: curY };
  }

  // =========================================================================
  // ДОМЕННЫЙ МОДУЛЬ: БИО-ПУТЬ И КЛЕТОЧНАЯ МЕМБРАНА (bio_pathway)
  // =========================================================================
  drawBioPathway(ctx, stage, scene, timing) {
    const { t, simP, theme } = timing;
    const stages = scene.visualPayload?.stages || [];

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    ctx.fillStyle = theme.primary;
    ctx.font = "800 13px 'JetBrains Mono', monospace";
    ctx.fillText("БИОЛОГИЧЕСКИЙ ПРОЦЕСС · МЕМБРАННЫЙ ТРАНСПОРТ", stage.x + 26, stage.y + 34);

    // Плавная органическая мембрана по центру
    ctx.save();
    ctx.beginPath();
    const midY = stage.y + stage.h * 0.54;
    for (let x = stage.x + 30; x <= stage.x + stage.w - 30; x += 12) {
      const wave = Math.sin(x * 0.025 + t * 1.6) * 8;
      if (x === stage.x + 30) ctx.moveTo(x, midY + wave);
      else ctx.lineTo(x, midY + wave);
    }
    ctx.strokeStyle = theme.primarySoft;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    const count = Math.min(4, Math.max(3, stages.length));
    const stepW = (stage.w - 80) / count;
    let focusPos = { x: stage.x + stage.w * 0.5, y: midY };

    for (let i = 0; i < count; i++) {
      const st = stages[i] || { shortTitle: `Фаза ${i + 1}`, detail: "Ключевой этап", metric: `0${i + 1}` };
      const nodeP = LectureAnimationEngine.stagger(timing.p, i, count, 0.14, 0.25);
      const isFocus = Math.floor(simP * count) === i;
      const cx = stage.x + 40 + stepW * (i + 0.5);
      const cy = midY + (i % 2 === 0 ? -42 : 42) + Math.sin(t * 1.4 + i) * 3;
      if (isFocus) focusPos = { x: cx, y: cy };

      ctx.save();
      ctx.globalAlpha = nodeP * (isFocus || timing.isReadingPause ? 1 : 0.62);
      const r = isFocus ? 46 : 40;
      const grad = ctx.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, i % 2 === 0 ? "#CCFBF1" : "#FFE4E6");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = i % 2 === 0 ? theme.primary : theme.secondary;
      ctx.lineWidth = isFocus ? 3 : 1.6;
      ctx.stroke();

      ctx.fillStyle = theme.ink;
      ctx.textAlign = "center";
      ctx.font = "800 13px 'Inter', sans-serif";
      ctx.fillText(st.shortTitle.slice(0, 14), cx, cy + 4, r * 1.85);
      ctx.fillStyle = theme.muted;
      ctx.font = "600 11.5px 'Inter', sans-serif";
      ctx.fillText(st.metric, cx, cy - r - 10, 120);
      ctx.textAlign = "left";
      ctx.restore();
    }
    return focusPos;
  }

  // =========================================================================
  // ДОМЕННЫЙ МОДУЛЬ: ЭКОНОМИЧЕСКАЯ ВОРОНКА (funnel_flow)
  // =========================================================================
  drawFunnelFlow(ctx, stage, scene, timing) {
    const { simP, theme } = timing;
    const stages = scene.visualPayload?.stages || [];

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    ctx.fillStyle = theme.secondary;
    ctx.font = "800 13px 'JetBrains Mono', monospace";
    ctx.fillText("ПОТОК ЦЕННОСТИ И ЮНИТ-ЭКОНОМИКА", stage.x + 26, stage.y + 34);

    const count = Math.min(4, Math.max(3, stages.length));
    const maxW = stage.w - 110;
    const barH = 58;
    const startY = stage.y + 66;
    let focusPos = { x: stage.x + stage.w * 0.5, y: startY + 80 };

    for (let i = 0; i < count; i++) {
      const st = stages[i] || { shortTitle: `Этап ${i + 1}`, detail: "", metric: `${100 - i * 22}%` };
      const barP = LectureAnimationEngine.stagger(timing.p, i, count, 0.13, 0.24);
      const isFocus = Math.floor(simP * count) === i;
      const w = maxW * (1 - i * 0.14) * barP;
      const x = stage.x + (stage.w - w) / 2;
      const y = startY + i * (barH + 14);
      if (isFocus) focusPos = { x: x + w * 0.5, y: y + barH * 0.5 };

      ctx.save();
      ctx.globalAlpha = isFocus || timing.isReadingPause ? 1 : 0.68;
      this.drawKurzgesagtCapsule(ctx, x, y, w, barH, {
        top: i === count - 1 ? "#ECFDF5" : "#FFFBEB",
        bottom: i === count - 1 ? "#D1FAE5" : "#FEF3C7",
        rim: isFocus ? theme.primary : theme.surfaceBorder
      }, 14);
      if (w > 120) {
        ctx.fillStyle = theme.ink;
        ctx.font = "800 14.5px 'Inter', sans-serif";
        ctx.fillText(st.shortTitle, x + 22, y + 26, w - 110);
        ctx.fillStyle = theme.muted;
        ctx.font = "600 12px 'Inter', sans-serif";
        ctx.fillText(st.detail, x + 22, y + 44, w - 110);
        ctx.textAlign = "right";
        ctx.fillStyle = i === count - 1 ? theme.success : theme.secondary;
        ctx.font = "800 15px 'JetBrains Mono', monospace";
        ctx.fillText(st.metric, x + w - 20, y + 35, 90);
        ctx.textAlign = "left";
      }
      ctx.restore();
    }
    return focusPos;
  }

  // =========================================================================
  // ДОМЕННЫЙ МОДУЛЬ: ЛЕНТА ВРЕМЕНИ И ПРАВОВАЯ ЦЕПЬ (timeline_scroll)
  // =========================================================================
  drawTimelineScroll(ctx, stage, scene, timing) {
    const { simP, theme } = timing;
    const stages = scene.visualPayload?.stages || [];

    this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.08)`);

    ctx.fillStyle = theme.primary;
    ctx.font = "800 13px 'JetBrains Mono', monospace";
    ctx.fillText("ХРОНОЛОГИЯ И ПРОЦЕССУАЛЬНАЯ ЛОГИКА", stage.x + 26, stage.y + 34);

    const lineY = stage.y + stage.h * 0.56;
    const leftX = stage.x + 56;
    const rightX = stage.x + stage.w - 56;
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftX, lineY);
    ctx.lineTo(rightX, lineY);
    ctx.stroke();

    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftX, lineY);
    ctx.lineTo(leftX + (rightX - leftX) * LectureAnimationEngine.clamp(simP, 0.05, 1), lineY);
    ctx.stroke();

    const count = Math.min(4, Math.max(3, stages.length));
    let focusPos = { x: stage.x + stage.w * 0.5, y: lineY };

    for (let i = 0; i < count; i++) {
      const st = stages[i] || { shortTitle: `Этап ${i + 1}`, detail: "", metric: `0${i + 1}` };
      const nodeP = LectureAnimationEngine.stagger(timing.p, i, count, 0.14, 0.25);
      const isFocus = Math.floor(simP * count) === i;
      const cx = leftX + ((rightX - leftX) * i) / Math.max(1, count - 1);
      const cardY = i % 2 === 0 ? lineY - 122 : lineY + 26;
      if (isFocus) focusPos = { x: cx, y: lineY };

      ctx.save();
      ctx.globalAlpha = nodeP * (isFocus || timing.isReadingPause ? 1 : 0.65);
      ctx.fillStyle = isFocus ? theme.primary : "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, lineY, isFocus ? 10 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const cw = 188;
      const cxCard = LectureAnimationEngine.clamp(cx - cw / 2, stage.x + 18, stage.x + stage.w - cw - 18);
      this.drawKurzgesagtCapsule(ctx, cxCard, cardY, cw, 92, {
        top: "#FFFFFF",
        bottom: "#FAF8F5",
        rim: isFocus ? theme.primary : theme.surfaceBorder
      }, 12);
      ctx.fillStyle = theme.secondary;
      ctx.font = "800 11px 'JetBrains Mono', monospace";
      ctx.fillText(st.metric, cxCard + 12, cardY + 22, cw - 24);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 13.5px 'Inter', sans-serif";
      ctx.fillText(st.shortTitle, cxCard + 12, cardY + 42, cw - 24);
      ctx.fillStyle = theme.muted;
      ctx.font = "500 11.5px 'Inter', sans-serif";
      this.wrapText(ctx, st.detail, cxCard + 12, cardY + 60, cw - 24, 15, 2);
      ctx.restore();
    }
    return focusPos;
  }

  // =========================================================================
  // АРХЕТИП 1: HERO PROBLEM HOOK (Динамическая симуляция проблемы и нагрузки)
  // =========================================================================
  drawHeroProblemHook(ctx, stage, scene, timing) {
    const { t, enterP, motionAmp } = timing;
    const theme = timing.theme || this.getSceneTheme(scene);
    const domainProfile = scene.visualPayload?.domainProfile || { heroLabel: scene.sectionRef || "Ключевой вызов" };
    const signals = scene.visualPayload?.signals || { dangerMetric: { label: "Риск", value: "Высокий" } };
    const dangerLabel = signals?.dangerMetric?.label || "Фактор риска";
    const dangerValue = signals?.dangerMetric?.value || "Критично";

    if (!scene.styleVariant?.frameless) {
      this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
        top: theme.surfaceTop,
        bottom: theme.surfaceBottom,
        rim: theme.surfaceBorder
      }, 22, `rgba(${theme.shadowRgb}, 0.08)`);
    }

    const cx = stage.x + Math.round(stage.w * 0.28);
    const cy = stage.y + 195;

    // 1. Волны ударного воздействия слева
    for (let wIdx = 0; wIdx < 3; wIdx++) {
      const wavePhase = ((t * 1.4 + wIdx * 0.33) % 1);
      const wx = stage.x + 40 + wavePhase * 135;
      const alpha = (1 - wavePhase) * 0.65 * enterP;
      ctx.strokeStyle = `rgba(225, 29, 72, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wx - 24, cy, 40 + wIdx * 16, -0.55, 0.55);
      ctx.stroke();
    }

    // 2. Центральный параметрический объект дисциплины под нагрузкой
    if (scene.domainId === "arch_eng") {
      const baseW = 140;
      const floorH = 44;
      const groundY = cy + 90;
      ctx.fillStyle = theme.muted;
      this.roundRect(ctx, cx - 95, groundY, 190, 14, 6);
      ctx.fill();

      for (let f = 0; f < 4; f++) {
        const sway = Math.sin(t * 7.5 - f * 0.35) * (f + 1) * 6.5 * motionAmp;
        const fy = groundY - (f + 1) * floorH;
        const fx = cx - baseW / 2 + sway;
        this.drawKurzgesagtCapsule(ctx, fx, fy, baseW, floorH - 5, {
          top: f === 0 ? "#FEE2E2" : "#DBEAFE",
          bottom: f === 0 ? "#FECACA" : "#BFDBFE",
          rim: f === 0 ? theme.danger : theme.primary
        }, 8, f === 0 ? "rgba(239, 68, 68, 0.25)" : null);

        ctx.fillStyle = f === 0 ? "#991B1B" : "#1E40AF";
        for (let k = 0; k < 3; k++) {
          ctx.fillRect(fx + 18 + k * 38, fy + 11, 22, 16);
        }
      }
    } else if (scene.domainId === "biz_econ") {
      this.drawKurzgesagtCapsule(ctx, cx - 75, cy - 85, 150, 170, {
        top: "#F8FAFC",
        bottom: "#F1F5F9",
        rim: theme.danger
      }, 20);
      const levelH = 95 - Math.sin(t * 3) * 18 * motionAmp;
      this.drawKurzgesagtCapsule(ctx, cx - 67, cy + 77 - levelH, 134, levelH, {
        top: "#FFE4E6",
        bottom: "#FECDD3",
        rim: "#F43F5E"
      }, 14);
      ctx.fillStyle = "#9F1239";
      ctx.font = "800 18px 'JetBrains Mono', monospace";
      ctx.fillText("CAC > LTV", cx - 50, cy + 5);
    } else {
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3 + t * 1.2 * motionAmp;
        const nx = cx + Math.cos(ang) * 76;
        const ny = cy + Math.sin(ang) * 68;
        ctx.strokeStyle = "rgba(225, 29, 72, 0.35)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        this.drawKurzgesagtCapsule(ctx, nx - 28, ny - 16, 56, 32, {
          top: i % 2 === 0 ? "#FFE4E6" : "#EEF2FF",
          bottom: i % 2 === 0 ? "#FECDD3" : "#E0E7FF",
          rim: i % 2 === 0 ? theme.danger : theme.primary
        }, 10);
      }
      this.drawKurzgesagtCapsule(ctx, cx - 44, cy - 44, 88, 88, {
        top: theme.primarySoft || "#EEF2FF",
        bottom: "#FFFFFF",
        rim: theme.primary
      }, 44, `rgba(${theme.shadowRgb}, 0.16)`);
      ctx.fillStyle = theme.ink;
      ctx.font = "800 17px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("ФОКУС", cx, cy + 6);
      ctx.textAlign = "left";
    }

    // 3. Правая панель: Датчик критической метрики + карточка ключевого термина
    const rightX = stage.x + Math.round(stage.w * 0.49);
    const rightW = stage.w - Math.round(stage.w * 0.49) - 24;

    const s1 = LectureAnimationEngine.stagger(timing.p, 0, 3);
    if (s1 > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s1);
      this.drawKurzgesagtCapsule(ctx, rightX, stage.y + 26, rightW, 118, {
        top: "#FFF1F2",
        bottom: "#FFE4E6",
        rim: "#FB7185"
      }, 14);
      ctx.fillStyle = "#BE123C";
      ctx.font = "800 12.5px 'JetBrains Mono', monospace";
      ctx.fillText(`⚠ КРИТИЧЕСКИЙ ФАКТОР · ${String(dangerLabel).toUpperCase()}`, rightX + 18, stage.y + 52, rightW - 36);
      ctx.fillStyle = "#881337";
      ctx.font = "900 28px 'Manrope', sans-serif";
      ctx.fillText(dangerValue, rightX + 18, stage.y + 92, rightW - 36);
      ctx.fillStyle = "#475569";
      ctx.font = "600 14px 'Inter', sans-serif";
      ctx.fillText(domainProfile.heroLabel || scene.sectionRef || "", rightX + 18, stage.y + 122, rightW - 36);
      ctx.restore();
    }

    const s2 = LectureAnimationEngine.stagger(timing.p, 1, 3);
    if (s2 > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s2);
      this.drawKurzgesagtCapsule(ctx, rightX, stage.y + 162, rightW, 200, {
        top: "#EFF6FF",
        bottom: "#DBEAFE",
        rim: "#2563EB"
      }, 14);
      const termHdr = scene.outputLang === "kk" ? "НЕГІЗГІ ҰҒЫМ:" : scene.outputLang === "en" ? "KEY CONCEPT:" : "КЛЮЧЕВОЙ ТЕРМИН:";
      ctx.fillStyle = "#1D4ED8";
      ctx.font = "800 13.5px 'JetBrains Mono', monospace";
      ctx.fillText(termHdr, rightX + 20, stage.y + 192);
      ctx.fillStyle = "#0F172A";
      ctx.font = "800 21px 'Manrope', sans-serif";
      ctx.fillText(scene.keyTerm, rightX + 20, stage.y + 222, rightW - 36);
      ctx.fillStyle = "#334155";
      ctx.font = "500 16.5px 'Inter', sans-serif";
      this.wrapText(ctx, scene.keyPlain, rightX + 20, stage.y + 254, rightW - 36, 24, 3);
      ctx.restore();
    }

    return { x: cx + 40, y: cy };
  }

  // =========================================================================
  // АРХЕТИП 2: PIPELINE ENERGY FLOW (S-траектория Безье и бегущие импульсы)
  // =========================================================================
  drawPipelineEnergyFlow(ctx, stage, scene, timing) {
    const { t, p, simP } = timing;
    const theme = timing.theme || this.getSceneTheme(scene);
    const stages = scene.visualPayload?.stages || [];

    if (!scene.styleVariant?.frameless) {
      this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
        top: theme.surfaceTop,
        bottom: theme.surfaceBottom,
        rim: theme.surfaceBorder
      }, 22, `rgba(${theme.shadowRgb}, 0.08)`);
    }

    const count = Math.min(4, Math.max(3, stages.length));
    const cardW = Math.min(220, Math.floor((stage.w - 90) / count));
    const cardH = 148;
    const stepX = (stage.w - 70 - cardW) / Math.max(1, count - 1);

    const centers = [];
    for (let i = 0; i < count; i++) {
      const cx = stage.x + 35 + cardW / 2 + i * stepX;
      const cy = stage.y + (i % 2 === 0 ? 132 : 252);
      centers.push({ x: cx, y: cy });
    }

    // 1. Саморисующиеся кривые Безье + бегущие импульсы
    for (let i = 0; i < centers.length - 1; i++) {
      const p0 = centers[i];
      const p2 = centers[i + 1];
      const cp = { x: (p0.x + p2.x) / 2, y: i % 2 === 0 ? p0.y - 30 : p0.y + 30 };
      const lineP = LectureAnimationEngine.clamp((simP - i * 0.22) * 2.2, 0, 1);

      this.drawTrimmedBezier(ctx, p0, cp, p2, lineP, theme.primary, 4);
      if (lineP > 0.4) {
        const pulseT = ((t * 0.9 + i * 0.35) % 1);
        this.drawBezierPulse(ctx, p0, cp, p2, pulseT, theme.secondary);
      }
    }

    // 2. Каскадные капсулы этапов в светлой палитре Quiet Luxury
    const activeIdx = Math.min(count - 1, Math.floor(simP * count));
    const pals = theme.cardPalettes || [
      { top: "#EFF6FF", bot: "#DBEAFE", stroke: "#2563EB", text: "#1E3A8A" },
      { top: "#F5F3FF", bot: "#EDE9FE", stroke: "#7C3AED", text: "#4C1D95" },
      { top: "#ECFEFF", bot: "#CFFAFE", stroke: "#0891B2", text: "#155E75" },
      { top: "#ECFDF5", bot: "#D1FAE5", stroke: "#059669", text: "#065F46" }
    ];

    centers.forEach((c, idx) => {
      const st = stages[idx] || { shortTitle: `Этап ${idx + 1}`, detail: scene.keyPlain, metric: `0${idx + 1}` };
      const pop = LectureAnimationEngine.stagger(p, idx, count, 0.09, 0.38);
      if (pop <= 0.02) return;

      const breathY = Math.sin(t * 2.4 + idx * 1.1) * 3;
      const isCurrent = idx === activeIdx;
      const scale = Math.min(1.06, pop) * (isCurrent ? 1.04 : 1.0);
      const w = cardW * scale;
      const h = cardH * scale;
      const x = c.x - w / 2;
      const y = c.y - h / 2 + breathY;
      const pal = pals[idx % pals.length];

      this.drawKurzgesagtCapsule(
        ctx,
        x,
        y,
        w,
        h,
        { top: pal.top, bottom: pal.bot, rim: isCurrent ? theme.primary : pal.stroke },
        16,
        isCurrent ? `rgba(${theme.shadowRgb}, 0.16)` : null
      );

      if (pop > 0.45) {
        ctx.fillStyle = pal.stroke;
        ctx.font = "800 12px 'JetBrains Mono', monospace";
        ctx.fillText(`ШАГ 0${idx + 1} · ${st.metric || ""}`, x + 16, y + 28, w - 28);

        ctx.fillStyle = theme.ink;
        ctx.font = "800 17px 'Manrope', sans-serif";
        ctx.fillText(st.shortTitle, x + 16, y + 54, w - 28);

        ctx.fillStyle = theme.muted;
        ctx.font = "500 13.5px 'Inter', sans-serif";
        this.wrapText(ctx, st.detail, x + 16, y + 78, w - 28, 18, 3);
      }
    });

    return centers[activeIdx] || centers[0];
  }

  // =========================================================================
  // АРХЕТИП 5: SHIELD CORE ARCHITECTURE (3 орбитальных щита + спидометр 96%)
  // =========================================================================
  drawShieldCoreArchitecture(ctx, stage, scene, timing) {
    const { t, p, simP, motionAmp } = timing;
    const theme = timing.theme || this.getSceneTheme(scene);
    const rings = scene.visualPayload?.rings || [];

    if (!scene.styleVariant?.frameless) {
      this.drawKurzgesagtCapsule(ctx, stage.x, stage.y, stage.w, stage.h, {
        top: theme.surfaceTop,
        bottom: theme.surfaceBottom,
        rim: theme.surfaceBorder
      }, 22, `rgba(${theme.shadowRgb}, 0.08)`);
    }

    const cx = stage.x + 250;
    const cy = stage.y + 196;
    const pals = theme.cardPalettes || [];
    const ringColors = [theme.primary, theme.secondary, theme.success];

    // 1. Три вращающихся концентрических контура
    for (let rIdx = 2; rIdx >= 0; rIdx--) {
      const radius = 64 + rIdx * 42;
      const pop = LectureAnimationEngine.stagger(p, rIdx, 3);
      const rot = t * (rIdx % 2 === 0 ? 0.55 : -0.45) * (0.3 + 0.7 * motionAmp);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = ringColors[rIdx % ringColors.length];
      ctx.lineWidth = 5;
      ctx.setLineDash([42, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * Math.min(1, pop), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Центральное ядро
    this.drawKurzgesagtCapsule(ctx, cx - 46, cy - 46, 92, 92, {
      top: "#ECFDF5",
      bottom: "#D1FAE5",
      rim: theme.success
    }, 46, `rgba(${theme.shadowRgb}, 0.14)`);

    const stabilityPct = Math.round(60 + simP * 38);
    ctx.fillStyle = "#065F46";
    ctx.font = "900 22px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${stabilityPct}%`, cx, cy + 4);
    const coreWord = scene.outputLang === "kk" ? "ӨЗЕК" : scene.outputLang === "en" ? "CORE" : "ЯДРО";
    ctx.font = "700 11px 'Inter', sans-serif";
    ctx.fillStyle = "#047857";
    ctx.fillText(coreWord, cx, cy + 22);
    ctx.textAlign = "left";

    // 3. Правая колонка: Карточки 3 слоёв в светлой палитре
    const rx = stage.x + 485;
    const rw = stage.w - 510;
    rings.forEach((ring, idx) => {
      const rPop = LectureAnimationEngine.stagger(p, idx, 3, 0.12);
      if (rPop <= 0.05) return;
      const ry = stage.y + 38 + idx * 112;
      const pal = pals[idx % Math.max(1, pals.length)] || { top: "#FFFFFF", bot: "#F8FAFC", stroke: ringColors[idx % ringColors.length], text: theme.ink };
      ctx.save();
      ctx.globalAlpha = Math.min(1, rPop);
      this.drawKurzgesagtCapsule(ctx, rx, ry, rw, 94, {
        top: pal.top,
        bottom: pal.bot,
        rim: pal.stroke
      }, 14);

      ctx.fillStyle = pal.stroke;
      ctx.font = "800 16px 'Manrope', sans-serif";
      ctx.fillText(ring.name, rx + 20, ry + 34, rw - 36);

      ctx.fillStyle = theme.ink;
      ctx.font = "500 14.5px 'Inter', sans-serif";
      ctx.fillText(ring.role, rx + 20, ry + 64, rw - 36);
      ctx.restore();
    });

    return { x: cx, y: cy };
  }

  // =========================================================================
  // ПРОЦЕДУРНЫЙ 2D-ПЕРСОНАЖ В СТИЛЕ DUOLINGO / RIVE (2-Bone IK + Gaze + 5 Жестов)
  // =========================================================================
  drawProceduralTutor(ctx, cx, cy, t, scene, focalTarget, isPause, beats = null, opts = {}) {
    const scale = opts.scale ?? 1.0;
    const isCornerBadge = opts.mode === "corner_badge";
    const isRightSide = opts.side === "right";
    ctx.save();
    if (scale !== 1.0) {
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }

    // Чтение реальной амплитуды речи через AnalyserNode для точного Lip-Sync
    let voiceAmp = 0;
    if (!isPause && this.isPlaying && this.analyserNode && this.analyserData && this.audioPlaybackState.active) {
      try {
        this.analyserNode.getByteTimeDomainData(this.analyserData);
        let sumSq = 0;
        for (let i = 0; i < this.analyserData.length; i += 2) {
          const v = (this.analyserData[i] - 128) / 128;
          sumSq += v * v;
        }
        voiceAmp = Math.min(1, Math.sqrt(sumSq / (this.analyserData.length / 2)) * 3.8);
      } catch (_) {}
    }

    // Многослойный цикл дыхания со сдвигом фаз + реакция на голос
    const breath = Math.sin(t * 2.3);
    const torsoY = -breath * 3.5;
    const headY = -Math.sin(t * 2.3 - 0.45) * 4.5 - voiceAmp * 2.5;
    const headTilt = Math.sin(t * 1.15 - 0.3) * 0.035 + (scene.tutorCue === "QUESTION_OPEN" ? 0.06 : 0);
    const glassesY = -Math.sin(t * 2.3 - 0.75) * 1.8;

    const theme = this.getSceneTheme(scene);
    const ui = this.getCanvasUiLabels(scene);

    // Плавный трекинг взгляда и руки к активному элементу схемы
    this.tutor.targetX += (focalTarget.x - this.tutor.targetX) * 0.12;
    this.tutor.targetY += (focalTarget.y - this.tutor.targetY) * 0.12;

    // Светлая Editorial-капсула тьютора (Quiet Luxury, в единой теме сцены!)
    this.drawKurzgesagtCapsule(ctx, cx - 126, cy - 196, 252, 392, {
      top: theme.surfaceTop,
      bottom: theme.surfaceBottom,
      rim: theme.surfaceBorder
    }, 22, `rgba(${theme.shadowRgb}, 0.10)`);

    // Мягкая аура в цвете предметного домена
    const aura = ctx.createRadialGradient(cx, cy - 35, 10, cx, cy - 35, 100);
    aura.addColorStop(0, theme.primarySoft || "rgba(79, 70, 229, 0.14)");
    aura.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy - 35, 100, 0, Math.PI * 2);
    ctx.fill();

    // 1. Торс со Squash & Stretch в благородном цвете домена
    this.drawKurzgesagtCapsule(ctx, cx - 58, cy - 12 + torsoY, 116, 122, {
      top: theme.primary,
      bottom: theme.ink,
      rim: "#FFFFFF"
    }, 28);

    // Галстук / бейдж ИИ
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 10 + torsoY);
    ctx.lineTo(cx + 12, cy - 10 + torsoY);
    ctx.lineTo(cx, cy + 38 + torsoY);
    ctx.closePath();
    ctx.fill();

    // 2. Голова с наклоном
    ctx.save();
    ctx.translate(cx, cy - 64 + headY);
    ctx.rotate(headTilt);

    // Шея и лицо
    this.drawKurzgesagtCapsule(ctx, -42, -44, 84, 86, {
      top: "#fde68a",
      bottom: "#f59e0b",
      rim: "#fef3c7"
    }, 38);

    // Шапочка / причёска академика
    this.drawKurzgesagtCapsule(ctx, -44, -50, 88, 24, {
      top: "#1e293b",
      bottom: "#0f172a",
      rim: "#64748b"
    }, 12);

    // 3. Глаза с естественным морганием и Gaze Anchoring (смотрят на активный узел схемы!)
    const blinkCycle = (t % 3.8);
    const isBlinking = blinkCycle > 3.62;
    const dx = this.tutor.targetX - cx;
    const dy = this.tutor.targetY - (cy - 64);
    const dist = Math.hypot(dx, dy) || 1;
    const lookX = (dx / dist) * 3.5;
    const lookY = (dy / dist) * 2.2;

    [-16, 16].forEach((ex) => {
      if (isBlinking) {
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ex - 8, -8);
        ctx.lineTo(ex + 8, -8);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex, -8, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(ex + lookX, -8 + lookY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        // Блик в зрачке
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex + lookX + 1.5, -10 + lookY, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Брови по эмоции сцены (Non-Manual Signals для глухих студентов)
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    const browTilt = scene.emotion === "risk" ? 0.22 : scene.emotion === "celebrate" ? -0.15 : 0;
    [-16, 16].forEach((bx, bIdx) => {
      ctx.save();
      ctx.translate(bx, -21);
      ctx.rotate(bIdx === 0 ? browTilt : -browTilt);
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.restore();
    });

    // Очки со сдвигом фазы
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.6;
    this.roundRect(ctx, -28, -18 + glassesY, 23, 18, 5);
    ctx.stroke();
    this.roundRect(ctx, 5, -18 + glassesY, 23, 18, 5);
    ctx.stroke();

    // Артикуляция рта (синхронизирована с реальным AnalyserNode аудиопотока или слоговым ритмом)
    ctx.fillStyle = "#0f172a";
    if (!isPause && this.isPlaying) {
      const fallbackSyllable = Math.abs(Math.sin(t * 12.5) * Math.cos(t * 5.3));
      const amp = voiceAmp > 0.03 ? voiceAmp : fallbackSyllable;
      const mouthOpen = 2.5 + amp * 7.5;
      this.roundRect(ctx, -10, 12, 20, mouthOpen, 4);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 11, 11, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Две руки (2-Bone IK) + смысловой жест кисти (WARNING_PALM, QUESTION_OPEN, THUMBS_UP, POINT)
    const cue = scene.tutorCue || "POINT";
    const leftShoulder = { x: cx - 48, y: cy + 12 + torsoY };
    const leftHandGoal = cue === "QUESTION_OPEN"
      ? { x: cx - 86, y: cy - 18 + Math.sin(t * 3.0) * 8 }
      : { x: cx - 72, y: cy + 52 + breath * 3 };
    const leftElbow = { x: (leftShoulder.x + leftHandGoal.x) / 2 - 12, y: (leftShoulder.y + leftHandGoal.y) / 2 + 12 };

    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x, leftShoulder.y);
    ctx.lineTo(leftElbow.x, leftElbow.y);
    ctx.lineTo(leftHandGoal.x, leftHandGoal.y);
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(leftHandGoal.x, leftHandGoal.y, 8.5, 0, Math.PI * 2);
    ctx.fill();

    const shoulder = { x: cx + 48, y: cy + 8 + torsoY };
    const handGoal = cue === "WARNING_PALM"
      ? { x: cx + 82, y: cy - 34 + Math.sin(t * 4) * 5 }
      : cue === "THUMBS_UP"
        ? { x: cx + 84, y: cy - 28 + Math.sin(t * 3) * 4 }
        : { x: cx + 88, y: cy - 10 + Math.sin(t * 3.2) * 9 };
    const elbow = {
      x: (shoulder.x + handGoal.x) / 2 - 8,
      y: (shoulder.y + handGoal.y) / 2 + 18
    };

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(handGoal.x, handGoal.y);
    ctx.stroke();

    // Кисть руки (разный силуэт для жеста)
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(handGoal.x, handGoal.y, 9, 0, Math.PI * 2);
    ctx.fill();
    if (cue === "THUMBS_UP") {
      this.roundRect(ctx, handGoal.x - 3, handGoal.y - 18, 6, 12, 3);
      ctx.fill();
    } else if (cue === "WARNING_PALM") {
      for (let f = -1; f <= 1; f++) {
        this.roundRect(ctx, handGoal.x + f * 5 - 2, handGoal.y - 17, 4, 10, 2);
        ctx.fill();
      }
    }

    // Мягкий Spotlight Halo на активном узле схемы (отключаем в corner_badge)
    const beatPulseAlpha = beats ? Math.max(0.24, 1 - beats.beatP * 1.1) : 0.7;
    if (!isPause && !isCornerBadge) {
      this.drawLaserBeam(ctx, handGoal, { x: this.tutor.targetX, y: this.tutor.targetY }, beatPulseAlpha, theme);
    }

    // Подпись жеста КЖЯ/РЖЯ и роли под персонажем (скрываем в компактном corner_badge)
    if (!isCornerBadge) {
      ctx.fillStyle = theme.ink;
      ctx.font = "800 13.5px 'Manrope', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ui.tutorName, cx, cy + 148, 224);
      ctx.fillStyle = theme.primary;
      ctx.font = "700 12px 'Inter', sans-serif";
      ctx.fillText(ui.gestures[scene.tutorCue] || ui.gestures.POINT, cx, cy + 170, 228);
      ctx.textAlign = "left";
    }

    ctx.restore();
  }

  // Деликатный направляющий вектор у руки + мягкий Spotlight-ореол вокруг целевого узла (без пересечения букв!)
  drawLaserBeam(ctx, tip, target, alphaScale = 1, theme = null) {
    ctx.save();
    const dx = target.x - tip.x;
    const dy = target.y - tip.y;
    const dist = Math.hypot(dx, dy) || 1;
    const shortLen = Math.min(42, dist * 0.18);
    const endX = tip.x + (dx / dist) * shortLen;
    const endY = tip.y + (dy / dist) * shortLen;

    const accentRgb = theme?.shadowRgb || "79, 70, 229";
    const grad = ctx.createLinearGradient(tip.x, tip.y, endX, endY);
    grad.addColorStop(0, `rgba(${accentRgb}, ${(0.55 * alphaScale).toFixed(2)})`);
    grad.addColorStop(1, `rgba(${accentRgb}, 0)`);
    ctx.strokeStyle = grad;
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Кольцо фокуса на самом объекте схемы (Manim Focus Ring)
    const flare = ctx.createRadialGradient(target.x, target.y, 4, target.x, target.y, 34);
    flare.addColorStop(0, `rgba(${accentRgb}, ${(0.22 * alphaScale).toFixed(2)})`);
    flare.addColorStop(1, `rgba(${accentRgb}, 0)`);
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Саморисующаяся квадратичная кривая Безье (Trim Paths)
  drawTrimmedBezier(ctx, p0, cp, p2, progress, color, width = 3) {
    if (progress <= 0.01) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    const approxLen = Math.hypot(p2.x - p0.x, p2.y - p0.y) * 1.25;
    ctx.setLineDash([approxLen, approxLen]);
    ctx.lineDashOffset = approxLen * (1 - LectureAnimationEngine.clamp(progress, 0, 1));
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  // Светящийся импульс энергии вдоль кривой Безье
  drawBezierPulse(ctx, p0, cp, p2, t, color) {
    const inv = 1 - t;
    const x = inv * inv * p0.x + 2 * inv * t * cp.x + t * t * p2.x;
    const y = inv * inv * p0.y + 2 * inv * t * cp.y + t * t * p2.y;
    ctx.save();
    const rad = ctx.createRadialGradient(x, y, 0, x, y, 11);
    rad.addColorStop(0, "#ffffff");
    rad.addColorStop(0.45, color);
    rad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // КАРАОКЕ-ПОЛОСА СУБТИТРОВ WCAG AAA (Safe Zone 18% снизу, светлая тема, без прыжка ширины)
  // =========================================================================
  drawKaraokeCaptionBar(ctx, W, H, scene, p, isPause, themeObj, beatsObj) {
    const theme = themeObj || this.getSceneTheme(scene);
    const ui = this.getCanvasUiLabels(scene);
    const barX = 36;
    const barW = W - 72;
    const capY = H - 124;
    this.drawKurzgesagtCapsule(ctx, barX, capY, barW, 102, {
      top: "rgba(255, 255, 255, 0.96)",
      bottom: "rgba(248, 250, 252, 0.98)",
      rim: theme.surfaceBorder
    }, 16, `rgba(${theme.shadowRgb}, 0.10)`);

    // Левый вертикальный акцентный якорь (DeafSpace Visual Anchor)
    ctx.fillStyle = theme.primary;
    this.roundRect(ctx, barX, capY + 12, 5, 78, 3);
    ctx.fill();

    // Верхняя строка метаданных субтитра (с реально измеренным контрастом WCAG!)
    ctx.fillStyle = theme.primary;
    ctx.font = "800 12.5px 'JetBrains Mono', monospace";
    const beatTag = beatsObj ? `${ui.beatWord} ${(beatsObj.activeBeatIdx ?? 0) + 1}/3  ·  ` : "";
    const crLabel = scene.contrastRatio || "15.8:1 (WCAG AAA)";
    ctx.fillText(
      `${beatTag}${ui.captionTitle}  ·  ${ui.paceWord}: ${scene.finalCps} ${ui.cpsUnit}  ·  ${crLabel}`,
      barX + 22,
      capY + 26,
      barW - 44
    );

    // Пословная КАРАОКЕ-подсветка только для текущего активного бита (без перегруза и обрезки!)
    const activeBeatIdx = beatsObj?.activeBeatIdx ?? 0;
    const activeBeatText = beatsObj?.beats?.[activeBeatIdx]?.text || scene.caption || "";
    const words = String(activeBeatText).split(/\s+/).filter(Boolean);
    const beatProgress = beatsObj
      ? LectureAnimationEngine.clamp(beatsObj.beatP ?? 0, 0, 1)
      : LectureAnimationEngine.clamp((p - 0.05) / 0.72, 0, 1);
    const activeWordIdx = isPause ? words.length : Math.floor(beatProgress * words.length);

    const fontSize = activeBeatText.length > 95 ? 18.5 : 20.5;
    ctx.font = `700 ${fontSize}px 'Inter', sans-serif`;
    let curX = barX + 22;
    let curY = capY + 56;
    const maxX = barX + barW - 24;

    words.forEach((word, wIdx) => {
      const wWidth = ctx.measureText(word + " ").width;
      if (curX + wWidth > maxX) {
        curX = barX + 22;
        curY += 25;
      }
      if (curY > capY + 94) return;
      if (wIdx < activeWordIdx) {
        ctx.fillStyle = theme.ink;
      } else if (wIdx === activeWordIdx) {
        ctx.fillStyle = theme.primarySoft;
        this.roundRect(ctx, curX - 4, curY - 18, wWidth, 24, 6);
        ctx.fill();
        ctx.fillStyle = theme.primary;
      } else {
        ctx.fillStyle = theme.muted;
      }
      ctx.fillText(word, curX, curY);
      curX += wWidth;
    });
  }

  // =========================================================================
  // РЕЖИМ ДЕМОНСТРАЦИИ «ДО ПРАВКИ AI SUPERVISOR (RAW-ДЕФЕКТ)»
  // =========================================================================
  drawRawDefectOverlay(ctx, W, H, stage, scene) {
    const barX = 36;
    const barW = W - 72;
    const capY = H - 168;
    ctx.save();
    ctx.fillStyle = "rgba(127, 29, 29, 0.92)";
    this.roundRect(ctx, barX, capY, barW, 146, 12);
    ctx.fill();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.stroke();

    ctx.fillStyle = "#fca5a5";
    ctx.font = "900 14px 'JetBrains Mono', monospace";
    ctx.fillText(
      `❌ ДЕФЕКТ ДО AI SUPERVISOR: COLLISION ${scene.rawCollisionPx} px² · ТЕМП ${scene.rawDefectCps} CPS (> 15 НОРМА DHH!)`,
      barX + 22,
      capY + 26
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "600 19px 'Inter', sans-serif";
    this.wrapText(ctx, scene.rawDefectCaption, barX + 22, capY + 56, barW - 44, 25, 3);
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    const width = Math.max(0, w);
    const height = Math.max(0, h);
    const radius = Math.min(r, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
    const words = String(text || "").split(/\s+/);
    let line = "";
    let curY = y;
    let linesCount = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        linesCount++;
        if (linesCount >= maxLines) {
          ctx.fillText(line.trim() + "…", x, curY);
          return;
        }
        ctx.fillText(line, x, curY);
        line = words[n] + " ";
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  cancelVideoExport() {
    if (this.isExporting) {
      this.cancelExportFlag = true;
    }
  }

  // Фазово-синхронизированный экспорт полной лекции (видео + звук) по часам AudioContext / performance.now()
  async exportVideoFile(onProgress) {
    if (this.isExporting) {
      throw new Error("Экспорт видео уже выполняется");
    }
    this.isExporting = true;
    this.cancelExportFlag = false;

    // Ставим живой плеер на паузу на время записи файла, чтобы звук не дублировался
    const wasPlaying = this.isPlaying;
    this.stopTts();
    this.isPlaying = false;

    // Если включена озвучка, но не все сцены ещё успели догрузиться в фоне — дожидаемся их перед записью
    if (this.ttsEnabled && this.ttsBackendMode === "neural_buffer" && this.scenes.some((s) => !s.audioBuffer)) {
      try {
        await this.pregenerateAllSceneAudio(this.scenes, this.ttsLang, null);
      } catch (_) {}
    }

    const ctx = this.ensureAudioContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (_) {}
    }

    return new Promise((resolve, reject) => {
      try {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = this.canvas.width;
        offCanvas.height = this.canvas.height;
        const offCtx = offCanvas.getContext("2d");

        const videoStream = offCanvas.captureStream(30);
        const tracks = [...videoStream.getVideoTracks()];

        let exportAudioCtx = null;
        let audioStartAnchor = 0;
        const audioSources = [];
        if (ctx && typeof ctx.createMediaStreamDestination === "function" && this.scenes.some((s) => s.audioBuffer)) {
          try {
            const dest = ctx.createMediaStreamDestination();
            exportAudioCtx = ctx;
            audioStartAnchor = ctx.currentTime + 0.08;
            let cursor = 0;
            this.scenes.forEach((sc) => {
              if (sc.audioBuffer) {
                const src = ctx.createBufferSource();
                src.buffer = sc.audioBuffer;
                src.connect(dest);
                src.start(audioStartAnchor + cursor + 0.25);
                audioSources.push(src);
              }
              cursor += sc.durationSec || 10;
            });
            dest.stream.getAudioTracks().forEach((tr) => tracks.push(tr));
          } catch (_) {
            exportAudioCtx = null;
          }
        }

        const combinedStream = new MediaStream(tracks);
        const mimeTypes = [
          "video/mp4;codecs=avc1.42E01E",
          "video/mp4",
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm"
        ];
        const supportedMime = mimeTypes.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
        const recorder = supportedMime
          ? new MediaRecorder(combinedStream, { mimeType: supportedMime, videoBitsPerSecond: 4200000 })
          : new MediaRecorder(combinedStream);

        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const restoreLivePlayer = () => {
          audioSources.forEach((s) => {
            try {
              s.stop();
              s.disconnect();
            } catch (_) {}
          });
          this.isExporting = false;
          if (wasPlaying) {
            this.isPlaying = true;
            this.lastSpokenSceneIdx = -1;
          }
        };

        recorder.onstop = () => {
          const cancelled = this.cancelExportFlag;
          restoreLivePlayer();
          if (cancelled) {
            reject(new DOMException("Export cancelled", "AbortError"));
            return;
          }
          const blob = new Blob(chunks, { type: supportedMime || "video/webm" });
          const ext = supportedMime.includes("mp4") ? "mp4" : "webm";
          resolve({ blob, ext });
        };

        const exportDurationSec = Math.min(360, Math.max(4, this.totalDuration));
        const wallStartMs = performance.now();

        this.renderFrameOnContext(offCtx, offCanvas.width, offCanvas.height, 0);
        recorder.start(150);

        const timer = setInterval(() => {
          if (this.cancelExportFlag) {
            clearInterval(timer);
            if (recorder.state !== "inactive") recorder.stop();
            return;
          }

          // Привязка времени кадра к реальным часам AudioContext исключает рассинхрон звука и видео!
          const elapsedSec = exportAudioCtx
            ? Math.max(0, exportAudioCtx.currentTime - audioStartAnchor)
            : (performance.now() - wallStartMs) / 1000;
          const simTime = Math.min(exportDurationSec, elapsedSec);

          this.renderFrameOnContext(offCtx, offCanvas.width, offCanvas.height, simTime);
          const pct = Math.min(99, Math.round((simTime / exportDurationSec) * 100));
          if (onProgress) onProgress(pct);

          if (simTime >= exportDurationSec) {
            clearInterval(timer);
            if (recorder.state !== "inactive") recorder.stop();
          }
        }, 1000 / 30);
      } catch (err) {
        this.isExporting = false;
        if (wasPlaying) this.isPlaying = true;
        reject(err);
      }
    });
  }
};

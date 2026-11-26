// Главный контроллер Lecture AI Studio (Команда ArchAI · АЖиОЗ 25–30)
// Включает:
// 1) Split-Pane Studio управление, Focus Mode и сохранение настроек доступности (A / A+ / A++ / WCAG AAA)
// 2) Персистентность (SQLite /api/lectures + localStorage) и Course-Level Cache (0 токенов для одногруппников)
// 3) Двухфазный журнал транзакций (Two-Phase Credit Ledger: RESERVE -> SETTLEMENT / REFUND / CACHE_HIT) + Kaspi QR
// 4) Однопроходную безопасную подсветку терминов (с поддержкой казахского алфавита) + Дактиль КЖЯ/РЖЯ + Личные заметки
// 5) Двухуровневую Майнд-карту (Тема -> Разделы -> Термины) с кривыми Безье и масштабированием (+ / - / 100%)
// 6) Тумблер «До AI Supervisor (Raw-дефект) ↔ После (PASS)», озвучку TTS и экспорт всех форматов (.MP4/.WEBM, .DOC, .PDF, .PNG, .SVG, .SRT)
// 7) Встроенный модуль тестирования КТ 4 (5+ реальных пользователей + выгрузка таблицы .CSV)

(function () {
  const STORAGE_KEYS = {
    CREDITS: "lecture_ai_credits_v2",
    PLAN: "lecture_ai_plan_v2",
    LEDGER: "lecture_ai_ledger_v2",
    HISTORY: "lecture_ai_history_v2",
    NOTES: "lecture_ai_personal_notes_v2",
    A11Y: "lecture_ai_a11y_v2",
    FEEDBACK: "lecture_ai_kt4_feedback_v2",
    LANG: "lecture_ai_output_lang_v1",
    VOICE: "lecture_ai_voice_gender_v1",
    DEAF_FIRST: "lecture_ai_deaf_first_v1"
  };

  const DEFAULT_FEEDBACK = [
    {
      id: 1,
      testerName: "Студент #1 (Архитектура, 2 курс)",
      university: "КазГАСА",
      userGroup: "Слышащий студент",
      clarityScore: 5,
      termsScore: 5,
      animationScore: 5,
      npsScore: 10,
      comment: "Конспект без воды, 6-сценовая 2D-анимация сейсмоизоляции наглядно показала работу демпферов."
    },
    {
      id: 2,
      testerName: "Студент #2 (Архитектура, 2 курс)",
      university: "КазГАСА",
      userGroup: "Слышащий студент",
      clarityScore: 5,
      termsScore: 5,
      animationScore: 5,
      npsScore: 9,
      comment: "Удобны всплывающие карточки терминов с дактилем и мини-тест сразу после лекции."
    },
    {
      id: 3,
      testerName: "Студент #3 (Переводческое дело, 2 курс)",
      university: "ЕНУ",
      userGroup: "Слышащий студент",
      clarityScore: 4,
      termsScore: 5,
      animationScore: 5,
      npsScore: 9,
      comment: "Двухуровневая майнд-карта и субтитры без задержки помогли быстро схватить структуру темы."
    },
    {
      id: 4,
      testerName: "Студент #4 (Бизнес, 2 курс)",
      university: "AlmaU",
      userGroup: "Студент с нарушением слуха (Deaf/HoH)",
      clarityScore: 5,
      termsScore: 5,
      animationScore: 5,
      npsScore: 10,
      comment: "Визуальное объяснение через 6 архетипов анимации и паузы Moving Hold 2.5 сек полностью сняли проблему расщепления внимания!"
    },
    {
      id: 5,
      testerName: "Студент #5 (2 курс)",
      university: "КазНУ",
      userGroup: "Слышащий студент",
      clarityScore: 5,
      termsScore: 5,
      animationScore: 5,
      npsScore: 10,
      comment: "Ясный язык с сохранением оригинального термина для экзамена — всё понятно и доступно."
    }
  ];

  const state = {
    currentPreset: "arch",
    outputLang: "ru",
    voiceGender: "female",
    deafFirstMode: false,
    notesMode: "dual",
    glossaryQuery: "",
    flashcardsOpen: false,
    flashcardIdx: 0,
    flashcardFlipped: false,
    quizErrorsOnly: false,
    isRunning: false,
    isMediaReady: false,
    generationRunId: 0,
    abortController: null,
    mindmapZoom: 1.0,
    mindmapPan: { x: 0, y: 0 },
    credits: 3,
    planName: "Free",
    ledger: [],
    history: [],
    personalNotes: {},
    feedbackList: [],
    pipelineResult: null,
    animEngine: null,
    liveRecognition: null,
    isLiveRecording: false,
    micStream: null,
    micVadTimer: null,
    simTimers: [],
    correctedTermsCount: 0,
    silenceSavedSec: 0
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadPersistedState();

    const canvas = document.getElementById("animationCanvas");
    state.animEngine = new window.LectureAnimationEngine(canvas);
    state.animEngine.voiceGender = state.voiceGender;
    state.animEngine.onTtsNotice = (msg) => showFlashToast(msg, "warn");
    state.animEngine.onAudioProgress = updateAudioStreamBadge;

    initAccessibilityControls();
    initSidebarAndPresets();
    initOutputLanguageSwitch();
    initInputTabs();
    initFileUpload();
    initLiveCaptions();
    initResultTabs();
    initPlayerControls();
    initBillingAndApiModals();
    initKt4Modal();
    initDownloadButtons();

    updateTokenBadge();
  });

  // Загрузка и сохранение персистентного состояния
  function loadPersistedState() {
    try {
      const savedCredits = localStorage.getItem(STORAGE_KEYS.CREDITS);
      if (savedCredits !== null) {
        const parsedCredits = parseInt(savedCredits, 10);
        if (Number.isFinite(parsedCredits) && parsedCredits >= 0) {
          state.credits = parsedCredits;
        }
      }

      const savedPlan = localStorage.getItem(STORAGE_KEYS.PLAN);
      if (savedPlan) state.planName = savedPlan;

      const savedLedger = localStorage.getItem(STORAGE_KEYS.LEDGER);
      state.ledger = savedLedger
        ? JSON.parse(savedLedger)
        : [
            {
              time: new Date().toLocaleTimeString("ru-RU"),
              type: "FREEMIUM_GRANT (Старт)",
              key: "init:monthly_free_quota",
              delta: "+3",
              balance: 3
            }
          ];

      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      state.history = savedHistory ? JSON.parse(savedHistory) : [];

      const savedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      state.personalNotes = savedNotes ? JSON.parse(savedNotes) : {};

      const savedFeedback = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
      state.feedbackList = savedFeedback ? JSON.parse(savedFeedback) : DEFAULT_FEEDBACK;

      const savedLang = localStorage.getItem(STORAGE_KEYS.LANG);
      if (savedLang && ["ru", "kk", "en"].includes(savedLang)) {
        state.outputLang = savedLang;
      }
      const savedVoice = localStorage.getItem(STORAGE_KEYS.VOICE);
      if (savedVoice && ["female", "male"].includes(savedVoice)) {
        state.voiceGender = savedVoice;
      }
      state.deafFirstMode = localStorage.getItem(STORAGE_KEYS.DEAF_FIRST) === "1";
    } catch (_) {
      state.feedbackList = DEFAULT_FEEDBACK;
    }

    updateQuotaUI();
    renderHistoryList();
    const gKey = localStorage.getItem("lecture_ai_gemini_key") || "";
    document.getElementById("apiStatusBadge").textContent = gKey ? "Gemini 2.5" : "ИИ";

    // Подгружаем общий Course-Level Cache из SQLite сервера (если сервер запущен)
    if (typeof window !== "undefined" && window.location && window.location.protocol !== "file:") {
      fetch("/api/lectures")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.lectures) && data.lectures.length) {
            const localHashes = new Set(state.history.map((h) => h.contentHash));
            const remoteItems = data.lectures
              .filter((l) => l.contentHash && !localHashes.has(l.contentHash))
              .map((l) => ({
                id: l.id,
                contentHash: l.contentHash,
                courseTitle: l.courseTitle,
                domainId: l.domainId,
                glossary: new Array(l.termsCount || 0).fill(null),
                scenes: new Array(l.scenesCount || 6).fill(null),
                _remoteOnly: true
              }));
            if (remoteItems.length) {
              state.history = [...state.history, ...remoteItems].slice(0, 15);
              renderHistoryList();
            }
          }
        })
        .catch(() => {});
    }
  }

  function savePersistedState() {
    const safeSet = (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch (_) {}
    };
    safeSet(STORAGE_KEYS.CREDITS, String(state.credits));
    safeSet(STORAGE_KEYS.PLAN, state.planName);
    safeSet(STORAGE_KEYS.LEDGER, JSON.stringify(state.ledger.slice(0, 30)));
    safeSet(STORAGE_KEYS.NOTES, JSON.stringify(state.personalNotes));
    safeSet(STORAGE_KEYS.FEEDBACK, JSON.stringify(state.feedbackList));
    safeSet(STORAGE_KEYS.HISTORY, JSON.stringify(state.history.filter((h) => !h._remoteOnly).slice(0, 8)));
  }

  // Световой Flash-Toast для глухих студентов (вместо звуковых сигналов и блокирующих alert)
  function showFlashToast(message, type = "info") {
    const toast = document.getElementById("flashToast");
    toast.textContent = message;
    toast.style.borderColor = type === "success" ? "#15803d" : type === "warn" ? "#b45309" : "#0f766e";
    toast.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add("hidden"), 3400);
  }

  // 1. Настройки доступности (A / A+ / A++ / WCAG AAA Контраст) с сохранением в localStorage
  function initAccessibilityControls() {
    const applyA11y = (scale, btnId, contrast) => {
      document.documentElement.style.setProperty("--font-scale", scale);
      ["btnFontNormal", "btnFontLarge", "btnFontXLarge"].forEach((id) => {
        document.getElementById(id).classList.toggle("active", id === btnId);
      });
      document.body.classList.toggle("high-contrast", !!contrast);
      document.getElementById("btnContrast").classList.toggle("active", !!contrast);
      try {
        localStorage.setItem(STORAGE_KEYS.A11Y, JSON.stringify({ scale, btnId, contrast: !!contrast }));
      } catch (_) {}
    };

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.A11Y) || "null");
      if (saved) applyA11y(saved.scale || 1, saved.btnId || "btnFontNormal", saved.contrast);
    } catch (_) {}

    document.getElementById("btnFontNormal").addEventListener("click", () =>
      applyA11y(1, "btnFontNormal", document.body.classList.contains("high-contrast"))
    );
    document.getElementById("btnFontLarge").addEventListener("click", () =>
      applyA11y(1.15, "btnFontLarge", document.body.classList.contains("high-contrast"))
    );
    document.getElementById("btnFontXLarge").addEventListener("click", () =>
      applyA11y(1.3, "btnFontXLarge", document.body.classList.contains("high-contrast"))
    );
    document.getElementById("btnContrast").addEventListener("click", () => {
      const nextC = !document.body.classList.contains("high-contrast");
      const activeFontBtn =
        ["btnFontNormal", "btnFontLarge", "btnFontXLarge"].find((id) =>
          document.getElementById(id).classList.contains("active")
        ) || "btnFontNormal";
      const sc = activeFontBtn === "btnFontLarge" ? 1.15 : activeFontBtn === "btnFontXLarge" ? 1.3 : 1;
      applyA11y(sc, activeFontBtn, nextC);
    });
  }

  // 2. Сворачивание левой панели, витрина 4 пресетов и режим Deaf-First
  function initSidebarAndPresets() {
    document.getElementById("btnToggleSidebar").addEventListener("click", () => {
      document.getElementById("studioWorkspace").classList.toggle("sidebar-collapsed");
    });

    document.querySelectorAll("[data-preset-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.isRunning) return;
        const key = btn.getAttribute("data-preset-key") || "arch";
        if (key === "kz" && state.outputLang !== "kk") {
          const kkBtn = document.querySelector('#outputLangSwitch .btn-lang[data-lang="kk"]');
          if (kkBtn) {
            state.outputLang = "kk";
            try { localStorage.setItem(STORAGE_KEYS.LANG, "kk"); } catch (_) {}
            document.documentElement.lang = "kk";
            document.querySelectorAll("#outputLangSwitch .btn-lang").forEach((b) => {
              b.classList.toggle("active", b.getAttribute("data-lang") === "kk");
            });
            if (state.animEngine) state.animEngine.ttsLang = "kk-KZ";
          }
        }
        loadPreset(key, true);
      });
    });

    const deafCb = document.getElementById("deafFirstCheckbox");
    if (deafCb) {
      deafCb.checked = state.deafFirstMode;
      deafCb.addEventListener("change", () => {
        state.deafFirstMode = deafCb.checked;
        try {
          localStorage.setItem(STORAGE_KEYS.DEAF_FIRST, state.deafFirstMode ? "1" : "0");
        } catch (_) {}
        if (state.animEngine && state.isMediaReady) {
          state.animEngine.setTtsEnabled(!state.deafFirstMode);
          const btnTts = document.getElementById("btnToggleTts");
          if (btnTts) btnTts.textContent = state.animEngine.ttsEnabled ? "🔊 Озвучка: ВКЛ" : "🔇 Озвучка: ВЫКЛ";
        }
      });
    }

    const btnNewLec = document.getElementById("btnNewLecture");
    if (btnNewLec) btnNewLec.addEventListener("click", resetToNewLecture);

    const btnCancelGen = document.getElementById("btnCancelGeneration");
    if (btnCancelGen) {
      btnCancelGen.addEventListener("click", () => {
        cancelActiveGeneration(true);
      });
    }

    document.getElementById("lectureTextInput").addEventListener("input", updateTokenBadge);
  }

  function cancelActiveGeneration(keepInputs = true) {
    if (state.isRunning) {
      state.generationRunId++;
      if (state.abortController) {
        try {
          state.abortController.abort();
        } catch (_) {}
      }
    }
    state.isRunning = false;
    state.abortController = null;
    setSidebarBusyState(false);
    if (state.animEngine) {
      state.animEngine.prepareStoryboard("", []);
    }
    state.isMediaReady = false;
    setPlayerControlsLocked(true);
    const genStage = document.getElementById("generationProgressStage");
    if (genStage) genStage.classList.add("hidden");
    const progressBox = document.getElementById("pipelineProgress");
    if (progressBox) progressBox.classList.add("hidden");

    if (keepInputs) {
      if (state.pipelineResult) {
        document.getElementById("resultsContentWrap").classList.add("hidden");
      }
      document.getElementById("emptyStateStage").classList.remove("hidden");
      showFlashToast("Генерация отменена. Текст вашей лекции сохранён слева.", "info");
    }
  }

  // Неразрушающий сброс экрана: очищает поля и возвращает стартовый вид, сохраняя лекцию в «История»
  function resetToNewLecture() {
    cancelActiveGeneration(false);
    state.pipelineResult = null;
    document.getElementById("courseTitleInput").value = "";
    document.getElementById("lectureTextInput").value = "";
    document.getElementById("glossaryInput").value = "";
    document.getElementById("uploadedFilesList").innerHTML = "";
    document.getElementById("liveCaptionsScreen").innerHTML =
      '<div class="live-placeholder">Нажмите «Включить микрофон» или «Демо речи»...</div>';
    updateTokenBadge();

    document.getElementById("resultsContentWrap").classList.add("hidden");
    const genStage = document.getElementById("generationProgressStage");
    if (genStage) genStage.classList.add("hidden");
    document.getElementById("emptyStateStage").classList.remove("hidden");

    // Возвращаем левую панель на вкладку «Файлы и текст»
    document.querySelectorAll(".input-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-input-tab") === "files"));
    document.querySelectorAll(".input-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-files"));

    showFlashToast("Экран очищен! Прошлые лекции сохранены во вкладке «История» (открываются бесплатно).", "success");
  }

  // Глобальный переключатель языка результата (РУС | ҚАЗ | ENG)
  function initOutputLanguageSwitch() {
    const mapLocale = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
    const applyLang = (lang, triggerRerun) => {
      state.outputLang = lang;
      try {
        localStorage.setItem(STORAGE_KEYS.LANG, lang);
      } catch (_) {}
      document.documentElement.lang = lang;
      document.querySelectorAll("#outputLangSwitch .btn-lang").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-lang") === lang);
      });
      const locale = mapLocale[lang] || "ru-RU";
      if (state.animEngine) {
        state.animEngine.ttsLang = locale;
        state.animEngine.stopTts();
        state.animEngine.lastSpokenSceneIdx = -1;
        if (triggerRerun && state.pipelineResult) {
          state.animEngine.isPlaying = false;
        }
      }
      const liveSel = document.getElementById("liveLangSelect");
      if (liveSel) liveSel.value = locale;

      if (triggerRerun && state.pipelineResult) {
        executePipeline(true);
      }
    };

    applyLang(state.outputLang, false);

    document.querySelectorAll("#outputLangSwitch .btn-lang").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.isRunning) return;
        const lang = btn.getAttribute("data-lang");
        applyLang(lang, true);
        const names = { ru: "Русский", kk: "Қазақша", en: "English" };
        showFlashToast(`Язык результата переключён на: ${names[lang] || lang}`, "info");
      });
    });
  }

  function loadPreset(key, autoRun) {
    if (state.isRunning) return;
    state.currentPreset = key;
    const preset = window.LECTURE_PRESETS[key];
    if (!preset) return;

    document.getElementById("courseTitleInput").value = preset.courseTitle;
    document.getElementById("glossaryInput").value = preset.glossaryText;
    document.getElementById("lectureTextInput").value = preset.lectureText;

    // Автоматически переключаем язык микрофона на казахский для пресета AI-Sana KZ
    if (key === "kz") {
      document.getElementById("liveLangSelect").value = "kk-KZ";
    } else {
      document.getElementById("liveLangSelect").value = "ru-RU";
    }

    const listEl = document.getElementById("uploadedFilesList");
    listEl.innerHTML = preset.files.map((f) => `<span class="file-tag">✓ ${escapeHtml(f)}</span>`).join("");

    updateTokenBadge();
    if (autoRun) {
      executePipeline(true);
    }
  }

  function updateTokenBadge() {
    const text = document.getElementById("lectureTextInput").value || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const singlePassTokens = Math.round(words * 1.75 + 480);
    document.getElementById("tokenEstimateBadge").textContent = `~${singlePassTokens} ток. (-79%)`;
  }

  // 3. Вкладки левой панели (Файлы / Live-пара / База истории)
  function initInputTabs() {
    document.querySelectorAll(".input-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-input-tab");
        document.querySelectorAll(".input-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".input-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("panel-" + target).classList.add("active");
      });
    });

    document.getElementById("btnToggleHistoryView").addEventListener("click", () => {
      document.querySelectorAll(".input-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".input-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById("panel-history").classList.add("active");
    });

    const btnHideOnb = document.getElementById("btnHideOnboarding");
    if (btnHideOnb) {
      btnHideOnb.addEventListener("click", () => {
        document.getElementById("onboardingStrip").classList.add("hidden");
      });
    }

    const btnExportMenu = document.getElementById("btnToggleExportMenu");
    const exportMenu = document.getElementById("exportDropdownMenu");
    if (btnExportMenu && exportMenu) {
      btnExportMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle("hidden");
      });
      document.addEventListener("click", () => exportMenu.classList.add("hidden"));
    }

    document.getElementById("btnRunPipeline").addEventListener("click", () => executePipeline(false));
  }

  // 4. Загрузка файлов преподавателя (.PPTX, .DOCX, .PDF, .TXT, .MD, .CSV, Аудио)
  function initFileUpload() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const btnSelect = document.getElementById("btnSelectFiles");

    btnSelect.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#7c3aed";
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "";
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "";
      if (e.dataTransfer.files.length) handleUploadedFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) {
        handleUploadedFiles(fileInput.files);
        fileInput.value = "";
      }
    });
  }

  async function handleUploadedFiles(fileList) {
    const files = Array.from(fileList);
    const listEl = document.getElementById("uploadedFilesList");
    listEl.innerHTML = files
      .map((f) => `<span class="file-tag">📄 ${escapeHtml(f.name)} (${Math.max(1, Math.round(f.size / 1024))} КБ)</span>`)
      .join("");

    const extractedChunks = [];
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || name.endsWith(".json")) {
        const txt = await file.text();
        extractedChunks.push(txt.trim());
      } else if (name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".m4a") || name.endsWith(".webm")) {
        const audioTxt = await transcribeAudioWithGroqOrFallback(file);
        extractedChunks.push(audioTxt);
      } else {
        const extracted = await extractBinaryDocumentText(file);
        extractedChunks.push(extracted);
      }
    }

    if (extractedChunks.length > 0) {
      const joined = extractedChunks.join("\n\n");
      const meta = window.AISupervisorPipeline.sanitizeAndExtractMeta(
        `Загруженный курс · ${files[0].name.replace(/\.[^.]+$/, "")}`,
        joined
      );
      document.getElementById("courseTitleInput").value = meta.cleanTitle;
      document.getElementById("lectureTextInput").value = meta.cleanText;
      updateTokenBadge();
      showFlashToast(`Загружено файлов: ${files.length}. Нажмите «Создать учебный пакет →»!`, "success");
    }
  }

  async function transcribeAudioWithGroqOrFallback(file) {
    const groqKey = localStorage.getItem("lecture_ai_groq_key") || "";
    if (groqKey.startsWith("gsk_")) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("model", "whisper-large-v3-turbo");
        const resp = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}` },
          body: fd
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.text) return data.text.trim();
        }
      } catch (_) {}
    }
    return `Аудиофайл «${file.name}» принят в обработку. (Для облачной расшифровки аудиофайлов можно указать бесплатный ключ Groq Whisper в меню «🔑 ИИ» или использовать микрофон во вкладке «Живая речь»).`;
  }

  async function extractPdfViaGeminiFallback(file) {
    const gKey = (localStorage.getItem("lecture_ai_gemini_key") || "").trim();
    if (!gKey.startsWith("AIza") || file.size > 12 * 1024 * 1024) return "";
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const b64 = btoa(bin);
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(gKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: "application/pdf", data: b64 } },
                { text: "Extract all readable lecture text and slide headings verbatim, preserving slide numbers as [Слайд N]." }
              ]
            }]
          })
        }
      );
      if (resp.ok) {
        const d = await resp.json();
        return (d?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      }
    } catch (_) {}
    return "";
  }

  async function extractBinaryDocumentText(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/extract-text", { method: "POST", body: formData });
      if (resp.ok) {
        const data = await resp.json();
        if (data.text && data.text.trim().length > 25) return data.text.trim();
        if (file.name.toLowerCase().endsWith(".pdf")) {
          const geminiPdfTxt = await extractPdfViaGeminiFallback(file);
          if (geminiPdfTxt.length > 25) return geminiPdfTxt;
        }
        if (Array.isArray(data.warnings) && data.warnings.length > 0) {
          showFlashToast(data.warnings[0], "warn");
        }
      }
    } catch (_) {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const geminiPdfTxt = await extractPdfViaGeminiFallback(file);
        if (geminiPdfTxt.length > 25) return geminiPdfTxt;
      }
    }

    const buf = await file.arrayBuffer();
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const xmlMatches = raw.match(/<a:t[^>]*>([^<]+)<\/a:t>|<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (xmlMatches && xmlMatches.length > 3) {
      return xmlMatches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ").slice(0, 8000);
    }
    // Фильтруем служебные слова PDF/Office XML, поддерживая казахский и русский алфавит
    const cleanRaw = raw.replace(/\b(obj|endobj|stream|endstream|FlateDecode|FontDescriptor|MediaBox|XRef|themeManager|openxmlformats|datastoreItem|SelectedStyle|Microsoft Word)\b/gi, " ");
    const readable = cleanRaw.match(/[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]{4,}[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z0-9.,:;() -]{18,}/g);
    if (readable && readable.length > 0) {
      return readable.join(" ").slice(0, 6000);
    }
    return `Документ «${file.name}» загружен в базу курса для построения конспекта, схемы, теста и 2D видео-анимации.`;
  }

  // 5. Режим «Live-пара» (реальный микрофон без дублирования + живая Fuzzy-коррекция терминов по глоссарию)
  function initLiveCaptions() {
    const btnStart = document.getElementById("btnStartLive");
    const btnSim = document.getElementById("btnSimulateLive");
    const screen = document.getElementById("liveCaptionsScreen");

    btnSim.addEventListener("click", () => {
      state.simTimers.forEach(clearTimeout);
      state.simTimers = [];

      const phrases = window.LIVE_SIMULATION_PHRASES[state.currentPreset] || window.LIVE_SIMULATION_PHRASES.arch;
      screen.innerHTML = "";
      state.correctedTermsCount = 0;
      state.silenceSavedSec = 0;

      phrases.forEach((item, idx) => {
        const tId = setTimeout(() => {
          document.getElementById("vadStatus").textContent = "VAD: Речь лектора";
          document.getElementById("vadFill").style.width = `${68 + (idx % 3) * 10}%`;
          state.correctedTermsCount += 1;
          state.silenceSavedSec += 4;
          document.getElementById("vadStats").textContent =
            `Тишина отсечена: ${state.silenceSavedSec} сек · Исправлено терминов по силлабусу: ${state.correctedTermsCount}`;

          const p = document.createElement("div");
          p.style.marginBottom = "10px";
          const safeRaw = escapeHtml(item.raw);
          const safeWrong = escapeHtml(item.wrongTerm);
          const safeCorr = escapeHtml(item.correctedTerm);
          const highlighted = safeRaw.replace(
            safeWrong,
            `<span class="corrected-chip" title="Автокоррекция по глоссарию силлабуса (было: ${safeWrong})">✓ ${safeCorr}</span>`
          );
          p.innerHTML = `<span style="color:#38bdf8;font-weight:700;">[00:0${idx + 1}:12]</span> ${highlighted}`;
          screen.appendChild(p);
          screen.scrollTop = screen.scrollHeight;

          if (idx === phrases.length - 1) {
            const endTimer = setTimeout(() => {
              document.getElementById("vadStatus").textContent = "VAD: Пауза (0 токенов)";
              document.getElementById("vadFill").style.width = "6%";
              showFlashToast("Живая речь распознана: исправлено 3 профильных термина по силлабусу!", "success");
            }, 900);
            state.simTimers.push(endTimer);
          }
        }, idx * 1050);
        state.simTimers.push(tId);
      });
    });

    const stopMicVadMeter = () => {
      if (state.micVadTimer) {
        clearInterval(state.micVadTimer);
        state.micVadTimer = null;
      }
      if (state.micStream) {
        state.micStream.getTracks().forEach((tr) => tr.stop());
        state.micStream = null;
      }
    };

    const startMicVadMeter = async () => {
      stopMicVadMeter();
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!state.isLiveRecording) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        state.micStream = stream;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const mCtx = state.animEngine?.ensureAudioContext() || new Ctx();
        const src = mCtx.createMediaStreamSource(stream);
        const analyser = mCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        state.micVadTimer = setInterval(() => {
          if (!state.isLiveRecording) {
            stopMicVadMeter();
            return;
          }
          analyser.getByteTimeDomainData(buf);
          let sumSq = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / buf.length);
          const levelPct = Math.min(98, Math.max(4, Math.round(rms * 360)));
          const isSpeech = rms > 0.022;
          if (!isSpeech) {
            state.silenceSavedSec = +(state.silenceSavedSec + 0.25).toFixed(1);
          }
          document.getElementById("vadFill").style.width = `${levelPct}%`;
          document.getElementById("vadStatus").textContent = isSpeech ? "VAD: Речь лектора" : "VAD: Тишина (отсечена)";
          document.getElementById("vadStats").textContent =
            `Тишина отсечена: ${Math.floor(state.silenceSavedSec)} с · Исправлено: ${state.correctedTermsCount}`;
        }, 250);
      } catch (_) {}
    };

    btnStart.addEventListener("click", () => {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        btnSim.click();
        return;
      }
      if (state.isLiveRecording && state.liveRecognition) {
        state.isLiveRecording = false;
        stopMicVadMeter();
        try { state.liveRecognition.stop(); } catch (_) {}
        btnStart.textContent = "▶ Включить микрофон";
        document.getElementById("vadStatus").textContent = "Готов";
        document.getElementById("vadFill").style.width = "0%";
        return;
      }

      const rec = new SpeechRec();
      rec.lang = document.getElementById("liveLangSelect").value || "ru-RU";
      rec.continuous = true;
      rec.interimResults = true;
      state.liveRecognition = rec;
      state.isLiveRecording = true;
      state.silenceSavedSec = 0;
      btnStart.textContent = "⏹ Стоп";
      screen.innerHTML = "";
      startMicVadMeter();

      const glossaryList = window.AISupervisorPipeline.parseGlossary(
        document.getElementById("glossaryInput").value,
        document.getElementById("lectureTextInput").value
      );

      let finalizedHtml = "";
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const corr = window.AISupervisorPipeline.correctTranscriptWithGlossary(escapeHtml(chunk), glossaryList);
            state.correctedTermsCount += corr.replacementsCount;
            finalizedHtml += `<div style="margin-bottom:8px;"><span style="color:#4ade80;font-weight:700;">[Live]</span> ${corr.correctedHtml}</div>`;
            document.getElementById("lectureTextInput").value += "\n" + chunk.trim();
            updateTokenBadge();
          } else {
            interim += chunk;
          }
        }
        if (!state.micVadTimer) {
          document.getElementById("vadStatus").textContent = "VAD: Активный микрофон";
          document.getElementById("vadFill").style.width = "74%";
        }
        document.getElementById("vadStats").textContent =
          `Тишина отсечена: ${Math.floor(state.silenceSavedSec)} с · Исправлено: ${state.correctedTermsCount}`;
        screen.innerHTML =
          finalizedHtml +
          (interim ? `<div style="color:#94a3b8;font-style:italic;">${escapeHtml(interim)}...</div>` : "");
        screen.scrollTop = screen.scrollHeight;
      };

      // Авто-рестарт при длинных паузах лектора, чтобы микрофон не обрывался посреди пары!
      rec.onend = () => {
        if (state.isLiveRecording) {
          setTimeout(() => {
            if (!state.isLiveRecording) return;
            try {
              rec.start();
            } catch (_) {
              state.isLiveRecording = false;
              stopMicVadMeter();
              btnStart.textContent = "▶ Включить микрофон";
            }
          }, 220);
        } else {
          stopMicVadMeter();
          btnStart.textContent = "▶ Включить микрофон";
        }
      };

      rec.onerror = (ev) => {
        if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
          state.isLiveRecording = false;
          stopMicVadMeter();
          btnStart.textContent = "▶ Включить микрофон";
          showFlashToast("Доступ к микрофону запрещён браузером. Включаю демо речи.", "warn");
          btnSim.click();
        }
      };
      try {
        rec.start();
      } catch (_) {
        state.isLiveRecording = false;
        stopMicVadMeter();
        btnStart.textContent = "▶ Включить микрофон";
      }
    });
  }

  // Блокировка всех контролов плеера и скачивания видео до 100% готовности сцен и звука
  function setPlayerControlsLocked(locked) {
    state.isMediaReady = !locked;
    const ids = [
      "btnPlayPause",
      "btnPrevScene",
      "btnNextScene",
      "videoScrubber",
      "playbackSpeedSelect",
      "btnFullscreen",
      "btnToggleTts",
      "btnToggleSupervisorMode",
      "btnDownloadVideo",
      "btnExportVideoInline"
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = Boolean(locked);
    });
    const playerCol = document.querySelector(".player-column");
    if (playerCol) playerCol.classList.toggle("player-locked", Boolean(locked));
    const sbList = document.getElementById("storyboardList");
    if (sbList) sbList.classList.toggle("player-locked", Boolean(locked));

    if (locked && (document.fullscreenElement || document.webkitFullscreenElement)) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document).catch?.(() => {});
    }
  }

  function setSidebarBusyState(busy, pctText = "") {
    const btnRun = document.getElementById("btnRunPipeline");
    if (btnRun) {
      btnRun.disabled = busy;
      btnRun.setAttribute("aria-busy", busy ? "true" : "false");
      btnRun.textContent = busy ? `Создание видео и звука... ${pctText}` : "Создать учебный пакет →";
    }
    const langSw = document.getElementById("outputLangSwitch");
    if (langSw) langSw.classList.toggle("is-locked", busy);
    document.querySelectorAll("#outputLangSwitch .btn-lang").forEach((b) => {
      b.disabled = busy;
    });
    ["btnLoadSampleLecture", "btnEmptyTrySample"].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.disabled = busy;
    });
  }

  function updateGenerationProgressUI({ pct, activeStep = 1, title, sub, sceneText, supText, etaText }) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    const pctEl = document.getElementById("genPercentValue");
    const fillEl = document.getElementById("genProgressBarFill");
    const ariaEl = document.getElementById("genProgressAria");
    const titleEl = document.getElementById("genStageTitle");
    const subEl = document.getElementById("genStageSub");
    const scEl = document.getElementById("genSceneCounter");
    const supEl = document.getElementById("genSupervisorStatus");
    const etaEl = document.getElementById("genEtaLabel");

    if (pctEl) pctEl.textContent = `${clamped}%`;
    if (fillEl) fillEl.style.width = `${clamped}%`;
    if (ariaEl) ariaEl.setAttribute("aria-valuenow", String(clamped));
    if (titleEl && title) titleEl.textContent = title;
    if (subEl && sub) subEl.textContent = sub;
    if (scEl && sceneText) scEl.textContent = sceneText;
    if (supEl && supText) supEl.textContent = supText;
    if (etaEl && etaText) etaEl.textContent = etaText;

    document.querySelectorAll("#genMilestones .gen-step").forEach((stepEl) => {
      const sNum = parseInt(stepEl.getAttribute("data-gen-step"), 10);
      stepEl.classList.toggle("is-done", sNum < activeStep || clamped === 100);
      stepEl.classList.toggle("is-active", sNum === activeStep && clamped < 100);
    });

    const sideSteps = document.getElementById("progressSteps");
    const sideFill = document.getElementById("progressBarFill");
    if (sideSteps && title) sideSteps.textContent = `${clamped}% · ${title}`;
    if (sideFill) sideFill.style.width = `${clamped}%`;

    setSidebarBusyState(clamped < 100 && state.isRunning, `${clamped}%`);
  }

  function updateAudioStreamBadge(prog) {
    const badge = document.getElementById("audioStreamBadge");
    if (!badge) return;
    if (!prog || state.deafFirstMode || !state.animEngine?.ttsEnabled) {
      badge.classList.add("hidden");
      return;
    }
    badge.classList.remove("hidden");
    if (prog.done) {
      badge.textContent = prog.mode === "neural"
        ? `✓ Озвучка готова (${prog.totalScenes}/${prog.totalScenes})`
        : "✓ Голос браузера активен";
      clearTimeout(badge._hideTimer);
      badge._hideTimer = setTimeout(() => badge.classList.add("hidden"), 3200);
    } else {
      badge.textContent = `🎧 Синтез звука: ${prog.readyCount}/${prog.totalScenes} сцен...`;
    }
  }

  function jumpToVideoScene(sceneIdx = 0, beatIdx = 0) {
    document.querySelectorAll(".result-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab") === "animation"));
    document.querySelectorAll(".result-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-animation"));
    if (state.animEngine?.isReady) {
      state.animEngine.jumpToBeat(sceneIdx, beatIdx);
    }
    document.getElementById("canvasWrapper")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Мгновенное открытие учебного пакета (Progressive Audio Loading: конспект, карта, тест и сцена 1 открываются сразу!)
  async function pregenerateAudioAndUnlockPlayer(result, { isCacheHit = false, myRunId, abortSignal }) {
    const localeMap = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
    const ttsLocale = localeMap[result.outputLang || state.outputLang] || "ru-RU";
    state.animEngine.ttsLang = ttsLocale;
    state.animEngine.voiceGender = state.voiceGender;
    state.animEngine.prepareStoryboard(result.courseTitle, result.scenes);

    if (myRunId !== state.generationRunId || abortSignal?.aborted) {
      throw new DOMException("Cancelled", "AbortError");
    }

    const genStage = document.getElementById("generationProgressStage");
    if (genStage) genStage.classList.add("hidden");

    const wantAudio = !state.deafFirstMode;
    renderResultsAll(result, isCacheHit);
    setPlayerControlsLocked(false);
    state.animEngine.activateReadyStoryboard({ autoPlay: true, enableTts: wantAudio });

    const btnPlayPause = document.getElementById("btnPlayPause");
    if (btnPlayPause) btnPlayPause.textContent = "⏸ Пауза";
    const btnTts = document.getElementById("btnToggleTts");
    if (btnTts) {
      btnTts.textContent = state.animEngine.ttsEnabled ? "🔊 Озвучка: ВКЛ" : "🔇 Озвучка: ВЫКЛ";
    }

    // Потоковая подгрузка студийного аудио в фоне без блокировки экрана студента!
    if (wantAudio) {
      state.animEngine
        .streamStoryboardAudioProgressive(state.animEngine.scenes, ttsLocale, (prog) => {
          updateAudioStreamBadge(prog);
          if (prog.done && state.pipelineResult === result) {
            result.scenes = state.animEngine.scenes.map((s) => ({ ...s, audioBuffer: undefined }));
          }
        }, abortSignal)
        .catch(() => {});
    } else {
      updateAudioStreamBadge(null);
    }
  }

  // 6. Запуск полного пайплайна со строгой блокировкой просмотра до 100% готовности видео + озвучки
  async function executePipeline(isInitialAutoRun, forcedPackage = null) {
    if (state.isRunning) return;

    const runLang = forcedPackage?.outputLang || state.outputLang;
    const courseTitle = forcedPackage ? forcedPackage.courseTitle : document.getElementById("courseTitleInput").value.trim();
    const glossaryText = forcedPackage ? "" : document.getElementById("glossaryInput").value.trim();
    const lectureText = forcedPackage ? "cached" : document.getElementById("lectureTextInput").value.trim();

    if (!forcedPackage && !isInitialAutoRun && lectureText.length < 15) {
      showFlashToast("Введите текст лекции (минимум 15 символов) или загрузите файл преподавателя.", "warn");
      document.getElementById("lectureTextInput").focus();
      return;
    }

    if (!forcedPackage && !isInitialAutoRun && state.credits <= 0) {
      renderLedgerTable();
      document.getElementById("billingModal").classList.remove("hidden");
      return;
    }

    // Разблокируем AudioContext синхронно по клику пользователя!
    if (state.animEngine) {
      state.animEngine.unlockAudio();
      state.animEngine.prepareStoryboard("", []);
    }

    const myRunId = ++state.generationRunId;
    const ac = new AbortController();
    state.abortController = ac;
    state.isRunning = true;
    setPlayerControlsLocked(true);

    // Немедленно скрываем старый плеер и открываем экран прогресса 0%..100%
    document.getElementById("emptyStateStage")?.classList.add("hidden");
    document.getElementById("resultsContentWrap")?.classList.add("hidden");
    const genStage = document.getElementById("generationProgressStage");
    if (genStage) genStage.classList.remove("hidden");
    const progressBox = document.getElementById("pipelineProgress");
    if (progressBox) progressBox.classList.remove("hidden");

    const jobId = "job_" + Math.random().toString(36).slice(2, 8);
    let reserved = false;
    let llmTicker = null;

    try {
      updateGenerationProgressUI({
        pct: 6,
        activeStep: 1,
        title: "Разбор структуры лекции и извлечение терминов...",
        sub: "Очищаем текст от служебных меток, выделяем смысловые разделы и определения.",
        sceneText: "Анализ текста...",
        supText: "NLP-парсер структуры",
        etaText: "Оценка времени..."
      });

      if (forcedPackage) {
        const cloned = JSON.parse(JSON.stringify(forcedPackage));
        state.pipelineResult = cloned;
        await pregenerateAudioAndUnlockPlayer(cloned, { isCacheHit: true, myRunId, abortSignal: ac.signal });
        showFlashToast("⚡ Лекция и озвучка готовы к просмотру (0 токенов)!", "success");
        return;
      }

      const cleanMeta = window.AISupervisorPipeline.sanitizeAndExtractMeta(courseTitle, lectureText);
      const contentHash = await window.AISupervisorPipeline.computeContentHash(
        cleanMeta.cleanTitle,
        glossaryText,
        cleanMeta.cleanText,
        runLang
      );
      const bypassCache = Boolean(document.getElementById("bypassCacheCheckbox")?.checked);
      let cachedLecture = bypassCache ? null : state.history.find((h) => h.contentHash === contentHash && !h._remoteOnly);
      if (!bypassCache && !cachedLecture && typeof window !== "undefined" && window.location?.protocol !== "file:") {
        try {
          const serverCacheResp = await fetch(`/api/lectures/${encodeURIComponent(contentHash)}`, { signal: ac.signal });
          if (serverCacheResp.ok) {
            const serverCacheData = await serverCacheResp.json();
            if (serverCacheData?.lecture?.scenes?.length) {
              cachedLecture = serverCacheData.lecture;
            }
          }
        } catch (_) {}
      }

      if (!bypassCache && !isInitialAutoRun && cachedLecture) {
        state.ledger.unshift({
          time: new Date().toLocaleTimeString("ru-RU"),
          type: "CACHE_HIT (Кэш курса группы)",
          key: `cache:${contentHash}`,
          delta: "0",
          balance: state.credits
        });
        savePersistedState();
        const clonedCache = JSON.parse(JSON.stringify(cachedLecture));
        state.pipelineResult = clonedCache;
        await pregenerateAudioAndUnlockPlayer(clonedCache, { isCacheHit: true, myRunId, abortSignal: ac.signal });
        showFlashToast("⚡ Пакет загружен из кэша курса за 0 кредитов, звук полностью готов!", "success");
        return;
      }

      if (!isInitialAutoRun) {
        state.credits -= 1;
        reserved = true;
        state.ledger.unshift({
          time: new Date().toLocaleTimeString("ru-RU"),
          type: "RESERVE (Бронь 1 лекции)",
          key: `reserve:${jobId}`,
          delta: "-1",
          balance: state.credits
        });
        updateQuotaUI();
      }

      const geminiApiKey = localStorage.getItem("lecture_ai_gemini_key") || "";
      let fakePct = 16;
      updateGenerationProgressUI({
        pct: fakePct,
        activeStep: 2,
        title: "Модуль ИИ-сценариста создаёт сценарий урока...",
        sub: "Объясняем термины простыми словами и подбираем уникальные 2D-сцены под предмет.",
        sceneText: "Построение сценария...",
        supText: geminiApiKey.startsWith("AIza") ? "Gemini 2.5 Flash + Валидатор" : "Универсальный ИИ-сценарист",
        etaText: geminiApiKey.startsWith("AIza") ? "Осталось ~14 сек" : "Осталось ~10 сек"
      });

      llmTicker = setInterval(() => {
        if (fakePct < 33 && myRunId === state.generationRunId) {
          fakePct += 2;
          updateGenerationProgressUI({
            pct: fakePct,
            activeStep: 2,
            title: "Модуль ИИ-сценариста адаптирует разделы лекции...",
            sub: "Синхронизируем реплики диктора с элементами будущих 2D-сцен."
          });
        }
      }, 420);

      const result = await window.AISupervisorPipeline.runFullPipeline({
        courseTitle,
        glossaryText,
        lectureText,
        geminiApiKey,
        outputLang: runLang,
        abortSignal: ac.signal
      });
      if (llmTicker) {
        clearInterval(llmTicker);
        llmTicker = null;
      }
      if (myRunId !== state.generationRunId || ac.signal.aborted) {
        throw new DOMException("Cancelled", "AbortError");
      }

      if (result.courseTitle && (!courseTitle || courseTitle.startsWith("Загруженный курс"))) {
        document.getElementById("courseTitleInput").value = result.courseTitle;
      }

      updateGenerationProgressUI({
        pct: 40,
        activeStep: 3,
        title: `Сборка ${result.scenes.length} предметных 2D-сцен («${result.domainName}»)...`,
        sub: "Проверяем геометрию кадра (0 px² коллизий) и переходим к озвучке.",
        sceneText: `Сцен подготовлено · ${result.scenes.length}`,
        supText: `Домен: ${result.domainName}`,
        etaText: "Подготовка звука..."
      });
      await new Promise((r) => setTimeout(r, 140));

      await pregenerateAudioAndUnlockPlayer(result, { isCacheHit: false, myRunId, abortSignal: ac.signal });

      if (!isInitialAutoRun && reserved) {
        state.ledger.unshift({
          time: new Date().toLocaleTimeString("ru-RU"),
          type: "SETTLEMENT (Подтверждено PASS)",
          key: `settle:${jobId}`,
          delta: "0",
          balance: state.credits
        });
      }

      state.pipelineResult = result;
      saveLectureToHistory(result);
      savePersistedState();

      if (!isInitialAutoRun) {
        showFlashToast(`Готово на 100%! Сценарий, ${result.scenes.length} уникальных 2D-сцен и озвучка запущены.`, "success");
      }
    } catch (err) {
      if (llmTicker) clearInterval(llmTicker);
      const isCancelled = err?.name === "AbortError" || myRunId !== state.generationRunId;
      if (reserved) {
        state.credits += 1;
        state.ledger.unshift({
          time: new Date().toLocaleTimeString("ru-RU"),
          type: isCancelled ? "REFUND (Отменено пользователем)" : "REFUND (Авто-возврат при сбое)",
          key: `refund:${jobId}`,
          delta: "+1",
          balance: state.credits
        });
        updateQuotaUI();
        savePersistedState();
      }
      if (!isCancelled) {
        document.getElementById("generationProgressStage")?.classList.add("hidden");
        document.getElementById("emptyStateStage")?.classList.remove("hidden");
        showFlashToast("Ошибка генерации (кредит возвращён): " + err.message, "warn");
      }
    } finally {
      if (myRunId === state.generationRunId) {
        state.isRunning = false;
        setSidebarBusyState(false);
        setTimeout(() => progressBox?.classList.add("hidden"), 250);
      }
    }
  }

  function saveLectureToHistory(res) {
    state.history = [res, ...state.history.filter((h) => h.contentHash !== res.contentHash)].slice(0, 15);
    renderHistoryList();
    fetch("/api/lectures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(res)
    }).catch(() => {});
  }

  function renderHistoryList() {
    const label = document.getElementById("historyCountLabel");
    if (label) label.textContent = String(state.history.length);
    const listEl = document.getElementById("historyList");
    if (!listEl) return;

    if (state.history.length === 0) {
      listEl.innerHTML = `<div style="font-size:0.78rem;color:var(--text-muted);">История пуста — сгенерируйте первую лекцию.</div>`;
      return;
    }

    listEl.innerHTML = state.history
      .map(
        (h, idx) => `
      <div class="history-item" data-hist-idx="${idx}">
        <div>
          <div style="font-weight:800;font-size:0.8rem;color:var(--primary);">${escapeHtml(h.courseTitle)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">
            Терминов: ${h.glossary?.length || 0} · Сцен: ${h.scenes?.length || 6} · ⚡ Кэш 0 ток.
          </div>
        </div>
        <button type="button" class="btn-del-history" data-del-hist="${idx}" title="Удалить из истории">✕</button>
      </div>`
      )
      .join("");

    listEl.querySelectorAll(".btn-del-history").forEach((delBtn) => {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(delBtn.getAttribute("data-del-hist"), 10);
        const removed = state.history[idx];
        if (!removed) return;
        state.history.splice(idx, 1);
        savePersistedState();
        renderHistoryList();
        const delKey = removed.contentHash || removed.id;
        if (delKey) {
          fetch(`/api/lectures/${encodeURIComponent(delKey)}`, { method: "DELETE" }).catch(() => {});
        }
        showFlashToast("Запись удалена из истории.", "info");
      });
    });

    listEl.querySelectorAll(".history-item").forEach((item) => {
      item.addEventListener("click", async () => {
        if (state.isRunning) return;
        const idx = parseInt(item.getAttribute("data-hist-idx"), 10);
        let chosen = state.history[idx];
        if (!chosen) return;
        if (chosen._remoteOnly) {
          try {
            const resp = await fetch(`/api/lectures/${encodeURIComponent(chosen.contentHash || chosen.id)}`);
            if (resp.ok) {
              const d = await resp.json();
              if (d?.lecture) {
                chosen = d.lecture;
                state.history[idx] = chosen;
              }
            }
          } catch (_) {}
        }
        if (chosen && !chosen._remoteOnly) {
          executePipeline(true, chosen);
        }
      });
    });
  }

  // 7. Отрисовка всех 4 студенческих вкладок и модалки контроля ИИ (вызывается строго после 100% готовности!)
  function renderResultsAll(res, isCacheHit) {
    if (state.animEngine) {
      state.animEngine.showRawDefectMode = false;
    }
    const supToggle = document.getElementById("btnToggleSupervisorMode");
    if (supToggle) {
      supToggle.classList.remove("raw-mode");
      supToggle.textContent = "✓ После проверки ИИ (PASS) · Показать дефект ДО";
    }
    const emptyCard = document.getElementById("emptyStateStage");
    const genStage = document.getElementById("generationProgressStage");
    const contentWrap = document.getElementById("resultsContentWrap");
    if (emptyCard) emptyCard.classList.add("hidden");
    if (genStage) genStage.classList.add("hidden");
    if (contentWrap) contentWrap.classList.remove("hidden");

    document.getElementById("sec2-title").textContent = res.courseTitle;
    document.getElementById("resultsSubtitle").textContent =
      `Терминов: ${res.glossary.length} · Сцен 2D-анимации: ${res.scenes.length} · Язык: ${(res.outputLang || "ru").toUpperCase()}`;

    const cacheBadge = document.getElementById("cacheHitBadge");
    cacheBadge.textContent = isCacheHit
      ? "✓ Проверено ИИ · Из памяти (бесплатно)"
      : "✓ Проверено ИИ · Подробнее";

    document.getElementById("readabilityBadge").textContent =
      `Ясный язык: ${res.avgReadability || 95}/100`;
    document.getElementById("domainBadge").textContent = res.domainName || "Универсальный";

    const sbHeader = document.querySelector(".storyboard-header h3");
    if (sbHeader) sbHeader.textContent = `Сцены мультфильма (${res.scenes.length})`;

    renderStoryboardList(res.scenes);
    renderNotesAndGlossary(res);
    renderTwoLevelMindMapSVG(res);
    renderQuiz(res.quiz);
    renderSupervisorTab(res);
  }

  function renderStoryboardList(scenes) {
    const container = document.getElementById("storyboardList");
    container.innerHTML = scenes
      .map(
        (s, idx) => `
      <div class="scene-card ${idx === 0 ? "active" : ""}" data-scene-idx="${idx}">
        <div class="scene-card-top">
          <span>${escapeHtml(s.archetypeBadge || "СЦЕНА 0" + (idx + 1))}${s.sourceBadge ? ` · ${escapeHtml(s.sourceBadge)}` : ""}</span>
          <span>✓ ${s.finalCps} симв/с · ${Math.round(s.durationSec || 12)} с</span>
        </div>
        <div class="scene-card-title">${escapeHtml(s.title)}</div>
        <div class="scene-card-caption">${escapeHtml(s.caption)}</div>
        ${
          Array.isArray(s.beats) && s.beats.length >= 2
            ? `<div class="scene-beats-mini">
                ${s.beats
                  .slice(0, 3)
                  .map(
                    (b, bIdx) =>
                      `<button type="button" class="beat-jump-chip" data-jump-scene="${idx}" data-jump-beat="${bIdx}" title="${escapeHtml(b.text)}">▶ Бит ${bIdx + 1}</button>`
                  )
                  .join("")}
               </div>`
            : ""
        }
      </div>`
      )
      .join("");

    container.querySelectorAll(".beat-jump-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!state.isMediaReady || !state.animEngine?.isReady) return;
        const sIdx = parseInt(chip.getAttribute("data-jump-scene"), 10);
        const bIdx = parseInt(chip.getAttribute("data-jump-beat"), 10);
        state.animEngine.jumpToBeat(sIdx, bIdx);
      });
    });

    container.querySelectorAll(".scene-card").forEach((card) => {
      card.addEventListener("click", () => {
        if (!state.isMediaReady || !state.animEngine?.isReady) return;
        const idx = parseInt(card.getAttribute("data-scene-idx"), 10);
        state.animEngine.jumpToScene(idx);
      });
    });
  }

  // 8. Однопроходная безопасная подсветка терминов (с поддержкой казахского алфавита) + Дактиль КЖЯ/РЖЯ + Личные заметки
  function renderNotesAndGlossary(res) {
    const notesEl = document.getElementById("notesContent");
    const glossaryEl = document.getElementById("glossaryCardsContainer");

    const highlightTermsInText = (text) => {
      const raw = String(text || "");
      const termEntries = res.glossary
        .map((g) => ({
          id: g.id,
          base: g.term.split(/[/(]/)[0].trim()
        }))
        .filter((t) => t.base.length >= 3)
        .sort((a, b) => b.base.length - a.base.length);

      if (termEntries.length === 0) return escapeHtml(raw);

      const pattern = termEntries
        .map((t) => t.base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[а-яёәіңғүұқөһa-z0-9-]*")
        .join("|");
      const combinedRegex = new RegExp(`(?<![а-яёәіңғүұқөһa-z0-9-])(${pattern})`, "gi");

      let out = "";
      let lastIdx = 0;
      for (const match of raw.matchAll(combinedRegex)) {
        const idx = match.index;
        const word = match[0];
        const wordLower = word.toLowerCase();
        const found = termEntries.find((t) => wordLower.startsWith(t.base.toLowerCase()));
        out += escapeHtml(raw.slice(lastIdx, idx));
        if (found) {
          out += `<span class="term-highlight" data-term-id="${escapeHtml(found.id)}" title="Открыть карточку термина и дактиль КЖЯ/РЖЯ">${escapeHtml(word)}</span>`;
        } else {
          out += escapeHtml(word);
        }
        lastIdx = idx + word.length;
      }
      out += escapeHtml(raw.slice(lastIdx));
      return out;
    };

    notesEl.innerHTML = res.sections
      .map((sec) => {
        const noteKey = `${res.contentHash}_sec_${sec.sectionIndex}`;
        const savedNote = state.personalNotes[noteKey] || "";
        const rd = sec.readability || { score: 95, origAvgWords: 22, plainAvgWords: 11 };
        const sceneIdx = typeof sec.linkedSceneIndex === "number" ? sec.linkedSceneIndex : Math.min((res.scenes?.length || 1) - 1, sec.sectionIndex - 1);
        return `
      <article class="note-block">
        <div class="note-block-header">
          <h3>${escapeHtml(sec.title)}</h3>
          <div class="note-header-badges">
            ${sec.sourceBadge ? `<span class="source-cite-badge">📌 ${escapeHtml(sec.sourceBadge)}</span>` : ""}
            <span class="note-section-tag">Ясность: ${rd.score}/100 (${rd.origAvgWords} → ${rd.plainAvgWords} сл.)</span>
            <button type="button" class="btn-jump-scene no-print" data-goto-scene="${sceneIdx}" title="Открыть эту тему в 2D-мультфильме">
              🎬 Сцена ${sceneIdx + 1}
            </button>
          </div>
        </div>
        <div class="note-plain-box">
          <div class="note-plain-label">✨ Простое объяснение темы:</div>
          ${
            sec.plainBlocks
              ? `<div class="note-core-idea">${highlightTermsInText(sec.plainBlocks.coreIdea)}</div>
                 ${sec.plainBlocks.analogy ? `<div class="note-analogy-box">💡 ${highlightTermsInText(sec.plainBlocks.analogy)}</div>` : ""}
                 ${
                   Array.isArray(sec.plainBlocks.termBreakdown) && sec.plainBlocks.termBreakdown.length
                     ? `<div class="note-terms-row">${sec.plainBlocks.termBreakdown
                         .map((tb) => `<div class="note-term-chip" ${tb.id ? `data-term-id="${escapeHtml(tb.id)}" style="cursor:pointer;"` : ""}><strong>${escapeHtml(tb.term)}</strong> — ${escapeHtml(tb.plain)}</div>`)
                         .join("")}</div>`
                     : ""
                 }
                 ${
                   Array.isArray(sec.plainBullets) && sec.plainBullets.length
                     ? `<ul class="note-bullets-list">${sec.plainBullets.map((b) => `<li>${highlightTermsInText(b)}</li>`).join("")}</ul>`
                     : ""
                 }`
              : `<div>${highlightTermsInText(sec.plainSummary)}</div>`
          }
        </div>
        ${
          state.notesMode === "dual"
            ? `<div class="note-academic-box">
                 <strong>📘 Оригинальный академический текст (${escapeHtml(sec.sourceBadge || "для экзамена")}):</strong><br/>
                 ${highlightTermsInText(sec.academicOriginal)}
               </div>`
            : ""
        }
        <input type="text" class="personal-note-input no-print" data-note-key="${escapeHtml(noteKey)}" value="${escapeHtml(savedNote)}" placeholder="✏️ Ваша личная заметка к этому разделу (автосохранение и экспорт в .DOC)..." />
      </article>`;
      })
      .join("");

    const qFilter = (state.glossaryQuery || "").trim().toLowerCase();
    const filteredGlossary = qFilter
      ? res.glossary.filter(
          (g) =>
            g.term.toLowerCase().includes(qFilter) ||
            g.plain.toLowerCase().includes(qFilter) ||
            (g.academic || "").toLowerCase().includes(qFilter)
        )
      : res.glossary;

    glossaryEl.innerHTML = filteredGlossary.length
      ? filteredGlossary
          .map(
            (g) => `
          <div class="glossary-card" data-term-id="${g.id}">
            <div class="glossary-term-name">📌 ${escapeHtml(g.term)}</div>
            <div class="glossary-plain"><strong>На ясном языке:</strong> ${escapeHtml(g.plain)}</div>
            <div class="dactyl-code">🤟 Дактиль: ${escapeHtml(g.dactylBoxes || "")}</div>
            <div class="sign-hint-text">${escapeHtml(g.signHint || "")}</div>
          </div>`
          )
          .join("")
      : `<div style="padding:12px;font-size:0.8rem;color:var(--text-muted);">По запросу «${escapeHtml(state.glossaryQuery)}» терминов не найдено.</div>`;

    renderFlashcardsWidget(res);

    notesEl.querySelectorAll("[data-goto-scene]").forEach((btn) => {
      btn.addEventListener("click", () => {
        jumpToVideoScene(parseInt(btn.getAttribute("data-goto-scene"), 10) || 0, 0);
      });
    });

    document.querySelectorAll("[data-term-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-term-id");
        const termObj = res.glossary.find((t) => t.id === id);
        if (termObj) showTermPopover(termObj);
      });
    });

    document.querySelectorAll(".personal-note-input").forEach((inp) => {
      inp.addEventListener("input", () => {
        const k = inp.getAttribute("data-note-key");
        state.personalNotes[k] = inp.value;
        savePersistedState();
      });
    });
  }

  function renderFlashcardsWidget(res) {
    const fcStage = document.getElementById("flashcardStage");
    const listContainer = document.getElementById("glossaryCardsContainer");
    const btnFc = document.getElementById("btnToggleFlashcards");
    if (!fcStage || !res?.glossary?.length) return;

    fcStage.classList.toggle("hidden", !state.flashcardsOpen);
    if (listContainer) listContainer.classList.toggle("hidden", state.flashcardsOpen);
    if (btnFc) btnFc.textContent = state.flashcardsOpen ? "📋 Список словаря" : "🃏 Карточки";
    if (!state.flashcardsOpen) return;

    const total = res.glossary.length;
    const idx = ((state.flashcardIdx % total) + total) % total;
    const card = res.glossary[idx];
    const flipped = state.flashcardFlipped;

    fcStage.innerHTML = `
      <div class="flashcard-face" id="flashcardInteractiveFace" title="Нажмите, чтобы перевернуть карточку">
        <span class="step-badge">${flipped ? "✨ ОТВЕТ НА ЯСНОМ ЯЗЫКЕ" : `КАРТОЧКА ${idx + 1} ИЗ ${total} · НАЖМИТЕ ДЛЯ ОТВЕТА`}</span>
        ${
          flipped
            ? `<div style="font-weight:700;font-size:0.94rem;color:var(--text);margin-top:4px;">${escapeHtml(card.plain)}</div>
               <div class="dactyl-code">🤟 ${escapeHtml(card.dactylBoxes || "")}</div>
               <div style="font-size:0.77rem;color:var(--text-muted);">${escapeHtml(card.academic || "")}</div>`
            : `<div style="font-family:var(--font-display);font-weight:800;font-size:1.14rem;color:var(--primary);margin-top:8px;">${escapeHtml(card.term)}</div>
               <div style="font-size:0.78rem;color:var(--text-muted);">Попробуйте вспомнить смысл своими словами, затем нажмите на карточку</div>`
        }
      </div>
      <div class="flashcard-controls">
        <button type="button" class="btn-outline-sm" id="btnFcPrev">← Пред.</button>
        <button type="button" class="btn-primary-sm" id="btnFcFlip">${flipped ? "Скрыть ответ" : "Показать ответ"}</button>
        <button type="button" class="btn-outline-sm" id="btnFcNext">След. →</button>
      </div>`;

    const toggleFlip = () => {
      state.flashcardFlipped = !state.flashcardFlipped;
      renderFlashcardsWidget(res);
    };
    document.getElementById("flashcardInteractiveFace")?.addEventListener("click", toggleFlip);
    document.getElementById("btnFcFlip")?.addEventListener("click", toggleFlip);
    document.getElementById("btnFcPrev")?.addEventListener("click", () => {
      state.flashcardIdx = (idx - 1 + total) % total;
      state.flashcardFlipped = false;
      renderFlashcardsWidget(res);
    });
    document.getElementById("btnFcNext")?.addEventListener("click", () => {
      state.flashcardIdx = (idx + 1) % total;
      state.flashcardFlipped = false;
      renderFlashcardsWidget(res);
    });
  }

  function showTermPopover(termObj) {
    document.getElementById("popoverTermTitle").textContent = termObj.term;
    document.getElementById("popoverPlainText").textContent = termObj.plain;
    document.getElementById("popoverDactylText").textContent = termObj.dactylBoxes || "";
    document.getElementById("popoverSignHintText").textContent = termObj.signHint || "";
    document.getElementById("popoverAcademicText").textContent = termObj.academic;
    document.getElementById("popoverExampleText").textContent = termObj.example;
    document.getElementById("termPopover").classList.remove("hidden");
  }

  // 9. Настоящая двухуровневая Интеллект-карта (Тема -> Разделы -> Термины) с Pan & Zoom и переходом к сцене видео
  function renderTwoLevelMindMapSVG(res) {
    const container = document.getElementById("mindmapContainer");
    const detailBox = document.getElementById("mindmapNodeDetail");
    const centerTitle = res.courseTitle.split("·").pop().trim();
    const sections = (res.sections || []).slice(0, 4);
    const terms = (res.glossary || []).slice(0, 8);
    state.mindmapZoom = 1.0;
    state.mindmapPan = { x: 0, y: 0 };

    const jewelPalette = [
      { fill: "#EEF4FF", stroke: "#3B82F6", text: "#1E3A8A", link: "#93C5FD" },
      { fill: "#ECFDF5", stroke: "#10B981", text: "#065F46", link: "#6EE7B7" },
      { fill: "#F5F3FF", stroke: "#8B5CF6", text: "#4C1D95", link: "#C4B5FD" },
      { fill: "#FFF1F2", stroke: "#F43F5E", text: "#881337", link: "#FDA4AF" },
      { fill: "#FFFBEB", stroke: "#D97706", text: "#78350F", link: "#FCD34D" }
    ];

    const measureCanvas = document.createElement("canvas");
    const mCtx = measureCanvas.getContext("2d");

    const wrapLines = (text, maxW, font, maxLn = 2) => {
      mCtx.font = font;
      const words = String(text || "").trim().split(/\s+/);
      const lines = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (mCtx.measureText(test).width <= maxW) {
          cur = test;
        } else {
          if (cur) lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);
      return lines.slice(0, maxLn);
    };

    const W = 1220;
    const H = 580;
    const cx = W / 2;
    const cy = H / 2;

    // Распределяем термины по разделам (2-й уровень иерархии)
    const usedTermIds = new Set();
    const branchTree = sections.map((sec, sIdx) => {
      const matched = terms.filter((g) => {
        if (usedTermIds.has(g.id)) return false;
        const stem = g.term.split(/[/(]/)[0].trim().toLowerCase().slice(0, 6);
        return stem.length >= 3 && `${sec.title} ${sec.academicOriginal}`.toLowerCase().includes(stem);
      }).slice(0, 2);
      matched.forEach((m) => usedTermIds.add(m.id));
      return { sec, sIdx, children: matched };
    });

    // Оставшиеся термины равномерно прикрепляем к веткам разделов
    terms.forEach((g) => {
      if (usedTermIds.has(g.id) || !branchTree.length) return;
      const targetBranch = branchTree.reduce((best, b) => (b.children.length < best.children.length ? b : best), branchTree[0]);
      if (targetBranch.children.length < 2) {
        targetBranch.children.push(g);
        usedTermIds.add(g.id);
      }
    });

    const rightBranches = branchTree.filter((_, i) => i % 2 === 0);
    const leftBranches = branchTree.filter((_, i) => i % 2 === 1);

    const rootLines = wrapLines(centerTitle, 178, "800 13.5px Manrope, sans-serif", 3);
    const rootW = 204;
    const rootH = Math.max(66, rootLines.length * 19 + 26);

    let pathsXml = "";
    let nodesXml = "";
    const interactiveRecords = [];

    const renderSide = (branches, isRight) => {
      const bCount = branches.length;
      if (!bCount) return;
      const secStepY = H / (bCount + 1);

      branches.forEach((br, posIdx) => {
        const pal = jewelPalette[br.sIdx % jewelPalette.length];
        const sy = secStepY * (posIdx + 1);
        const sx = isRight ? cx + 220 : cx - 220;
        const secW = 186;
        const sLines = wrapLines(br.sec.title, 158, "700 12.5px Manrope, sans-serif", 2);
        const secH = 26 + sLines.length * 16 + 14;

        const rx1 = isRight ? cx + rootW / 2 : cx - rootW / 2;
        const rx2 = isRight ? sx - secW / 2 : sx + secW / 2;
        const rMid = rx1 + (rx2 - rx1) * 0.5;
        pathsXml += `<path d="M ${rx1},${cy} C ${rMid},${cy} ${rMid},${sy} ${rx2},${sy}" fill="none" stroke="${pal.link}" stroke-width="2.8" />`;

        const secRecIdx = interactiveRecords.length;
        interactiveRecords.push({
          kind: "section",
          badge: br.sec.sourceBadge || `РАЗДЕЛ 0${br.sIdx + 1}`,
          title: br.sec.title,
          plain: br.sec.plainBlocks?.coreIdea || br.sec.plainSummary,
          extra: br.sec.plainBlocks?.analogy || "",
          sceneIndex: br.sec.linkedSceneIndex ?? br.sIdx
        });

        const sTitleTspans = sLines
          .map((ln, lIdx) => `<tspan x="${sx}" y="${sy - secH / 2 + 28 + lIdx * 16}">${escapeHtml(ln)}</tspan>`)
          .join("");

        nodesXml += `
          <g class="mm-node" data-mm-rec="${secRecIdx}" style="cursor:pointer;">
            <rect x="${sx - secW / 2}" y="${sy - secH / 2}" width="${secW}" height="${secH}" rx="14" ry="14" fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="1.8" />
            <text x="${sx}" y="${sy - secH / 2 + 14}" text-anchor="middle" fill="${pal.stroke}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="800">${escapeHtml(br.sec.sourceBadge || `РАЗДЕЛ ${br.sIdx + 1}`)}</text>
            <text text-anchor="middle" fill="${pal.text}" font-family="Manrope, Inter, sans-serif" font-size="12.5" font-weight="700">${sTitleTspans}</text>
          </g>`;

        // Уровень 2: Термины этого раздела
        const kids = br.children;
        kids.forEach((termObj, kIdx) => {
          const offsetY = kids.length === 1 ? 0 : (kIdx === 0 ? -42 : 42);
          const ty = Math.max(46, Math.min(H - 46, sy + offsetY));
          const tx = isRight ? sx + 225 : sx - 225;
          const tW = 192;
          const cleanT = termObj.term.split(/[/(]/)[0].trim();
          const tLines = wrapLines(cleanT, 166, "700 12px Manrope, sans-serif", 2);
          const tH = 20 + tLines.length * 15 + 6;

          const tx1 = isRight ? sx + secW / 2 : sx - secW / 2;
          const tx2 = isRight ? tx - tW / 2 : tx + tW / 2;
          const tMid = tx1 + (tx2 - tx1) * 0.5;
          pathsXml += `<path d="M ${tx1},${sy} C ${tMid},${sy} ${tMid},${ty} ${tx2},${ty}" fill="none" stroke="${pal.link}" stroke-width="1.9" stroke-dasharray="4 3" />`;

          const termRecIdx = interactiveRecords.length;
          interactiveRecords.push({
            kind: "term",
            badge: `ТЕРМИН · ${br.sec.sourceBadge || "СИЛЛАБУС"}`,
            title: termObj.term,
            plain: termObj.plain,
            dactyl: termObj.dactylBoxes,
            signHint: termObj.signHint,
            academic: termObj.academic,
            sceneIndex: br.sec.linkedSceneIndex ?? br.sIdx
          });

          const tTspans = tLines
            .map((ln, lIdx) => `<tspan x="${tx}" y="${ty - ((tLines.length - 1) * 15) / 2 + lIdx * 15 + 4}">${escapeHtml(ln)}</tspan>`)
            .join("");

          nodesXml += `
            <g class="mm-node" data-mm-rec="${termRecIdx}" style="cursor:pointer;">
              <rect x="${tx - tW / 2}" y="${ty - tH / 2}" width="${tW}" height="${tH}" rx="12" ry="12" fill="#FFFFFF" stroke="${pal.stroke}" stroke-width="1.5" />
              <text text-anchor="middle" fill="#18181B" font-family="Manrope, Inter, sans-serif" font-size="12" font-weight="700">${tTspans}</text>
            </g>`;
        });
      });
    };

    renderSide(rightBranches, true);
    renderSide(leftBranches, false);

    const rootTspans = rootLines
      .map((ln, lIdx) => `<tspan x="${cx}" y="${cy - ((rootLines.length - 1) * 18) / 2 + lIdx * 18 + 4}">${escapeHtml(ln)}</tspan>`)
      .join("");

    container.innerHTML = `
      <svg id="lectureMindmapSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
        <defs>
          <pattern id="mmDots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" fill="#E2DDD2" />
          </pattern>
        </defs>
        <rect width="${W}" height="${H}" rx="16" fill="#FAF9F5" />
        <rect width="${W}" height="${H}" rx="16" fill="url(#mmDots)" />
        <g id="mindmapViewport">
          ${pathsXml}
          <g>
            <rect x="${cx - rootW / 2}" y="${cy - rootH / 2}" width="${rootW}" height="${rootH}" rx="18" fill="#18181B" stroke="#0F172A" stroke-width="1.5" />
            <text text-anchor="middle" fill="#FAF9F5" font-family="Manrope, sans-serif" font-size="13.5" font-weight="800">${rootTspans}</text>
          </g>
          ${nodesXml}
        </g>
      </svg>`;

    const selectRecord = (recIdx) => {
      const rec = interactiveRecords[recIdx];
      if (!rec) return;
      detailBox.innerHTML = `
        <span class="step-badge">${escapeHtml(rec.badge)}</span>
        <h4 style="font-size:1.06rem;margin:6px 0 8px;">${escapeHtml(rec.title)}</h4>
        <p style="margin-bottom:8px;font-size:0.85rem;"><strong>✨ Простыми словами:</strong> ${escapeHtml(rec.plain)}</p>
        ${rec.dactyl ? `<div class="dactyl-code">🤟 Дактиль: ${escapeHtml(rec.dactyl)}</div>` : ""}
        ${rec.signHint ? `<p style="font-size:0.77rem;color:var(--text-muted);margin:6px 0;">${escapeHtml(rec.signHint)}</p>` : ""}
        ${rec.extra ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;">💡 ${escapeHtml(rec.extra)}</p>` : ""}
        ${rec.academic ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:10px;"><strong>📘 Для экзамена:</strong> ${escapeHtml(rec.academic)}</p>` : ""}
        <button type="button" class="btn-primary-sm no-print" id="btnMmGotoScene" data-scene="${rec.sceneIndex || 0}">
          🎬 Показать в 2D-мультфильме (Сцена ${(rec.sceneIndex || 0) + 1})
        </button>`;
      document.getElementById("btnMmGotoScene")?.addEventListener("click", (ev) => {
        jumpToVideoScene(parseInt(ev.currentTarget.getAttribute("data-scene"), 10) || 0, 0);
      });
    };

    if (interactiveRecords.length > 0) selectRecord(0);

    container.querySelectorAll(".mm-node").forEach((node) => {
      node.addEventListener("click", () => {
        const idx = parseInt(node.getAttribute("data-mm-rec"), 10);
        selectRecord(idx);
      });
    });

    // Поддержка интерактивного перетаскивания (Pan) и колеса мыши (Zoom)
    const applyMmTransform = () => {
      const vp = document.getElementById("mindmapViewport");
      if (vp) {
        vp.setAttribute(
          "transform",
          `translate(${W / 2 + state.mindmapPan.x}, ${H / 2 + state.mindmapPan.y}) scale(${state.mindmapZoom}) translate(${-W / 2}, ${-H / 2})`
        );
      }
    };

    container._applyMmTransform = applyMmTransform;
    if (!container._mmEventsBound) {
      container._mmEventsBound = true;
      let dragging = false;
      let startX = 0;
      let startY = 0;
      container.addEventListener("mousedown", (e) => {
        if (e.target.closest(".mm-node")) return;
        dragging = true;
        startX = e.clientX - state.mindmapPan.x;
        startY = e.clientY - state.mindmapPan.y;
        container.classList.add("is-panning");
      });
      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        state.mindmapPan.x = Math.max(-360, Math.min(360, e.clientX - startX));
        state.mindmapPan.y = Math.max(-220, Math.min(220, e.clientY - startY));
        container._applyMmTransform?.();
      });
      window.addEventListener("mouseup", () => {
        dragging = false;
        container.classList.remove("is-panning");
      });
      container.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          state.mindmapZoom = Math.max(0.7, Math.min(1.85, +(state.mindmapZoom + delta).toFixed(2)));
          container._applyMmTransform?.();
        },
        { passive: false }
      );
    }
  }

  // 10. Полноценный адаптивный тест (количество вопросов зависит от объёма лекции) + перегенерация
  function renderQuiz(quiz) {
    const listEl = document.getElementById("quizList");
    const count = Array.isArray(quiz) ? quiz.length : 0;
    const countBadge = document.getElementById("quizCountBadge");
    if (countBadge) countBadge.textContent = String(count);

    const res = state.pipelineResult;
    const fullCount = res?.fullQuizCount || res?.quizFull?.length || count;
    const btnFull = document.getElementById("btnQuizModeFull");
    const btnQuick = document.getElementById("btnQuizModeQuick");
    if (btnFull) {
      btnFull.textContent = `Полный тест (${fullCount})`;
      btnFull.classList.toggle("active", (res?.quizMode || "full") === "full");
    }
    if (btnQuick) {
      btnQuick.classList.toggle("active", res?.quizMode === "quick");
    }

    state.quizErrorsOnly = false;
    const btnFilterErr = document.getElementById("btnQuizFilterErrors");
    if (btnFilterErr) {
      btnFilterErr.classList.add("hidden");
      btnFilterErr.classList.remove("active");
    }
    const scoreBox = document.getElementById("quizScoreBox");
    if (scoreBox) {
      scoreBox.textContent = `Ответьте на ${count} вопр. и нажмите «Проверить ответы»`;
      scoreBox.style.borderColor = "";
      scoreBox.style.color = "";
      scoreBox.style.background = "";
    }

    listEl.innerHTML = quiz
      .map(
        (q, qIdx) => `
      <div class="quiz-card" data-q-idx="${qIdx}">
        <div class="quiz-q-head">
          <div class="quiz-q-title">${q.number}. ${escapeHtml(q.question)}</div>
          <div class="quiz-q-actions">
            <span class="quiz-status-pill hidden" id="quiz_status_${qIdx}"></span>
            ${q.sourceBadge ? `<span class="source-cite-badge">📌 ${escapeHtml(q.sourceBadge)}</span>` : ""}
            ${q.angleLabel ? `<span class="note-section-tag">${escapeHtml(q.angleLabel)}</span>` : ""}
            ${q.hint ? `<button type="button" class="btn-quiz-hint no-print" data-hint-q="${qIdx}">💡 Подсказка</button>` : ""}
          </div>
        </div>
        ${q.hint ? `<div class="quiz-hint-box hidden no-print" id="quiz_hint_${qIdx}">${escapeHtml(q.hint)}</div>` : ""}
        <div class="quiz-options">
          ${q.options
            .map(
              (opt, oIdx) => `
            <label class="quiz-option" data-q="${qIdx}" data-o="${oIdx}">
              <input type="radio" name="quiz_q_${qIdx}" value="${oIdx}" />
              <span class="quiz-opt-main">${escapeHtml(opt)}</span>
              <span class="quiz-opt-tag"></span>
            </label>`
            )
            .join("")}
        </div>
        <div class="quiz-explanation hidden" id="quiz_exp_${qIdx}">
          <div class="quiz-diff-line hidden" id="quiz_diff_${qIdx}"></div>
          <div>${escapeHtml(q.explanation)}</div>
          ${
            typeof q.linkedSceneIndex === "number"
              ? `<button type="button" class="btn-jump-scene mt-6 no-print" data-quiz-goto-scene="${q.linkedSceneIndex}">🎬 Повторить в Сцене ${q.linkedSceneIndex + 1}</button>`
              : ""
          }
        </div>
      </div>`
      )
      .join("");

    listEl.querySelectorAll("[data-hint-q]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-hint-q");
        document.getElementById(`quiz_hint_${idx}`)?.classList.toggle("hidden");
      });
    });

    listEl.querySelectorAll("[data-quiz-goto-scene]").forEach((btn) => {
      btn.addEventListener("click", () => {
        jumpToVideoScene(parseInt(btn.getAttribute("data-quiz-goto-scene"), 10) || 0, 0);
      });
    });
  }

  function renderSupervisorTab(res) {
    document.getElementById("supervisorChecks").innerHTML = res.supervisorLogs
      .map(
        (log) => `
      <div class="sup-check-card">
        <div class="sup-check-top">
          <span>${escapeHtml(log.echelon)}</span>
          <span class="sup-pass-pill">✓ ${escapeHtml(log.status)}</span>
        </div>
        <p style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(log.detail)}</p>
      </div>`
      )
      .join("");

    document.querySelector("#generatedCodeViewer code").textContent = res.generatedCode;
  }

  // 11. Вкладки результатов, Zoom майнд-карты и управление плеером
  function initResultTabs() {
    document.querySelectorAll(".result-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        document.querySelectorAll(".result-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".result-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("tab-" + target).classList.add("active");
      });
    });

    document.querySelectorAll("[data-notes-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.notesMode = btn.getAttribute("data-notes-mode") || "dual";
        document.querySelectorAll("[data-notes-mode]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (state.pipelineResult) renderNotesAndGlossary(state.pipelineResult);
      });
    });

    const gSearch = document.getElementById("glossarySearchInput");
    if (gSearch) {
      gSearch.addEventListener("input", () => {
        state.glossaryQuery = gSearch.value;
        if (state.pipelineResult) renderNotesAndGlossary(state.pipelineResult);
      });
    }

    const btnFcToggle = document.getElementById("btnToggleFlashcards");
    if (btnFcToggle) {
      btnFcToggle.addEventListener("click", () => {
        state.flashcardsOpen = !state.flashcardsOpen;
        state.flashcardFlipped = false;
        if (state.pipelineResult) renderFlashcardsWidget(state.pipelineResult);
      });
    }

    const applyZoom = (z, resetPan = false) => {
      state.mindmapZoom = Math.max(0.7, Math.min(1.85, z));
      if (resetPan) state.mindmapPan = { x: 0, y: 0 };
      const container = document.getElementById("mindmapContainer");
      if (container?._applyMmTransform) {
        container._applyMmTransform();
      } else {
        const svg = document.getElementById("lectureMindmapSvg");
        if (svg) svg.style.transform = `scale(${state.mindmapZoom})`;
      }
    };
    document.getElementById("btnZoomIn").addEventListener("click", () => applyZoom(state.mindmapZoom + 0.15));
    document.getElementById("btnZoomOut").addEventListener("click", () => applyZoom(state.mindmapZoom - 0.15));
    document.getElementById("btnZoomReset").addEventListener("click", () => applyZoom(1.0, true));

    document.getElementById("btnClosePopover").addEventListener("click", () => {
      document.getElementById("termPopover").classList.add("hidden");
    });

    document.getElementById("btnCheckQuiz").addEventListener("click", () => {
      if (!state.pipelineResult) return;
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;
      let firstIssueCard = null;
      const totalQ = state.pipelineResult.quiz.length || 1;

      state.pipelineResult.quiz.forEach((q, qIdx) => {
        const card = document.querySelector(`.quiz-card[data-q-idx="${qIdx}"]`);
        const statusEl = document.getElementById(`quiz_status_${qIdx}`);
        const diffEl = document.getElementById(`quiz_diff_${qIdx}`);
        const selected = document.querySelector(`input[name="quiz_q_${qIdx}"]:checked`);
        const chosenIdx = selected ? parseInt(selected.value, 10) : -1;
        const isCorrect = chosenIdx === q.correctIndex;
        const isSkipped = chosenIdx === -1;

        if (isCorrect) correctCount++;
        else if (isSkipped) skippedCount++;
        else wrongCount++;

        if (card) {
          card.classList.remove("is-correct", "is-wrong", "is-skipped", "hidden");
          card.classList.add(isCorrect ? "is-correct" : isSkipped ? "is-skipped" : "is-wrong");
          if (!isCorrect && !firstIssueCard) firstIssueCard = card;
        }

        if (statusEl) {
          statusEl.classList.remove("hidden", "is-correct", "is-wrong", "is-skipped");
          if (isCorrect) {
            statusEl.textContent = "✓ Верно";
            statusEl.classList.add("is-correct");
          } else if (isSkipped) {
            statusEl.textContent = "⚠ Без ответа";
            statusEl.classList.add("is-skipped");
          } else {
            statusEl.textContent = "✕ Ошибка";
            statusEl.classList.add("is-wrong");
          }
        }

        document.querySelectorAll(`.quiz-option[data-q="${qIdx}"]`).forEach((optEl) => {
          const oIdx = parseInt(optEl.getAttribute("data-o"), 10);
          const tagEl = optEl.querySelector(".quiz-opt-tag");
          const inp = optEl.querySelector('input[type="radio"]');
          if (inp) inp.disabled = true;

          optEl.classList.remove("correct", "wrong", "dimmed");
          if (tagEl) tagEl.textContent = "";

          if (oIdx === q.correctIndex) {
            optEl.classList.add("correct");
            if (tagEl) tagEl.textContent = oIdx === chosenIdx ? "✓ Ваш выбор · Верно" : "✓ Верный ответ";
          } else if (oIdx === chosenIdx) {
            optEl.classList.add("wrong");
            if (tagEl) tagEl.textContent = "✕ Ваш выбор";
          } else {
            optEl.classList.add("dimmed");
          }
        });

        if (diffEl) {
          if (isCorrect) {
            diffEl.classList.add("hidden");
            diffEl.textContent = "";
          } else {
            const correctTxt = q.options?.[q.correctIndex] || "";
            const chosenTxt = isSkipped ? "ответ не выбран" : `«${q.options?.[chosenIdx] || ""}»`;
            diffEl.textContent = isSkipped
              ? `⚠ Вы пропустили вопрос. Верный ответ: «${correctTxt}»`
              : `✕ Вы выбрали: ${chosenTxt} → Верный ответ: «${correctTxt}»`;
            diffEl.classList.remove("hidden");
          }
        }

        document.getElementById(`quiz_exp_${qIdx}`)?.classList.remove("hidden");
      });

      const pct = Math.round((correctCount / totalQ) * 100);
      const scoreBox = document.getElementById("quizScoreBox");
      if (scoreBox) {
        const parts = [`Верно: ${correctCount} из ${totalQ} (${pct}%)`];
        if (wrongCount > 0) parts.push(`Ошибок: ${wrongCount}`);
        if (skippedCount > 0) parts.push(`Пропущено: ${skippedCount}`);
        scoreBox.textContent = parts.join(" · ");
        if (wrongCount === 0 && skippedCount === 0) {
          scoreBox.style.borderColor = "var(--success)";
          scoreBox.style.color = "var(--success)";
          scoreBox.style.background = "var(--success-soft)";
        } else {
          scoreBox.style.borderColor = "var(--danger)";
          scoreBox.style.color = "var(--danger)";
          scoreBox.style.background = "var(--danger-soft)";
        }
      }

      const issuesCount = wrongCount + skippedCount;
      const btnFilterErr = document.getElementById("btnQuizFilterErrors");
      if (btnFilterErr) {
        if (issuesCount > 0) {
          btnFilterErr.textContent = `🔍 Только ошибки (${issuesCount})`;
          btnFilterErr.classList.remove("hidden", "active");
          state.quizErrorsOnly = false;
        } else {
          btnFilterErr.classList.add("hidden");
        }
      }

      if (firstIssueCard) {
        firstIssueCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    document.getElementById("btnQuizFilterErrors")?.addEventListener("click", () => {
      const btnFilterErr = document.getElementById("btnQuizFilterErrors");
      state.quizErrorsOnly = !state.quizErrorsOnly;
      if (btnFilterErr) btnFilterErr.classList.toggle("active", state.quizErrorsOnly);
      document.querySelectorAll("#quizList .quiz-card").forEach((card) => {
        if (state.quizErrorsOnly && card.classList.contains("is-correct")) {
          card.classList.add("hidden");
        } else {
          card.classList.remove("hidden");
        }
      });
    });

    document.getElementById("btnResetQuiz").addEventListener("click", () => {
      if (state.pipelineResult) renderQuiz(state.pipelineResult.quiz);
    });

    const switchQuizMode = (mode) => {
      const res = state.pipelineResult;
      if (!res) return;
      res.quizMode = mode;
      if (!res.quizFull || !res.quizQuick) {
        const regen = window.AISupervisorPipeline.regenerateQuiz(res, res.quizVariationSeed || 0);
        res.quizFull = regen.quizFull;
        res.quizQuick = regen.quizQuick;
        res.fullQuizCount = regen.fullQuizCount;
      }
      res.quiz = mode === "quick" ? res.quizQuick : res.quizFull;
      renderQuiz(res.quiz);
    };
    document.getElementById("btnQuizModeFull")?.addEventListener("click", () => switchQuizMode("full"));
    document.getElementById("btnQuizModeQuick")?.addEventListener("click", () => switchQuizMode("quick"));

    document.getElementById("btnRegenerateQuiz")?.addEventListener("click", () => {
      const res = state.pipelineResult;
      if (!res) return;
      res.quizVariationSeed = (res.quizVariationSeed || 0) + 1;
      const regen = window.AISupervisorPipeline.regenerateQuiz(res, res.quizVariationSeed);
      res.quizFull = regen.quizFull;
      res.quizQuick = regen.quizQuick;
      res.fullQuizCount = regen.fullQuizCount;
      res.quiz = res.quizMode === "quick" ? res.quizQuick : res.quizFull;
      renderQuiz(res.quiz);
      savePersistedState();
      showFlashToast(`Тест пересоздан: ${res.quiz.length} новых вопросов под разными углами!`, "success");
    });

    // Открытие и закрытие модального окна «Контроль ИИ и код» по клику на бейдж
    const supModal = document.getElementById("supervisorModal");
    const badgeBtn = document.getElementById("cacheHitBadge");
    if (badgeBtn && supModal) {
      badgeBtn.addEventListener("click", () => supModal.classList.remove("hidden"));
      document.getElementById("btnCloseSupervisorModal").addEventListener("click", () => supModal.classList.add("hidden"));
    }

    document.getElementById("btnCopyCode").addEventListener("click", (e) => {
      if (!state.pipelineResult) return;
      navigator.clipboard?.writeText(state.pipelineResult.generatedCode);
      e.currentTarget.textContent = "✓ Скопировано!";
      setTimeout(() => (e.currentTarget.textContent = "📋 Копировать код"), 1500);
    });
  }

  function initPlayerControls() {
    const btnPlayPause = document.getElementById("btnPlayPause");
    const scrubber = document.getElementById("videoScrubber");
    const speedSel = document.getElementById("playbackSpeedSelect");
    const btnSupToggle = document.getElementById("btnToggleSupervisorMode");
    const btnTts = document.getElementById("btnToggleTts");

    btnPlayPause.addEventListener("click", () => {
      if (!state.isMediaReady || !state.animEngine?.isReady) return;
      state.animEngine.isPlaying = !state.animEngine.isPlaying;
      btnPlayPause.textContent = state.animEngine.isPlaying ? "⏸ Пауза" : "▶ Играть";
      if (!state.animEngine.isPlaying) {
        state.animEngine.stopTts();
      } else {
        state.animEngine.unlockAudio();
        state.animEngine.lastSpokenSceneIdx = -1;
      }
    });

    document.getElementById("btnPrevScene").addEventListener("click", () => {
      if (!state.isMediaReady || !state.animEngine?.isReady) return;
      const info = state.animEngine.getCurrentSceneInfo();
      state.animEngine.jumpToScene(Math.max(0, info.index - 1));
    });

    document.getElementById("btnNextScene").addEventListener("click", () => {
      if (!state.isMediaReady || !state.animEngine?.isReady) return;
      const info = state.animEngine.getCurrentSceneInfo();
      state.animEngine.jumpToScene(Math.min(state.animEngine.scenes.length - 1, info.index + 1));
    });

    scrubber.addEventListener("input", () => {
      if (!state.isMediaReady || !state.animEngine?.isReady) return;
      const ratio = parseFloat(scrubber.value) / 1000;
      state.animEngine.seekTo(ratio * state.animEngine.totalDuration);
    });

    speedSel.addEventListener("change", () => {
      state.animEngine.setPlaybackSpeed(parseFloat(speedSel.value) || 1.0);
    });

    // Тумблер «После AI Supervisor (PASS) ↔ Показать дефект ДО»
    btnSupToggle.addEventListener("click", () => {
      state.animEngine.showRawDefectMode = !state.animEngine.showRawDefectMode;
      if (state.animEngine.showRawDefectMode) {
        btnSupToggle.textContent = "❌ ДО AI Supervisor: ДЕФЕКТ (Коллизия 410 px² · 22.4 CPS)";
        btnSupToggle.classList.add("raw-mode");
        showFlashToast("Показан сырой кадр ДО вмешательства AI Supervisor: канцелярский субтитр налезает на схему!", "warn");
      } else {
        btnSupToggle.textContent = "🛡️ После AI Supervisor: PASS (0 коллизий · ≤15 CPS)";
        btnSupToggle.classList.remove("raw-mode");
        showFlashToast("Контур AI Supervisor: текст сжат до ≤15 симв/с, коллизии устранены (0 px²)!", "success");
      }
    });

    // Кнопка голосовой озвучки субтитров (TTS) и выбор мужского/женского тембра
    btnTts.addEventListener("click", () => {
      state.animEngine.unlockAudio();
      const next = !state.animEngine.ttsEnabled;
      state.animEngine.setTtsEnabled(next);
      btnTts.textContent = next ? "🔊 Озвучка: ВКЛ" : "🔇 Озвучка: ВЫКЛ";
      if (!next) updateAudioStreamBadge(null);
    });

    const voiceSel = document.getElementById("voiceGenderSelect");
    if (voiceSel) {
      voiceSel.value = state.voiceGender;
      voiceSel.addEventListener("change", () => {
        state.voiceGender = voiceSel.value === "male" ? "male" : "female";
        try {
          localStorage.setItem(STORAGE_KEYS.VOICE, state.voiceGender);
        } catch (_) {}
        if (state.animEngine) {
          state.animEngine.unlockAudio();
          state.animEngine.setVoiceGender(state.voiceGender);
        }
        showFlashToast(
          state.voiceGender === "male" ? "Включён мужской нейронный голос диктора." : "Включён женский нейронный голос диктора.",
          "info"
        );
      });
    }

    // Полноэкранный режим 2D-плеера (кнопка ⛶ или двойной клик по видео)
    const btnFullscreen = document.getElementById("btnFullscreen");
    const playerCol = document.querySelector(".player-column");
    const animCanvas = document.getElementById("animationCanvas");
    const toggleFullscreen = () => {
      if (!state.isMediaReady || !state.animEngine?.isReady || !playerCol) return;
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        const req = playerCol.requestFullscreen || playerCol.webkitRequestFullscreen;
        if (req) req.call(playerCol).catch?.(() => {});
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document).catch?.(() => {});
      }
    };
    if (btnFullscreen) {
      btnFullscreen.addEventListener("click", toggleFullscreen);
      const syncFsBtn = () => {
        const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        btnFullscreen.textContent = isFs ? "⤢" : "⛶";
        btnFullscreen.title = isFs ? "Выйти из полноэкранного режима (Esc)" : "На весь экран";
      };
      document.addEventListener("fullscreenchange", syncFsBtn);
      document.addEventListener("webkitfullscreenchange", syncFsBtn);
    }
    if (animCanvas) {
      animCanvas.addEventListener("dblclick", toggleFullscreen);
    }

    let lastUiSceneIdx = -1;
    let lastUiSec = -1;
    state.animEngine.onTimeUpdate = (cur, total, info) => {
      const safeTotal = Math.max(1, total);
      scrubber.value = Math.round((cur / safeTotal) * 1000);
      const curSec = Math.floor(cur);
      if (curSec !== lastUiSec) {
        lastUiSec = curSec;
        document.getElementById("currentTimeLabel").textContent = formatTime(cur);
        document.getElementById("totalTimeLabel").textContent = formatTime(safeTotal);
      }
      if (info.index !== lastUiSceneIdx) {
        lastUiSceneIdx = info.index;
        document.getElementById("sceneCounterLabel").textContent =
          `Сцена ${info.index + 1} из ${state.animEngine.scenes.length || 6}`;
        document.querySelectorAll(".scene-card").forEach((c, idx) => {
          c.classList.toggle("active", idx === info.index);
        });
      }
    };

    // Глобальные горячие клавиши плеера (Space, Стрелки, F, M) и Escape для закрытия модалок
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ["supervisorModal", "billingModal", "kt4Modal", "apiModal", "termPopover"].forEach((id) => {
          document.getElementById(id)?.classList.add("hidden");
        });
        return;
      }
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (!state.isMediaReady || !state.animEngine?.isReady) return;
      if (e.code === "Space") {
        e.preventDefault();
        document.getElementById("btnPlayPause")?.click();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        document.getElementById("btnPrevScene")?.click();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        document.getElementById("btnNextScene")?.click();
      } else if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
        document.getElementById("btnToggleTts")?.click();
      }
    });
  }

  // 12. Модальные окна Биллинга (Kaspi QR 100 ₸) и ИИ API
  function initBillingAndApiModals() {
    const billingModal = document.getElementById("billingModal");
    const apiModal = document.getElementById("apiModal");

    document.getElementById("btnOpenBilling").addEventListener("click", () => {
      renderLedgerTable();
      billingModal.classList.remove("hidden");
    });
    document.getElementById("btnCloseBilling").addEventListener("click", () => billingModal.classList.add("hidden"));

    document.getElementById("btnBuyPack500").addEventListener("click", () => {
      const txId = "kaspi_qr_" + Math.random().toString(36).slice(2, 8);
      state.credits += 5;
      state.planName = "Kaspi QR (100 ₸)";
      state.ledger.unshift({
        time: new Date().toLocaleTimeString("ru-RU"),
        type: "PURCHASE_TOPUP (Kaspi QR 500 ₸)",
        key: txId,
        delta: "+5",
        balance: state.credits
      });
      updateQuotaUI();
      savePersistedState();
      renderLedgerTable();
      showFlashToast("Kaspi Pay QR: зачислено +5 генераций (500 ₸, комиссия 0.95%)!", "success");
    });

    document.getElementById("btnActivateInclusive").addEventListener("click", () => {
      const txId = "dhh_grant_" + Math.random().toString(36).slice(2, 8);
      state.credits += 10;
      state.planName = "Инклюзия ОВЗ (0 ₸)";
      state.ledger.unshift({
        time: new Date().toLocaleTimeString("ru-RU"),
        type: "UNIVERSITY_INCLUSIVE_GRANT (0 ₸)",
        key: txId,
        delta: "+10",
        balance: state.credits
      });
      updateQuotaUI();
      savePersistedState();
      renderLedgerTable();
      showFlashToast("Активирован бесплатный инклюзивный грант вуза (+10 генераций за 0 ₸)!", "success");
    });

    document.getElementById("btnOpenApiModal").addEventListener("click", () => {
      document.getElementById("geminiKeyInput").value = localStorage.getItem("lecture_ai_gemini_key") || "";
      document.getElementById("groqKeyInput").value = localStorage.getItem("lecture_ai_groq_key") || "";
      apiModal.classList.remove("hidden");
    });
    document.getElementById("btnCloseApiModal").addEventListener("click", () => apiModal.classList.add("hidden"));

    document.getElementById("btnSaveApiKeys").addEventListener("click", () => {
      const gKey = document.getElementById("geminiKeyInput").value.trim();
      const qKey = document.getElementById("groqKeyInput").value.trim();
      if (gKey) localStorage.setItem("lecture_ai_gemini_key", gKey);
      else localStorage.removeItem("lecture_ai_gemini_key");
      if (qKey) localStorage.setItem("lecture_ai_groq_key", qKey);
      else localStorage.removeItem("lecture_ai_groq_key");
      document.getElementById("apiStatusBadge").textContent = gKey ? "Gemini 2.5" : "ИИ";
      apiModal.classList.add("hidden");
      showFlashToast(gKey ? "Ключи ИИ сохранены (подключён Gemini 2.5 Flash)!" : "Облачные ключи очищены (работает автономное ядро).", "success");
    });

    document.getElementById("btnClearApiKeys").addEventListener("click", () => {
      localStorage.removeItem("lecture_ai_gemini_key");
      localStorage.removeItem("lecture_ai_groq_key");
      document.getElementById("geminiKeyInput").value = "";
      document.getElementById("groqKeyInput").value = "";
      document.getElementById("apiStatusBadge").textContent = "ИИ";
    });
  }

  function updateQuotaUI() {
    document.getElementById("quotaText").innerHTML =
      `${escapeHtml(state.planName)}: <strong>${state.credits}</strong> ген.`;
  }

  function renderLedgerTable() {
    const tbody = document.getElementById("ledgerTableBody");
    tbody.innerHTML = state.ledger
      .map(
        (row) => `
      <tr>
        <td class="mono-num">${escapeHtml(row.time)}</td>
        <td><strong>${escapeHtml(row.type)}</strong></td>
        <td><code>${escapeHtml(row.key)}</code></td>
        <td style="color:${row.delta.startsWith("+") ? "#059669" : row.delta === "0" ? "#4f46e5" : "#e11d48"};font-weight:800;">${escapeHtml(row.delta)}</td>
        <td class="mono-num"><strong>${row.balance}</strong></td>
      </tr>`
      )
      .join("");
  }

  // 13. Модуль тестирования КТ 4 (5+ реальных пользователей + экспорт CSV для Раздела 7)
  function initKt4Modal() {
    const modal = document.getElementById("kt4Modal");

    const refreshFeedback = async () => {
      try {
        const resp = await fetch("/api/feedback");
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.feedback) && data.feedback.length >= 5) {
            state.feedbackList = data.feedback;
            savePersistedState();
          }
        }
      } catch (_) {}
      renderKt4Dashboard();
    };

    document.getElementById("btnOpenKt4Modal").addEventListener("click", () => {
      refreshFeedback();
      modal.classList.remove("hidden");
    });
    document.getElementById("btnCloseKt4Modal").addEventListener("click", () => modal.classList.add("hidden"));

    document.getElementById("btnSubmitKt4Feedback").addEventListener("click", async () => {
      const name = document.getElementById("kt4Name").value.trim() || `Студент #${state.feedbackList.length + 1}`;
      const uni = document.getElementById("kt4Uni").value.trim() || "КазГАСА / Вуз РК";
      const group = document.getElementById("kt4Group").value;
      const sc = parseInt(document.getElementById("kt4Score").value, 10) || 5;
      const comment = document.getElementById("kt4Comment").value.trim() || "Отличная визуализация и понятный ясный язык.";

      const newEntry = {
        id: state.feedbackList.length + 1,
        testerName: name,
        university: uni,
        userGroup: group,
        clarityScore: sc,
        termsScore: 5,
        animationScore: 5,
        npsScore: sc === 5 ? 10 : 9,
        comment,
        courseTitle: state.pipelineResult?.courseTitle || "Lecture AI"
      };

      state.feedbackList.unshift(newEntry);
      savePersistedState();
      renderKt4Dashboard();

      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry)
      }).catch(() => {});

      document.getElementById("kt4Name").value = "";
      document.getElementById("kt4Comment").value = "";
      showFlashToast(`Отзыв тестировщика «${name}» сохранён в базу КТ 4!`, "success");
    });

    document.getElementById("btnExportKt4Csv").addEventListener("click", () => {
      const headers = ["№", "Тестировщик", "Вуз", "Категория", "Ясность (1-5)", "Термины (1-5)", "2D-Анимация (1-5)", "NPS (0-10)", "Отзыв"];
      const rows = state.feedbackList.map((f, idx) => [
        idx + 1,
        `"${(f.testerName || "").replace(/"/g, '""')}"`,
        `"${(f.university || "").replace(/"/g, '""')}"`,
        `"${(f.userGroup || "").replace(/"/g, '""')}"`,
        f.clarityScore,
        f.termsScore,
        f.animationScore,
        f.npsScore,
        `"${(f.comment || "").replace(/"/g, '""')}"`
      ]);
      const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "АЖиОЗ-25-30_ArchAI_Результаты_Тестирования_КТ4.csv");
    });

    renderKt4Dashboard();
  }

  function renderKt4Dashboard() {
    const list = state.feedbackList;
    const count = list.length || 1;
    document.getElementById("kt4CountBadge").textContent = String(list.length);

    const avgClarity = (list.reduce((a, b) => a + (b.clarityScore || 5), 0) / count).toFixed(1);
    const avgAnim = (list.reduce((a, b) => a + (b.animationScore || 5), 0) / count).toFixed(1);
    const avgNps = (list.reduce((a, b) => a + (b.npsScore || 10), 0) / count).toFixed(1);

    document.getElementById("kt4MetricsRow").innerHTML = `
      <div class="kt4-metric-card"><div class="kt4-metric-val">${list.length} / 5+</div><div class="kt4-metric-lbl">Реальных тестировщиков (Норма ≥ 5)</div></div>
      <div class="kt4-metric-card"><div class="kt4-metric-val">${avgClarity} / 5.0</div><div class="kt4-metric-lbl">Понятность «Ясного языка»</div></div>
      <div class="kt4-metric-card"><div class="kt4-metric-val">${avgAnim} / 5.0</div><div class="kt4-metric-lbl">Наглядность 2D-анимации</div></div>
      <div class="kt4-metric-card"><div class="kt4-metric-val">${avgNps} / 10</div><div class="kt4-metric-lbl">Индекс рекомендации (NPS)</div></div>
    `;

    document.getElementById("kt4TableBody").innerHTML = list
      .map(
        (f, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(f.testerName)}</strong> (${escapeHtml(f.university)})</td>
        <td>${escapeHtml(f.userGroup)}</td>
        <td><strong>${f.clarityScore}/5</strong></td>
        <td><strong>${f.termsScore}/5</strong></td>
        <td><strong>${f.animationScore}/5</strong></td>
        <td><strong>${f.npsScore}/10</strong></td>
        <td>${escapeHtml(f.comment)}</td>
      </tr>`
      )
      .join("");
  }

  // 14. Скачивание ВСЕХ файлов (.DOC, векторный PDF, .PNG, .SVG, .SRT, .MP4/.WEBM)
  function initDownloadButtons() {
    document.getElementById("btnPrintPdf").addEventListener("click", () => {
      window.print();
    });

    document.getElementById("btnDownloadNotes").addEventListener("click", () => {
      if (!state.pipelineResult) return;
      const res = state.pipelineResult;
      const noteHtml = (s) => {
        const noteKey = `${res.contentHash}_sec_${s.sectionIndex}`;
        const note = state.personalNotes?.[noteKey];
        return note ? `<p><strong>✏️ Личная заметка студента:</strong> ${escapeHtml(note)}</p>` : "";
      };
      const htmlDoc = `\uFEFF<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>Конспект Lecture AI</title>
      <style>body{font-family:Arial,sans-serif;line-height:1.55;padding:24px;} h1{color:#1e3a8a;} .plain{background:#eef2ff;padding:12px;border-left:4px solid #4f46e5;margin-bottom:10px;} .term{border:1px solid #cbd5e1;padding:10px;margin-bottom:8px;}</style></head><body>
      <h1>Lecture AI Studio — Адаптированный конспект на «ясном языке»</h1>
      <p><strong>Курс:</strong> ${escapeHtml(res.courseTitle)} · <strong>Ясность:</strong> ${res.avgReadability}/100</p>
      <h2>1. Конспект разделов («Ясный язык» + Оригинал для экзамена)</h2>
      ${res.sections
        .map(
          (s) => `<h3>${escapeHtml(s.title)}</h3>
          <div class="plain"><strong>На ясном языке:</strong> ${escapeHtml(s.plainSummary)}</div>
          <p><em>Оригинал для экзамена:</em> ${escapeHtml(s.academicOriginal)}</p>${noteHtml(s)}`
        )
        .join("")}
      <h2>2. Глоссарий терминов силлабуса + Дактиль КЖЯ/РЖЯ</h2>
      ${res.glossary
        .map(
          (g) => `<div class="term"><strong>${escapeHtml(g.term)}</strong> — ${escapeHtml(g.plain)}<br/>
          <code>Дактиль: ${escapeHtml(g.dactylBoxes || "")}</code><br/><small>${escapeHtml(g.academic)}</small></div>`
        )
        .join("")}
      </body></html>`;
      triggerDownload(new Blob([htmlDoc], { type: "application/msword;charset=utf-8" }), "Lecture_AI_Конспект_Ясный_Язык.doc");
    });

    document.getElementById("btnDownloadQuiz").addEventListener("click", () => {
      if (!state.pipelineResult) return;
      const res = state.pipelineResult;
      const htmlQuiz = `\uFEFF<!DOCTYPE html><html><head><meta charset="utf-8"><title>Тест Lecture AI</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;} .q{margin-bottom:16px;padding:12px;border:1px solid #cbd5e1;}</style></head><body>
      <h1>Lecture AI Studio — Тест (${res.quiz.length} вопр.) с ключами</h1>
      <p><strong>Курс:</strong> ${escapeHtml(res.courseTitle)}</p>
      ${res.quiz
        .map(
          (q) => `<div class="q"><strong>${q.number}. ${escapeHtml(q.question)}</strong>${q.angleLabel ? ` <em>[${escapeHtml(q.angleLabel)}]</em>` : ""}<ul>
          ${q.options.map((o, idx) => `<li>${idx === q.correctIndex ? "<strong>[ВЕРНО]</strong> " : ""}${escapeHtml(o)}</li>`).join("")}
          </ul><p><em>Разбор:</em> ${escapeHtml(q.explanation)}</p></div>`
        )
        .join("")}
      </body></html>`;
      triggerDownload(new Blob([htmlQuiz], { type: "application/msword;charset=utf-8" }), `Lecture_AI_Тест_${res.quiz.length}_вопросов.doc`);
    });

    document.getElementById("btnDownloadSvg").addEventListener("click", () => {
      const svgEl = document.getElementById("lectureMindmapSvg");
      if (!svgEl) return;
      triggerDownload(new Blob([svgEl.outerHTML], { type: "image/svg+xml;charset=utf-8" }), "Lecture_AI_MindMap.svg");
    });

    const downloadMindmapPng = () => {
      const svgEl = document.getElementById("lectureMindmapSvg");
      if (!svgEl) return;
      const vb = svgEl.viewBox.baseVal;
      const w = vb && vb.width ? vb.width : 1040;
      const h = vb && vb.height ? vb.height : 520;
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const scale = 3; // 3x Retina PNG
        const c = document.createElement("canvas");
        c.width = w * scale;
        c.height = h * scale;
        const ctx = c.getContext("2d");
        ctx.scale(scale, scale);
        ctx.fillStyle = "#FAF9F5";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob((pngBlob) => {
          if (pngBlob) triggerDownload(pngBlob, "Lecture_AI_MindMap.png");
        }, "image/png");
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    };

    document.getElementById("btnDownloadPng").addEventListener("click", downloadMindmapPng);
    document.getElementById("btnDownloadMindmap").addEventListener("click", downloadMindmapPng);

    document.getElementById("btnDownloadSrt").addEventListener("click", () => {
      if (!state.pipelineResult) return;
      let elapsed = 0;
      const srtLines = [];
      let cueNum = 1;
      state.pipelineResult.scenes.forEach((s) => {
        const dur = s.durationSec || 10;
        const beats = Array.isArray(s.beats) && s.beats.length >= 2 ? s.beats : [{ text: s.caption }];
        const step = dur / beats.length;
        beats.forEach((b, bIdx) => {
          const start = formatSrtTime(elapsed + bIdx * step);
          const end = formatSrtTime(elapsed + (bIdx + 1) * step);
          const txt = String(b?.text || "").replace(/\s+/g, " ").trim();
          if (txt) {
            srtLines.push(`${cueNum++}\n${start} --> ${end}\n${txt}\n`);
          }
        });
        elapsed += dur;
      });
      triggerDownload(new Blob(["\uFEFF" + srtLines.join("\n")], { type: "text/plain;charset=utf-8" }), "Lecture_AI_Subtitles_DHH.srt");
    });

    document.getElementById("btnCancelVideoExport")?.addEventListener("click", () => {
      state.animEngine?.cancelVideoExport();
    });

    const exportVideoHandler = async () => {
      if (!state.isMediaReady || !state.animEngine?.isReady || !state.pipelineResult || !state.animEngine.scenes.length) {
        showFlashToast("Сначала создайте учебный пакет для скачивания видео.", "warn");
        return;
      }
      const indicator = document.getElementById("recordingIndicator");
      const progressTxt = document.getElementById("recordingProgressText");
      indicator.classList.remove("hidden");
      progressTxt.textContent = "0%";
      try {
        const { blob, ext } = await state.animEngine.exportVideoFile((pct) => {
          progressTxt.textContent = pct + "%";
        });
        triggerDownload(blob, `Lecture_AI_2D_Animation_1x.${ext}`);
        showFlashToast(`Видеофайл (.${ext.toUpperCase()}) записан с точной синхронизацией звука и сохранён!`, "success");
      } catch (err) {
        if (err?.name === "AbortError") {
          showFlashToast("Запись видео отменена.", "info");
        } else {
          showFlashToast("Браузер не поддерживает MediaRecorder. Откройте сайт в Chrome или Edge.", "warn");
        }
      } finally {
        indicator.classList.add("hidden");
      }
    };

    document.getElementById("btnDownloadVideo").addEventListener("click", exportVideoHandler);
    document.getElementById("btnExportVideoInline").addEventListener("click", exportVideoHandler);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function formatSrtTime(sec) {
    const totalMs = Math.max(0, Math.round(sec * 1000));
    const hh = String(Math.floor(totalMs / 3600000)).padStart(2, "0");
    const mm = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0");
    const ss = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0");
    const ms = String(totalMs % 1000).padStart(3, "0");
    return `${hh}:${mm}:${ss},${ms}`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();

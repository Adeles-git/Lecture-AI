// Светлая «Editorial / Quiet Luxury» дизайн-система и доменная визуальная режиссура (v2)
// 6 уникальных предметных миров + контекстная классификация по биграммам и весу заголовка + 12 разных 2D-композиций

window.LectureVisualDirector = (function () {
  const EDITORIAL_THEMES = {
    arch_eng: {
      domainId: "arch_eng",
      name: "Drafting Porcelain & Cobalt",
      label: "Инженерия, строительство и физика",
      patternType: "blueprint",
      glyph: "structure",
      bgTop: "#FAF9F5",
      bgBottom: "#EEF3F9",
      ambientA: "rgba(191, 219, 254, 0.42)",
      ambientB: "rgba(254, 243, 199, 0.30)",
      gridColor: "rgba(100, 116, 139, 0.13)",
      surfaceTop: "rgba(255, 255, 255, 0.92)",
      surfaceBottom: "rgba(248, 250, 252, 0.94)",
      surfaceBorder: "rgba(15, 23, 42, 0.09)",
      shadowRgb: "29, 78, 216",
      ink: "#18181B",
      muted: "#52525B",
      primary: "#1D4ED8",
      primaryLight: "#3B82F6",
      primarySoft: "rgba(29, 78, 216, 0.10)",
      secondary: "#EA580C",
      secondaryLight: "#FB923C",
      secondarySoft: "rgba(234, 88, 12, 0.10)",
      success: "#0F766E",
      successSoft: "rgba(15, 118, 110, 0.10)",
      danger: "#DC2626",
      dangerSoft: "rgba(220, 38, 38, 0.09)",
      cardPalettes: [
        { top: "#EFF6FF", bot: "#DBEAFE", stroke: "#2563EB", text: "#1E3A8A" },
        { top: "#FFF7ED", bot: "#FFEDD5", stroke: "#EA580C", text: "#9A3412" },
        { top: "#F0FDF4", bot: "#DCFCE7", stroke: "#0D9488", text: "#115E59" },
        { top: "#F8FAFC", bot: "#E2E8F0", stroke: "#475569", text: "#1E293B" }
      ]
    },
    ai_cs: {
      domainId: "ai_cs",
      name: "Stripe Editorial & Prism Mist",
      label: "IT, алгоритмы и ИИ",
      patternType: "dots",
      glyph: "circuit",
      bgTop: "#F9FAFB",
      bgBottom: "#F0F2FA",
      ambientA: "rgba(221, 214, 254, 0.45)",
      ambientB: "rgba(207, 250, 254, 0.38)",
      gridColor: "rgba(99, 102, 241, 0.11)",
      surfaceTop: "rgba(255, 255, 255, 0.92)",
      surfaceBottom: "rgba(248, 250, 252, 0.94)",
      surfaceBorder: "rgba(79, 70, 229, 0.11)",
      shadowRgb: "79, 70, 229",
      ink: "#0F172A",
      muted: "#475569",
      primary: "#4F46E5",
      primaryLight: "#6366F1",
      primarySoft: "rgba(79, 70, 229, 0.10)",
      secondary: "#0891B2",
      secondaryLight: "#22D3EE",
      secondarySoft: "rgba(8, 145, 178, 0.10)",
      success: "#059669",
      successSoft: "rgba(5, 150, 105, 0.10)",
      danger: "#E11D48",
      dangerSoft: "rgba(225, 29, 72, 0.09)",
      cardPalettes: [
        { top: "#EEF2FF", bot: "#E0E7FF", stroke: "#4F46E5", text: "#312E81" },
        { top: "#ECFEFF", bot: "#CFFAFE", stroke: "#0891B2", text: "#164E63" },
        { top: "#FAF5FF", bot: "#F3E8FF", stroke: "#7C3AED", text: "#581C87" },
        { top: "#ECFDF5", bot: "#D1FAE5", stroke: "#059669", text: "#064E3B" }
      ]
    },
    bio_med: {
      domainId: "bio_med",
      name: "Botanical Sage & Clinical Pearl",
      label: "Медицина, биология и экология",
      patternType: "organic",
      glyph: "cell",
      bgTop: "#F8FAF8",
      bgBottom: "#EAF4EE",
      ambientA: "rgba(167, 243, 208, 0.42)",
      ambientB: "rgba(255, 228, 230, 0.32)",
      gridColor: "rgba(13, 148, 136, 0.10)",
      surfaceTop: "rgba(255, 255, 255, 0.92)",
      surfaceBottom: "rgba(247, 252, 250, 0.94)",
      surfaceBorder: "rgba(13, 148, 136, 0.12)",
      shadowRgb: "13, 148, 136",
      ink: "#132A23",
      muted: "#4B685E",
      primary: "#0D9488",
      primaryLight: "#14B8A6",
      primarySoft: "rgba(13, 148, 136, 0.10)",
      secondary: "#E11D48",
      secondaryLight: "#FB7185",
      secondarySoft: "rgba(225, 29, 72, 0.09)",
      success: "#059669",
      successSoft: "rgba(5, 150, 105, 0.10)",
      danger: "#DC2626",
      dangerSoft: "rgba(220, 38, 38, 0.09)",
      cardPalettes: [
        { top: "#F0FDFA", bot: "#CCFBF1", stroke: "#0D9488", text: "#134E4A" },
        { top: "#FFF1F2", bot: "#FFE4E6", stroke: "#E11D48", text: "#881337" },
        { top: "#ECFDF5", bot: "#D1FAE5", stroke: "#059669", text: "#065F46" },
        { top: "#F0F9FF", bot: "#E0F2FE", stroke: "#0284C7", text: "#075985" }
      ]
    },
    biz_econ: {
      domainId: "biz_econ",
      name: "FT Paper & Emerald Brass",
      label: "Экономика, финансы и менеджмент",
      patternType: "ledger",
      glyph: "trend",
      bgTop: "#FBF7F2",
      bgBottom: "#F3ECE1",
      ambientA: "rgba(253, 230, 138, 0.30)",
      ambientB: "rgba(209, 250, 229, 0.34)",
      gridColor: "rgba(120, 113, 108, 0.13)",
      surfaceTop: "rgba(255, 253, 249, 0.93)",
      surfaceBottom: "rgba(250, 246, 240, 0.95)",
      surfaceBorder: "rgba(120, 113, 108, 0.13)",
      shadowRgb: "15, 118, 110",
      ink: "#1C1917",
      muted: "#6B635B",
      primary: "#0F766E",
      primaryLight: "#14B8A6",
      primarySoft: "rgba(15, 118, 110, 0.10)",
      secondary: "#B45309",
      secondaryLight: "#D97706",
      secondarySoft: "rgba(180, 83, 9, 0.10)",
      success: "#15803D",
      successSoft: "rgba(21, 128, 61, 0.10)",
      danger: "#B91C1C",
      dangerSoft: "rgba(185, 28, 28, 0.09)",
      cardPalettes: [
        { top: "#ECFDF5", bot: "#D1FAE5", stroke: "#0F766E", text: "#115E59" },
        { top: "#FFFBEB", bot: "#FEF3C7", stroke: "#B45309", text: "#78350F" },
        { top: "#F0F9FF", bot: "#E0F2FE", stroke: "#0369A1", text: "#0C4A6E" },
        { top: "#FAF5FF", bot: "#F3E8FF", stroke: "#7E22CE", text: "#581C87" }
      ]
    },
    soc_hum: {
      domainId: "soc_hum",
      name: "Editorial Terracotta & Warm Sand",
      label: "Социология, история и гуманитарные науки",
      patternType: "editorial",
      glyph: "people",
      bgTop: "#FAF7F2",
      bgBottom: "#F2EBE1",
      ambientA: "rgba(254, 215, 170, 0.38)",
      ambientB: "rgba(224, 231, 255, 0.32)",
      gridColor: "rgba(120, 113, 108, 0.11)",
      surfaceTop: "rgba(255, 254, 251, 0.93)",
      surfaceBottom: "rgba(250, 245, 238, 0.95)",
      surfaceBorder: "rgba(194, 65, 12, 0.12)",
      shadowRgb: "194, 65, 12",
      ink: "#1C1917",
      muted: "#57534E",
      primary: "#C2410C",
      primaryLight: "#EA580C",
      primarySoft: "rgba(194, 65, 12, 0.10)",
      secondary: "#334155",
      secondaryLight: "#475569",
      secondarySoft: "rgba(51, 65, 85, 0.10)",
      success: "#0F766E",
      successSoft: "rgba(15, 118, 110, 0.10)",
      danger: "#B91C1C",
      dangerSoft: "rgba(185, 28, 28, 0.09)",
      cardPalettes: [
        { top: "#FFF7ED", bot: "#FFEDD5", stroke: "#C2410C", text: "#7C2D12" },
        { top: "#F8FAFC", bot: "#E2E8F0", stroke: "#334155", text: "#0F172A" },
        { top: "#FEFCE8", bot: "#FEF08A", stroke: "#A16207", text: "#713F12" },
        { top: "#F0FDFA", bot: "#CCFBF1", stroke: "#0F766E", text: "#134E4A" }
      ]
    },
    law_gov: {
      domainId: "law_gov",
      name: "Editorial Ivory & Burgundy",
      label: "Право, государство и политология",
      patternType: "editorial",
      glyph: "scales",
      bgTop: "#FAF8F5",
      bgBottom: "#F3EFE9",
      ambientA: "rgba(252, 231, 243, 0.34)",
      ambientB: "rgba(254, 243, 199, 0.30)",
      gridColor: "rgba(120, 113, 108, 0.12)",
      surfaceTop: "rgba(255, 254, 251, 0.93)",
      surfaceBottom: "rgba(249, 245, 238, 0.95)",
      surfaceBorder: "rgba(136, 19, 55, 0.12)",
      shadowRgb: "136, 19, 55",
      ink: "#1C1917",
      muted: "#57534E",
      primary: "#881337",
      primaryLight: "#BE123C",
      primarySoft: "rgba(136, 19, 55, 0.09)",
      secondary: "#B45309",
      secondaryLight: "#D97706",
      secondarySoft: "rgba(180, 83, 9, 0.10)",
      success: "#0F766E",
      successSoft: "rgba(15, 118, 110, 0.10)",
      danger: "#B91C1C",
      dangerSoft: "rgba(185, 28, 28, 0.09)",
      cardPalettes: [
        { top: "#FFF1F2", bot: "#FFE4E6", stroke: "#9F1239", text: "#881337" },
        { top: "#FFFBEB", bot: "#FEF3C7", stroke: "#B45309", text: "#78350F" },
        { top: "#EFF6FF", bot: "#DBEAFE", stroke: "#1D4ED8", text: "#1E3A8A" },
        { top: "#F0FDFA", bot: "#CCFBF1", stroke: "#0F766E", text: "#134E4A" }
      ]
    }
  };

  // Обратная совместимость со старым ключом law_hum
  EDITORIAL_THEMES.law_hum = EDITORIAL_THEMES.soc_hum;

  function getTheme(domainId) {
    if (domainId === "law_hum") return EDITORIAL_THEMES.soc_hum;
    return EDITORIAL_THEMES[domainId] || EDITORIAL_THEMES.soc_hum;
  }

  function detectVisualDomain(text, title = "", glossaryText = "") {
    const head = `${title} ${glossaryText}`.toLowerCase();
    const body = String(text || "").slice(0, 8000).toLowerCase();
    const scores = {
      arch_eng: 0,
      ai_cs: 0,
      bio_med: 0,
      biz_econ: 0,
      soc_hum: 0,
      law_gov: 0
    };

    const countIn = (str, re) => (str.match(re) || []).length;

    // 1. Высокоточные биграммы (исключают ложное попадание «социологии архитектуры» и «архитектуры трансформеров» в стройку)
    scores.soc_hum += countIn(head + " " + body, /социолог\S*\s+(?:архитектур|город|урбаниз|исследован)|социальн\S*\s+(?:общност|структур|стратификац|институт|статус|групп|среда|процесс|действ|взаимодейств)|социологическ\S*\s+(?:подход|воображен|мышлен)/g) * 18;
    scores.ai_cs += countIn(head + " " + body, /архитектур\S*\s+(?:трансформер|нейросет|данн|программ|систем|микросервис|rag|компьютер|модел)|больши\S*\s+языков\S*\s+модел|векторн\S*\s+(?:баз|эмбеддинг|поиск)/g) * 18;
    scores.arch_eng += countIn(head + " " + body, /сейсмостойк\S*\s+(?:проектирован|строительств|здани)|несущ\S*\s+каркас|диафрагм\S*\s+жёсткост|пространственн\S*\s+ферм|диссипац\S*\s+энерги/g) * 18;
    scores.law_gov += countIn(head + " " + body, /нормативн\S*\s+акт|правоотношен|уголовн\S*\s+кодекс|гражданск\S*\s+прав|конституционн\S*\s+строй/g) * 18;
    scores.bio_med += countIn(head + " " + body, /клеточн\S*\s+мембран|иммунн\S*\s+систем|обмен\S*\s+веществ|клиническ\S*\s+симптом|синтез\S*\s+белк/g) * 18;
    scores.biz_econ += countIn(head + " " + body, /юнит-экономик|точк\S*\s+безубыточност|спрос\S*\s+и\s+предложен|денежн\S*\s+поток|маржинальн\S*\s+прибыл/g) * 18;

    // 2. Узкопрофильные маркеры (вес заголовка/глоссария ×4, основного текста ×1)
    const addWeighted = (domain, strongRe, weakRe) => {
      scores[domain] += countIn(head, strongRe) * 16 + countIn(body, strongRe) * 4;
      if (weakRe) {
        scores[domain] += countIn(head, weakRe) * 4 + countIn(body, weakRe) * 1;
      }
    };

    addWeighted(
      "soc_hum",
      /социолог|әлеуметтан|стратификац|урбаниз|маргинальн|девиант|гендер|индивид|обществ|қоғам|философ|истори|эпох|цивилизац|культур|психолог|педагогик|этнос|гуманитар|миллс|бергер/g,
      /социальн|групп|поведен|среда|традиц|ценност/g
    );
    addWeighted(
      "law_gov",
      /юрисдикц|кодекс|правонарушен|судебн|законодатель|конституц|прокурор|ответственност|преступлен|договор|санкци|норма\s+прав|политолог|парламент/g,
      /(?:^|[^а-яёa-z])(?:закон(?:а|у|ом|е|ы|ов)?|прав(?:о|а|ом|у)|суд(?:а|ом|е|ы)?)(?=$|[^а-яёa-z])|государств/g
    );
    addWeighted(
      "bio_med",
      /клетк|мембран|вирус|бактери|фермент|молекул|днк|рнк|ген(?:етик|ом)|органелл|метаболизм|терапи|диагноз|патолог|анатом|физиолог|биолог|эколог|фотосинтез|рецептор/g,
      /белок|ткань|орган|реакц|растен|животн|медицин|хими/g
    );
    addWeighted(
      "biz_econ",
      /экономик|маржинальн|конверси|инвестиц|рентабельност|инфляц|бюджет|финанс|капитал|выручк|издержк|безубыточ|маркетинг|менеджмент|ltv|cac|roi|актив|пассив|налог/g,
      /рынок|клиент|прибыл|продаж|бизнес|стоимост|товар|спрос/g
    );
    addWeighted(
      "ai_cs",
      /алгоритм|нейросет|трансформер|токенизац|эмбеддинг|embedding|self-attention|rag|pgvector|компилятор|рекурси|матриц|граф(?:ов|ы)|баз\S*\s+данн|sql|python|javascript|api|сервер|криптограф/g,
      /программ|данн|код|информатик|вычислен|токен|вектор/g
    );
    addWeighted(
      "arch_eng",
      /сейсм|железобетон|арматур|фундамент|балк|ферм|демпфер|диссипац|сопромат|деформац|напряжен|гидравлик|термодинам|электротехн|чертеж|пролёт|колонн/g,
      /архитектур|здани|конструкц|механик|нагруз|резонанс/g
    );

    let bestId = "soc_hum";
    let bestScore = 0;
    Object.keys(scores).forEach((k) => {
      if (scores[k] > bestScore) {
        bestScore = scores[k];
        bestId = k;
      }
    });
    return getTheme(bestId);
  }

  function estimateComplexityAndPacing(text, glossaryLen = 4) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    const hasFormulas = /[=≈≠≥≤∑∫√]|cos\(|sin\(|log\(|O\(n/i.test(text);
    const complexityPoints =
      (words > 260 ? 2 : words > 110 ? 1 : 0) +
      (glossaryLen >= 5 ? 2 : glossaryLen >= 3 ? 1 : 0) +
      (hasFormulas ? 1 : 0);

    if (complexityPoints <= 1) {
      return { tier: 1, label: "Базовый обзор", sceneCount: 5, targetCps: 12.2, preRollSec: 0.7, postRollSec: 1.2 };
    }
    if (complexityPoints <= 3) {
      return { tier: 2, label: "Стандартный концептуальный", sceneCount: 6, targetCps: 12.0, preRollSec: 0.8, postRollSec: 1.4 };
    }
    return { tier: 3, label: "Углублённый разбор", sceneCount: 6, targetCps: 11.5, preRollSec: 0.9, postRollSec: 1.5 };
  }

  function computeCalmDurationSec(caption, baseMin = 10, targetCps = 12.0, preRoll = 0.8, postRoll = 1.4) {
    const len = String(caption || "").trim().length;
    const speechSec = len / Math.max(9.5, targetCps);
    return Math.min(22, Math.max(baseMin, +(preRoll + speechSec + postRoll).toFixed(1)));
  }

  // Подбор УНИКАЛЬНОГО набора визуальных композиций под предмет и структуру текста
  function selectDomainModules(domainId, sceneCount = 6, contentHints = {}) {
    const hasYears = Boolean(contentHints.hasYears);
    const hasFormula = Boolean(contentHints.hasFormula);

    const map = {
      soc_hum: [
        "actor_network_web",
        "social_stratification_pyramid",
        "split_versus_duel",
        hasYears ? "chronicle_timeline" : "multi_mode_chart",
        "case_dossier_blueprint",
        "radial_constellation_map"
      ],
      law_gov: [
        "scales_balance_norm",
        "social_stratification_pyramid",
        "split_versus_duel",
        "chronicle_timeline",
        "case_dossier_blueprint",
        "radial_constellation_map"
      ],
      bio_med: [
        "bio_cell_cycle",
        "bio_pathway",
        "split_versus_duel",
        "multi_mode_chart",
        "case_dossier_blueprint",
        "radial_constellation_map"
      ],
      biz_econ: [
        "econ_funnel_waterfall",
        "scales_balance_norm",
        "split_versus_duel",
        "multi_mode_chart",
        "case_dossier_blueprint",
        "radial_constellation_map"
      ],
      ai_cs: [
        "cs_layered_pipeline",
        "system_anatomy",
        "split_versus_duel",
        hasFormula ? "multi_mode_chart" : "actor_network_web",
        "case_dossier_blueprint",
        "radial_constellation_map"
      ],
      arch_eng: [
        "eng_structural_forces",
        "system_anatomy",
        "split_versus_duel",
        "multi_mode_chart",
        "case_dossier_blueprint",
        "radial_constellation_map"
      ]
    };

    const list = (map[domainId] || map.soc_hum).slice();
    const count = Math.max(5, Math.min(6, sceneCount));
    if (count === 5) {
      return [list[0], list[1], list[2], list[4], list[5]];
    }
    return list.slice(0, count);
  }

  return {
    EDITORIAL_THEMES,
    getTheme,
    detectVisualDomain,
    estimateComplexityAndPacing,
    computeCalmDurationSec,
    selectDomainModules
  };
})();

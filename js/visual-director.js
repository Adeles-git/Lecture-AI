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
      patternType: "archival_columns",
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
    const minForCps = len > 0 ? Math.ceil((len / 14.2) * 10) / 10 : baseMin;
    return Math.min(28, Math.max(baseMin, minForCps, +(preRoll + speechSec + postRoll).toFixed(1)));
  }

  const MODULE_FAMILIES = {
    actor_network_web: "network",
    system_anatomy: "network",
    radial_constellation_map: "network",
    social_stratification_pyramid: "hierarchy",
    cs_layered_pipeline: "hierarchy",
    shield_core_architecture: "hierarchy",
    bio_pathway: "flow_steps",
    pipeline_energy_flow: "flow_steps",
    cause_effect_flow: "flow_steps",
    chronicle_timeline: "timeline",
    timeline_scroll: "timeline",
    split_versus_duel: "contrast",
    scales_balance_norm: "contrast",
    multi_mode_chart: "analytics",
    causal_curve: "analytics",
    econ_funnel_waterfall: "analytics",
    funnel_flow: "analytics",
    case_dossier_blueprint: "case_practice",
    worked_example: "case_practice",
    eng_structural_forces: "case_practice",
    bio_cell_cycle: "case_practice",
    hero_problem_hook: "case_practice"
  };

  const DOMAIN_PATTERN_VARIANTS = {
    arch_eng: ["blueprint", "dots", "editorial"],
    ai_cs: ["dots", "blueprint", "editorial"],
    bio_med: ["organic", "dots", "editorial"],
    biz_econ: ["ledger", "dots", "editorial"],
    soc_hum: ["editorial", "dots", "ledger"],
    law_gov: ["archival_columns", "ledger", "editorial"]
  };

  function analyzeSectionSemantics(sec) {
    const raw = [
      sec?.title || "",
      sec?.academicOriginal || "",
      sec?.plainSummary || "",
      ...(Array.isArray(sec?.plainBullets) ? sec.plainBullets : [])
    ]
      .join(" ")
      .toLowerCase();

    const count = (re) => (raw.match(re) || []).length;
    const years = raw.match(/(?:^|\s)(?:1[5-9]\d{2}|20[0-3]\d)(?:\s*(?:г\.|год\S*|ж\.|жыл\S*))?|(?:\s|^)(?:[xхvi]{1,4}\s*в(?:ек|\.)|century|centuries|ғасыр)/gi) || [];
    const metrics = raw.match(/\b\d+(?:[.,]\d+)?\s*(?:%|ms|sec|min|hz|kw|mpa|pts|points|tokens|times|мс|сек|мин|гц|квт|мпа|баллов|токенов|ұпай|токен|рет|₸|₽|\$|€|раз|:1)/gi) || [];
    const hasFormula = /[=≈≠≥≤∑∫√]|cos\(|sin\(|log\(|O\(/i.test(raw);

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    return {
      datesChronology: clamp01(years.length * 0.45 + count(/(?:^|[\s.,;:!?()«»"'])(?:эпох|истори|эволюц|период|поколен|хронолог|сначала|затем|впоследствии|кезең|тарих|дәуір|алдымен|кейін|timeline|history|era|century|evolution)/g) * 0.28),
      numbersFormulas: clamp01((hasFormula ? 0.65 : 0) + metrics.length * 0.25 + count(/(?:^|[\s.,;:!?()«»"'])(?:график|кривая|рост|снижен|зависимост|пропорц|коэффициент|формул|метрик|диаграмм|көрсеткіш|өсім|төмендеу|формула|график|chart|curve|growth|ratio|metric)/g) * 0.22),
      comparisonContrast: clamp01(count(/(?:^|[\s.,;:!?()«»"'])(?:в отличие от|напротив|однако|с одной стороны|с другой стороны|преимуществ|недостат|ошибк|наивн|традиционн|современн|без\s+|против|айырмашылы|артықшылы|кемшілі|қарама-қарсы|алайда|unlike|whereas|versus|however|advantage|disadvantage|contrast)/g) * 0.34),
      stagesSequence: clamp01(((sec?.plainBullets?.length || 0) >= 3 ? 0.35 : 0) + count(/(?:^|[\s.,;:!?()«»"'])(?:этап|стади|шаг|фаз|алгоритм|последовательност|цикл|поток|пайплайн|далее|затем|қадам|кезең|саты|реттілік|ағын|stage|step|phase|pipeline|sequence|workflow)/g) * 0.26),
      hierarchyTaxonomy: clamp01(count(/(?:^|[\s.,;:!?()«»"'])(?:уровен|уровн|ступен|иерарх|стратификац|классификац|категори|типолог|пирамид|слой|подсистем|архитектур|деңгей|саты|жіктеу|жүйе|құрылым|layer|level|hierarchy|tier|taxonomy)/g) * 0.32),
      causeEffect: clamp01(count(/(?:^|[\s.,;:!?()«»"'])(?:потому что|поэтому|следовательно|приводит к|вызывает|влияет на|зависит от|вследствие|причина|следствие|механизм|эффект|фактор|себеп|салдар|сондықтан|өйткені|нәтиже|әсер|because|therefore|causes|leads to|effect|impact)/g) * 0.3),
      balanceNormTradeoff: clamp01(count(/(?:^|[\s.,;:!?()«»"'])(?:баланс|равновес|компромисс|норма|правил|регулир|ограничен|санкц|право|обязанност|спрос|предложен|издержк|риск|тепе-теңдік|қағида|ереже|тәуекел|сұраныс|balance|equilibrium|tradeoff|norm|rule)/g) * 0.32),
      practicalCase: clamp01(count(/(?:^|[\s.,;:!?()«»"'])(?:пример|кейс|задач|практик|применен|расчёт|расчет|сценари|ситуаци|дано|решен|на практике|в жизни|мысал|есеп|тәжірибе|жағдай|шешім|case|example|practice|problem|solution)/g) * 0.32),
      actorsNetwork: clamp01(count(/(?:^|[\s.,;:!?()«»"'])(?:взаимодейств|участник|субъект|агент|актор|групп|институт|связ|сеть|экосистем|коммуникац|компонент|қоғам|байланыс|қатысушы|желі|орта|actor|participant|network|system|node)/g) * 0.3)
    };
  }

  function scoreModuleForSection(modId, f, domainId, idx, totalScenes) {
    let sem = 0;
    switch (modId) {
      case "chronicle_timeline":
      case "timeline_scroll":
        sem = f.datesChronology * 52 + f.stagesSequence * 20;
        break;
      case "multi_mode_chart":
        sem = f.numbersFormulas * 48 + f.causeEffect * 22;
        break;
      case "causal_curve":
        sem = f.causeEffect * 38 + f.numbersFormulas * 34;
        break;
      case "worked_example":
        sem = f.practicalCase * 44 + f.numbersFormulas * 30;
        break;
      case "case_dossier_blueprint":
        sem = f.practicalCase * 46 + f.stagesSequence * 18;
        break;
      case "split_versus_duel":
        sem = f.comparisonContrast * 54 + f.balanceNormTradeoff * 12;
        break;
      case "scales_balance_norm":
        sem = f.balanceNormTradeoff * 48 + f.comparisonContrast * 20;
        break;
      case "social_stratification_pyramid":
        sem = f.hierarchyTaxonomy * 52;
        break;
      case "cs_layered_pipeline":
        sem = f.hierarchyTaxonomy * 34 + f.stagesSequence * 30;
        break;
      case "shield_core_architecture":
        sem = f.hierarchyTaxonomy * 26 + f.balanceNormTradeoff * 26 + f.actorsNetwork * 18;
        break;
      case "cause_effect_flow":
        sem = f.causeEffect * 50 + f.stagesSequence * 20;
        break;
      case "bio_pathway":
      case "pipeline_energy_flow":
        sem = f.stagesSequence * 46 + f.causeEffect * 20;
        break;
      case "econ_funnel_waterfall":
      case "funnel_flow":
        sem = f.numbersFormulas * 32 + f.stagesSequence * 32;
        break;
      case "actor_network_web":
      case "system_anatomy":
        sem = f.actorsNetwork * 46 + f.hierarchyTaxonomy * 16;
        break;
      case "eng_structural_forces":
      case "bio_cell_cycle":
      case "hero_problem_hook":
        sem = f.causeEffect * 24 + f.actorsNetwork * 20 + 12;
        break;
      case "radial_constellation_map":
        sem = idx === totalScenes - 1 ? 36 : 10;
        break;
      default:
        sem = 10;
    }

    // Мягкий доменный бонус (не навязывает одинаковый шаблон, лишь усиливает профильные образы)
    const domAff = {
      arch_eng: { eng_structural_forces: 22, system_anatomy: 14, hero_problem_hook: 14, shield_core_architecture: 12, worked_example: 12, causal_curve: 10 },
      ai_cs: { cs_layered_pipeline: 22, pipeline_energy_flow: 16, system_anatomy: 14, shield_core_architecture: 14, actor_network_web: 12, causal_curve: 10 },
      bio_med: { bio_cell_cycle: 24, bio_pathway: 22, cause_effect_flow: 14, causal_curve: 12 },
      biz_econ: { econ_funnel_waterfall: 22, funnel_flow: 16, scales_balance_norm: 16, worked_example: 14, multi_mode_chart: 12 },
      soc_hum: { actor_network_web: 20, social_stratification_pyramid: 20, chronicle_timeline: 14, timeline_scroll: 12, split_versus_duel: 10 },
      law_gov: { scales_balance_norm: 22, social_stratification_pyramid: 16, chronicle_timeline: 16, timeline_scroll: 14, shield_core_architecture: 12 }
    };
    const domBonus = domAff[domainId]?.[modId] || 0;

    let posBonus = 0;
    if (idx === 0) {
      if (["hero_problem_hook", "actor_network_web", "eng_structural_forces", "cs_layered_pipeline", "bio_cell_cycle", "econ_funnel_waterfall", "scales_balance_norm"].includes(modId)) {
        posBonus = 18;
      }
    } else if (idx === totalScenes - 1) {
      if (modId === "radial_constellation_map") posBonus = 24;
      else if (["case_dossier_blueprint", "worked_example"].includes(modId)) posBonus = 8;
    }

    return sem + domBonus + posBonus;
  }

  function hashSeedInt(str) {
    let h = 2166136261;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Семантический подбор УНИКАЛЬНОЙ последовательности композиций, раскладок и переходов под конкретные разделы лекции
  function selectSectionModules(domainId, sections = [], globalSignals = {}, options = {}) {
    const count = Math.max(4, Math.min(6, options.sceneCount || Math.max(5, Math.min(6, sections.length || 6))));
    const seedInt = hashSeedInt(`${domainId}||${sections.map((s) => s?.title || "").join("|")}||${options.seedStr || ""}`);

    const allPool = Object.keys(MODULE_FAMILIES);
    const usedModules = new Set();
    let prevFamily = "";
    let prevLayout = "";
    let prevTransition = "";

    const wideFriendly = new Set(["chronicle_timeline", "timeline_scroll", "cs_layered_pipeline", "pipeline_energy_flow", "multi_mode_chart", "causal_curve", "econ_funnel_waterfall", "funnel_flow", "cause_effect_flow", "worked_example"]);
    const focusSplitFriendly = new Set(["split_versus_duel", "scales_balance_norm", "case_dossier_blueprint", "worked_example", "shield_core_architecture"]);
    const transitions = ["cross_dissolve", "slide", "zoom_fade", "wipe"];
    const accentModes = ["primary", "secondary", "contrast", "neutral_ink"];
    const pVariants = DOMAIN_PATTERN_VARIANTS[domainId] || DOMAIN_PATTERN_VARIANTS.soc_hum;

    const chosen = [];
    for (let idx = 0; idx < count; idx++) {
      const sec = sections[idx % Math.max(1, sections.length)] || { title: "", academicOriginal: "", plainSummary: "", plainBullets: [] };
      const feats = analyzeSectionSemantics(sec);

      const ranked = allPool
        .filter((modId) => !usedModules.has(modId))
        .map((modId) => {
          const fam = MODULE_FAMILIES[modId];
          let sc = scoreModuleForSection(modId, feats, domainId, idx, count);
          if (fam === prevFamily) sc -= 85;
          // Детерминированный микро-сдвиг от содержания лекции, чтобы даже похожие темы имели разный визуальный ритм
          const jitter = ((seedInt + idx * 97 + modId.length * 31) % 11) * 0.9;
          return { modId, fam, sc: sc + jitter };
        })
        .sort((a, b) => b.sc - a.sc);

      const best = ranked[0] || { modId: "actor_network_web", fam: "network" };
      usedModules.add(best.modId);
      prevFamily = best.fam;

      // Авто-режиссура раскладки кадра (зависит от архетипа, индекса и seed лекции)
      let layoutMode = "split_tutor";
      if (idx === 0) {
        layoutMode = seedInt % 2 === 0 ? "hero_intro" : "split_tutor";
      } else if (wideFriendly.has(best.modId) && prevLayout !== "wide_stage") {
        layoutMode = "wide_stage";
      } else if (focusSplitFriendly.has(best.modId) && prevLayout !== "focus_split") {
        layoutMode = "focus_split";
      } else if (prevLayout === "split_tutor") {
        layoutMode = wideFriendly.has(best.modId) ? "wide_stage" : "focus_split";
      }
      prevLayout = layoutMode;

      // Разнообразие переходов между сценами
      let transitionType = transitions[(idx * 3 + seedInt) % transitions.length];
      if (idx === 0 && seedInt % 2 === 0) transitionType = "zoom_fade";
      else if ((best.fam === "timeline" || best.fam === "flow_steps") && (idx + seedInt) % 2 === 0) transitionType = "wipe";
      else if (best.fam === "contrast" && (idx + seedInt) % 2 === 0) transitionType = "slide";
      if (transitionType === prevTransition) {
        transitionType = transitions[(transitions.indexOf(transitionType) + 1) % transitions.length];
      }
      prevTransition = transitionType;

      chosen.push({
        moduleId: best.modId,
        family: best.fam,
        layoutMode,
        transitionType,
        styleVariant: {
          patternVariant: pVariants[(idx + seedInt) % pVariants.length],
          accentMode: accentModes[(idx * 3 + (seedInt >>> 2)) % accentModes.length],
          frameless: layoutMode === "wide_stage" || (idx + seedInt) % 3 === 0,
          paletteOffset: (idx * 2 + (seedInt >>> 4)) % 4
        }
      });
    }

    return chosen;
  }

  // Обратная совместимость со старым вызовом
  function selectDomainModules(domainId, sceneCount = 6, contentHints = {}) {
    if (Array.isArray(contentHints.sections) && contentHints.sections.length > 0) {
      return selectSectionModules(domainId, contentHints.sections, contentHints, { sceneCount }).map((c) => c.moduleId);
    }
    const stubSections = Array.from({ length: sceneCount }, (_, i) => ({
      title: `Раздел ${i + 1}`,
      academicOriginal: contentHints.hasFormula ? "формула = результат 50%" : contentHints.hasYears ? "1990 2020 эволюция этап" : "анализ пример сравнение структура"
    }));
    return selectSectionModules(domainId, stubSections, contentHints, { sceneCount }).map((c) => c.moduleId);
  }

  return {
    EDITORIAL_THEMES,
    MODULE_FAMILIES,
    getTheme,
    detectVisualDomain,
    estimateComplexityAndPacing,
    computeCalmDurationSec,
    analyzeSectionSemantics,
    selectSectionModules,
    selectDomainModules
  };
})();

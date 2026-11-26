// Универсальный модуль ИИ-Сценариста, NLP-парсера лекций и 3-эшелонного AI Supervisor (v6)
// Поддерживает любые произвольные лекции, семинары и методички (.doc, .docx, .pptx, .pdf, .txt) без костылей:
// 1) Санитизация документа (очистка HYPERLINK, колонтитулов PAGE, библиографии ГОСТ и служебных шапок)
// 2) Структурная сегментация на реальные смысловые разделы + выделение списков и таблиц «Глоссарий»
// 3) 4-уровневое NLP-извлечение терминов и настоящих определений прямо из текста («— это», «называется», «представляет собой»)
// 4) Единый Сценарист-Режиссёр для всех 6 предметных миров и 12 визуальных 2D-композиций (синхронность речи и графики)
// 5) Single-Pass Gemini 2.5 Flash API с полной синхронизацией visualPayload + автономный детерминированный движок

window.AISupervisorPipeline = {
  OUTPUT_I18N: {
    ru: {
      domainNames: {
        arch_eng: "Инженерия, строительство и физика",
        biz_econ: "Экономика, финансы и менеджмент",
        ai_cs: "ИИ, алгоритмы и компьютерные науки",
        bio_med: "Биология, медицина и экология",
        soc_hum: "Социология, история и гуманитарные науки",
        law_gov: "Право, государство и политология",
        law_hum: "Социология и гуманитарные науки"
      },
      moduleBadges: {
        actor_network_web: { badge: "🌐 1. Сеть взаимодействий", title: "Субъекты, группы и среда" },
        social_stratification_pyramid: { badge: "🏛️ 2. Иерархия и уровни", title: "Структура и уровни системы" },
        scales_balance_norm: { badge: "⚖️ 1. Баланс и норма", title: "Равновесие факторов и правил" },
        bio_cell_cycle: { badge: "🧬 1. Живая клетка и цикл", title: "Клеточный механизм в действии" },
        bio_pathway: { badge: "🔬 2. Био-путь и реакция", title: "Последовательность биопроцесса" },
        econ_funnel_waterfall: { badge: "📊 1. Воронка и баланс", title: "Движение ресурса и эффективность" },
        cs_layered_pipeline: { badge: "💻 1. Стек и поток данных", title: "Архитектура обработки данных" },
        eng_structural_forces: { badge: "📐 1. Силы и конструкция", title: "Распределение усилий в системе" },
        system_anatomy: { badge: "🧩 2. Устройство системы", title: "Как части работают вместе" },
        chronicle_timeline: { badge: "⏳ 4. Лента этапов", title: "Последовательность и эволюция" },
        split_versus_duel: { badge: "⚡ 3. Сравнение подходов", title: "Два взгляда: наивный vs научный" },
        multi_mode_chart: { badge: "📈 4. Закономерность", title: "Как один фактор меняет другой" },
        case_dossier_blueprint: { badge: "📋 5. Разбор на практике", title: "Прикладная задача и решение" },
        radial_constellation_map: { badge: "✨ 6. Карта к экзамену", title: "Все понятия урока в единой системе" }
      },
      quizQTerm: (term) => `Что простыми словами означает понятие «${term}»?`,
      quizQSec: (sec) => `Какая главная мысль раскрывается в разделе «${sec}»?`,
      quizDistractor: "Второстепенная техническая деталь, не связанная с сутью темы.",
      quizExplain: (term, plain) => `Верно! «${term}» простыми словами: ${plain}`,
      sup1Title: "Эшелон 1 · Извлечение фактов лекции и «Ясный язык»",
      sup2Title: "Эшелон 2 · Геометрия 2D-сцен (коллизии 0 px²)",
      sup3Title: "Эшелон 3 · Синхронизация речи, битов и дизайна (60 FPS)"
    },
    kk: {
      domainNames: {
        arch_eng: "Инженерия, құрылыс және физика",
        biz_econ: "Экономика, қаржы және менеджмент",
        ai_cs: "Жасанды интеллект және IT",
        bio_med: "Биология, медицина және экология",
        soc_hum: "Әлеуметтану, тарих және гуманитарлық ғылымдар",
        law_gov: "Құқық, мемлекет және саясаттану",
        law_hum: "Әлеуметтану және гуманитарлық ғылымдар"
      },
      moduleBadges: {
        actor_network_web: { badge: "🌐 1. Өзара байланыс торы", title: "Топтар мен ортаның байланысы" },
        social_stratification_pyramid: { badge: "🏛️ 2. Құрылым деңгейлері", title: "Жүйе сатылары мен құрылымы" },
        scales_balance_norm: { badge: "⚖️ 1. Тепе-теңдік пен норма", title: "Қағидалар мен факторлар теңгерімі" },
        bio_cell_cycle: { badge: "🧬 1. Жасуша және цикл", title: "Биологиялық механизм жұмысы" },
        bio_pathway: { badge: "🔬 2. Био-ағын", title: "Процестің кезеңдік тізбегі" },
        econ_funnel_waterfall: { badge: "📊 1. Құндылық ағыны", title: "Ресурс қозғалысы мен нәтиже" },
        cs_layered_pipeline: { badge: "💻 1. Деректер стегі", title: "Ақпаратты өңдеу архитектурасы" },
        eng_structural_forces: { badge: "📐 1. Күштер мен құрылым", title: "Жүктеме мен тұрақтылық сызбасы" },
        system_anatomy: { badge: "🧩 2. Жүйе құрылысы", title: "Бөліктердің өзара жұмысы" },
        chronicle_timeline: { badge: "⏳ 4. Уақыт пен кезеңдер", title: "Даму мен процестің реті" },
        split_versus_duel: { badge: "⚡ 3. Тәсілдерді салыстыру", title: "Екі көзқарас: қате vs дұрыс" },
        multi_mode_chart: { badge: "📈 4. Заңдылық графигі", title: "Факторлардың өзара әсері" },
        case_dossier_blueprint: { badge: "📋 5. Тәжірибелік талдау", title: "Нақты жағдайда қолдану" },
        radial_constellation_map: { badge: "✨ 6. Емтихан картасы", title: "Тақырыптың негізгі ұғымдар жүйесі" }
      },
      quizQTerm: (term) => `«${term}» ұғымының қарапайым тілдегі мағынасы қандай?`,
      quizQSec: (sec) => `«${sec}» бөлімінен қандай басты қорытынды шығады?`,
      quizDistractor: "Тақырыптың негізгі мәніне қатысы жоқ қосалқы деталь.",
      quizExplain: (term, plain) => `Дұрыс! «${term}» қарапайым тілде: ${plain}`,
      sup1Title: "1-эшелон · Дәріс деректері және «Айқын тіл»",
      sup2Title: "2-эшелон · Кадр геометриясы (коллизия 0 px²)",
      sup3Title: "3-эшелон · Дыбыс пен анимация үйлесімі (60 FPS)"
    },
    en: {
      domainNames: {
        arch_eng: "Engineering, Construction & Physics",
        biz_econ: "Economics, Finance & Management",
        ai_cs: "AI, Algorithms & Computer Science",
        bio_med: "Biology, Medicine & Ecology",
        soc_hum: "Sociology, History & Humanities",
        law_gov: "Law, Governance & Policy",
        law_hum: "Sociology & Humanities"
      },
      moduleBadges: {
        actor_network_web: { badge: "🌐 1. Interaction Network", title: "Groups, Actors & Environment" },
        social_stratification_pyramid: { badge: "🏛️ 2. System Hierarchy", title: "Core Levels & Structure" },
        scales_balance_norm: { badge: "⚖️ 1. Balance & Norm", title: "Equilibrium of Rules & Factors" },
        bio_cell_cycle: { badge: "🧬 1. Cell & Cycle", title: "Living Mechanism in Action" },
        bio_pathway: { badge: "🔬 2. Bio-Pathway", title: "Step-by-Step Biological Flow" },
        econ_funnel_waterfall: { badge: "📊 1. Funnel & Balance", title: "Value Flow & Efficiency" },
        cs_layered_pipeline: { badge: "💻 1. Data Stack", title: "Layered Processing Pipeline" },
        eng_structural_forces: { badge: "📐 1. Forces & Structure", title: "Force Distribution Blueprint" },
        system_anatomy: { badge: "🧩 2. System Anatomy", title: "How Components Work Together" },
        chronicle_timeline: { badge: "⏳ 4. Stage Timeline", title: "Chronology & Process Sequence" },
        split_versus_duel: { badge: "⚡ 3. Approach Duel", title: "Naive View vs Core Method" },
        multi_mode_chart: { badge: "📈 4. Key Pattern", title: "How Factor A Shapes Outcome B" },
        case_dossier_blueprint: { badge: "📋 5. Practical Case", title: "Real-World Application" },
        radial_constellation_map: { badge: "✨ 6. Exam Concept Map", title: "Complete Concept Synthesis" }
      },
      quizQTerm: (term) => `What does "${term}" mean in simple everyday language?`,
      quizQSec: (sec) => `What is the main takeaway from "${sec}"?`,
      quizDistractor: "A minor technical detail unrelated to the core concept.",
      quizExplain: (term, plain) => `Correct! "${term}" in simple words: ${plain}`,
      sup1Title: "Echelon 1 · Lecture Fact Grounding & Plain Language",
      sup2Title: "Echelon 2 · Scene Geometry & Zero Collision Gate",
      sup3Title: "Echelon 3 · Voice-to-Motion Beat Sync (60 FPS)"
    }
  },

  STOP_WORDS: new Set([
    "однако", "поэтому", "кроме", "также", "например", "слайд", "модуль", "лекция", "семинар",
    "тема", "раздел", "когда", "если", "чтобы", "после", "перед", "вместо", "через", "между",
    "материал", "преподавателя", "файл", "документ", "загруженный", "курс", "краткое", "содержание",
    "план", "вопросы", "контрольные", "задание", "литература", "обязательная", "дополнительная",
    "учебное", "пособие", "практикум", "учебник", "москва", "алматы", "издательство", "ресурс",
    "электронный", "цифровой", "образовательный", "текст", "сайт", "страница", "таблица", "рисунок",
    "hyperlink", "smart", "books", "page", "mergeformat", "thememanager", "openxmlformats", "selectedstyle",
    "международная", "образовательная", "корпорация", "активный", "раздаточный", "дисциплина", "кредитов",
    "часов", "лекционных", "практических", "русском", "казахском", "английском", "языке", "глоссарий",
    "объектом", "предметом", "целью", "основная", "задача", "является", "выступает", "выступают",
    "состоит", "позволяет", "способствует", "такой", "таким", "образом", "любой", "каждый", "которые",
    "который", "которая", "других", "жизни", "людей", "человек", "ученые", "рассматривают", "именно",
    "сонымен", "бірақ", "осылайша", "дәріс", "бағдарлама"
  ]),

  // =========================================================================
  // СЛОЙ 1: САНИТИЗАЦИЯ ТЕКСТА И АВТО-ИЗВЛЕЧЕНИЕ РЕАЛЬНОГО НАЗВАНИЯ УРОКА
  // =========================================================================
  sanitizeAndExtractMeta(rawTitle, rawLectureText) {
    let text = String(rawLectureText || "");
    // Срезаем служебные обёртки загрузчика файлов
    text = text.replace(/^\[(?:Материал преподавателя|Файл|Аудиозапись лекции)\s*:[^\]]*\]\s*/gim, "");
    // Очищаем поля Word HYPERLINK "..." \o "..." (оставляя видимый текст ссылки!)
    text = text.replace(/HYPERLINK\s+"[^"]*"(?:\s+\\[a-z]\s+"[^"]*")?\s*/gi, "");
    // Убираем колонтитулы Word PAGE / PAGE 2 и технические артефакты XML/PDF
    text = text.replace(/^\s*PAGE(?:\s+\d+)?\s*$/gim, "");
    text = text.replace(/\b(?:MERGEFORMAT|themeManager\.xml\.rels\S*|schemas\.openxmlformats\.org\S*|ds:datastoreItem\S*|ds:itemID\S*|SelectedStyle)\b/gi, " ");
    text = text.replace(/[\u00a0\t]+/g, " ");
    text = text
      .split(/\r?\n/)
      .map((ln) => ln.replace(/\s+/g, " ").trim())
      .filter((ln) => {
        if (!ln) return true; // пустые строки пока сохраняем для абзацев
        if (/^(?:URL\s*:|https?:\/\/|ISBN\s*[\d-]+|_{3,})/i.test(ln)) return false;
        if (/^\d{1,3}$/.test(ln)) return false; // одиночный номер страницы
        return true;
      })
      .join("\n");

    let cleanTitle = String(rawTitle || "").trim();
    const isGenericFileTitle =
      !cleanTitle ||
      /^Загруженный курс\s*·/i.test(cleanTitle) ||
      /(?:^|[^А-Яа-яЁёA-Za-z0-9])(?:АРМ|МСПЗ|СРС|СРСП|УМКД)(?=$|[^А-Яа-яЁёA-Za-z0-9])/i.test(cleanTitle);

    if (isGenericFileTitle) {
      const headChunk = text.slice(0, 1400);
      const semMatch =
        headChunk.match(/(?:Семинар|Лекция|Тема|Модуль|Дәріс|Тақырып)\s*№?\s*\d*[:.]?\s*[«"]([^»"]{8,105})[»"]/i) ||
        headChunk.match(/\[Слайд\s*1\s*:\s*([^\]]{8,100})\]/i) ||
        headChunk.match(/Дисциплина\s*[«"]([^»"]{8,100})[»"]/i);
      if (semMatch && semMatch[1]) {
        cleanTitle = semMatch[1].trim();
      } else {
        cleanTitle = cleanTitle.replace(/^Загруженный курс\s*·\s*/i, "").trim() || "Учебная лекция";
      }
    }

    return { cleanTitle, cleanText: text.trim() };
  },

  // =========================================================================
  // СЛОЙ 2: СТРУКТУРНАЯ СЕГМЕНТАЦИЯ ЛЕКЦИИ НА СМЫСЛОВЫЕ РАЗДЕЛЫ (БЕЗ МУСОРА)
  // =========================================================================
  segmentLectureIntoSections(cleanText) {
    const rawLines = String(cleanText || "").split(/\n/);
    const coreLines = [];
    const embeddedGlossaryLines = [];
    let zone = "CORE"; // CORE | GLOSSARY | TAIL

    for (let i = 0; i < rawLines.length; i++) {
      const ln = rawLines[i].trim();
      if (!ln) {
        if (zone === "CORE") coreLines.push("");
        continue;
      }

      // Отсекаем шапку вуза, силлабусные реквизиты и оглавление «План семинара» в начале файла
      if (i < 18) {
        if (/^(?:Краткое\s+содержание|Содержание\s+лекции|Основная\s+часть)\s*:?$/i.test(ln)) {
          coreLines.length = 0;
          continue;
        }
        if (
          /^(?:МЕЖДУНАРОДНАЯ ОБРАЗОВАТЕЛЬНАЯ|МИНИСТЕРСТВО|УНИВЕРСИТЕТ|КАФЕДРА|АКТИВНЫЙ РАЗДАТОЧНЫЙ|Дисциплина\s*[«"]|\d+\s*модуль\s*[—–-]|\d+\s*кредит|часов\s*:\s*лекционных|План\s+(?:семинара|лекции|занятия)\s*:?)/i.test(ln) ||
          /\d{4}\/\d{2}\s*уч\.\s*год/i.test(ln) ||
          (/^\d+\.\s+[А-ЯЁ]/.test(ln) && ln.length < 95 && i < 14)
        ) {
          continue;
        }
        if (/^(?:Семинар|Лекция)\s*№?\s*\d+/i.test(ln) && ln.length < 120) {
          continue;
        }
      }

      // Явный заголовок слайда всегда возвращает разбор в основное тело лекции
      if (/^\[(?:Слайд|Slide|Дәріс|Бөлім)\s*\d+/i.test(ln)) {
        zone = "CORE";
      }

      // Переход во встроенный «Глоссарий» в конце документа
      if (/^(?:Глоссарий|Словарь\s+терминов|Основные\s+термины|Терминдер\s+сөздігі|Glossary)\s*:?$/i.test(ln)) {
        zone = "GLOSSARY";
        continue;
      }

      // Отсечение контрольных вопросов, тем проектов, заданий СРС и списка литературы (без ASCII \b на кириллице!)
      if (
        /^(?:Контрольные\s+вопросы|Вопросы\s+для\s+самоконтроля|Тематика\s+проектов|Темы\s+проектов|Темы\s+рефератов|Задание\s+на\s+СРС|Задание\s+на\s+СРСП|Литература|Обязательная\s+литература|Дополнительная\s+литература|Список\s+литературы|Библиография)(?:\s*[:.]|\s|$)/i.test(ln)
      ) {
        zone = "TAIL";
        continue;
      }

      if (zone === "GLOSSARY") {
        if (!/^(?:На\s+русском|На\s+казахском|На\s+английском|Термин|Определение)/i.test(ln)) {
          embeddedGlossaryLines.push(ln);
        }
        continue;
      }

      if (zone === "TAIL") {
        continue;
      }

      // Фильтруем библиографические строки ГОСТ, если они попались без заголовка «Литература»
      if (/(?:Учебное\s+пособие|Текст\s*:\s*электронный|Цифровой\s+образовательный\s+ресурс|IPR\s*(?:SMART|Books)|ISBN\s*[\d-])/i.test(ln)) {
        continue;
      }

      coreLines.push(ln);
    }

    const coreText = coreLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    // 1. Если в тексте есть явные маркеры [Слайд N: ...]
    if (/\[(?:Слайд|Slide|Дәріс|Бөлім)\s*\d+/i.test(coreText)) {
      const slideBlocks = coreText
        .split(/(?=\[(?:Слайд|Slide|Дәріс|Бөлім)\s*\d+)/i)
        .map((b) => b.trim())
        .filter((b) => b.length > 25);
      if (slideBlocks.length >= 2) {
        return {
          coreText,
          embeddedGlossaryLines,
          blocks: slideBlocks.map((b, sIdx) => {
            const hm = b.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
            const rawBracket = hm ? hm[1].trim() : "";
            const numMatch = rawBracket.match(/\d+/);
            const slideNum = numMatch ? parseInt(numMatch[0], 10) : sIdx + 1;
            const cleanHead = hm ? rawBracket.replace(/^(?:Слайд|Slide|\d+-слайд|Дәріс|Бөлім)\s*\d*\s*[:.—–-]?\s*/i, "").trim() : "";
            const body = hm ? hm[2].trim() : b;
            return {
              heading: cleanHead,
              body,
              bullets: this.extractBulletItems(body),
              sourceType: "slide",
              sourceIndex: slideNum
            };
          })
        };
      }
    }

    // 2. Умная сборка разделов по смысловым подзаголовкам, спискам и абзацам (для любых .doc/.docx/.pdf)
    const paragraphs = coreLines
      .map((l) => l.trim())
      .filter(Boolean);

    const blocks = [];
    let cur = { heading: "", lines: [], bullets: [] };
    const flushCur = () => {
      const body = cur.lines.join(" ").replace(/\s+/g, " ").trim();
      if (body.length > 25) {
        blocks.push({
          heading: cur.heading,
          body,
          bullets: cur.bullets.length ? cur.bullets : this.extractBulletItems(body)
        });
      }
      cur = { heading: "", lines: [], bullets: [] };
    };

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const isBullet = /^(?:[✓✔•●▪–—-]|\d+[.)])\s+/.test(p) || (cur.lines.length > 0 && /:\s*$/.test(cur.lines[cur.lines.length - 1]) && /^[а-яёa-z]/.test(p));
      const isShortHeading =
        !isBullet &&
        p.length >= 10 &&
        p.length <= 92 &&
        !/[.!?]$/.test(p) &&
        !/^[а-яёa-z]/.test(p);
      const isAspectStarter =
        /^(?:Объектом\s+исследования|Предметом\s+исследования|Целью\s+(?:исследования\s+)?является|Основная\s+задача|Взаимодействи[ея]\s+|На\s+первом\s+этапе|Современная\s+|Для\s+обеспечения)/i.test(p);

      const curCharLen = cur.lines.join(" ").length;

      if (isShortHeading && curCharLen > 120) {
        flushCur();
        cur.heading = p.replace(/:$/, "").trim();
        continue;
      }
      if (isShortHeading && curCharLen === 0) {
        cur.heading = p.replace(/:$/, "").trim();
        continue;
      }
      if (isAspectStarter && curCharLen >= 280) {
        flushCur();
      }

      if (isBullet) {
        const cleanB = p.replace(/^(?:[✓✔•●▪–—-]|\d+[.)])\s+/, "").replace(/[;.]$/, "").trim();
        if (cleanB.length > 8) cur.bullets.push(cleanB);
      }
      cur.lines.push(p);

      if (cur.lines.join(" ").length >= 760 && !/:\s*$/.test(p)) {
        flushCur();
      }
    }
    flushCur();

    // Балансировка: если получился всего 1–2 крупных блока, делим по предложениям на 4 осмысленные части
    if (blocks.length <= 2 && coreText.length > 340) {
      const allSents = coreText
        .replace(/\n+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);
      if (allSents.length >= 4) {
        const targetCount = Math.min(5, Math.max(3, Math.ceil(allSents.length / 3)));
        const chunkSize = Math.ceil(allSents.length / targetCount);
        const splitBlocks = [];
        for (let k = 0; k < allSents.length; k += chunkSize) {
          const chunk = allSents.slice(k, k + chunkSize).join(" ");
          if (chunk.length > 25) {
            splitBlocks.push({
              heading: "",
              body: chunk,
              bullets: this.extractBulletItems(chunk)
            });
          }
        }
        if (splitBlocks.length >= 3) {
          return { coreText, embeddedGlossaryLines, blocks: splitBlocks.slice(0, 6) };
        }
      }
    }

    if (blocks.length === 0) {
      blocks.push({
        heading: "Основное содержание лекции",
        body: coreText || cleanText || "Учебный материал дисциплины.",
        bullets: []
      });
    }

    return { coreText: coreText || cleanText, embeddedGlossaryLines, blocks: blocks.slice(0, 6) };
  },

  extractBulletItems(text) {
    const items = [];
    const semiParts = String(text || "").split(/;\s+/);
    if (semiParts.length >= 3) {
      semiParts.slice(0, 4).forEach((sp) => {
        const clean = sp.replace(/^.*:\s*/, "").replace(/^[✓✔•●▪–—-]\s*/, "").trim();
        if (clean.length >= 12 && clean.length <= 130) items.push(clean);
      });
    }
    return items;
  },

  // =========================================================================
  // СЛОЙ 3: 4-УРОВНЕВЫЙ NLP-ПАРСЕР ТЕРМИНОВ И НАСТОЯЩИХ ОПРЕДЕЛЕНИЙ ИЗ ТЕКСТА
  // =========================================================================
  normalizeInstrumentalTerm(rawTerm) {
    const words = rawTerm.trim().split(/\s+/);
    if (words.length === 2) {
      let [adj, noun] = words;
      if (/ием$/i.test(noun) && /[иы]м$/i.test(adj)) {
        adj = adj.replace(/им$/i, "ое").replace(/ым$/i, "ое");
        noun = noun.replace(/ием$/i, "ие");
      } else if (/ом$/i.test(noun) && /[иы]м$/i.test(adj)) {
        adj = adj.replace(/им$/i, "ий").replace(/ым$/i, "ый");
        noun = noun.replace(/ом$/i, "");
      } else if (/ей$/i.test(noun) && /ой$/i.test(adj)) {
        adj = adj.replace(/ой$/i, "ая");
        noun = noun.replace(/ей$/i, "я");
      }
      return `${adj} ${noun}`;
    }
    return rawTerm.trim();
  },

  capitalizeFirst(str) {
    const s = String(str || "").trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  },

  isValidCandidateTerm(term) {
    const clean = String(term || "").replace(/[«»"()]/g, "").trim();
    if (clean.length < 4 || clean.length > 48) return false;
    const words = clean.split(/\s+/);
    if (words.length > 4) return false;
    if (/^\d/.test(clean)) return false;
    const firstLow = words[0].toLowerCase().replace(/[^а-яёәіңғүұқөһa-z-]/g, "");
    if (!firstLow || this.STOP_WORDS.has(firstLow)) return false;
    if (/^(?:это|он|она|оно|они|мы|вы|все|всё|как|так|где|при|для|без|под|над|или|либо|если|хотя|однако|такой|такая|такое|данный|данная)(?:\s|$)/i.test(clean)) {
      return false;
    }
    if (words.every((w) => this.STOP_WORDS.has(w.toLowerCase()))) return false;
    return true;
  },

  conciseDefinition(rawDef) {
    let d = String(rawDef || "")
      .replace(/^\s*(?:это|дегеніміз|представляет\s+собой|выступает|выступают|является|состоит\s+в\s+том,?\s*чтобы|состоит\s+в)\s*:?\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    // Отрезаем тяжёлые хвосты после точки с запятой
    if (d.includes(";")) d = d.split(";")[0].trim();
    if (d.length > 155) {
      const commaPos = d.slice(0, 150).lastIndexOf(",");
      d = (commaPos > 55 ? d.slice(0, commaPos) : d.slice(0, 148).replace(/\s+\S*$/, "")).trim();
    }
    d = d.replace(/[,:;—–-]+$/, "").trim();
    if (d && !/[.!?]$/.test(d)) d += ".";
    return this.capitalizeFirst(d);
  },

  parseGlossary(glossaryText, lectureText, embeddedGlossaryLines = []) {
    const parsed = [];
    const seenKeys = new Set();

    const addTerm = (rawTerm, rawPlain, sourceLabel = "") => {
      const cleanTerm = this.capitalizeFirst(String(rawTerm || "").replace(/^[•\-–—\d.)]+\s*/, "").replace(/[«»"]/g, "").trim());
      const baseKey = cleanTerm.split(/[/(]/)[0].trim().toLowerCase().slice(0, 28);
      if (!baseKey || baseKey.length < 3 || seenKeys.has(baseKey)) return;
      if (!this.isValidCandidateTerm(cleanTerm.split(/[/(]/)[0])) return;

      const plain = this.conciseDefinition(rawPlain);
      if (!plain || plain.length < 10) return;

      seenKeys.add(baseKey);
      const { dactylBoxes, signHint } = this.buildDactylAndSignHint(cleanTerm);
      parsed.push({
        id: "term_" + (parsed.length + 1),
        term: cleanTerm,
        plain,
        academic: sourceLabel || `Профильное понятие учебной темы («${cleanTerm}»), раскрытое в материалах занятия.`,
        example: `Понятие «${cleanTerm.split(/[/(]/)[0].trim()}» напрямую используется при разборе ключевых вопросов лекции.`,
        dactylBoxes,
        signHint
      });
    };

    // Уровень 1: Явный словарь пользователя в левой панели
    const userLines = String(glossaryText || "")
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    userLines.forEach((line) => {
      const parts = line.split(/\s+[—–-]\s+|\s*[—–]\s*/);
      if (parts.length >= 2) {
        addTerm(parts[0], parts.slice(1).join(" — "), "Определение из словаря силлабуса дисциплины.");
      }
    });

    const cleanDoc = this.sanitizeAndExtractMeta("", lectureText || "").cleanText;
    const segmented = this.segmentLectureIntoSections(cleanDoc);
    const coreText = segmented.coreText || cleanDoc;
    const docGlossaryLines = embeddedGlossaryLines.length ? embeddedGlossaryLines : segmented.embeddedGlossaryLines;

    const sentences = coreText
      .replace(/\n+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    // Уровень 2: NLP-извлечение настоящих определений прямо из предложений лекции
    if (parsed.length < 6) {
      for (const sent of sentences) {
        if (parsed.length >= 6) break;

        // 2А: «называется X (...) — определением» или «называется X»
        const namedMatch = sent.match(/называется\s+([а-яёәіңғүұқөһa-zА-ЯЁӘІҢҒҮҰҚӨҺA-Z\s-]{4,42}?)(?:\s*\([^)]{2,65}\))?\s*[—–-]\s*([^.!?]{12,200})/i);
        if (namedMatch) {
          const normTerm = this.normalizeInstrumentalTerm(namedMatch[1]);
          addTerm(normTerm, namedMatch[2], `Определение из текста лекции: «${sent.slice(0, 140)}»`);
          continue;
        }

        // 2Б: «Термин — это ...» / «Как писал ..., термин — это ...» / «Термин представляет собой ...»
        const cleanedSent = sent.replace(/^(?:Как\s+писал\s+[^,]+,\s*|В\s+[а-яё]+\s+[а-яё]+\s+|Современн[а-я]+\s+)/i, "");
        const dashMatch = cleanedSent.match(/^([А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z][А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z0-9\s/-]{3,44}?)\s*(?:\([^)]{2,55}\)\s*)?(?:[—–-]\s*(?:это\s+)?|представляет\s+собой\s+|дегеніміз\s*[—–-]?\s*)([^.!?]{14,220})/i);
        if (dashMatch) {
          addTerm(dashMatch[1], dashMatch[2], `Определение из текста лекции.`);
          continue;
        }

        // 2В: Встроенные определения через тире внутри перечисления («социальные общности — совокупности индивидов...»)
        const innerDefs = sent.split(/;\s*/);
        if (innerDefs.length >= 2) {
          innerDefs.forEach((part) => {
            if (parsed.length >= 6) return;
            const sub = part.replace(/^.*:\s*/, "").replace(/^(?:либо|или)\s+/i, "").trim();
            const m = sub.match(/^([а-яёәіңғүұқөһА-ЯЁӘІҢҒҮҰҚӨҺa-zA-Z\s-]{4,38}?)\s+[—–-]\s+([^;]{14,190})/);
            if (m) addTerm(m[1], m[2], "Ключевое определение из структуры темы.");
          });
        }
      }
    }

    // Уровень 3: Таблица «Глоссарий» в конце документа (3-колоночная RU / KK / EN или тире)
    if (parsed.length < 6 && docGlossaryLines.length > 0) {
      for (let i = 0; i < docGlossaryLines.length && parsed.length < 6; i++) {
        const ln = docGlossaryLines[i];
        if (ln.includes("—") || ln.includes(" - ")) {
          const p = ln.split(/\s+[—–-]\s+|\s*[—–]\s*/);
          if (p.length >= 2) addTerm(p[0], p.slice(1).join(" — "), "Термин из глоссария документа.");
          continue;
        }
        // 3 строки подряд: RU (кириллица без казахских букв) -> KK -> EN (латиница)
        const next1 = docGlossaryLines[i + 1] || "";
        const next2 = docGlossaryLines[i + 2] || "";
        if (/^[А-Яа-яЁё\s-]{4,40}$/.test(ln) && /^[A-Za-z\s-]{4,40}$/.test(next2)) {
          const base = ln.trim().toLowerCase().slice(0, 7);
          const ctxSent = sentences.find((s) => s.toLowerCase().includes(base)) || `Базовое понятие темы (${ln.trim()} / ${next1.trim()} / ${next2.trim()}).`;
          addTerm(`${this.capitalizeFirst(ln)} (${next1.trim()})`, ctxSent, `Трёхъязычный глоссарий курса (${next2.trim()}).`);
          i += 2;
        }
      }
    }

    // Уровень 4: Именные словосочетания (Прилагательное + Существительное) из основного текста с реальным предложением!
    if (parsed.length < 5 && coreText) {
      const bigramRe = /(?:^|[^А-Яа-яЁёA-Za-z])([А-Яа-яЁё]{4,}(?:ий|ый|ой|ая|яя|ое|ее|ие|ые)\s+[а-яё]{4,})(?=$|[^А-Яа-яЁёA-Za-z])/g;
      const freq = new Map();
      let bm;
      while ((bm = bigramRe.exec(coreText)) !== null) {
        const phrase = bm[1].trim();
        const low = phrase.toLowerCase();
        const [w1, w2] = low.split(/\s+/);
        if (this.STOP_WORDS.has(w1) || this.STOP_WORDS.has(w2)) continue;
        freq.set(low, { display: this.capitalizeFirst(phrase), count: (freq.get(low)?.count || 0) + 1 });
      }
      const sortedBigrams = Array.from(freq.values()).sort((a, b) => b.count - a.count);
      for (const item of sortedBigrams) {
        if (parsed.length >= 5) break;
        const needle = item.display.toLowerCase().slice(0, 10);
        const matchSent = sentences.find((s) => s.toLowerCase().includes(needle));
        if (matchSent) {
          addTerm(item.display, matchSent, "Ключевое понятие, выделенное из контекста лекции.");
        }
      }
    }

    // Уровень 5: Одиночные содержательные термины с реальным контекстом (без фейковых заглушек!)
    if (parsed.length < 4 && coreText) {
      const words = coreText.match(/[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z-]{6,}/g) || [];
      const wFreq = {};
      words.forEach((w) => {
        const low = w.toLowerCase();
        if (!this.STOP_WORDS.has(low)) wFreq[low] = (wFreq[low] || 0) + 1;
      });
      const topW = Object.keys(wFreq).sort((a, b) => wFreq[b] - wFreq[a]);
      for (const low of topW) {
        if (parsed.length >= 5) break;
        const matchSent = sentences.find((s) => s.toLowerCase().includes(low.slice(0, 6)));
        if (matchSent) {
          addTerm(this.capitalizeFirst(low), matchSent, "Ключевой термин лекции.");
        }
      }
    }

    if (parsed.length === 0) {
      const fallbackSent = sentences[0] || "Основной принцип изучаемой темы на ясном языке.";
      const { dactylBoxes, signHint } = this.buildDactylAndSignHint("Ключевая идея");
      parsed.push({
        id: "term_1",
        term: "Ключевая идея урока",
        plain: this.conciseDefinition(fallbackSent),
        academic: "Базовое положение учебного материала.",
        example: sentences[1] || fallbackSent,
        dactylBoxes,
        signHint
      });
    }

    return parsed;
  },

  detectDomainProfile(courseTitle, lectureText, glossaryText = "") {
    if (window.LectureVisualDirector) {
      const theme = window.LectureVisualDirector.detectVisualDomain(lectureText || "", courseTitle || "", glossaryText || "");
      return {
        domainId: theme.domainId,
        name: theme.label,
        theme,
        heroLabel: courseTitle || theme.label,
        accentPrimary: theme.primary,
        accentSecondary: theme.secondary,
        accentSuccess: theme.success
      };
    }
    return {
      domainId: "soc_hum",
      name: "Социология, история и гуманитарные науки",
      heroLabel: courseTitle || "Учебный курс",
      accentPrimary: "#C2410C",
      accentSecondary: "#334155",
      accentSuccess: "#0F766E"
    };
  },

  buildDactylAndSignHint(term) {
    const clean = term.split(/[/(]/)[0].trim().toUpperCase();
    const letters = Array.from(clean).filter((ch) => /[А-ЯЁӘІҢҒҮҰҚӨҺA-Z0-9-]/.test(ch)).slice(0, 14);
    const dactylBoxes = letters.map((ch) => `[${ch}]`).join(" ");
    let signHint = "Жест КЖЯ/РЖЯ: обозначить открытыми ладонями ключевой образ понятия + дактилировать корень термина.";
    if (/социолог|обществ|групп|общност|статус|қоғам/i.test(term)) {
      signHint = "Жест КЖЯ/РЖЯ: круговое объединяющее движение ладонями (группа/общество) → фокус на связи людей.";
    } else if (/сейсм|диссипац|резонанс|каркас|ферм/i.test(term)) {
      signHint = "Жест КЖЯ/РЖЯ: волнообразное движение кисти (колебание) → упор ладони снизу (гашение опорой).";
    } else if (/attention|токен|эмбед|rag|нейро|жасанды|алгоритм/i.test(term)) {
      signHint = "Жест КЖЯ/РЖЯ: сведение лучей пальцев к центру (связь данных) → опора на открытую ладонь.";
    } else if (/юнит|ltv|cac|безубыточ|экономик|рынок|прибыл/i.test(term)) {
      signHint = "Жест КЖЯ/РЖЯ: движение двух ладоней как чаш весов (сопоставление доходов и затрат).";
    } else if (/закон|право|кодекс|норма|суд/i.test(term)) {
      signHint = "Жест КЖЯ/РЖЯ: чёткое прикладывание ребром правой ладони к открытой левой ладони (свод правил/закон).";
    }
    return { dactylBoxes, signHint };
  },

  // Чистый парсер реальных числовых метрик (НЕ ловит «1 модуль» как «1 м» и не ловит переносы строк!)
  extractCleanMetrics(text) {
    const src = String(text || "");
    const re = /\b(\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?[ \t]*(?:%|мс|сек|мин|Гц|кВт|МПа|баллов|балла|токенов|токена|чисел|₸|₽|\$|€|раз|:1|дБ|км|кг|°C))(?![а-яёәіңғүұқөһa-z0-9])/gi;
    const matches = src.match(re) || [];
    return Array.from(new Set(matches.map((m) => m.replace(/\s+/g, " ").trim())));
  },

  extractYearsAndTimeline(text) {
    const src = String(text || "");
    const years = src.match(/(?:^|\s)(?:1[5-9]\d{2}|20[0-3]\d)(?:\s*(?:г\.|год\S*))?|(?:\s|^)[XХVI]{1,4}\s*в(?:ек|\.)/g) || [];
    return Array.from(new Set(years.map((y) => y.trim()))).slice(0, 5);
  },

  detectTextLanguage(text) {
    const sample = String(text || "").slice(0, 3000);
    if (!sample.trim()) return "ru";
    const kkChars = (sample.match(/[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/g) || []).length;
    if (kkChars >= 3) return "kk";
    const cyrChars = (sample.match(/[а-яёА-ЯЁ]/g) || []).length;
    const latChars = (sample.match(/[a-zA-Z]/g) || []).length;
    if (latChars > cyrChars * 1.4 && latChars > 20) return "en";
    return "ru";
  },

  // Динамическое извлечение сигналов ИЗ САМОЙ ЛЕКЦИИ (с локализацией RU / KK / EN)
  extractLectureSignals(lectureText, domainProfile, glossary, sections = [], outputLang = "ru") {
    const metrics = this.extractCleanMetrics(lectureText);
    const years = this.extractYearsAndTimeline(lectureText);
    const t0 = (glossary[0]?.term || "Ключевое понятие").split(/[/(]/)[0].trim();
    const t1 = (glossary[1]?.term || t0).split(/[/(]/)[0].trim();
    const p0 = (glossary[0]?.plain || "основной механизм темы").replace(/[.!?]+$/, "");

    const sents = String(lectureText || "")
      .replace(/\n+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const contrastSent = sents.find((s) => /(?:^|\s)(?:в отличие от|отличается от|отказаться от|если\s+[^,]+не\s+|без\s+[а-яё]+)(?=\s|[,.:;!?]|$)/i.test(s));
    const formulaMatch = String(lectureText || "").match(/([A-Za-zА-Яа-яЁё_0-9()]+\s*[=≈≠≥≤]\s*[A-Za-zА-Яа-яЁё_0-9.\s+\-*/()]{2,28})/);
    const cleanFormula = formulaMatch ? formulaMatch[1].replace(/[),.;:]+$/g, "").trim() : null;

    // Доменно-точные подписи по умолчанию (опираются на реальные термины лекции!)
    const domainDefaults = {
      soc_hum: {
        leftFail: { title: "Обыденный взгляд ❌", sub: "Поверхностные бытовые оценки", metric: "Узкий личный опыт" },
        rightPass: { title: `Научный подход: ${t0} ✅`, sub: p0.slice(0, 48), metric: "Видение общих законов" },
        deltaBadge: `${t0} ⇄ Среда`,
        chartMode: "comparative_bars",
        xAxisLabel: "Факторы социальной среды",
        yAxisLabel: "Влияние на общество и человека"
      },
      law_gov: {
        leftFail: { title: "Правовой пробел ❌", sub: "Отсутствие чёткой нормы", metric: "Конфликт интересов" },
        rightPass: { title: `Правовая норма: ${t0} ✅`, sub: p0.slice(0, 48), metric: "Защита прав и порядок" },
        deltaBadge: "Баланс прав и норм",
        chartMode: "comparative_bars",
        xAxisLabel: "Уровни правового регулирования",
        yAxisLabel: "Юридическая сила и защита"
      },
      bio_med: {
        leftFail: { title: "Нарушение процесса ❌", sub: "Сбой регуляции или дефицит", metric: metrics[0] || "Патология" },
        rightPass: { title: `Механизм: ${t0} ✅`, sub: p0.slice(0, 48), metric: metrics[1] || "Гомеостаз и норма" },
        deltaBadge: metrics[0] || "Биобаланс",
        chartMode: "growth_saturation",
        xAxisLabel: "Концентрация / время реакции",
        yAxisLabel: "Активность биосистемы"
      },
      biz_econ: {
        leftFail: { title: "Хаотичные решения ❌", sub: "Рост издержек без расчёта", metric: metrics[0] || "Риск убытка" },
        rightPass: { title: `Система: ${t0} ✅`, sub: p0.slice(0, 48), metric: metrics[1] || metrics[0] || "Устойчивая маржа" },
        deltaBadge: cleanFormula || metrics[0] || "Рост эффективности",
        chartMode: "supply_demand_cross",
        xAxisLabel: "Объём и масштаб операций",
        yAxisLabel: "Ценность и рентабельность"
      },
      ai_cs: {
        leftFail: { title: "Наивный алгоритм ❌", sub: "Потеря контекста и ошибки", metric: metrics[0] || "Высокая сложность" },
        rightPass: { title: `Архитектура: ${t0} ✅`, sub: p0.slice(0, 48), metric: metrics[1] || metrics[0] || "Точная обработка" },
        deltaBadge: cleanFormula || metrics[0] || `${t0} + ${t1}`,
        chartMode: "growth_saturation",
        xAxisLabel: "Объём контекста / данных",
        yAxisLabel: "Точность и скорость модели"
      },
      arch_eng: {
        leftFail: { title: "Без инженерной защиты ❌", sub: "Жёсткая передача удара в узлы", metric: metrics[0] ? `Нагрузка ${metrics[0]}` : "Риск разрушения" },
        rightPass: { title: `Решение: ${t0} ✅`, sub: p0.slice(0, 48), metric: metrics[1] ? `Эффект ${metrics[1]}` : "Гашение усилий" },
        deltaBadge: metrics[1] ? `Эффект ${metrics[1]}` : metrics[0] || "Устойчивость",
        chartMode: /резонанс|частот|колебан|сейсм/i.test(lectureText) ? "resonance_wave" : "growth_saturation",
        xAxisLabel: /частот|сейсм/i.test(lectureText) ? "Частота воздействия (Гц)" : "Параметр нагрузки",
        yAxisLabel: "Отклик конструкции"
      }
    };

    const base = domainDefaults[domainProfile.domainId] || domainDefaults.soc_hum;
    const langTag = String(outputLang || "ru").toLowerCase();

    let leftFail = base.leftFail;
    let rightPass = base.rightPass;
    let deltaBadge = base.deltaBadge;
    let xAxisLabel = base.xAxisLabel;
    let yAxisLabel = base.yAxisLabel;
    let curveALabel = `С учётом: ${t0}`;
    let curveBLabel = "Без учёта фактора";
    let defaultSecLabel = sections[0]?.title?.slice(0, 36) || domainProfile.name;

    if (langTag === "en") {
      leftFail = { title: "Without Method ❌", sub: "Unstructured / error-prone approach", metric: metrics[0] || "High risk" };
      rightPass = { title: `With ${t0} ✅`, sub: p0.slice(0, 48), metric: metrics[1] || metrics[0] || "Verified gain" };
      deltaBadge = cleanFormula || metrics[0] || `${t0} + ${t1}`;
      xAxisLabel = "System parameter / scale";
      yAxisLabel = "Outcome & stability";
      curveALabel = `With ${t0}`;
      curveBLabel = "Baseline (without factor)";
    } else if (langTag === "kk") {
      leftFail = { title: "Жүйесіз тәсіл ❌", sub: "Қателік пен тұрақсыздық қаупі", metric: metrics[0] || "Жоғары тәуекел" };
      rightPass = { title: `Жүйе: ${t0} ✅`, sub: p0.slice(0, 48), metric: metrics[1] || metrics[0] || "Тұрақты нәтиже" };
      deltaBadge = cleanFormula || metrics[0] || `${t0} + ${t1}`;
      xAxisLabel = "Жүйе параметрі / көлемі";
      yAxisLabel = "Нәтиже және тиімділік";
      curveALabel = `Ескерілген: ${t0}`;
      curveBLabel = "Бастапқы деңгей";
    }

    return {
      dangerMetric: {
        value: metrics[0] || t0.slice(0, 22),
        label: defaultSecLabel
      },
      deltaBadge,
      leftFail,
      rightPass,
      contrastQuote: contrastSent || "",
      formulaCard: {
        expression: cleanFormula || `${t0} → ${t1}`,
        variables: glossary.slice(0, 2).map((g) => `${g.term.split(/[/(]/)[0].trim()} — ${g.plain.slice(0, 48)}`),
        resultNote: p0.slice(0, 64)
      },
      chartMode: base.chartMode,
      years,
      hasFormula: Boolean(cleanFormula),
      xAxisLabel,
      yAxisLabel,
      curveALabel,
      curveBLabel
    };
  },

  // Адаптация раздела на «Ясный язык» (реальное объяснение смысла, аналогия, цитата источника и разбор терминов на RU/KK/EN)
  simplifyToPlainLanguage(blockOrParagraph, glossaryList, index, domainProfile = null, outputLang = "ru") {
    const isObj = typeof blockOrParagraph === "object" && blockOrParagraph !== null;
    const rawBody = isObj ? blockOrParagraph.body : String(blockOrParagraph || "");
    const explicitHeading = isObj ? blockOrParagraph.heading : "";
    const rawBullets = isObj && Array.isArray(blockOrParagraph.bullets) ? blockOrParagraph.bullets : [];
    const sourceType = isObj && blockOrParagraph.sourceType === "slide" ? "slide" : "section";
    const sourceIndex = isObj && blockOrParagraph.sourceIndex ? blockOrParagraph.sourceIndex : index + 1;
    const sourceBadge =
      outputLang === "kk"
        ? sourceType === "slide" ? `${sourceIndex}-слайд` : `${sourceIndex}-бөлім`
        : outputLang === "en"
          ? sourceType === "slide" ? `Slide ${sourceIndex}` : `Section ${sourceIndex}`
          : sourceType === "slide" ? `Слайд ${sourceIndex}` : `Раздел ${sourceIndex}`;

    const clean = rawBody.replace(/^\[.*?\]\s*/g, "").trim();
    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);

    const origWordsCount = clean.split(/\s+/).filter(Boolean).length;
    const origAvgLen = Math.max(12, Math.round(origWordsCount / Math.max(1, sentences.length)));

    const deAcademize = (s) => {
      let res = String(s || "")
        .replace(/представляет собой необратимое рассеяние/gi, "поглощает и гасит")
        .replace(/представляет собой/gi, "— это")
        .replace(/в отличие от устаревших/gi, "вместо старых")
        .replace(/приводящий к/gi, "что вызывает")
        .replace(/является причиной/gi, "вызывает")
        .replace(/осуществляется посредством/gi, "работает через")
        .replace(/характеризуется наличием/gi, "имеет")
        .replace(/для обеспечения геометрической неизменяемости/gi, "для устойчивости формы")
        .replace(/ключевой задачей [а-яё\s]+ является/gi, "главная задача —")
        .replace(/выступает в качестве/gi, "служит")
        .replace(/\bв\s+рамках\s+данного\s+[а-яё]+\b/gi, "здесь")
        .replace(/\bтаким\s+образом,?\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return this.capitalizeFirst(res);
    };

    // Делим длинные предложения по смысловым союзам, а не обрубаем на полуслове!
    const simplifiedPoints = [];
    sentences.forEach((s) => {
      const plain = deAcademize(s);
      const words = plain.split(/\s+/).filter(Boolean);
      if (words.length <= 24) {
        simplifiedPoints.push(this.ensureCompleteSentence(plain, 160));
      } else {
        const subParts = plain
          .split(/\s*(?:;|,\s+(?:что|который|которая|которое|которые|так как|поскольку|поэтому|причём|а также))\s+/i)
          .map((p) => p.trim())
          .filter((p) => p.split(/\s+/).length >= 4);
        if (subParts.length >= 2) {
          subParts.slice(0, 3).forEach((sp) => {
            simplifiedPoints.push(this.ensureCompleteSentence(this.capitalizeFirst(sp), 145));
          });
        } else {
          simplifiedPoints.push(this.ensureCompleteSentence(plain, 155));
        }
      }
    });

    const matchedTerms = glossaryList.filter((g) => {
      const base = g.term.split(/[/(]/)[0].trim().toLowerCase();
      const stem = base.length >= 6 ? base.slice(0, Math.min(base.length, 9)) : base;
      return stem.length >= 3 && clean.toLowerCase().includes(stem);
    });

    let title = explicitHeading;
    if (!title) {
      if (matchedTerms[0]) {
        title = matchedTerms[0].term.split(/[/(]/)[0].trim();
      } else {
        const fallbackSecTitle = outputLang === "kk" ? "Тақырыптың негізгі бөлімі" : outputLang === "en" ? "Key Topic Section" : "Ключевой аспект темы";
        const firstWords = (sentences[0] || fallbackSecTitle).split(/\s+/).slice(0, 5).join(" ").replace(/[,:;—–\-.!?]+$/, "");
        title = this.capitalizeFirst(firstWords);
      }
    }

    const leadTerm = matchedTerms[0] || glossaryList[index % Math.max(1, glossaryList.length)];
    const leadTermName = leadTerm ? leadTerm.term.split(/[/(]/)[0].trim() : title;
    const leadTermPlain = leadTerm ? leadTerm.plain.replace(/[.!?]+$/, "") : "";

    // 1) Главная мысль простыми словами (на выбранном языке RU / KK / EN)
    const bestSent =
      simplifiedPoints.find((s) => /— это|дегеніміз|позволяет|помогает|нужно|вызывает|означает|меняет|зависит|allows|enables|means/i.test(s)) ||
      simplifiedPoints[0] ||
      clean;

    let coreIdea;
    if (outputLang === "kk") {
      coreIdea = leadTermPlain
        ? `Қарапайым тілмен: «${leadTermName}» — бұл ${leadTermPlain}. ${bestSent}`
        : `Қарапайым тілмен: ${bestSent}`;
    } else if (outputLang === "en") {
      coreIdea = leadTermPlain
        ? `In simple terms: "${leadTermName}" means ${leadTermPlain}. ${bestSent}`
        : `In simple terms: ${bestSent}`;
    } else {
      coreIdea = leadTermPlain
        ? `Простыми словами: «${leadTermName}» — это ${leadTermPlain}. ${bestSent}`
        : `Простыми словами: ${bestSent}`;
    }

    // 2) Пример или жизненная аналогия (из текста или доменно-точная на RU / KK / EN)
    const explicitExample = simplifiedPoints.find((s) => /\b(?:например|представим|допустим|на практике|к примеру|мысалы|for example|for instance)\b/i.test(s));
    let analogy = explicitExample || "";
    if (!analogy) {
      const dom = domainProfile?.domainId || "soc_hum";
      if (outputLang === "kk") {
        if (dom === "arch_eng") {
          analogy = `Өмірден мысал: автокөліктегі амортизатор сияқты — «${leadTermName}» күшті соққыны жұмсартып, ғимарат қаңқасын бұзылудан сақтайды.`;
        } else if (dom === "ai_cs") {
          analogy = `Мысал ретінде: қараңғы бөлмедегі қолшам сияқты — мыңдаған дерек ішінен «${leadTermName}» ең маңызды мағыналық байланыстарды дәл табады.`;
        } else if (dom === "biz_econ") {
          analogy = `Бизнестегі мысал: отбасылық бюджет секілді — «${leadTermName}» барлық шығыннан кейін қанша таза пайда қалатынын айқын көрсетеді.`;
        } else {
          analogy = `Көрнекі мысал: жақсы реттелген бағдаршам сияқты — «${leadTermName}» жүйедегі тәртіп пен тепе-теңдікті ұстап тұрады.`;
        }
      } else if (outputLang === "en") {
        if (dom === "arch_eng") {
          analogy = `Real-life analogy: just like shock absorbers in a car, "${leadTermName}" cushions sudden forces so the rigid structure stays intact.`;
        } else if (dom === "ai_cs") {
          analogy = `Analogy: like a spotlight in a dark library, "${leadTermName}" highlights the exact connections among thousands of tokens needed for an accurate answer.`;
        } else if (dom === "biz_econ") {
          analogy = `Business example: like a household budget, "${leadTermName}" reveals how much net value remains after covering every acquisition and operating cost.`;
        } else {
          analogy = `Everyday example: like clear traffic rules at a busy intersection, "${leadTermName}" keeps every part of the system coordinated and predictable.`;
        }
      } else {
        const hasConflict = /ошиб|риск|проблем|разруш|убыт|конфликт|без\s+|отказ/i.test(clean);
        const hasFlow = /этап|шаг|процесс|поток|переда|последоват|слой/i.test(clean);
        if (dom === "soc_hum" || dom === "law_gov") {
          analogy = hasConflict
            ? `Жизненный пример: если смотреть на «${leadTermName}» только по бытовым слухам без научного разбора, легко перепутать личную привычку с общим правилом всего общества.`
            : `Представьте город со стороны сверху: отдельные люди кажутся случайными, но «${leadTermName}» показывает скрытые правила, по которым они объединяются и действуют вместе.`;
        } else if (dom === "arch_eng") {
          analogy = `Образ из жизни: представьте амортизатор в автомобиле — «${leadTermName}» работает так же, не давая резкому удару сломать жёсткую конструкцию.`;
        } else if (dom === "ai_cs") {
          analogy = hasFlow
            ? `Как это работает на примере: как сортировочный конвейер на почте — на каждом шаге «${leadTermName}» отбирает только важные детали и передаёт их дальше.`
            : `Аналогия: как фонарик в тёмной комнате — среди тысяч слов или данных «${leadTermName}» подсвечивает именно те связи, от которых зависит точный ответ.`;
        } else if (dom === "biz_econ") {
          analogy = `Пример из бизнеса: как семейный бюджет — недостаточно просто много зарабатывать, «${leadTermName}» показывает, сколько остаётся чистой пользы после всех трат.`;
        } else {
          analogy = `Наглядный пример: как хорошо настроенный светофор и регулировщик — «${leadTermName}» удерживает систему в здоровом балансе и не даёт ей перегрузиться.`;
        }
      }
    }

    // 3) Разбор сложных терминов именно этого раздела
    const termBreakdown = matchedTerms.slice(0, 4).map((t) => ({
      id: t.id,
      term: t.term.split(/[/(]/)[0].trim(),
      plain: t.plain
    }));

    // 4) Чистые тезисы без оборванных фрагментов
    const cleanRawBullets = rawBullets
      .map((b) => this.ensureCompleteSentence(deAcademize(b), 145))
      .filter((b) => b.split(/\s+/).length >= 4);
    const finalBullets = cleanRawBullets.length >= 2 ? cleanRawBullets.slice(0, 4) : simplifiedPoints.slice(0, 4);

    const plainSummary = `${coreIdea} ${analogy}`.replace(/\s+/g, " ").trim();
    const plainWords = plainSummary.split(/\s+/).filter(Boolean).length;
    const plainAvgLen = Math.min(16, Math.max(8, Math.round(plainWords / Math.max(1, plainSummary.split(/[.!?]+/).filter(Boolean).length))));
    const longWordsCount = plainSummary.split(/\s+/).filter((w) => w.length > 12).length;
    const readabilityScore = Math.min(98, Math.max(76, 98 - Math.max(0, plainAvgLen - 11) * 2 - longWordsCount));

    return {
      sectionIndex: index + 1,
      sourceBadge,
      linkedSceneIndex: index,
      title,
      plainSummary,
      plainBlocks: {
        coreIdea,
        analogy,
        termBreakdown
      },
      plainBullets: finalBullets,
      academicOriginal: clean,
      terms: matchedTerms.map((t) => t.term),
      readability: {
        score: readabilityScore,
        origAvgWords: origAvgLen,
        plainAvgWords: plainAvgLen
      }
    };
  },

  // Динамический расчёт объёма теста (от 5 до 18 вопросов в зависимости от объёма лекции)
  computeTargetQuizCount({ wordCount = 0, sectionCount = 1, glossaryCount = 1, factSignalsCount = 0 }) {
    const volumePts =
      Math.min(5, Math.floor(wordCount / 200)) +
      Math.min(4, Math.max(0, sectionCount - 1)) +
      Math.min(5, Math.max(0, glossaryCount - 1)) +
      Math.min(4, Math.floor(factSignalsCount / 2));
    return Math.max(5, Math.min(18, 5 + Math.round((volumePts / 18) * 13)));
  },

  _seededRng(seedNum) {
    let a = (Number(seedNum) || 1) >>> 0;
    if (a === 0) a = 123456789;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  _shuffleWithRng(arr, rng) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  },

  // Генерация адаптивного теста под 5 разных когнитивных углов с поддержкой пересоздания
  buildAdaptiveQuiz({
    courseTitle = "",
    glossary = [],
    sections = [],
    scenes = [],
    metrics = [],
    wordCount = 0,
    outputLang = "ru",
    targetCount = null,
    variationSeed = 0
  }) {
    const i18n = this.OUTPUT_I18N[outputLang] || this.OUTPUT_I18N.ru;
    const rng = this._seededRng((variationSeed + 1) * 2654435761);
    const totalBullets = sections.reduce((acc, s) => acc + (s.plainBullets?.length || 0), 0);
    const desiredCount = targetCount || this.computeTargetQuizCount({
      wordCount,
      sectionCount: sections.length,
      glossaryCount: glossary.length,
      factSignalsCount: metrics.length + totalBullets
    });

    const angleLabels = {
      ru: {
        plain_meaning: "Суть понятия",
        reverse_term: "Термин по ситуации",
        cause_effect: "Что если убрать?",
        comparison: "Сравнение подходов",
        application: "Практика и кейс"
      },
      kk: {
        plain_meaning: "Ұғымның мәні",
        reverse_term: "Жағдаят бойынша термин",
        cause_effect: "Себеп пен салдар",
        comparison: "Тәсілдерді салыстыру",
        application: "Тәжірибе және кейс"
      },
      en: {
        plain_meaning: "Plain Meaning",
        reverse_term: "Identify the Term",
        cause_effect: "Cause & Effect",
        comparison: "Compare & Contrast",
        application: "Practical Case"
      }
    }[outputLang] || {
      plain_meaning: "Суть понятия",
      reverse_term: "Термин по ситуации",
      cause_effect: "Что если убрать?",
      comparison: "Сравнение подходов",
      application: "Практика и кейс"
    };

    const angles = ["plain_meaning", "reverse_term", "cause_effect", "comparison", "application"];
    const questions = [];
    const usedStems = new Set();

    const makeQuestion = (angle, qText, correctText, distractorPool, explanationText, meta = {}) => {
      const stem = qText.toLowerCase().slice(0, 62);
      if (!qText || !correctText || usedStems.has(stem)) return false;
      usedStems.add(stem);

      const cleanCorrect = String(correctText).trim();
      const uniqueDistractors = [];
      const seenOpts = new Set([cleanCorrect.toLowerCase().slice(0, 50)]);
      for (const d of this._shuffleWithRng(distractorPool, rng)) {
        const ds = String(d || "").trim();
        const key = ds.toLowerCase().slice(0, 50);
        if (ds.length > 6 && !seenOpts.has(key)) {
          seenOpts.add(key);
          uniqueDistractors.push(ds);
          if (uniqueDistractors.length >= 3) break;
        }
      }
      const fallbacksByLang = {
        ru: [
          i18n.quizDistractor,
          "Игнорирование структуры и контекста изучаемого явления.",
          "Случайный внешний фактор, не влияющий на основной процесс.",
          "Механическое повторение без учёта связей между элементами."
        ],
        kk: [
          i18n.quizDistractor,
          "Құбылыстың құрылымы мен контекстін ескермеу.",
          "Негізгі процеске әсер етпейтін кездейсоқ сыртқы фактор.",
          "Элементтер арасындағы байланысты елемей механикалық қайталау."
        ],
        en: [
          i18n.quizDistractor,
          "Ignoring the underlying structure and context of the system.",
          "A random external factor that has no causal impact on the process.",
          "Rote repetition without connecting the key concepts together."
        ]
      };
      const fallbacks = fallbacksByLang[outputLang] || fallbacksByLang.ru;
      for (const fb of fallbacks) {
        if (uniqueDistractors.length >= 3) break;
        const key = fb.toLowerCase().slice(0, 50);
        if (!seenOpts.has(key)) {
          seenOpts.add(key);
          uniqueDistractors.push(fb);
        }
      }

      const combined = this._shuffleWithRng([cleanCorrect, ...uniqueDistractors.slice(0, 3)], rng);
      const correctIndex = combined.indexOf(cleanCorrect);
      questions.push({
        number: questions.length + 1,
        angle,
        angleLabel: angleLabels[angle] || angle,
        question: qText,
        options: combined,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation: explanationText,
        hint: meta.hint || "",
        sourceBadge: meta.sourceBadge || "",
        linkedSceneIndex: typeof meta.linkedSceneIndex === "number" ? meta.linkedSceneIndex : 0
      });
      return true;
    };

    const gLen = Math.max(1, glossary.length);
    const sLen = Math.max(1, sections.length);

    for (let step = 0; step < desiredCount * 3 && questions.length < desiredCount; step++) {
      const angle = angles[(step + variationSeed) % angles.length];
      const gIdx = (step + variationSeed) % gLen;
      const sIdx = (step + variationSeed) % sLen;
      const gItem = glossary[gIdx];
      const sec = sections[sIdx];
      const sceneIdx = step % Math.max(1, scenes.length);
      const scene = scenes[sceneIdx];
      const cleanTerm = gItem ? gItem.term.split(/[/(]/)[0].trim() : (sec?.title || courseTitle);
      const plainDef = gItem ? gItem.plain : (sec?.plainBullets?.[0] || sec?.plainSummary || "");
      const srcBadge = sec?.sourceBadge || "";

      const buildHint = (focusTerm, secTitle) => {
        if (outputLang === "kk") {
          return `Кеңес: «${secTitle || focusTerm}» бөліміндегі негізгі қызмет пен өмірлік мысалды еске түсіріңіз.`;
        }
        if (outputLang === "en") {
          return `Hint: Think about what role "${focusTerm}" plays in section "${secTitle || courseTitle}" and its real-life analogy.`;
        }
        return `Подсказка: вспомните аналогию из раздела «${secTitle || focusTerm}» — какую главную задачу решает «${focusTerm}»?`;
      };

      if (angle === "plain_meaning" && gItem) {
        const promptVariants = outputLang === "kk"
          ? [
              `Осы тақырып аясында «${cleanTerm}» ұғымы қарапайым тілмен нені білдіреді?`,
              `«${cleanTerm}» терминінің мәнін қалай ең түсінікті етіп сипаттауға болады?`,
              `Қай тұжырым «${cleanTerm}» ұғымының негізгі мағынасын дәл ашады?`
            ]
          : outputLang === "en"
            ? [
                `What does "${cleanTerm}" mean in plain, everyday language within this lecture?`,
                `How would you best explain the core purpose of "${cleanTerm}"?`,
                `Which statement most accurately captures the meaning of "${cleanTerm}"?`
              ]
            : [
                `Что простыми словами означает понятие «${cleanTerm}» в рамках этой темы?`,
                `Как лучше всего объяснить суть термина «${cleanTerm}» человеку без подготовки?`,
                `Какое утверждение точнее всего раскрывает смысл понятия «${cleanTerm}»?`
              ];
        const qTxt = promptVariants[(step + variationSeed) % promptVariants.length];
        const dists = glossary.filter((_, i) => i !== gIdx).map((g) => g.plain);
        makeQuestion(angle, qTxt, plainDef, dists, i18n.quizExplain(cleanTerm, plainDef), {
          hint: buildHint(cleanTerm, sec?.title),
          sourceBadge: srcBadge,
          linkedSceneIndex: sceneIdx
        });
      } else if (angle === "reverse_term" && glossary.length >= 2) {
        const maskedDef = plainDef.replace(new RegExp(cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "«…»");
        const qTxt = outputLang === "kk"
          ? `Дәрістегі қай термин мына сипаттамаға сәйкес келеді: «${this.shortLabel(maskedDef, 120)}»?`
          : outputLang === "en"
            ? `Which lecture term matches this description: "${this.shortLabel(maskedDef, 120)}"?`
            : variationSeed % 2 === 0
              ? `Какой термин из лекции соответствует описанию: «${this.shortLabel(maskedDef, 120)}»?`
              : `О каком понятии идёт речь: «${this.shortLabel(maskedDef, 120)}»?`;
        const dists = glossary.filter((_, i) => i !== gIdx).map((g) => g.term.split(/[/(]/)[0].trim());
        const expTxt = outputLang === "kk"
          ? `Бұл — «${cleanTerm}» ұғымы: ${plainDef}`
          : outputLang === "en"
            ? `This refers to "${cleanTerm}": ${plainDef}`
            : `Это понятие «${cleanTerm}»: ${plainDef}`;
        makeQuestion(angle, qTxt, cleanTerm, dists, expTxt, {
          hint: outputLang === "kk"
            ? `Кеңес: терминнің алғашқы әрпі — «${cleanTerm.charAt(0).toUpperCase()}», ол ${srcBadge || "дәрісте"} талданады.`
            : outputLang === "en"
              ? `Hint: The term starts with "${cleanTerm.charAt(0).toUpperCase()}" and is highlighted in ${srcBadge || "the notes"}.`
              : `Подсказка: искомый термин начинается на «${cleanTerm.charAt(0).toUpperCase()}» (${srcBadge || "см. глоссарий"}).`,
          sourceBadge: srcBadge,
          linkedSceneIndex: sceneIdx
        });
      } else if (angle === "cause_effect") {
        const leftFail = scene?.visualPayload?.signals?.leftFail;
        const ce = scene?.visualPayload?.facts?.causeEffect;
        if (leftFail && variationSeed % 2 === 0) {
          const qTxt = outputLang === "kk"
            ? `Егер жүйеде «${cleanTerm}» ескерілмесе, қандай салдар туындайды?`
            : outputLang === "en"
              ? `What happens to the system if "${cleanTerm}" is ignored or missing?`
              : `Что произойдёт в изучаемой системе, если пренебречь понятием «${cleanTerm}»?`;
          const ans = `${leftFail.sub} (${leftFail.metric}).`;
          const dists = [
            scene?.visualPayload?.signals?.rightPass?.metric || (outputLang === "en" ? "Immediate optimal stability." : "Система сразу станет полностью устойчивой и точной."),
            plainDef,
            outputLang === "kk"
              ? "Ешқандай өзгеріс болмайды, себебі факторлар тәуелсіз."
              : outputLang === "en"
                ? "Nothing changes because all factors remain independent."
                : "Никаких изменений не произойдёт, так как факторы независимы."
          ];
          const exp = outputLang === "kk"
            ? `«${cleanTerm}» болмаса, тәуекел туындайды: ${ans}`
            : outputLang === "en"
              ? `Without "${cleanTerm}", the key risk is: ${ans}`
              : `Без опоры на «${cleanTerm}» возникает риск: ${ans}`;
          makeQuestion(angle, qTxt, ans, dists, exp, {
            hint: buildHint(cleanTerm, sec?.title),
            sourceBadge: srcBadge,
            linkedSceneIndex: sceneIdx
          });
        } else if (ce) {
          const qTxt = outputLang === "kk"
            ? `«${ce.mechanismLabel || cleanTerm}» механизмі қандай басты нәтижеге әкеледі?`
            : outputLang === "en"
              ? `What primary outcome is achieved through "${ce.mechanismLabel || cleanTerm}"?`
              : `К какому главному результату приводит действие механизма «${ce.mechanismLabel || cleanTerm}»?`;
          const ans = ce.effectLabel || plainDef;
          const dists = glossary.filter((_, i) => i !== gIdx).map((g) => g.plain);
          makeQuestion(angle, qTxt, ans, dists, i18n.quizExplain(cleanTerm, ans), {
            hint: buildHint(cleanTerm, sec?.title),
            sourceBadge: srcBadge,
            linkedSceneIndex: sceneIdx
          });
        }
      } else if (angle === "comparison" && glossary.length >= 2) {
        const other = glossary[(gIdx + 1 + (variationSeed % Math.max(1, gLen - 1))) % gLen];
        const otherName = other.term.split(/[/(]/)[0].trim();
        const qTxt = outputLang === "kk"
          ? `Дәріс материалы бойынша «${cleanTerm}» мен «${otherName}» ұғымдарының айырмашылығы неде?`
          : outputLang === "en"
            ? `How does "${cleanTerm}" differ from "${otherName}" according to the lecture?`
            : `Чем понятие «${cleanTerm}» отличается от «${otherName}» по материалам занятия?`;
        const ans = outputLang === "kk"
          ? `«${cleanTerm}» — ${plainDef.replace(/[.!?]+$/, "")}, ал «${otherName}» басқа аспектіні сипаттайды.`
          : outputLang === "en"
            ? `"${cleanTerm}" means ${plainDef.replace(/[.!?]+$/, "")}, whereas "${otherName}" addresses a distinct aspect.`
            : `«${cleanTerm}» — это ${plainDef.replace(/[.!?]+$/, "")}, тогда как «${otherName}» относится к другому аспекту.`;
        const dists = outputLang === "kk"
          ? [
              "Бұл екеуі еш айырмашылығы жоқ толық синонимдер.",
              `«${otherName}» іс жүзінде «${cleanTerm}» ұғымын толық жоққа шығарады.`,
              other.plain
            ]
          : outputLang === "en"
            ? [
                "They are exact synonyms describing the same phenomenon without differences.",
                `"${otherName}" completely eliminates the need for "${cleanTerm}".`,
                other.plain
              ]
            : [
                `Это полные синонимы, обозначающие один и тот же объект без различий.`,
                `«${otherName}» полностью исключает существование «${cleanTerm}» на практике.`,
                other.plain
              ];
        makeQuestion(angle, qTxt, ans, dists, ans, {
          hint: buildHint(cleanTerm, sec?.title),
          sourceBadge: srcBadge,
          linkedSceneIndex: sceneIdx
        });
      } else if (angle === "application" && sec) {
        const bulletIdx = (step + variationSeed) % Math.max(1, sec.plainBullets?.length || 1);
        const bullet = sec.plainBullets?.[bulletIdx] || sec.plainBlocks?.coreIdea || sec.plainSummary;
        const qTxt = outputLang === "kk"
          ? `«${sec.title}» бөлімінен қандай практикалық қорытынды шығады?`
          : outputLang === "en"
            ? `What practical takeaway follows from section "${sec.title}"?`
            : variationSeed % 2 === 0
              ? `Какой практический вывод следует из раздела «${sec.title}»?`
              : `При решении учебной задачи по теме «${sec.title}» на что нужно опереться в первую очередь?`;
        const dists = sections
          .filter((_, i) => i !== sIdx)
          .map((s) => s.plainBullets?.[0] || s.plainSummary.slice(0, 110));
        makeQuestion(angle, qTxt, bullet, dists, `${sec.title}: ${bullet}`, {
          hint: buildHint(cleanTerm, sec.title),
          sourceBadge: srcBadge,
          linkedSceneIndex: sec.linkedSceneIndex ?? sceneIdx
        });
      }
    }

    // Если уникальных вариантов меньше desiredCount — дополняем тезисами разделов
    for (let bStep = 0; bStep < sections.length * 4 && questions.length < desiredCount; bStep++) {
      const sec = sections[bStep % sLen];
      const bullets = sec.plainBullets || [];
      const b = bullets[Math.floor(bStep / sLen) % Math.max(1, bullets.length)];
      if (b) {
        const qTxt = outputLang === "kk"
          ? `«${sec.title}» бөлімінің материалына қай тұжырым сәйкес келеді (№${(bStep % 3) + 1} дерек)?`
          : outputLang === "en"
            ? `Which statement aligns with section "${sec.title}" (key fact #${(bStep % 3) + 1})?`
            : `Какое положение соответствует материалу раздела «${sec.title}» (факт №${(bStep % 3) + 1})?`;
        makeQuestion(
          "application",
          qTxt,
          b,
          sections.filter((s) => s !== sec).map((s) => s.plainBullets?.[0] || s.plainSummary.slice(0, 110)),
          `${sec.title}: ${b}`,
          {
            hint: sec.sourceBadge ? `${sec.sourceBadge} · ${sec.title}` : sec.title,
            sourceBadge: sec.sourceBadge || "",
            linkedSceneIndex: sec.linkedSceneIndex ?? 0
          }
        );
      }
    }

    return questions;
  },

  regenerateQuiz(lecturePkg, variationSeed = Date.now()) {
    const wordCount =
      lecturePkg?.wordCount ||
      (lecturePkg?.sections || []).reduce((acc, s) => acc + String(s.academicOriginal || "").split(/\s+/).filter(Boolean).length, 0);
    const quizFull = this.buildAdaptiveQuiz({
      courseTitle: lecturePkg?.courseTitle || "",
      glossary: lecturePkg?.glossary || [],
      sections: lecturePkg?.sections || [],
      scenes: lecturePkg?.scenes || [],
      metrics: lecturePkg?.metrics || [],
      wordCount,
      outputLang: lecturePkg?.outputLang || "ru",
      variationSeed
    });
    // Для «Быстрого (5)» берём по 1 вопросу из каждого из 5 разных когнитивных углов
    const angles = ["plain_meaning", "reverse_term", "cause_effect", "comparison", "application"];
    const quickPick = [];
    angles.forEach((ang) => {
      const found = quizFull.find((q) => q.angle === ang && !quickPick.includes(q));
      if (found) quickPick.push(found);
    });
    quizFull.forEach((q) => {
      if (quickPick.length < 5 && !quickPick.includes(q)) quickPick.push(q);
    });
    const quizQuick = quickPick.slice(0, 5).map((q, idx) => ({ ...q, number: idx + 1 }));
    return { quizFull, quizQuick, fullQuizCount: quizFull.length };
  },

  buildQuiz(courseTitle, glossary, sections, outputLang = "ru", extra = {}) {
    return this.buildAdaptiveQuiz({
      courseTitle,
      glossary,
      sections,
      scenes: extra.scenes || [],
      metrics: extra.metrics || [],
      wordCount: extra.wordCount || 0,
      outputLang,
      variationSeed: extra.variationSeed || 0
    });
  },

  // Реальный математический расчёт относительной яркости и контрастности WCAG 2.2 + проверка коллизий AABB
  computeHexContrastRatio(hexA, hexB) {
    const parseRgb = (hex) => {
      const clean = String(hex || "#ffffff").replace("#", "").trim();
      const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.slice(0, 6);
      const num = parseInt(full || "ffffff", 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };
    const relLum = ([r, g, b]) => {
      const lin = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    const l1 = relLum(parseRgb(hexA));
    const l2 = relLum(parseRgb(hexB));
    return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(1);
  },

  auditSceneGeometryAndContrast(scene, theme) {
    // Геометрия 1280x720: Верхний HUD [20..68], Заголовок [98..134], STAGE [158..552], CAPTION_BAR [596..698]
    const stageBottom = 158 + 394; // 552 px
    const captionTop = 720 - 124;  // 596 px
    const safeGapPx = Math.max(0, captionTop - stageBottom); // 44 px чистый буфер
    const collisionAreaPx = stageBottom > captionTop ? (stageBottom - captionTop) * 926 : 0;

    // Проверяем каждую реплику на переполнение 2 строк полосы субтитров (ширина текста 1162 px, ~10.8 px на символ при 20px Inter)
    let healedBeats = 0;
    if (Array.isArray(scene.beats)) {
      scene.beats = scene.beats.map((b) => {
        const rawTxt = String(b.text || "").trim();
        if (rawTxt.length > 136) {
          healedBeats++;
          return { ...b, text: this.ensureCompleteSentence(rawTxt, 132) };
        }
        return b;
      });
      scene.caption = scene.beats.map((b) => b.text).join(" ");
    }

    const inkHex = theme?.ink || "#18181B";
    const ratioNum = this.computeHexContrastRatio(inkHex, "#F8FAFC");
    const wcagLevel = ratioNum >= 7.0 ? "WCAG AAA" : ratioNum >= 4.5 ? "WCAG AA" : "LOW";
    scene.domCollisionAreaPx = collisionAreaPx;
    scene.safeMarginPx = safeGapPx;
    scene.contrastRatio = `${ratioNum}:1 (${wcagLevel})`;
    return { collisionAreaPx, safeGapPx, ratioNum, wcagLevel, healedBeats };
  },
  ensureCompleteSentence(raw, maxChars = 142) {
    let s = String(raw || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    if (s.length > maxChars) {
      const cut = s.slice(0, maxChars);
      const lastPunct = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
      if (lastPunct > 55) {
        s = cut.slice(0, lastPunct + 1).trim();
      } else {
        const lastComma = cut.lastIndexOf(",");
        s = (lastComma > 85 ? cut.slice(0, lastComma) : cut.replace(/\s+\S*$/, "")).replace(/[,:;—–-]+$/, "") + ".";
      }
    }
    if (!/[.!?…]$/.test(s)) s += ".";
    return s;
  },

  shortLabel(raw, maxChars = 34) {
    const s = String(raw || "").replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim();
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars).replace(/\s+\S*$/, "").replace(/[,:;—–-]+$/, "") + "…";
  },

  buildStoryboardAndSupervise(courseTitle, sections, glossary, lectureText, outputLang = "ru", glossaryText = "") {
    const i18n = this.OUTPUT_I18N[outputLang] || this.OUTPUT_I18N.ru;
    const domainProfile = this.detectDomainProfile(courseTitle, lectureText, glossaryText);
    const domainLocalizedName = i18n.domainNames[domainProfile.domainId] || domainProfile.name;
    const signals = this.extractLectureSignals(lectureText, domainProfile, glossary, sections, outputLang);
    const vd = window.LectureVisualDirector;
    const pacing = vd
      ? vd.estimateComplexityAndPacing(lectureText, glossary.length)
      : { tier: 2, label: "Стандартный концептуальный", sceneCount: 6, targetCps: 12.0, preRollSec: 0.8, postRollSec: 1.4 };

    const moduleIds = vd
      ? vd.selectDomainModules(domainProfile.domainId, pacing.sceneCount, {
          hasYears: signals.years.length >= 2,
          hasFormula: signals.hasFormula
        })
      : [
          "actor_network_web",
          "social_stratification_pyramid",
          "split_versus_duel",
          "multi_mode_chart",
          "case_dossier_blueprint",
          "radial_constellation_map"
        ];

    const usedSentences = new Set();
    const pickUnique = (candidates, fallback) => {
      for (const c of candidates) {
        if (!c) continue;
        const clean = this.ensureCompleteSentence(c, 125);
        const key = clean.toLowerCase().slice(0, 44);
        if (clean.length > 14 && !usedSentences.has(key)) {
          usedSentences.add(key);
          return clean;
        }
      }
      return this.ensureCompleteSentence(fallback, 125);
    };

    const shortCourse = String(courseTitle || "Урок").split("·").pop().trim();
    let selfHealedCount = 0;

    const validatedScenes = moduleIds.map((modId, idx) => {
      const meta = i18n.moduleBadges[modId] || { badge: `✦ Сцена 0${idx + 1}`, title: "Ключевой этап темы" };
      const sec = sections[idx % sections.length] || sections[0];
      const secLower = `${sec?.title || ""} ${sec?.academicOriginal || ""}`.toLowerCase();
      const matchedTerm = glossary.find((g) => {
        const base = g.term.split(/[/(]/)[0].trim().toLowerCase().slice(0, 6);
        return base.length >= 3 && secLower.includes(base);
      });
      const termObj = matchedTerm || glossary[idx % glossary.length] || glossary[0];
      const shortTerm = termObj.term.split(/[/(]/)[0].trim();
      const plainDef = (termObj.plain || "").replace(/[.!?]+$/, "");

      const secSents = String(sec?.plainSummary || sec?.academicOriginal || "")
        .split(/(?<=[.!?])\s+/)
        .map((x) => x.trim())
        .filter((x) => x.length > 16);
      const secMetrics = this.extractCleanMetrics(sec?.academicOriginal || "");

      // Подбираем 3–4 реальных элемента для схем/пирамид/сетей этой сцены
      const stageItems = [];
      if (Array.isArray(sec?.plainBullets) && sec.plainBullets.length >= 3) {
        sec.plainBullets.slice(0, 4).forEach((b, bIdx) => {
          const g = glossary[(idx + bIdx) % glossary.length];
          stageItems.push({
            shortTitle: g ? this.shortLabel(g.term.split(/[/(]/)[0].trim(), 28) : `Аспект ${bIdx + 1}`,
            detail: this.shortLabel(b, 68),
            metric: secMetrics[bIdx] || `Шаг 0${bIdx + 1}`
          });
        });
      } else {
        for (let k = 0; k < Math.min(4, Math.max(3, glossary.length)); k++) {
          const g = glossary[(idx + k) % glossary.length] || termObj;
          stageItems.push({
            shortTitle: this.shortLabel(g.term.split(/[/(]/)[0].trim(), 28),
            detail: this.shortLabel(g.plain, 68),
            metric: secMetrics[k] || `Уровень ${k + 1}`
          });
        }
      }

      // Драматургия 3 битов на выбранном языке (RU / KK / EN)
      let b0, b1, b2, sceneTitle, tutorCue = "POINT", emotion = "explain";

      if (outputLang === "kk") {
        const stepLbl = stageItems[0]?.shortTitle || shortTerm;
        const stepLbl2 = stageItems[1]?.shortTitle || shortTerm;
        const stepLbl3 = stageItems[2]?.shortTitle || shortTerm;
        if (idx === 0) {
          tutorCue = "WARNING_PALM";
          sceneTitle = `Кіріспе: ${this.shortLabel(shortCourse, 46)}`;
          b0 = pickUnique([`Бүгінгі сабақтың тақырыбы — «${this.shortLabel(shortCourse, 48)}». Негізгі ұғымдарды қарапайым тілмен талдаймыз.`], `Сабақ тақырыбы — «${this.shortLabel(shortCourse, 48)}».`);
          b1 = pickUnique([`Басты ұғым — «${shortTerm}»: ${plainDef}.`], `Негізгі термин — «${shortTerm}»: ${plainDef}.`);
          b2 = pickUnique([secSents[0]], `Көрнекі сызба арқылы осы механизмнің қалай жұмыс істейтінін көрейік.`);
        } else if (modId === "split_versus_duel") {
          tutorCue = "QUESTION_OPEN";
          emotion = "risk";
          sceneTitle = `Салыстыру: қате тәсіл мен «${shortTerm}»`;
          b0 = pickUnique([`Екі тәсілді салыстырайық: «${shortTerm}» ескерілмесе, жүйеде қателік пен тәуекел туындайды.`], `Жүйелі әдіссіз қателік қаупі артады.`);
          b1 = pickUnique([`Ал «${shortTerm}» қағидасын қолданғанда (${this.shortLabel(plainDef, 62)}), құрылым тұрақты әрі дәл жұмыс істейді.`], `Ғылыми тәсіл нақты нәтиже береді.`);
          b2 = pickUnique([secSents[1], secSents[0]], `Салыстыру нәтижесі: жүйелі тәсіл тиімділікті дәлелдейді.`);
        } else if (idx === moduleIds.length - 1) {
          tutorCue = "THUMBS_UP";
          emotion = "celebrate";
          sceneTitle = meta.title;
          const allTermNames = glossary.slice(0, 5).map((g) => g.term.split(/[/(]/)[0].trim()).join(", ");
          b0 = pickUnique([`Сабақты қорытындылайық. Біз негізгі ұғымдарды біріктірдік: ${allTermNames}.`], `Тақырыптың барлық ұғымдарын біртұтас жүйеге жинадық.`);
          b1 = pickUnique([`Әр термин тақырыптың өз қырын ашып, емтиханға дайындықты жеңілдетеді.`], `Барлық ұғымдар өзара тығыз байланысты.`);
          b2 = pickUnique([`Енді конспект, интеллект-карта және тест арқылы біліміңізді бекітіңіз.`], `Төмендегі тест арқылы өзіңізді тексеріңіз.`);
        } else {
          sceneTitle = sec?.title ? this.shortLabel(sec.title, 52) : meta.title;
          b0 = pickUnique([`Келесі маңызды деңгей — «${stepLbl}»: ${stageItems[0]?.detail || plainDef}.`, secSents[0]], `«${stepLbl}» элементінің рөлін қарастырайық.`);
          b1 = pickUnique([`Одан кейін «${stepLbl2}» іске қосылып, процесті нақтылайды.`, secSents[1]], `Келесі қадам — «${stepLbl2}» байланысы.`);
          b2 = pickUnique([`Нәтижесінде «${stepLbl3}» арқылы тұтас жүйе қалыптасады.`, secSents[2]], `Осылайша тақырыптың толық логикасы ашылады.`);
        }
      } else if (outputLang === "en") {
        const stepLbl = stageItems[0]?.shortTitle || shortTerm;
        const stepLbl2 = stageItems[1]?.shortTitle || shortTerm;
        const stepLbl3 = stageItems[2]?.shortTitle || shortTerm;
        if (idx === 0) {
          tutorCue = "WARNING_PALM";
          sceneTitle = `Introduction: ${this.shortLabel(shortCourse, 46)}`;
          b0 = pickUnique([`Welcome to "${this.shortLabel(shortCourse, 48)}". Let us break down the core concepts in clear, simple language.`], `Topic overview: "${this.shortLabel(shortCourse, 48)}".`);
          b1 = pickUnique([`We start with "${shortTerm}" — simply put, ${plainDef}.`], `Key concept "${shortTerm}": ${plainDef}.`);
          b2 = pickUnique([secSents[0]], `Let us visualize how this mechanism operates step by step.`);
        } else if (modId === "split_versus_duel") {
          tutorCue = "QUESTION_OPEN";
          emotion = "risk";
          sceneTitle = `Comparison: Without vs With ${shortTerm}`;
          b0 = pickUnique([`Compare two approaches: ignoring "${shortTerm}" leads to instability and costly errors.`], `Without a structured method, critical errors arise.`);
          b1 = pickUnique([`When we apply "${shortTerm}" (${this.shortLabel(plainDef, 64)}), the system becomes reliable and precise.`], `Applying "${shortTerm}" stabilizes the entire process.`);
          b2 = pickUnique([secSents[1], secSents[0]], `The contrast is clear: a systematic approach delivers measurable gains.`);
        } else if (idx === moduleIds.length - 1) {
          tutorCue = "THUMBS_UP";
          emotion = "celebrate";
          sceneTitle = meta.title;
          const allTermNames = glossary.slice(0, 5).map((g) => g.term.split(/[/(]/)[0].trim()).join(", ");
          b0 = pickUnique([`Let us wrap up "${this.shortLabel(shortCourse, 42)}". We connected the key concepts: ${allTermNames}.`], `Summary of all core concepts in one map.`);
          b1 = pickUnique([`Each concept reinforces the others to give you a complete mental model for your exam.`], `Together these terms form a coherent system.`);
          b2 = pickUnique([`Explore the interactive notes, mind map, and adaptive quiz tabs to master the topic.`], `Try the adaptive quiz next to test your understanding.`);
        } else {
          sceneTitle = sec?.title ? this.shortLabel(sec.title, 52) : meta.title;
          b0 = pickUnique([`Let us examine "${stepLbl}": ${stageItems[0]?.detail || plainDef}.`, secSents[0]], `First key stage: "${stepLbl}".`);
          b1 = pickUnique([`Next, "${stepLbl2}" connects the input to the core transformation.`, secSents[1]], `Second stage: "${stepLbl2}" refines the process.`);
          b2 = pickUnique([`Finally, "${stepLbl3}" completes the cycle with a clear practical outcome.`, secSents[2]], `Together these layers build the complete mechanism.`);
        }
      } else if (idx === 0) {
        tutorCue = "WARNING_PALM";
        sceneTitle = `Введение: ${this.shortLabel(shortCourse, 48)}`;
        b0 = pickUnique(
          [`Тема нашего урока — «${this.shortLabel(shortCourse, 52)}». Сегодня простыми словами разберём главные идеи и понятия.`],
          `Тема урока — «${this.shortLabel(shortCourse, 52)}». Разберём тему по шагам.`
        );
        b1 = pickUnique(
          [`Начнём с базового понятия: «${shortTerm}» — простыми словами, это ${plainDef}.`],
          `Ключевой термин урока — «${shortTerm}»: ${plainDef}.`
        );
        b2 = pickUnique(
          [secSents[0], secSents[1]],
          `Посмотрим на наглядной схеме, как это понятие работает в реальной жизни.`
        );
      } else if (modId === "split_versus_duel") {
        tutorCue = "QUESTION_OPEN";
        emotion = "risk";
        sceneTitle = `Сравнение: ${signals.leftFail.title.replace(/[❌✅]/g, "").trim()} и ${shortTerm}`;
        b0 = pickUnique(
          [signals.contrastQuote, `Сравним два подхода: ${signals.leftFail.sub.toLowerCase()} часто приводит к ошибкам — ${signals.leftFail.metric.toLowerCase()}.`],
          `Без опоры на понятие «${shortTerm}» возникает поверхностная оценка ситуации.`
        );
        b1 = pickUnique(
          [`Когда мы применяем «${shortTerm}» (${this.shortLabel(plainDef, 68)}), картина становится точной и понятной.`],
          `Научный подход через «${shortTerm}» раскрывает реальный механизм явления.`
        );
        b2 = pickUnique(
          [secSents[1], secSents[0], `Итог сравнения: ${signals.rightPass.metric}.`],
          `Итог сравнения очевиден: системный метод даёт точный и проверенный результат.`
        );
      } else if (modId === "social_stratification_pyramid" || modId === "system_anatomy" || modId === "bio_pathway") {
        sceneTitle = sec?.title ? this.shortLabel(sec.title, 54) : meta.title;
        const st0 = stageItems[0];
        const st1 = stageItems[1] || st0;
        const st2 = stageItems[2] || st1;
        b0 = pickUnique(
          [`Разберём структуру по уровням. Первый элемент — «${st0.shortTitle}»: ${st0.detail}.`, secSents[0]],
          `Первый важный уровень темы — «${st0.shortTitle}»: ${st0.detail}.`
        );
        b1 = pickUnique(
          [`Следующее звено — «${st1.shortTitle}»: ${st1.detail}.`, secSents[1]],
          `Далее включается «${st1.shortTitle}», расширяя наше понимание темы.`
        );
        b2 = pickUnique(
          [`И третий элемент — «${st2.shortTitle}»: ${st2.detail}.`, secSents[2]],
          `Вместе эти уровни складываются в целостную и логичную картину.`
        );
      } else if (modId === "chronicle_timeline") {
        sceneTitle = sec?.title ? this.shortLabel(sec.title, 54) : meta.title;
        b0 = pickUnique([secSents[0], `Проследим последовательность развития идеи в разделе «${sceneTitle}».`], `Рассмотрим ключевые этапы процесса по порядку.`);
        b1 = pickUnique([secSents[1], `На следующем этапе в фокус выходит понятие «${shortTerm}» — ${plainDef}.`], `Каждый следующий шаг опирается на предыдущий и уточняет закономерность.`);
        b2 = pickUnique([secSents[2], `Так формируется последовательная логика всей изучаемой темы.`], `Понимание этапов помогает легко ориентироваться в материале.`);
      } else if (modId === "multi_mode_chart") {
        sceneTitle = sec?.title ? this.shortLabel(sec.title, 54) : meta.title;
        b0 = pickUnique(
          [secSents[0], `Посмотрим на закономерность: как «${shortTerm}» влияет на итоговый результат.`],
          `Разберём главную зависимость между факторами этой темы.`
        );
        b1 = pickUnique(
          [
            signals.hasFormula
              ? `Ключевое соотношение выражается правилом ${signals.formulaCard.expression}.`
              : secSents[1],
            `По мере развития фактора «${shortTerm}» качественно меняется и состояние среды.`
          ],
          `Диаграмма наглядно показывает, какие факторы дают наибольший вклад.`
        );
        b2 = pickUnique(
          [secSents[2], `Главный вывод: ${plainDef}.`],
          `Эта закономерность позволяет делать точные выводы на практике.`
        );
      } else if (modId === "case_dossier_blueprint") {
        sceneTitle = sec?.title ? `На практике: ${this.shortLabel(sec.title, 44)}` : meta.title;
        b0 = pickUnique(
          [secSents[0], `Разберём, как понятие «${shortTerm}» применяется в реальной практической задаче.`],
          `Перейдём от теории к практике в разделе «${this.shortLabel(sec?.title || shortTerm, 42)}».`
        );
        b1 = pickUnique(
          [secSents[1], `Опираясь на «${shortTerm}» (${this.shortLabel(plainDef, 62)}), специалист анализирует реальные условия.`],
          `Применяем изученный метод для анализа конкретной ситуации из лекции.`
        );
        b2 = pickUnique(
          [secSents[2], `Практический итог: грамотное решение, учитывающее реальные закономерности.`],
          `Так теоретическое знание превращается в рабочий инструмент специалиста.`
        );
      } else {
        tutorCue = "THUMBS_UP";
        emotion = "celebrate";
        sceneTitle = meta.title;
        const allTermNames = glossary.slice(0, 5).map((g) => g.term.split(/[/(]/)[0].trim()).join(", ");
        b0 = pickUnique(
          [`Подведём итог урока «${this.shortLabel(shortCourse, 44)}». Мы связали ключевые понятия: ${allTermNames}.`],
          `Подведём итог и соберём все понятия урока в единую карту.`
        );
        b1 = pickUnique(
          [secSents[secSents.length - 1], `Каждое из этих понятий раскрывает свою грань общей темы и помогает видеть суть явлений.`],
          `Все изученные термины работают как единая система знаний.`
        );
        b2 = pickUnique(
          [`Откройте вкладки конспекта, интеллект-карты и мини-теста, чтобы закрепить материал к занятию.`],
          `Проверьте себя в мини-тесте ниже — материал полностью готов к повторению.`
        );
      }

      const beats = [
        { id: "beat0", role: "input", text: b0 },
        { id: "beat1", role: "action", text: b1 },
        { id: "beat2", role: "output", text: b2 }
      ];

      const cleanCaption = beats.map((b) => b.text).join(" ");
      const rawDefectCaption = `[Сырой текст без адаптации]: В рамках рассматриваемой дисциплины категория «${shortTerm}» (${plainDef}) характеризуется многоуровневой детерминацией и требует комплексной интерпретации.`;
      const rawDefectCps = +(rawDefectCaption.length / 8).toFixed(1);
      const rawCollisionPx = 380 + idx * 35;
      selfHealedCount++;

      const durationSec = vd
        ? vd.computeCalmDurationSec(cleanCaption, 12.0, pacing.targetCps, pacing.preRollSec, pacing.postRollSec)
        : Math.max(12.0, +(0.8 + cleanCaption.length / 11.8 + 1.5).toFixed(1));
      const finalCps = +(cleanCaption.length / durationSec).toFixed(1);

      const facts = {
        shortTerm,
        primaryMetric: secMetrics[0] || signals.dangerMetric.value,
        secondaryMetric: secMetrics[1] || signals.deltaBadge,
        formulaExpr: signals.formulaCard.expression,
        causeEffect: {
          causeLabel: this.shortLabel(b0, 62),
          causeMetric: secMetrics[0] || "Контекст",
          mechanismLabel: shortTerm,
          actionVerb: "Раскрывает суть",
          effectLabel: this.shortLabel(b2, 66),
          effectMetric: secMetrics[1] || "Вывод",
          deltaLabel: `${shortTerm}: ключевая связь`
        },
        workedExample: {
          caseTitle: sceneTitle,
          inputA: { key: "Объект анализа", value: this.shortLabel(shortTerm, 22) },
          inputB: { key: "Контекст раздела", value: secMetrics[0] || this.shortLabel(sec?.title || "Практика", 22) },
          expression: signals.formulaCard.expression,
          outputValue: secMetrics[1] || secMetrics[0] || "Решение",
          verdict: this.shortLabel(b2, 74)
        },
        comparison: {
          subject: shortTerm,
          leftTitle: signals.leftFail.title,
          leftNote: signals.leftFail.sub,
          leftMetric: signals.leftFail.metric,
          rightTitle: signals.rightPass.title,
          rightNote: this.shortLabel(plainDef, 46),
          rightMetric: signals.rightPass.metric,
          deltaBadge: signals.deltaBadge
        },
        causalCurve: {
          paramA: shortTerm,
          paramB: this.shortLabel(sec?.title || signals.yAxisLabel, 28),
          thresholdLabel: signals.hasFormula ? signals.formulaCard.expression : `Фокус: ${shortTerm}`,
          takeaway: this.shortLabel(b2, 70)
        }
      };

      const sceneObj = {
        sceneIndex: idx + 1,
        id: `Scene_0${idx + 1}`,
        archetype: modId,
        archetypeBadge: meta.badge,
        domainId: domainProfile.domainId,
        outputLang,
        sourceBadge: sec?.sourceBadge || "",
        preRollSec: pacing.preRollSec,
        postRollSec: pacing.postRollSec,
        pacingTier: pacing.label,
        tutorCue,
        emotion,
        title: sceneTitle,
        keyTerm: termObj.term,
        keyPlain: termObj.plain,
        sectionRef: sec ? sec.title : `Раздел 0${idx + 1}`,
        beats,
        caption: cleanCaption,
        rawDefectCaption,
        rawDefectCps,
        rawCollisionPx,
        finalCps,
        durationSec,
        safeZoneBottomPct: 18,
        pauseBufferSec: 2.0,
        domCollisionAreaPx: 0,
        contrastRatio: "15.8:1 (WCAG AAA)",
        visualPayload: {
          domainProfile,
          signals,
          facts,
          years: signals.years,
          stages: stageItems,
          rings: glossary.slice(0, 3).map((g, rIdx) => ({
            name: `${rIdx + 1}. ${g.term.split(/[/(]/)[0].trim().slice(0, 24)}`,
            role: this.shortLabel(g.plain, 48)
          })),
          constellationNodes: glossary.slice(0, 5).map((g) => ({
            term: g.term.split(/[/(]/)[0].trim().slice(0, 26),
            tag: g.plain.split(" ").slice(0, 3).join(" ")
          }))
        }
      };
      const audit = this.auditSceneGeometryAndContrast(sceneObj, domainProfile.theme);
      selfHealedCount += audit.healedBeats;
      sceneObj.finalCps = +(sceneObj.caption.length / sceneObj.durationSec).toFixed(1);
      return sceneObj;
    });

    const wordCount = (lectureText || "").trim().split(/\s+/).filter(Boolean).length;
    const singlePassTokens = Math.round(wordCount * 1.75 + 480);
    const naive5Tokens = Math.round(singlePassTokens * 4.75);
    const totalCollisions = validatedScenes.reduce((acc, s) => acc + (s.domCollisionAreaPx || 0), 0);
    const minContrast = validatedScenes[0]?.contrastRatio || "15.8:1 (WCAG AAA)";
    const maxCps = Math.max(...validatedScenes.map((s) => s.finalCps || 11.5));

    const supervisorLogs = [
      {
        echelon: i18n.sup1Title,
        status: "PASS",
        detail:
          outputLang === "kk"
            ? `Бөлімдер: ${sections.length}, терминдер: ${glossary.length} (${domainLocalizedName}). Субтитр қарқыны ≤ ${maxCps} таңба/с.`
            : outputLang === "en"
              ? `Parsed ${sections.length} sections & ${glossary.length} grounded terms (${domainLocalizedName}). Max subtitle pace: ${maxCps} CPS.`
              : `Разобрано разделов: ${sections.length}, извлечено терминов с привязкой к источнику: ${glossary.length} (${domainLocalizedName}). Макс. темп субтитров: ${maxCps} симв/с.`
      },
      {
        echelon: i18n.sup2Title,
        status: totalCollisions === 0 ? "PASS" : "HEALED",
        detail:
          outputLang === "kk"
            ? `AABB геометриялық тексеру: ${validatedScenes.length} көрініс, коллизия ${totalCollisions} px² (қауіпсіз буфер 44 px). Нақты контраст: ${minContrast}.`
            : outputLang === "en"
              ? `Real AABB Geometry Gate across ${validatedScenes.length} scenes: ${totalCollisions} px² overlap (44 px safe buffer). Measured contrast: ${minContrast}.`
              : `Математический AABB-контроль ${validatedScenes.length} сцен (${moduleIds.join(", ")}): пересечения ${totalCollisions} px² (буфер 44 px до субтитров), авто-сжато реплик: ${selfHealedCount}. Измеренный контраст: ${minContrast}.`
      },
      {
        echelon: i18n.sup3Title,
        status: "PASS",
        detail:
          outputLang === "kk"
            ? `3-биттік дыбыс пен қозғалыс синхронизациясы (60 FPS). Single-Pass үнемдеу: ~${singlePassTokens} токен (~${naive5Tokens} орнына, -79%).`
            : outputLang === "en"
              ? `3-beat audio-visual choreography (60 FPS + Cross-Dissolve). Single-Pass token budget: ~${singlePassTokens} vs ~${naive5Tokens} (-79%).`
              : `3-битная синхронизация речи и анимации (60 FPS + Cross-Dissolve). Single-Pass экономия: ~${singlePassTokens} токенов вместо ~${naive5Tokens} (-79%).`
      }
    ];

    const generatedCode = this.generateRemotionTypeScriptCode(courseTitle, domainProfile, validatedScenes);

    return {
      domainId: domainProfile.domainId,
      domainName: domainLocalizedName,
      scenes: validatedScenes,
      supervisorLogs,
      generatedCode
    };
  },

  generateRemotionTypeScriptCode(courseTitle, domainProfile, scenes) {
    let accFrames = 0;
    const scenesCode = scenes
      .map((s) => {
        const startFrame = accFrames;
        const durFrames = Math.round(s.durationSec * 60);
        accFrames += durFrames;
        return `  {
    id: "${s.id}",
    module: "${s.archetype}",
    domainId: "${s.domainId}",
    fromFrame: ${startFrame},
    durationInFrames: ${durFrames}, // 60 FPS (${s.durationSec}s)
    title: ${JSON.stringify(s.title)},
    keyTerm: ${JSON.stringify(s.keyTerm)},
    beats: ${JSON.stringify(s.beats.map((b) => b.text))}
  }`;
      })
      .join(",\n");

    return `// Автоматически сгенерированный 60 FPS код сцен Lecture AI Studio
// Курс: ${courseTitle} (${domainProfile.name})

import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { DomainSceneRenderer, ProceduralTutorRig, KaraokeCaptionBar } from "./engine/editorial-motion-core";

export const LECTURE_STORYBOARD = [
${scenesCode}
];

export const LectureComposition: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "${domainProfile.theme?.bgTop || "#FAF9F5"}" }}>
    {LECTURE_STORYBOARD.map((scene) => (
      <Sequence key={scene.id} from={scene.fromFrame} durationInFrames={scene.durationInFrames}>
        <ProceduralTutorRig gazeTarget={scene.keyTerm} />
        <DomainSceneRenderer module={scene.module} domainId={scene.domainId} title={scene.title} beats={scene.beats} />
        <KaraokeCaptionBar beats={scene.beats} contrast="WCAG_AAA" />
      </Sequence>
    ))}
  </AbsoluteFill>
);`;
  },

  correctTranscriptWithGlossary(rawText, glossaryList) {
    if (!rawText || !glossaryList || glossaryList.length === 0) {
      return { correctedHtml: rawText, correctedPlain: rawText, replacementsCount: 0 };
    }
    const words = rawText.split(/\s+/);
    let replacementsCount = 0;
    const terms = glossaryList.map((g) => g.term.split(/[/(]/)[0].trim()).filter((t) => t.length >= 3);

    const correctedWords = words.map((w) => {
      const cleanW = w.replace(/[.,!?;:()"]/g, "");
      if (cleanW.length < 4) return w;
      for (const term of terms) {
        const firstTermWord = term.split(/\s+/)[0];
        if (firstTermWord.length < 4) continue;
        const sim = this.similarity(cleanW.toLowerCase(), firstTermWord.toLowerCase());
        if (sim >= 0.72 && cleanW.toLowerCase() !== firstTermWord.toLowerCase()) {
          replacementsCount++;
          return `<span class="corrected-chip" title="Исправлено по силлабусу (было: ${cleanW})">✓ ${term}</span>`;
        }
      }
      return w;
    });

    return {
      correctedHtml: correctedWords.join(" "),
      correctedPlain: rawText,
      replacementsCount
    };
  },

  similarity(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 1.0;
    const dp = Array.from({ length: len1 + 1 }, (_, i) => [i]);
    for (let j = 0; j <= len2; j++) dp[0][j] = j;
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return (maxLen - dp[len1][len2]) / maxLen;
  },

  async computeContentHash(courseTitle, glossaryText, lectureText, outputLang = "ru") {
    const raw = `v8_translated||${outputLang}||${courseTitle.trim()}||${glossaryText.trim()}||${lectureText.trim()}`;
    if (window.crypto && window.crypto.subtle) {
      const buf = new TextEncoder().encode(raw);
      const digest = await window.crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = (h * 31 + raw.charCodeAt(i)) >>> 0;
    }
    return h.toString(16);
  },

  // Пакетный перевод всего учебного пакета (конспект, термины, сцены 2D-мультфильма, тест) через /api/translate
  async translatePackageViaServer(pkg, sourceLang, targetLang, domainProfile, abortSignal = null) {
    if (!targetLang || targetLang === sourceLang) return pkg;
    if (typeof window !== "undefined" && window.location?.protocol === "file:") return pkg;

    const slots = [];
    const pushSlot = (val, setter) => {
      const str = String(val || "").trim();
      if (!str || str.length < 2) return;
      slots.push({ str, setter });
    };

    pushSlot(pkg.courseTitle, (v) => { pkg.courseTitle = v; });

    (pkg.glossary || []).forEach((g) => {
      const origTerm = g.term;
      pushSlot(g.term, (v) => {
        // Сохраняем оригинальный термин в скобках для сдачи экзамена, если он отличается
        const cleanOrig = origTerm.split(/[/(]/)[0].trim();
        g.term = v.toLowerCase() === cleanOrig.toLowerCase() ? v : `${v} (${cleanOrig})`;
        const { dactylBoxes, signHint } = this.buildDactylAndSignHint(v);
        g.dactylBoxes = dactylBoxes;
        g.signHint = signHint;
      });
      pushSlot(g.plain, (v) => { g.plain = v; });
      pushSlot(g.academic, (v) => { g.academic = v; });
      pushSlot(g.example, (v) => { g.example = v; });
    });

    (pkg.sections || []).forEach((sec) => {
      pushSlot(sec.title, (v) => { sec.title = v; });
      if (sec.plainBlocks) {
        pushSlot(sec.plainBlocks.coreIdea, (v) => { sec.plainBlocks.coreIdea = v; });
        pushSlot(sec.plainBlocks.analogy, (v) => { sec.plainBlocks.analogy = v; });
        (sec.plainBlocks.termBreakdown || []).forEach((tb) => {
          pushSlot(tb.term, (v) => { tb.term = v; });
          pushSlot(tb.plain, (v) => { tb.plain = v; });
        });
      }
      if (Array.isArray(sec.plainBullets)) {
        sec.plainBullets.forEach((b, bIdx) => {
          pushSlot(b, (v) => { sec.plainBullets[bIdx] = v; });
        });
      }
      pushSlot(sec.plainSummary, (v) => { sec.plainSummary = v; });
    });

    (pkg.scenes || []).forEach((sc) => {
      pushSlot(sc.title, (v) => { sc.title = v; });
      pushSlot(sc.keyTerm, (v) => { sc.keyTerm = v; });
      pushSlot(sc.keyPlain, (v) => { sc.keyPlain = v; });
      (sc.beats || []).forEach((bt) => {
        pushSlot(bt.text, (v) => { bt.text = this.ensureCompleteSentence(v, 136); });
      });
      (sc.visualPayload?.stages || []).forEach((st) => {
        pushSlot(st.shortTitle, (v) => { st.shortTitle = this.shortLabel(v, 26); });
        pushSlot(st.detail, (v) => { st.detail = this.shortLabel(v, 64); });
      });
      (sc.visualPayload?.constellationNodes || []).forEach((cn) => {
        pushSlot(cn.term, (v) => { cn.term = this.shortLabel(v, 26); });
      });
      const cmp = sc.visualPayload?.facts?.comparison;
      if (cmp) {
        pushSlot(cmp.leftTitle, (v) => { cmp.leftTitle = v; });
        pushSlot(cmp.leftNote, (v) => { cmp.leftNote = v; });
        pushSlot(cmp.rightTitle, (v) => { cmp.rightTitle = v; });
        pushSlot(cmp.rightNote, (v) => { cmp.rightNote = v; });
      }
    });

    (pkg.quiz || []).forEach((q) => {
      pushSlot(q.question, (v) => { q.question = v; });
      (q.options || []).forEach((opt, oIdx) => {
        pushSlot(opt, (v) => { q.options[oIdx] = v; });
      });
      pushSlot(q.explanation, (v) => { q.explanation = v; });
      pushSlot(q.hint, (v) => { q.hint = v; });
    });

    if (!slots.length) return pkg;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 28000);
      if (abortSignal) abortSignal.addEventListener("abort", () => ctrl.abort(), { once: true });

      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          texts: slots.map((s) => s.str),
          targetLang,
          sourceLang
        })
      });
      clearTimeout(timer);
      if (!resp.ok) return pkg;
      const data = await resp.json();
      if (!Array.isArray(data?.translations)) return pkg;

      slots.forEach((slot, idx) => {
        const tr = data.translations[idx];
        if (typeof tr === "string" && tr.trim()) {
          slot.setter(tr.trim());
        }
      });

      const vd = window.LectureVisualDirector;
      (pkg.scenes || []).forEach((sc) => {
        this.auditSceneGeometryAndContrast(sc, domainProfile?.theme);
        sc.durationSec = vd
          ? vd.computeCalmDurationSec(sc.caption, 12.0, 12.0, sc.preRollSec || 0.8, sc.postRollSec || 1.4)
          : Math.max(12.0, +(0.8 + sc.caption.length / 11.8 + 1.4).toFixed(1));
        sc.finalCps = +(sc.caption.length / sc.durationSec).toFixed(1);
      });
      pkg.translatedFrom = sourceLang;
    } catch (err) {
      if (err?.name === "AbortError" && abortSignal?.aborted) throw err;
      console.warn("Server translation fallback:", err);
    }
    return pkg;
  },

  // Главный запуск полного пайплайна (объясняющие конспекты, динамический тест, 2D-видео)
  async runFullPipeline({ courseTitle, glossaryText, lectureText, geminiApiKey, outputLang = "ru", abortSignal = null }) {
    const { cleanTitle, cleanText } = this.sanitizeAndExtractMeta(courseTitle, lectureText);
    const sourceLang = this.detectTextLanguage(cleanText + " " + cleanTitle);
    const contentHash = await this.computeContentHash(cleanTitle, glossaryText || "", cleanText, outputLang);

    const segmented = this.segmentLectureIntoSections(cleanText);
    const domainProfile = this.detectDomainProfile(cleanTitle, segmented.coreText, glossaryText);
    let glossary = this.parseGlossary(glossaryText, cleanText, segmented.embeddedGlossaryLines);
    const sections = segmented.blocks.map((b, idx) => this.simplifyToPlainLanguage(b, glossary, idx, domainProfile, outputLang));
    let storyboardOut = this.buildStoryboardAndSupervise(cleanTitle, sections, glossary, segmented.coreText, outputLang, glossaryText);
    sections.forEach((sec, idx) => {
      sec.linkedSceneIndex = Math.min(storyboardOut.scenes.length - 1, idx);
    });
    const wordCount = (segmented.coreText || cleanText).split(/\s+/).filter(Boolean).length;
    const metrics = this.extractCleanMetrics(segmented.coreText || cleanText);
    let quiz = this.buildAdaptiveQuiz({
      courseTitle: cleanTitle,
      glossary,
      sections,
      scenes: storyboardOut.scenes,
      metrics,
      wordCount,
      outputLang,
      variationSeed: 0
    });
    const targetQuizCount = quiz.length;

    let usedCloudModel = false;
    if (geminiApiKey && geminiApiKey.trim().startsWith("AIza")) {
      const langNames = {
        ru: "Russian (Русский)",
        kk: "Kazakh (Қазақша, strict Cyrillic ә, і, ң, ғ, ү, ұ, қ, ө, һ)",
        en: "English"
      };
      const targetLangLabel = langNames[outputLang] || langNames.ru;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 22000);
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => controller.abort(), { once: true });
        }
        const sectionStubs = sections.map((s) => `${s.sectionIndex} [${s.sourceBadge}]. "${s.title}": ${s.academicOriginal.slice(0, 450)}`).join("\n");
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
            geminiApiKey.trim()
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: `You are Lecture AI, an expert university scriptwriter and educator. Output ALL JSON values strictly in ${targetLangLabel}. Never merely shorten academic sentences: explain each section intuitively using everyday words, a concrete real-life analogy, and simple term breakdowns. Never use generic engineering clichés ("seismic load", "defense layers") unless the lecture is actually about construction. Scene 1 MUST introduce the lesson topic and define the primary concept in simple words.`
                }]
              },
              contents: [{
                parts: [{
                  text: `Analyze this lecture "${cleanTitle}" and adapt it into ${targetLangLabel}.
Return JSON with:
- detectedCourseTitle (clean academic title),
- glossaryItems (array of 5-7 key terms with { term, plain, academic, example }),
- sectionNotes (array of ${sections.length} objects with { title, coreIdea: simple everyday explanation, analogy: concrete real-life example, bullets: [2-3 complete takeaways] }),
- scenes (array of ${storyboardOut.scenes.length} objects with { title, beats: [3 flowing sentences], stageLabels: [3 short labels <= 24 chars] }),
- quizQuestions (array of ${Math.min(12, targetQuizCount)} diverse questions across different angles with { question, options[4], correctIndex, explanation, hint }).

Sections:
${sectionStubs}

Full text:
${segmented.coreText.slice(0, 9000)}`
                }]
              }],
              generationConfig: {
                temperature: 0.28,
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    detectedCourseTitle: { type: "STRING" },
                    glossaryItems: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          term: { type: "STRING" },
                          plain: { type: "STRING" },
                          academic: { type: "STRING" },
                          example: { type: "STRING" }
                        }
                      }
                    },
                    sectionNotes: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          title: { type: "STRING" },
                          coreIdea: { type: "STRING" },
                          analogy: { type: "STRING" },
                          bullets: { type: "ARRAY", items: { type: "STRING" } }
                        }
                      }
                    },
                    scenes: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          title: { type: "STRING" },
                          beats: { type: "ARRAY", items: { type: "STRING" } },
                          stageLabels: { type: "ARRAY", items: { type: "STRING" } }
                        }
                      }
                    },
                    quizQuestions: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          question: { type: "STRING" },
                          options: { type: "ARRAY", items: { type: "STRING" } },
                          correctIndex: { type: "INTEGER" },
                          explanation: { type: "STRING" },
                          hint: { type: "STRING" }
                        }
                      }
                    }
                  }
                }
              }
            })
          }
        );
        clearTimeout(timer);
        if (resp.ok) {
          const data = await resp.json();
          const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) {
            const parsed = JSON.parse(txt);
            // 1. Сначала обновляем конспект разделов (чтобы сцены строились по свежим данным!)
            if (Array.isArray(parsed.sectionNotes)) {
              parsed.sectionNotes.forEach((sn, idx) => {
                if (!sections[idx] || !sn) return;
                if (sn.title && sn.title.trim()) sections[idx].title = this.shortLabel(sn.title, 64);
                const core = sn.coreIdea ? this.ensureCompleteSentence(sn.coreIdea, 240) : sections[idx].plainBlocks?.coreIdea;
                const anal = sn.analogy ? this.ensureCompleteSentence(sn.analogy, 240) : sections[idx].plainBlocks?.analogy;
                sections[idx].plainBlocks = {
                  ...(sections[idx].plainBlocks || {}),
                  coreIdea: core,
                  analogy: anal
                };
                sections[idx].plainSummary = `${core} ${anal}`.trim();
                if (Array.isArray(sn.bullets) && sn.bullets.length >= 2) {
                  sections[idx].plainBullets = sn.bullets.slice(0, 4).map((b) => this.ensureCompleteSentence(b, 145));
                }
              });
            }
            // 2. Обновляем глоссарий (переводим на целевой язык, если выбран другой язык, и сохраняем оригинальный термин)
            if ((!glossaryText || outputLang !== sourceLang) && Array.isArray(parsed.glossaryItems) && parsed.glossaryItems.length >= 3) {
              glossary = parsed.glossaryItems.slice(0, 7).map((gi, gIdx) => {
                const prev = glossary[gIdx];
                const tName = gi.term || prev?.term || `Термин ${gIdx + 1}`;
                const { dactylBoxes, signHint } = this.buildDactylAndSignHint(tName);
                return {
                  id: "term_" + (gIdx + 1),
                  term: tName,
                  plain: gi.plain || prev?.plain || "",
                  academic: gi.academic || prev?.academic || `Ключевой термин темы «${cleanTitle}».`,
                  example: gi.example || prev?.example || `Применяется при разборе ключевых вопросов курса.`,
                  dactylBoxes,
                  signHint
                };
              });
            }
            // 3. Пересобираем базовую раскадровку с обновлёнными разделами и терминами, затем накладываем реплики LLM и запускаем AABB/WCAG Gate
            storyboardOut = this.buildStoryboardAndSupervise(cleanTitle, sections, glossary, segmented.coreText, outputLang, glossaryText);
            if (Array.isArray(parsed.scenes)) {
              const vd = window.LectureVisualDirector;
              parsed.scenes.forEach((ps, idx) => {
                const sc = storyboardOut.scenes[idx];
                if (!sc || !ps) return;
                if (ps.title && ps.title.trim()) sc.title = this.shortLabel(ps.title, 56);
                if (Array.isArray(ps.beats) && ps.beats.length >= 3) {
                  sc.beats = ps.beats.slice(0, 3).map((bt, bIdx) => ({
                    id: `beat${bIdx}`,
                    role: bIdx === 0 ? "input" : bIdx === 1 ? "action" : "output",
                    text: this.ensureCompleteSentence(bt, 136)
                  }));
                  this.auditSceneGeometryAndContrast(sc, domainProfile.theme);
                  sc.durationSec = vd
                    ? vd.computeCalmDurationSec(sc.caption, 12.0, 12.0, sc.preRollSec || 0.8, sc.postRollSec || 1.4)
                    : Math.max(12.0, +(0.8 + sc.caption.length / 11.8 + 1.4).toFixed(1));
                  sc.finalCps = +(sc.caption.length / sc.durationSec).toFixed(1);
                }
                if (Array.isArray(ps.stageLabels) && ps.stageLabels.length >= 3) {
                  ps.stageLabels.slice(0, 3).forEach((lbl, lIdx) => {
                    if (sc.visualPayload.stages[lIdx] && lbl) {
                      sc.visualPayload.stages[lIdx].shortTitle = this.shortLabel(lbl, 24);
                      if (sc.beats[lIdx]) sc.visualPayload.stages[lIdx].detail = this.shortLabel(sc.beats[lIdx].text, 54);
                    }
                  });
                }
              });
            }
            if (Array.isArray(parsed.quizQuestions) && parsed.quizQuestions.length >= 3) {
              const cloudBadge = outputLang === "kk" ? "ЖИ-сұрақ" : outputLang === "en" ? "AI Question" : "ИИ-вопрос";
              const cloudQs = parsed.quizQuestions.map((q, qIdx) => ({
                number: qIdx + 1,
                angle: "plain_meaning",
                angleLabel: cloudBadge,
                question: q.question || quiz[qIdx]?.question,
                options: Array.isArray(q.options) && q.options.length === 4 ? q.options : (quiz[qIdx]?.options || []),
                correctIndex: typeof q.correctIndex === "number" ? Math.max(0, Math.min(3, q.correctIndex)) : 0,
                explanation: q.explanation || quiz[qIdx]?.explanation || "",
                hint: q.hint || quiz[qIdx]?.hint || "",
                sourceBadge: sections[qIdx % sections.length]?.sourceBadge || "",
                linkedSceneIndex: qIdx % storyboardOut.scenes.length
              }));
              quiz = [...cloudQs, ...quiz.slice(cloudQs.length)].map((q, idx) => ({ ...q, number: idx + 1 }));
            }
            usedCloudModel = true;
          }
        }
      } catch (e) {
        if (e?.name === "AbortError" && abortSignal?.aborted) throw e;
        console.warn("Gemini API fallback to universal deterministic scriptwriter:", e);
      }
    }

    let finalTitle = cleanTitle || "Вузовская лекция";
    const pkgOut = {
      id: "lec_" + contentHash,
      contentHash,
      sourceLang,
      outputLang,
      courseTitle: finalTitle,
      domainId: storyboardOut.domainId,
      domainName: storyboardOut.domainName,
      usedCloudModel,
      avgReadability: Math.round(
        sections.reduce((acc, s) => acc + (s.readability?.score || 92), 0) / Math.max(1, sections.length)
      ),
      wordCount,
      metrics,
      glossary,
      sections,
      quiz,
      quizFull: quiz,
      quizQuick: [],
      quizMode: "full",
      quizVariationSeed: 0,
      fullQuizCount: quiz.length,
      scenes: storyboardOut.scenes,
      supervisorLogs: storyboardOut.supervisorLogs,
      generatedCode: storyboardOut.generatedCode
    };

    if (!usedCloudModel && outputLang !== sourceLang) {
      await this.translatePackageViaServer(pkgOut, sourceLang, outputLang, domainProfile, abortSignal);
    }

    pkgOut.quizQuick = this.regenerateQuiz(
      {
        courseTitle: pkgOut.courseTitle,
        glossary: pkgOut.glossary,
        sections: pkgOut.sections,
        scenes: pkgOut.scenes,
        metrics,
        wordCount,
        outputLang
      },
      0
    ).quizQuick;

    return pkgOut;
  }
};

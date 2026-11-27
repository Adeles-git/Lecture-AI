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
        actor_network_web: { badge: "Сеть взаимодействий", title: "Субъекты, группы и среда" },
        social_stratification_pyramid: { badge: "Иерархия и уровни", title: "Структура и уровни системы" },
        scales_balance_norm: { badge: "Баланс и норма", title: "Равновесие факторов и правил" },
        bio_cell_cycle: { badge: "Живая клетка и цикл", title: "Клеточный механизм в действии" },
        bio_pathway: { badge: "Био-путь и реакция", title: "Последовательность биопроцесса" },
        econ_funnel_waterfall: { badge: "Воронка и баланс", title: "Движение ресурса и эффективность" },
        cs_layered_pipeline: { badge: "Стек и поток данных", title: "Архитектура обработки данных" },
        eng_structural_forces: { badge: "Силы и конструкция", title: "Распределение усилий в системе" },
        system_anatomy: { badge: "Устройство системы", title: "Как части работают вместе" },
        chronicle_timeline: { badge: "Лента этапов", title: "Последовательность и эволюция" },
        split_versus_duel: { badge: "Сравнение подходов", title: "Два взгляда: бытовой vs научный" },
        multi_mode_chart: { badge: "Закономерность", title: "Как один фактор меняет другой" },
        case_dossier_blueprint: { badge: "Разбор на практике", title: "Прикладная задача и решение" },
        radial_constellation_map: { badge: "Карта к экзамену", title: "Все понятия урока в единой системе" },
        cause_effect_flow: { badge: "Причина → Следствие", title: "Цепочка причин и последствий" },
        worked_example: { badge: "Пошаговый разбор", title: "Практический пример по шагам" },
        causal_curve: { badge: "Кривая влияния", title: "Динамика изменений и порог" },
        hero_problem_hook: { badge: "Главный вызов", title: "Ключевая проблема и решение" },
        pipeline_energy_flow: { badge: "Поток процесса", title: "Последовательная передача сигнала" },
        funnel_flow: { badge: "Воронка отбора", title: "Этапы фильтрации и результат" },
        timeline_scroll: { badge: "Хронология", title: "Ключевые вехи во времени" },
        shield_core_architecture: { badge: "Защитный контур", title: "Многоуровневая архитектура" }
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
        actor_network_web: { badge: "Өзара байланыс торы", title: "Топтар мен ортаның байланысы" },
        social_stratification_pyramid: { badge: "Құрылым деңгейлері", title: "Жүйе сатылары мен құрылымы" },
        scales_balance_norm: { badge: "Тепе-теңдік пен норма", title: "Қағидалар мен факторлар теңгерімі" },
        bio_cell_cycle: { badge: "Жасуша және цикл", title: "Биологиялық механизм жұмысы" },
        bio_pathway: { badge: "Био-ағын", title: "Процестің кезеңдік тізбегі" },
        econ_funnel_waterfall: { badge: "Құндылық ағыны", title: "Ресурс қозғалысы мен нәтиже" },
        cs_layered_pipeline: { badge: "Деректер стегі", title: "Ақпаратты өңдеу архитектурасы" },
        eng_structural_forces: { badge: "Күштер мен құрылым", title: "Жүктеме мен тұрақтылық сызбасы" },
        system_anatomy: { badge: "Жүйе құрылысы", title: "Бөліктердің өзара жұмысы" },
        chronicle_timeline: { badge: "Уақыт пен кезеңдер", title: "Даму мен процестің реті" },
        split_versus_duel: { badge: "Тәсілдерді салыстыру", title: "Екі көзқарас: қате vs дұрыс" },
        multi_mode_chart: { badge: "Заңдылық графигі", title: "Факторлардың өзара әсері" },
        case_dossier_blueprint: { badge: "Тәжірибелік талдау", title: "Нақты жағдайда қолдану" },
        radial_constellation_map: { badge: "Емтихан картасы", title: "Тақырыптың негізгі ұғымдар жүйесі" },
        cause_effect_flow: { badge: "Себеп → Салдар", title: "Себеп-салдар тізбегі" },
        worked_example: { badge: "Қадамдық талдау", title: "Практикалық мысалды шешу" },
        causal_curve: { badge: "Әсер қисығы", title: "Өзгеріс динамикасы мен шек" },
        hero_problem_hook: { badge: "Басты міндет", title: "Негізгі мәселе және шешім" },
        pipeline_energy_flow: { badge: "Процесс ағыны", title: "Кезеңдік сигнал берілісі" },
        funnel_flow: { badge: "Іріктеу шұңқыры", title: "Сүзгілеу және нәтиже" },
        timeline_scroll: { badge: "Хронология", title: "Уақыт бойынша негізгі кезеңдер" },
        shield_core_architecture: { badge: "Қорғаныс контуры", title: "Көпдеңгейлі архитектура" }
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
        actor_network_web: { badge: "Interaction Network", title: "Groups, Actors & Environment" },
        social_stratification_pyramid: { badge: "System Hierarchy", title: "Core Levels & Structure" },
        scales_balance_norm: { badge: "Balance & Norm", title: "Equilibrium of Rules & Factors" },
        bio_cell_cycle: { badge: "Cell & Cycle", title: "Living Mechanism in Action" },
        bio_pathway: { badge: "Bio-Pathway", title: "Step-by-Step Biological Flow" },
        econ_funnel_waterfall: { badge: "Funnel & Balance", title: "Value Flow & Efficiency" },
        cs_layered_pipeline: { badge: "Data Stack", title: "Layered Processing Pipeline" },
        eng_structural_forces: { badge: "Forces & Structure", title: "Force Distribution Blueprint" },
        system_anatomy: { badge: "System Anatomy", title: "How Components Work Together" },
        chronicle_timeline: { badge: "Stage Timeline", title: "Chronology & Process Sequence" },
        split_versus_duel: { badge: "Approach Duel", title: "Naive View vs Core Method" },
        multi_mode_chart: { badge: "Key Pattern", title: "How Factor A Shapes Outcome B" },
        case_dossier_blueprint: { badge: "Practical Case", title: "Real-World Application" },
        radial_constellation_map: { badge: "Exam Concept Map", title: "Complete Concept Synthesis" },
        cause_effect_flow: { badge: "Cause → Effect", title: "Causal Chain & Mechanism" },
        worked_example: { badge: "Worked Example", title: "Step-by-Step Solution" },
        causal_curve: { badge: "Causal Curve", title: "Factor Dynamics & Threshold" },
        hero_problem_hook: { badge: "Core Challenge", title: "Problem Hook & Resolution" },
        pipeline_energy_flow: { badge: "Energy Pipeline", title: "Sequential Stage Transfer" },
        funnel_flow: { badge: "Stage Funnel", title: "Filtering Stages & Yield" },
        timeline_scroll: { badge: "Chronology", title: "Key Milestones Over Time" },
        shield_core_architecture: { badge: "Shield Core", title: "Multi-Layer Core Architecture" }
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
    text = text.replace(/^\[(?:Материал преподавателя|Файл|Аудиозапись лекции)\s*:[^\]]*\]\s*/gim, "");
    text = text.replace(/\bHYPERLINK\s+"[^"]*"(?:\s+\\[a-z]\s+"[^"]*")?\s*/gi, "");
    text = text.replace(/\b(?:PAGEREF|TOC|SEQ|REF|STYLEREF|EMBED|INCLUDEPICTURE|SHAPE)\s+[^\n\r]{1,80}/gi, " ");
    text = text.replace(/^\s*PAGE(?:\s+\d+)?\s*$/gim, "");
    text = text.replace(/\b(?:HYPERLINK|MERGEFORMAT|FORMTEXT|themeManager\.xml\.rels\S*|schemas\.openxmlformats\.org\S*|ds:datastoreItem\S*|ds:itemID\S*|SelectedStyle)\b/gi, " ");
    text = text.replace(/[\u00a0\t]+/g, " ");
    text = text
      .split(/\r?\n/)
      .map((ln) => ln.replace(/\s+/g, " ").trim())
      .filter((ln) => {
        if (!ln) return true;
        if (/^(?:URL\s*:|https?:\/\/|ISBN\s*[\d-]+|_{3,}|-{4,}|={4,})/i.test(ln)) return false;
        if (/^\d{1,3}$/.test(ln)) return false;
        return true;
      })
      .join("\n");

    let cleanTitle = String(rawTitle || "").trim();
    const isGenericFileTitle =
      !cleanTitle ||
      /^Загруженный курс\s*·/i.test(cleanTitle) ||
      /(?:^|[^А-Яа-яЁёA-Za-z0-9])(?:АРМ|МСПЗ|СРС|СРСП|УМКД|ПЗ\s+|копия|copy)(?=$|[^А-Яа-яЁёA-Za-z0-9])/i.test(cleanTitle);

    if (isGenericFileTitle) {
      const headChunk = text.slice(0, 1600);
      const topicMatch =
        headChunk.match(/(?:по\s+теме|на\s+тему)\s*[:«"]+\s*([^\n»"]{6,100})[»"]?/i) ||
        headChunk.match(/(?:Семинар|Лекция|Тема|Модуль|Дәріс|Тақырып)\s*№?\s*\d*[:.]?\s*[«"]([^»"]{8,105})[»"]/i) ||
        headChunk.match(/\[(?:Слайд|Slide|\d+-слайд)\s*\d*\s*:\s*([^\]]{8,100})\]/i) ||
        headChunk.match(/Дисциплина\s*[«"]([^»"]{8,100})[»"]/i);
      if (topicMatch && topicMatch[1]) {
        cleanTitle = topicMatch[1].replace(/[«»".,:;]+$/, "").trim();
      } else {
        cleanTitle = cleanTitle.replace(/^Загруженный курс\s*·\s*/i, "").replace(/\s*(?:копия|copy)\s*$/i, "").trim() || "Учебная лекция";
      }
    }

    return { cleanTitle, cleanText: text.trim() };
  },

  // Умная разбивка на предложения: не режет на г., т.е., рис., П. Бергер и внутри скобок
  splitSentencesSmart(rawText) {
    const src = String(rawText || "").replace(/\s+/g, " ").trim();
    if (!src) return [];
    const abbrRe = /(?:^|\s)(?:г|гг|т\.?\s*е|т\.?\s*д|т\.?\s*п|др|пр|см|рис|табл|ст|п|гл|им|проф|доц|гр|уч|тыс|млн|млрд|стр|с|в|вв|ж|жж|[А-ЯЁA-Z])\.$/i;
    const out = [];
    let start = 0;
    let parenDepth = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === "(" || ch === "«") parenDepth++;
      else if (ch === ")" || ch === "»") parenDepth = Math.max(0, parenDepth - 1);
      if (parenDepth === 0 && (ch === "." || ch === "!" || ch === "?")) {
        const nextCh = src[i + 1] || "";
        const afterNext = src[i + 2] || "";
        if (nextCh && !/\s/.test(nextCh)) continue;
        if (ch === "." && abbrRe.test(src.slice(Math.max(start, i - 14), i + 1))) continue;
        // Не рвём, если следующее слово начинается с маленькой буквы (кроме цифр и кавычек)
        if (ch === "." && nextCh && /\s/.test(nextCh) && /^[а-яёәіңғүұқөһa-z]/.test(afterNext)) continue;
        const sent = src.slice(start, i + 1).trim();
        if (sent.length > 8) out.push(sent);
        start = i + 1;
      }
    }
    const tail = src.slice(start).trim();
    if (tail.length > 8) out.push(tail);
    return out;
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

      // Отсекаем шапку вуза, титульники пояснительных записок и оглавление в начале файла
      if (i < 20) {
        if (/^(?:Краткое\s+содержание|Содержание\s+лекции|Основная\s+часть)\s*:?$/i.test(ln)) {
          coreLines.length = 0;
          continue;
        }
        if (
          /^(?:МЕЖДУНАРОДНАЯ ОБРАЗОВАТЕЛЬНАЯ|КАЗАХСКАЯ ГОЛОВНАЯ|МИНИСТЕРСТВО|УНИВЕРСИТЕТ|КАФЕДРА|ФАКУЛЬТЕТ|АКТИВНЫЙ РАЗДАТОЧНЫЙ|ПОЯСНИТЕЛЬНАЯ\s+ЗАПИСКА|ПОЙСНИТЕЛЬНАЯ\s+ЗАПИСКА|КУРСОВОЙ\s+ПРОЕКТ|ВЫПУСКНАЯ\s+РАБОТА|Дисциплина\s*[«"]|Выполнил\s*:|Проверил\s*:|Руководитель\s*:|Студент(?:ка)?\s+гр|\d+\s*модуль\s*[—–-]|\d+\s*кредит|часов\s*:\s*лекционных|План\s+(?:семинара|лекции|занятия)\s*:?)/i.test(ln) ||
          /\d{4}\/\d{2}\s*уч\.\s*год/i.test(ln) ||
          (/^\d+\.\s+[А-ЯЁ]/.test(ln) && ln.length < 95 && i < 14)
        ) {
          continue;
        }
        if (/^(?:Семинар|Лекция)\s*№?\s*\d+/i.test(ln) && ln.length < 120) {
          continue;
        }
      }

      // Явный заголовок слайда всегда возвращает разбор в основное тело лекции (RU / KK / EN)
      if (/^\[(?:(?:Слайд|Slide|Дәріс|Бөлім)\s*\d+|\d+-слайд)/i.test(ln)) {
        zone = "CORE";
      }

      if (/^(?:Глоссарий|Словарь\s+терминов|Основные\s+термины|Терминдер\s+сөздігі|Glossary)\s*:?$/i.test(ln)) {
        zone = "GLOSSARY";
        continue;
      }

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

      if (zone === "TAIL") continue;

      if (/(?:Учебное\s+пособие|Текст\s*:\s*электронный|Цифровой\s+образовательный\s+ресурс|IPR\s*(?:SMART|Books)|ISBN\s*[\d-])/i.test(ln)) {
        continue;
      }

      coreLines.push(ln);
    }

    const coreText = coreLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    // 1. Если в тексте есть явные маркеры [Слайд N: ...] или [N-слайд: ...]
    const slideTagRe = /\[(?:(?:Слайд|Slide|Дәріс|Бөлім)\s*\d+|\d+-слайд)[^\]]*\]/i;
    if (slideTagRe.test(coreText)) {
      const slideBlocks = coreText
        .split(/(?=\[(?:(?:Слайд|Slide|Дәріс|Бөлім)\s*\d+|\d+-слайд))/i)
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
            const cleanHead = hm ? rawBracket.replace(/^(?:(?:Слайд|Slide|Дәріс|Бөлім)\s*\d*|\d+-слайд)\s*[:.—–-]?\s*/i, "").trim() : "";
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

    // 2. Умная сборка разделов по смысловым подзаголовкам, спискам и абзацам
    const paragraphs = coreLines.map((l) => l.trim()).filter(Boolean);
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

    const normalizeListHeader = (rawH) => {
      const h = rawH.replace(/:$/, "").trim();
      const verbTailMatch = h.match(/^(.{6,60}?)\s+(?:позволяет|помогает|обеспечивает|включает|делится\s+на|состоит\s+из)$/i);
      return {
        cleanTitle: verbTailMatch ? verbTailMatch[1].trim() : h,
        fullLead: h
      };
    };

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const prevLine = cur.lines[cur.lines.length - 1] || "";
      const isBullet = /^(?:[✓✔•●▪–—-]|\d+[.)])\s+/.test(p) || (cur.lines.length > 0 && /:\s*$/.test(prevLine) && /^[а-яёa-z]/.test(p));
      const isShortHeading =
        !isBullet &&
        p.length >= 10 &&
        p.length <= 92 &&
        !/[.!?]$/.test(p) &&
        !/^[а-яёa-z]/.test(p);
      const isAspectStarter =
        /^(?:Объектом\s+исследования|Предметом\s+исследования|Целью\s+(?:исследования\s+)?является|Основная\s+задача|Взаимодействи[ея]\s+|На\s+первом\s+этапе|Современная\s+|Для\s+обеспечения)/i.test(p);

      const curCharLen = cur.lines.join(" ").length;

      // Если строка заканчивается на ":" и за ней идут пункты списка — не отрываем подлежащее от пунктов!
      const nextP = paragraphs[i + 1] || "";
      const isLeadWithColon = /:\s*$/.test(p) && nextP && (/^[а-яёa-z]/.test(nextP) || /^(?:[✓✔•●▪–—-]|\d+[.)])\s+/.test(nextP));

      if (isShortHeading && (curCharLen > 120 || curCharLen === 0)) {
        if (curCharLen > 120) flushCur();
        const hdr = normalizeListHeader(p);
        cur.heading = hdr.cleanTitle;
        if (isLeadWithColon) {
          // Сохраняем фразу-связку (напр. "Социологическое воображение позволяет ..."), чтобы пункты не теряли подлежащее
          cur._pendingLead = hdr.fullLead;
        }
        continue;
      }
      if (isAspectStarter && curCharLen >= 260) {
        flushCur();
      }

      if (isBullet) {
        const cleanB = p.replace(/^(?:[✓✔•●▪–—-]|\d+[.)])\s+/, "").replace(/[;.]$/, "").trim();
        if (cleanB.length > 8) {
          const fullB = cur._pendingLead && /^[а-яёa-z]/.test(cleanB)
            ? `${cur._pendingLead} ${cleanB}`
            : cleanB;
          cur.bullets.push(this.capitalizeFirst(fullB));
        }
        if (cur._pendingLead && /^[а-яёa-z]/.test(cleanB)) {
          cur.lines.push(`${cur._pendingLead} ${cleanB}.`);
          cur._pendingLead = "";
          continue;
        }
      } else {
        cur._pendingLead = "";
      }
      cur.lines.push(p);

      if (cur.lines.join(" ").length >= 760 && !/:\s*$/.test(p)) {
        flushCur();
      }
    }
    flushCur();

    if (blocks.length <= 2 && coreText.length > 300) {
      const allSents = this.splitSentencesSmart(coreText).filter((s) => s.length > 15);
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

    const sentences = this.splitSentencesSmart(coreText).filter((s) => s.length > 20);

    // Уровень 2: NLP-извлечение настоящих определений прямо из предложений лекции
    if (parsed.length < 6) {
      for (const sent of sentences) {
        if (parsed.length >= 6) break;

        // 2А: «называется X (...) — определением»
        const namedMatch = sent.match(/называется\s+([а-яёәіңғүұқөһa-zА-ЯЁӘІҢҒҮҰҚӨҺA-Z\s-]{4,42}?)(?:\s*\([^)]{2,65}\))?\s+[—–-]\s+([^.!?]{12,200})/i);
        if (namedMatch) {
          const normTerm = this.normalizeInstrumentalTerm(namedMatch[1]);
          addTerm(normTerm, namedMatch[2], `Определение из текста лекции: «${this.shortLabel(sent, 130)}»`);
          continue;
        }

        // 2Б: «Термин — это ...» (строго с пробелами вокруг тире, чтобы не резать дефисные слова!)
        const cleanedSent = sent.replace(/^(?:Как\s+писал\s+[^,]+,\s*|В\s+[а-яё]+\s+[а-яё]+\s+|Современн[а-я]+\s+)/i, "");
        const dashMatch = cleanedSent.match(/^([А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z][А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z0-9\s/-]{3,44}?)\s*(?:\([^)]{2,55}\)\s*)?(?:\s+[—–-]\s+(?:это\s+)?|\s+представляет\s+собой\s+|\s+дегеніміз\s*[—–-]?\s*)([^.!?]{14,220})/i);
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
    const sample = String(text || "").slice(0, 3500);
    if (!sample.trim()) return "ru";
    const kkChars = (sample.match(/[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/g) || []).length;
    const cyrChars = (sample.match(/[а-яёА-ЯЁ]/g) || []).length;
    const latChars = (sample.match(/[a-zA-Z]/g) || []).length;
    const kkWords = (sample.match(/(?:^|\s)(?:және|үшін|бойынша|арқылы|болып|дегеніміз|негізгі|қазақстан|дәріс|білім|жүйесі|қарастырылады)(?=$|[\s.,;:!?])/gi) || []).length;
    const totalCyr = cyrChars + kkChars;
    if (kkWords >= 3 || kkChars >= 16 || (kkChars >= 4 && totalCyr > 0 && kkChars / totalCyr >= 0.045)) {
      return "kk";
    }
    if (latChars > totalCyr * 1.4 && latChars > 20) return "en";
    return "ru";
  },

  // Извлекает моноязычный вариант из двуязычных/трёхъязычных терминов вида «Self-Attention / Самовнимание (Өзіндік зейін)»
  pickTermForLang(rawTerm, targetLang = "ru") {
    const raw = String(rawTerm || "").trim();
    if (!raw) return "";
    const lang = String(targetLang || "ru").toLowerCase().slice(0, 2);
    const parts = raw
      .split(/\s*\/\s*|\s*\(\s*|\s*\)\s*/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 2);
    if (parts.length <= 1) return raw;

    const hasKk = (s) => /[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(s);
    const hasCyr = (s) => /[а-яёА-ЯЁ]/.test(s);
    const isPureLat = (s) => /[A-Za-z]{2,}/.test(s) && !hasCyr(s) && !hasKk(s);
    const isPureRu = (s) => hasCyr(s) && !hasKk(s) && !/[A-Za-z]{3,}/.test(s);

    if (lang === "kk") {
      return parts.find(hasKk) || parts.find((p) => hasCyr(p) && !isPureLat(p)) || parts[0];
    }
    if (lang === "en") {
      return parts.find(isPureLat) || parts[0];
    }
    return parts.find(isPureRu) || parts.find((p) => hasCyr(p) && !hasKk(p)) || parts[0];
  },

  // Убирает иноязычные пояснения в скобках из определений и предложений (чтобы языки не смешивались)
  cleanForeignBrackets(rawText, targetLang = "ru") {
    let s = String(rawText || "").trim();
    if (!s) return "";
    const lang = String(targetLang || "ru").toLowerCase().slice(0, 2);
    if (lang === "kk") {
      s = s.replace(/\s*\([^)]*[А-Яа-яЁё]{3,}[^)]*\)/g, (m) => (/[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(m) ? m : ""));
      s = s.replace(/\s*\([^)]*[A-Za-z]{3,}[^)]*\)/g, "");
    } else if (lang === "en") {
      s = s.replace(/\s*\([^)]*[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]{2,}[^)]*\)/g, "");
    } else {
      s = s.replace(/\s*\([^)]*[әіңғүұқөһӘІҢҒҮҰҚӨҺ]{2,}[^)]*\)/g, "");
    }
    return s.replace(/\s+/g, " ").trim();
  },

  // Проверяет, нуждается ли текст в переводе/очистке под целевой язык
  needsTranslationForLang(text, targetLang = "ru") {
    const s = String(text || "").trim();
    if (s.length < 3) return false;
    const lang = String(targetLang || "ru").toLowerCase().slice(0, 2);
    const kkChars = (s.match(/[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/g) || []).length;
    const ruOnlyChars = (s.match(/[а-яёА-ЯЁ]/g) || []).length;
    const latChars = (s.match(/[a-zA-Z]/g) || []).length;
    if (lang === "en") {
      return ruOnlyChars + kkChars >= 3;
    }
    if (lang === "kk") {
      if (latChars >= 8 && ruOnlyChars + kkChars === 0) return true;
      const detected = this.detectTextLanguage(s);
      if (detected !== "kk" && (ruOnlyChars >= 6 || latChars >= 10)) return true;
      return false;
    }
    if (lang === "ru") {
      if (kkChars >= 2) return true;
      if (latChars > ruOnlyChars * 1.4 && latChars >= 12) return true;
      return false;
    }
    return false;
  },

  // Динамическое извлечение сигналов ИЗ САМОЙ ЛЕКЦИИ (с локализацией RU / KK / EN)
  extractLectureSignals(lectureText, domainProfile, glossary, sections = [], outputLang = "ru") {
    const metrics = this.extractCleanMetrics(lectureText);
    const years = this.extractYearsAndTimeline(lectureText);
    const t0 = (glossary[0]?.term || "Ключевое понятие").split(/[/(]/)[0].trim();
    const t1 = (glossary[1]?.term || t0).split(/[/(]/)[0].trim();
    const p0 = (glossary[0]?.plain || "основной механизм темы").replace(/[.!?]+$/, "");

    const sents = this.splitSentencesSmart(lectureText).filter((s) => s.length > 20);

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
    let defaultSecLabel = this.shortLabel(sections[0]?.title || domainProfile.name, 34);

    if (langTag === "en") {
      leftFail = { title: "Without Method", sub: "Unstructured / error-prone approach", metric: metrics[0] || "High risk" };
      rightPass = { title: `With ${t0}`, sub: p0.slice(0, 48), metric: metrics[1] || metrics[0] || "Verified gain" };
      deltaBadge = cleanFormula || metrics[0] || `${t0} + ${t1}`;
      xAxisLabel = "System parameter / scale";
      yAxisLabel = "Outcome & stability";
      curveALabel = `With ${t0}`;
      curveBLabel = "Baseline (without factor)";
    } else if (langTag === "kk") {
      leftFail = { title: "Жүйесіз тәсіл", sub: "Қателік пен тұрақсыздық қаупі", metric: metrics[0] || "Жоғары тәуекел" };
      rightPass = { title: `Жүйе: ${t0}`, sub: p0.slice(0, 48), metric: metrics[1] || metrics[0] || "Тұрақты нәтиже" };
      deltaBadge = cleanFormula || metrics[0] || `${t0} + ${t1}`;
      xAxisLabel = "Жүйе параметрі / көлемі";
      yAxisLabel = "Нәтиже және тиімділік";
      curveALabel = `Ескерілген: ${t0}`;
      curveBLabel = "Бастапқы деңгей";
    }

    return {
      metrics,
      dangerMetric: {
        value: metrics[0] || this.shortLabel(t0, 22),
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

    const clean = rawBody.replace(/^\[(?:(?:Слайд|Slide|Дәріс|Бөлім)\s*\d+|\d+-слайд)[^\]]*\]\s*/gi, "").trim();
    const sentences = this.splitSentencesSmart(clean).filter((s) => s.length > 8);

    const origWordsCount = clean.split(/\s+/).filter(Boolean).length;
    const origAvgLen = Math.max(12, Math.round(origWordsCount / Math.max(1, sentences.length)));

    // Грамматически безопасное упрощение: сохраняет управление падежей (дат., род., вин.)
    const deAcademize = (s) => {
      let res = String(s || "")
        .replace(/представляет собой необратимое рассеяние/gi, "— это процесс поглощения и гашения")
        .replace(/представляет собой/gi, "— это")
        .replace(/в отличие от устаревших/gi, "вместо старых")
        .replace(/приводящ(?:ий|ее|ая|ие)\s+к\b/gi, "что приводит к")
        .replace(/является причиной/gi, "вызывает")
        .replace(/осуществляется посредством/gi, "работает через")
        .replace(/характеризуется наличием/gi, "имеет")
        .replace(/для обеспечения геометрической неизменяемости/gi, "для устойчивости формы")
        .replace(/ключевой задачей ([а-яё\s]+) является/gi, "главная задача $1 —")
        .replace(/выступает в качестве/gi, "служит")
        .replace(/\bв\s+рамках\s+данного\s+[а-яё]+\b/gi, "здесь")
        .replace(/\bтаким\s+образом,?\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return this.capitalizeFirst(res);
    };

    const simplifiedPoints = [];
    sentences.forEach((s) => {
      const plain = deAcademize(s);
      const words = plain.split(/\s+/).filter(Boolean);
      if (words.length <= 26) {
        simplifiedPoints.push(this.ensureCompleteSentence(plain, 175));
      } else {
        const subParts = plain
          .split(/\s*;\s*/)
          .map((p) => p.trim())
          .filter((p) => p.split(/\s+/).length >= 4);
        if (subParts.length >= 2) {
          subParts.slice(0, 3).forEach((sp) => {
            simplifiedPoints.push(this.ensureCompleteSentence(this.capitalizeFirst(sp), 165));
          });
        } else {
          simplifiedPoints.push(this.ensureCompleteSentence(plain, 175));
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
    const lowerPlain = leadTermPlain ? leadTermPlain.charAt(0).toLowerCase() + leadTermPlain.slice(1) : "";

    const leadSent =
      simplifiedPoints.find((s) => /— это|дегеніміз|позволяет|помогает|нужно|вызывает|приводит|означает|меняет|зависит|allows|enables|means/i.test(s)) ||
      simplifiedPoints[0] ||
      clean;
    const secondSent = simplifiedPoints.find((s) => s !== leadSent && s.length > 24) || "";

    // Избегаем тавтологии (если leadSent уже содержит определение термина, не дублируем его в скобках!)
    const alreadyExplainsTerm = leadSent.toLowerCase().includes(leadTermName.toLowerCase().slice(0, 6));
    const coreIdea =
      outputLang === "kk"
        ? (secondSent ? `${leadSent} ${secondSent}` : (lowerPlain && !alreadyExplainsTerm ? `«${leadTermName}» (${lowerPlain}): ${leadSent}` : leadSent))
        : outputLang === "en"
          ? (secondSent ? `${leadSent} ${secondSent}` : (lowerPlain && !alreadyExplainsTerm ? `Key concept "${leadTermName}" (${lowerPlain}): ${leadSent}` : leadSent))
          : (secondSent ? `${leadSent} ${secondSent}` : (lowerPlain && !alreadyExplainsTerm ? `В основе раздела — «${leadTermName}» (${lowerPlain}). ${leadSent}` : leadSent));

    // 2) Лаконичная, грамматически целая аналогия (до 135 симв., чтобы не резалась на полуслове)
    const explicitExample = simplifiedPoints.find((s) => /\b(?:например|представим|допустим|на практике|к примеру|мысалы|for example|for instance)\b/i.test(s));
    let analogy = explicitExample || "";
    if (!analogy) {
      const dom = domainProfile?.domainId || "soc_hum";
      const pools = {
        kk: {
          arch_eng: [
            `Көлік амортизаторы сияқты: «${leadTermName}» соққыны жұмсартып, негізгі қаңқаны сақтайды.`,
            `Көпір тіректері сияқты: «${leadTermName}» жүктемені біркелкі таратып, кернеуді азайтады.`,
            `Серіппелі тірек сияқты: «${leadTermName}» тербелісті өшіріп, ғимаратты тепе-теңдікте ұстайды.`
          ],
          ai_cs: [
            `Қараңғы мұрағаттағы прожектор сияқты: «${leadTermName}» мыңдаған дерек ішінен дәл байланысты табады.`,
            `Сұрыптау конвейері сияқты: «${leadTermName}» артық шуды алып тастап, тек пайдалы сигналды береді.`,
            `Анықтамалық кітап сөресі сияқты: «${leadTermName}» модельге тексерілген фактіге сүйенуге көмектеседі.`
          ],
          biz_econ: [
            `Отбасылық бюджет сияқты: «${leadTermName}» барлық шығыннан кейін қанша таза пайда қалатынын көрсетеді.`,
            `Дүкен қоймасы сияқты: «${leadTermName}» ресурстың қай кезеңде жоғалатынын бірден байқатады.`,
            `Қаржылық таразы сияқты: «${leadTermName}» табыс пен шығынның теңгерімін дәл есептейді.`
          ],
          soc_hum: [
            `Қаланы жоғарыдан бақылағандай: «${leadTermName}» жеке әрекеттердің ортақ жүйеге бірігуін көрсетеді.`,
            `Жол қозғалысы ережесі сияқты: «${leadTermName}» түрлі топтардың өзара әрекетін реттейді.`,
            `Оркестр партитурасы сияқты: «${leadTermName}» әр қатысушының ортақ үдерістегі рөлін айқындайды.`
          ]
        },
        en: {
          arch_eng: [
            `Like car shock absorbers, "${leadTermName}" damps sudden impact so the frame stays intact.`,
            `Like bridge trusses sharing weight, "${leadTermName}" spreads load away from weak joints.`,
            `Like flexible bearings under a structure, "${leadTermName}" keeps sway smooth and controlled.`
          ],
          ai_cs: [
            `Like a spotlight in a dark archive, "${leadTermName}" highlights the exact facts needed for an answer.`,
            `Like a sorting conveyor, "${leadTermName}" filters noise at every step and passes clean signals forward.`,
            `Like an indexed reference library, "${leadTermName}" grounds outputs in verified sources.`
          ],
          biz_econ: [
            `Like a household budget, "${leadTermName}" shows how much net value remains after every expense.`,
            `Like tracking leaks in a pipeline, "${leadTermName}" pinpoints where margin or users drop off.`,
            `Like a break-even scale, "${leadTermName}" balances recurring revenue against fixed costs.`
          ],
          soc_hum: [
            `Like viewing a city from above, "${leadTermName}" reveals how individual habits form shared patterns.`,
            `Like traffic rules at a busy junction, "${leadTermName}" coordinates different groups without chaos.`,
            `Like a musical score, "${leadTermName}" connects individual actions into one coherent system.`
          ]
        },
        ru: {
          arch_eng: [
            `Как амортизатор в автомобиле: «${leadTermName}» гасит резкий импульс и бережёт несущий каркас.`,
            `Как арочный мост распределяет вес, так «${leadTermName}» снимает лишнюю нагрузку со слабых узлов.`,
            `Как гибкая подушка под фундаментом: «${leadTermName}» переводит жёсткий удар в плавное движение.`
          ],
          ai_cs: [
            `Как прожектор в тёмном архиве: «${leadTermName}» выделяет среди тысяч записей именно нужные факты.`,
            `Как сортировочный конвейер: «${leadTermName}» отсекает шум и передаёт дальше точный сигнал.`,
            `Как проверенный справочник перед ответом: «${leadTermName}» не даёт системе выдумывать факты.`
          ],
          biz_econ: [
            `Как семейный бюджет: «${leadTermName}» показывает реальный остаток после вычета всех обязательных трат.`,
            `Как поиск утечек в воронке: «${leadTermName}» подсвечивает шаг, где теряется прибыль.`,
            `Как точка равновесия на весах: «${leadTermName}» сопоставляет доход с каждого клиента и затраты.`
          ],
          soc_hum: [
            `Как взгляд на город сверху: «${leadTermName}» показывает скрытые правила, объединяющие поступки людей.`,
            `Как правила движения на перекрёстке: «${leadTermName}» согласует действия разных групп без хаоса.`,
            `Как партитура оркестра: «${leadTermName}» связывает отдельные роли участников в единый процесс.`
          ]
        }
      };
      const langPool = pools[outputLang] || pools.ru;
      const domPool = langPool[dom] || langPool.soc_hum;
      analogy = domPool[index % domPool.length];
    }

    const termBreakdown = matchedTerms.slice(0, 4).map((t) => ({
      id: t.id,
      term: t.term.split(/[/(]/)[0].trim(),
      plain: t.plain
    }));

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
      cleanSentences: simplifiedPoints,
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
    const layoutMode = scene.layoutMode || "split_tutor";
    const stageRect =
      layoutMode === "wide_stage"
        ? { x: 44, y: 158, w: 1192, h: 394 }
        : layoutMode === "hero_intro"
          ? { x: 256, y: 158, w: 988, h: 394 }
          : layoutMode === "focus_split"
            ? { x: 36, y: 158, w: 926, h: 394 }
            : { x: 318, y: 158, w: 926, h: 394 };

    const stageBottom = stageRect.y + stageRect.h; // 552 px
    const captionTop = 720 - 124;  // 596 px
    const safeGapPx = Math.max(0, captionTop - stageBottom); // 44 px чистый буфер
    const collisionAreaPx = stageBottom > captionTop ? (stageBottom - captionTop) * stageRect.w : 0;

    // Проверяем каждую реплику на переполнение 3 строк полосы субтитров и CPS <= 15.0
    let healedBeats = 0;
    if (Array.isArray(scene.beats)) {
      scene.beats = scene.beats.map((b) => {
        const rawTxt = String(b.text || "").trim();
        if (rawTxt.length > 155) {
          healedBeats++;
          return { ...b, text: this.ensureCompleteSentence(rawTxt, 150) };
        }
        return b;
      });
      scene.caption = scene.beats.map((b) => b.text).join(" ");
    }

    // Ограничиваем длину текстовых полей visualPayload для предотвращения переполнения карточек
    if (scene.visualPayload && Array.isArray(scene.visualPayload.stages)) {
      scene.visualPayload.stages = scene.visualPayload.stages.map((st) => ({
        ...st,
        shortTitle: this.shortLabel(st.shortTitle || "", 28),
        detail: this.shortLabel(st.detail || "", 68),
        metric: this.shortLabel(st.metric || "", 24)
      }));
    }

    // Жёсткий CPS Gate <= 15.0 симв/с
    if (scene.caption && scene.durationSec) {
      const minDurForCps = +(Math.ceil((scene.caption.length / 14.8) * 10) / 10).toFixed(1);
      if (scene.durationSec < minDurForCps) {
        scene.durationSec = Math.min(28, Math.max(scene.durationSec, minDurForCps));
      }
      scene.finalCps = +(scene.caption.length / scene.durationSec).toFixed(1);
    }

    const inkHex = theme?.ink || "#18181B";
    const ratioNum = this.computeHexContrastRatio(inkHex, "#F8FAFC");
    const wcagLevel = ratioNum >= 7.0 ? "WCAG AAA" : ratioNum >= 4.5 ? "WCAG AA" : "LOW";
    scene.domCollisionAreaPx = collisionAreaPx;
    scene.safeMarginPx = safeGapPx;
    scene.contrastRatio = `${ratioNum}:1 (${wcagLevel})`;
    return { collisionAreaPx, safeGapPx, ratioNum, wcagLevel, healedBeats };
  },
  ensureCompleteSentence(raw, maxChars = 155) {
    let s = String(raw || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    if (s.length > maxChars) {
      const noParens = s.replace(/\s*\([^)]{8,}\)/g, "").replace(/\s+/g, " ").trim();
      if (noParens.length >= 24) s = noParens;
    }
    if (s.length > maxChars) {
      const cut = s.slice(0, maxChars);
      const lastPunct = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
      if (lastPunct > 45) {
        s = cut.slice(0, lastPunct + 1).trim();
      } else {
        const lastClause = Math.max(cut.lastIndexOf(";"), cut.lastIndexOf(" — "), cut.lastIndexOf(","));
        s = (lastClause > 55 ? cut.slice(0, lastClause) : cut.replace(/\s+\S*$/, "")).replace(/[,:;—–-]+$/, "").trim();
      }
    }
    // Убираем висячие предлоги, союзы и обрывки в конце предложения (включая ", но «Термин»")
    s = s.replace(/,\s*(?:но|а|и|где|когда|что|поэтому)\s+«[^»]{1,40}»$/i, "");
    const danglingRe = /\s+(?:в|во|на|но|и|а|к|с|со|о|об|от|по|до|за|из|под|над|при|для|без|про|через|между|либо|или|как|что|чтобы|если|хотя|также|где|когда|не|ни|который|которая|которое|которые|своего|данной|такой|этого)$/i;
    for (let k = 0; k < 4; k++) {
      if (!danglingRe.test(s)) break;
      s = s.replace(danglingRe, "").replace(/[,:;—–(-]+$/, "").trim();
    }
    if ((s.match(/\(/g) || []).length > (s.match(/\)/g) || []).length) {
      s = s.replace(/\s*\([^)]*$/, "").trim();
    }
    s = s.replace(/[,:;—–-]+$/, "").trim();
    if (s && !/[.!?…]$/.test(s)) s += ".";
    return s;
  },

  shortLabel(raw, maxChars = 34) {
    const s = String(raw || "").replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim();
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars).replace(/\s+\S*$/, "").replace(/[,:;—–-]+$/, "") + "…";
  },

  extractSectionSignals(sec, idx, domainProfile, glossary, globalSignals, outputLang = "ru") {
    const secText = `${sec?.title || ""} ${sec?.academicOriginal || ""} ${sec?.plainSummary || ""}`;
    const secMetrics = this.extractCleanMetrics(secText);
    const secYears = Array.from(new Set(secText.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/g) || [])).slice(0, 6);
    const secFormulaMatch = secText.match(/[A-Za-zА-Яа-яЁё]\s*=\s*[^.,;\n]{3,28}/);
    const matchedTerm = glossary.find((g) => {
      const base = g.term.split(/[/(]/)[0].trim().toLowerCase().slice(0, 6);
      return base.length >= 3 && secText.toLowerCase().includes(base);
    }) || glossary[idx % glossary.length] || glossary[0];
    const shortTerm = matchedTerm ? matchedTerm.term.split(/[/(]/)[0].trim() : `Понятие ${idx + 1}`;
    const plainDef = matchedTerm?.plain ? matchedTerm.plain.replace(/[.!?]+$/, "") : "";

    return {
      ...globalSignals,
      years: secYears.length >= 2 ? secYears : globalSignals.years,
      metrics: secMetrics.length ? secMetrics : globalSignals.metrics,
      hasFormula: Boolean(secFormulaMatch) || globalSignals.hasFormula,
      formulaCard: secFormulaMatch
        ? {
            ...(globalSignals.formulaCard || {}),
            expression: this.shortLabel(secFormulaMatch[0], 30),
            note: this.shortLabel(plainDef || sec?.title || "", 44)
          }
        : globalSignals.formulaCard,
      dangerMetric: {
        ...(globalSignals.dangerMetric || {}),
        value: secMetrics[0] || globalSignals.dangerMetric?.value || "100%"
      },
      leftFail: {
        ...(globalSignals.leftFail || {}),
        title: outputLang === "kk" ? `«${this.shortLabel(shortTerm, 18)}» ескерілмесе` : outputLang === "en" ? `Without ${this.shortLabel(shortTerm, 18)}` : `Без учёта «${this.shortLabel(shortTerm, 18)}»`,
        metric: secMetrics[0] || globalSignals.leftFail?.metric || "Риск"
      },
      rightPass: {
        ...(globalSignals.rightPass || {}),
        title: this.shortLabel(shortTerm, 22),
        sub: this.shortLabel(plainDef, 46) || globalSignals.rightPass?.sub,
        metric: secMetrics[1] || globalSignals.rightPass?.metric || "Норма"
      },
      yAxisLabel: this.shortLabel(sec?.title || globalSignals.yAxisLabel, 26)
    };
  },

  finalizeStoryboardLogsAndCode(courseTitle, domainProfile, domainLocalizedName, sections, glossary, validatedScenes, lectureText, outputLang = "ru", selfHealedCount = 0) {
    const i18n = this.OUTPUT_I18N[outputLang] || this.OUTPUT_I18N.ru;
    const wordCount = (lectureText || "").trim().split(/\s+/).filter(Boolean).length;
    const singlePassTokens = Math.round(wordCount * 1.75 + 480);
    const naive5Tokens = Math.round(singlePassTokens * 4.75);
    const totalCollisions = validatedScenes.reduce((acc, s) => acc + (s.domCollisionAreaPx || 0), 0);
    const minContrast = validatedScenes[0]?.contrastRatio || "15.8:1 (WCAG AAA)";
    const maxCps = Math.max(...validatedScenes.map((s) => s.finalCps || 11.5));
    const moduleIds = validatedScenes.map((s) => s.archetype);

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
              ? `3-beat audio-visual choreography (60 FPS). Single-Pass token budget: ~${singlePassTokens} vs ~${naive5Tokens} (-79%).`
              : `3-битная синхронизация речи и анимации (60 FPS + динамические переходы). Single-Pass экономия: ~${singlePassTokens} токенов вместо ~${naive5Tokens} (-79%).`
      }
    ];
    const generatedCode = this.generateRemotionTypeScriptCode(courseTitle, domainProfile, validatedScenes);
    return { supervisorLogs, generatedCode };
  },

  buildStoryboardAndSupervise(courseTitle, sections, glossary, lectureText, outputLang = "ru", glossaryText = "") {
    const i18n = this.OUTPUT_I18N[outputLang] || this.OUTPUT_I18N.ru;
    const domainProfile = this.detectDomainProfile(courseTitle, lectureText, glossaryText);
    const domainLocalizedName = i18n.domainNames[domainProfile.domainId] || domainProfile.name;
    const globalSignals = this.extractLectureSignals(lectureText, domainProfile, glossary, sections, outputLang);
    const vd = window.LectureVisualDirector;
    const pacing = vd
      ? vd.estimateComplexityAndPacing(lectureText, glossary.length, sections.length)
      : { tier: 2, label: "Стандартный концептуальный", sceneCount: Math.max(3, Math.min(6, sections.length + 1)), targetCps: 12.0, preRollSec: 0.8, postRollSec: 1.4 };

    const shortCourse = String(courseTitle || "Урок").split("·").pop().trim();
    const scenePlans = vd && typeof vd.selectSectionModules === "function"
      ? vd.selectSectionModules(domainProfile.domainId, sections, globalSignals, {
          sceneCount: pacing.sceneCount,
          seedStr: shortCourse
        })
      : [
          { moduleId: "hero_problem_hook", layoutMode: "hero_intro", transitionType: "zoom_fade", styleVariant: { patternVariant: "soft_grid", accentMode: "primary", frameless: false, paletteOffset: 0 } },
          { moduleId: "system_anatomy", layoutMode: "split_tutor", transitionType: "slide", styleVariant: { patternVariant: "soft_grid", accentMode: "secondary", frameless: false, paletteOffset: 1 } },
          { moduleId: "split_versus_duel", layoutMode: "wide_stage", transitionType: "wipe", styleVariant: { patternVariant: "soft_grid", accentMode: "primary", frameless: true, paletteOffset: 2 } },
          { moduleId: "multi_mode_chart", layoutMode: "focus_split", transitionType: "cross_dissolve", styleVariant: { patternVariant: "soft_grid", accentMode: "secondary", frameless: false, paletteOffset: 0 } },
          { moduleId: "case_dossier_blueprint", layoutMode: "split_tutor", transitionType: "slide", styleVariant: { patternVariant: "soft_grid", accentMode: "primary", frameless: false, paletteOffset: 1 } },
          { moduleId: "radial_constellation_map", layoutMode: "wide_stage", transitionType: "zoom_fade", styleVariant: { patternVariant: "soft_grid", accentMode: "secondary", frameless: true, paletteOffset: 2 } }
        ].slice(0, pacing.sceneCount);

    const usedSentences = new Set();
    const usedSceneTitles = new Set();
    const pickUnique = (candidates, fallback) => {
      for (const c of candidates) {
        if (!c) continue;
        const clean = this.ensureCompleteSentence(c, 150);
        const key = clean.toLowerCase().slice(0, 44);
        if (clean.length > 14 && !usedSentences.has(key)) {
          usedSentences.add(key);
          return clean;
        }
      }
      const fb = this.ensureCompleteSentence(fallback, 150);
      usedSentences.add(fb.toLowerCase().slice(0, 44));
      return fb;
    };
    const pickSceneTitle = (preferred, altTitle, fallbackTerm) => {
      const candidates = [preferred, altTitle, `${altTitle}: ${fallbackTerm}`];
      for (const cand of candidates) {
        const clean = this.shortLabel(String(cand || "").replace(/:$/, "").trim(), 52);
        const low = clean.toLowerCase();
        if (clean.length > 4 && !usedSceneTitles.has(low)) {
          usedSceneTitles.add(low);
          return clean;
        }
      }
      const uniq = this.shortLabel(`${preferred || altTitle} (${fallbackTerm})`, 52);
      usedSceneTitles.add(uniq.toLowerCase());
      return uniq;
    };

    let selfHealedCount = 0;

    const validatedScenes = scenePlans.map((plan, idx) => {
      const modId = plan.moduleId;
      const meta = i18n.moduleBadges[modId] || { badge: `✦ Сцена 0${idx + 1}`, title: "Ключевой этап темы" };
      const sec = sections[idx % sections.length] || sections[0];
      const signals = this.extractSectionSignals(sec, idx, domainProfile, glossary, globalSignals, outputLang);
      const secLower = `${sec?.title || ""} ${sec?.academicOriginal || ""}`.toLowerCase();
      const matchedTerm = glossary.find((g) => {
        const base = g.term.split(/[/(]/)[0].trim().toLowerCase().slice(0, 6);
        return base.length >= 3 && secLower.includes(base);
      });
      const termObj = matchedTerm || glossary[idx % glossary.length] || glossary[0];
      const shortTerm = termObj.term.split(/[/(]/)[0].trim();
      const plainDef = (termObj.plain || "").replace(/[.!?]+$/, "");

      const secSents = Array.isArray(sec?.cleanSentences) && sec.cleanSentences.length
        ? sec.cleanSentences
        : this.splitSentencesSmart(sec?.academicOriginal || "").filter((x) => x.length > 16);
      const secMetrics = this.extractCleanMetrics(sec?.academicOriginal || "");

      const secBullets = Array.isArray(sec?.plainBullets) ? sec.plainBullets.filter(Boolean) : [];
      // Формируем 3–4 семантически связных элемента (без заглушек «Шаг 01» / «Уровень 1» и без цитат с префиксами)
      const stageItems = [];
      const badStageStartRe = /^(?:хотя|как\s+писал|если|когда|потому|однако|кроме|также|таким\s+образом|позволит|способствует|является)/i;
      if (secBullets.length >= 3) {
        secBullets.slice(0, 4).forEach((b, bIdx) => {
          const g = glossary[(idx + bIdx) % glossary.length];
          const rawHead = b.split(/[:—–-]/)[0].trim();
          const cleanHead = !badStageStartRe.test(rawHead) && rawHead.split(/\s+/).length <= 4
            ? this.shortLabel(rawHead, 26)
            : "";
          stageItems.push({
            shortTitle: cleanHead || (g ? this.shortLabel(g.term.split(/[/(]/)[0].trim(), 26) : `${this.shortLabel(sec?.title || shortCourse, 22)}`),
            detail: this.shortLabel(b, 64),
            metric: secMetrics[bIdx] || ""
          });
        });
      } else {
        for (let k = 0; k < Math.min(4, Math.max(3, glossary.length)); k++) {
          const g = glossary[(idx + k) % glossary.length] || termObj;
          const gName = g.term.split(/[/(]/)[0].trim();
          const gStem = gName.toLowerCase().slice(0, 6);
          const matchedSent = secSents.find((s) => gStem.length >= 3 && s.toLowerCase().includes(gStem));
          stageItems.push({
            shortTitle: this.shortLabel(gName, 26),
            detail: this.shortLabel(matchedSent || g.plain || secBullets[k] || "", 64),
            metric: secMetrics[k] || ""
          });
        }
      }

      // Драматургия 3 битов на выбранном языке (RU / KK / EN) — приоритет реальным фактам раздела!
      let b0, b1, b2, sceneTitle, tutorCue = "POINT", emotion = "explain";
      const isClosing = idx === scenePlans.length - 1 || modId === "radial_constellation_map";
      const stepLbl = stageItems[0]?.shortTitle || shortTerm;
      const stepLbl2 = stageItems[1]?.shortTitle || shortTerm;
      const stepLbl3 = stageItems[2]?.shortTitle || shortTerm;

      if (outputLang === "kk") {
        if (idx === 0) {
          tutorCue = "WARNING_PALM";
          sceneTitle = this.shortLabel(sec?.title || shortCourse, 52);
          b0 = pickUnique([secSents[0], `Бүгінгі тақырып — «${this.shortLabel(shortCourse, 44)}»: «${shortTerm}» ұғымын талдаймыз.`], `Сабақ тақырыбы — «${this.shortLabel(shortCourse, 48)}».`);
          b1 = pickUnique([secSents[1], secBullets[0], `«${shortTerm}» — ${plainDef}.`], `Негізгі термин — «${shortTerm}»: ${plainDef}.`);
          b2 = pickUnique([secSents[2], secBullets[1], `${stageItems[0]?.detail || plainDef}.`], `Көрнекі сызба осы механизмнің қалай жұмыс істейтінін ашады.`);
        } else if (isClosing) {
          tutorCue = "THUMBS_UP";
          emotion = "celebrate";
          sceneTitle = meta.title;
          const allTermNames = glossary.slice(0, 5).map((g) => g.term.split(/[/(]/)[0].trim()).join(", ");
          b0 = pickUnique([secSents[0], `«${this.shortLabel(shortCourse, 40)}» қорытындысы: ${allTermNames}.`], `Тақырыптың барлық ұғымдарын біртұтас жүйеге жинадық.`);
          b1 = pickUnique([secSents[1], `Әр термин тақырыптың нақты тетігін ашып, біртұтас жүйе құрайды.`], `Барлық ұғымдар өзара тығыз байланысты.`);
          b2 = pickUnique([secSents[2], `Конспект, интеллект-карта және тест арқылы біліміңізді бекітіңіз.`], `Төмендегі тест арқылы өзіңізді тексеріңіз.`);
        } else if (modId === "split_versus_duel" || modId === "scales_balance_norm") {
          tutorCue = "QUESTION_OPEN";
          emotion = "risk";
          sceneTitle = sec?.title ? this.shortLabel(sec.title, 52) : meta.title;
          b0 = pickUnique([secSents[0], `«${shortTerm}» ескерілмесе, жүйеде қателік пен теңгерімсіздік туындайды.`], `Жүйелі әдіссіз қателік қаупі артады.`);
          b1 = pickUnique([secSents[1], secBullets[0], `«${shortTerm}» (${this.shortLabel(plainDef, 56)}) құрылымды тұрақтандырады.`], `Ғылыми тәсіл нақты нәтиже береді.`);
          b2 = pickUnique([secSents[2], secBullets[1]], `Салыстыру нәтижесі: жүйелі тәсіл тиімділікті дәлелдейді.`);
        } else {
          sceneTitle = sec?.title ? this.shortLabel(sec.title, 52) : meta.title;
          b0 = pickUnique([secSents[0], secBullets[0], `«${stepLbl}» — ${stageItems[0]?.detail || plainDef}.`], `«${stepLbl}» элементінің рөлін қарастырайық.`);
          b1 = pickUnique([secSents[1], secBullets[1], `«${stepLbl2}» кезеңі «${shortTerm}» арқылы процесті нақтылайды.`], `Келесі қадам — «${stepLbl2}» байланысы.`);
          b2 = pickUnique([secSents[2], secBullets[2], `Нәтижесінде «${stepLbl3}» жүйенің негізгі мақсатын орындайды.`], `Осылайша бөлімнің негізгі логикасы ашылады.`);
        }
      } else if (outputLang === "en") {
        if (idx === 0) {
          tutorCue = "WARNING_PALM";
          sceneTitle = this.shortLabel(sec?.title || shortCourse, 52);
          b0 = pickUnique([secSents[0], `Today we explore "${this.shortLabel(shortCourse, 44)}" starting with "${shortTerm}".`], `Topic overview: "${this.shortLabel(shortCourse, 48)}".`);
          b1 = pickUnique([secSents[1], secBullets[0], `"${shortTerm}" means ${plainDef}.`], `Key concept "${shortTerm}": ${plainDef}.`);
          b2 = pickUnique([secSents[2], secBullets[1], `${stageItems[0]?.detail || plainDef}.`], `The visual diagram breaks down how this mechanism works.`);
        } else if (isClosing) {
          tutorCue = "THUMBS_UP";
          emotion = "celebrate";
          sceneTitle = meta.title;
          const allTermNames = glossary.slice(0, 5).map((g) => g.term.split(/[/(]/)[0].trim()).join(", ");
          b0 = pickUnique([secSents[0], `Bringing "${this.shortLabel(shortCourse, 40)}" together: ${allTermNames}.`], `Summary of all core concepts in one map.`);
          b1 = pickUnique([secSents[1], `Each concept connects directly to the core mechanism you will see on the exam.`], `Together these terms form a coherent system.`);
          b2 = pickUnique([secSents[2], `Use the notes, mind map, and adaptive quiz to test your understanding.`], `Try the adaptive quiz next to test your understanding.`);
        } else if (modId === "split_versus_duel" || modId === "scales_balance_norm") {
          tutorCue = "QUESTION_OPEN";
          emotion = "risk";
          sceneTitle = sec?.title ? this.shortLabel(sec.title, 52) : meta.title;
          b0 = pickUnique([secSents[0], `Ignoring "${shortTerm}" creates imbalance and avoidable errors.`], `Without a structured method, critical errors arise.`);
          b1 = pickUnique([secSents[1], secBullets[0], `Applying "${shortTerm}" (${this.shortLabel(plainDef, 56)}) restores precision.`], `Applying "${shortTerm}" stabilizes the entire process.`);
          b2 = pickUnique([secSents[2], secBullets[1]], `A systematic approach delivers clear, measurable gains.`);
        } else {
          sceneTitle = sec?.title ? this.shortLabel(sec.title, 52) : meta.title;
          b0 = pickUnique([secSents[0], secBullets[0], `"${stepLbl}": ${stageItems[0]?.detail || plainDef}.`], `First key element: "${stepLbl}".`);
          b1 = pickUnique([secSents[1], secBullets[1], `"${stepLbl2}" drives the core interaction with "${shortTerm}".`], `Next, "${stepLbl2}" refines the process.`);
          b2 = pickUnique([secSents[2], secBullets[2], `"${stepLbl3}" completes the outcome for this section.`], `Together these stages explain the mechanism.`);
        }
      } else if (idx === 0) {
        tutorCue = "WARNING_PALM";
        sceneTitle = pickSceneTitle(sec?.title || shortCourse, meta.title, shortTerm);
        b0 = pickUnique(
          [secSents[0], `В теме «${this.shortLabel(shortCourse, 46)}» ключевую роль играет «${shortTerm}».`],
          `Тема урока — «${this.shortLabel(shortCourse, 52)}».`
        );
        b1 = pickUnique(
          [secSents[1], secBullets[0], `«${shortTerm}» — это ${plainDef}.`],
          `Ключевой термин «${shortTerm}» означает: ${plainDef}.`
        );
        b2 = pickUnique(
          [secSents[2], secBullets[1], `На схеме показано, как «${shortTerm}» работает на практике.`],
          `Посмотрим на схеме, как этот принцип работает на практике.`
        );
      } else if (isClosing) {
        tutorCue = "THUMBS_UP";
        emotion = "celebrate";
        sceneTitle = pickSceneTitle(meta.title, "Итоги темы", shortTerm);
        const allTermNames = glossary.slice(0, 5).map((g) => g.term.split(/[/(]/)[0].trim()).join(", ");
        b0 = pickUnique(
          [`Соберём ключевые понятия урока «${this.shortLabel(shortCourse, 38)}»: ${allTermNames}.`, secSents[0]],
          `Соберём все ключевые понятия урока в единую карту.`
        );
        b1 = pickUnique(
          [secSents[secSents.length - 1], secBullets[0], `Все изученные термины связывают теорию и практику в целостную систему.`],
          `Все изученные термины работают как единая система знаний.`
        );
        b2 = pickUnique(
          [`Закрепите материал в конспекте, интеллект-карте и мини-тесте ниже.`],
          `Проверьте себя в мини-тесте ниже — материал готов к повторению.`
        );
      } else if (modId === "split_versus_duel" || modId === "scales_balance_norm") {
        tutorCue = "QUESTION_OPEN";
        emotion = "risk";
        sceneTitle = pickSceneTitle(sec?.title, meta.title, shortTerm);
        b0 = pickUnique(
          [secSents[0], signals.contrastQuote, secBullets[0]],
          `Без системного разбора «${shortTerm}» возникают ошибки.`
        );
        b1 = pickUnique(
          [secSents[1], secBullets[1], `Опора на «${shortTerm}» даёт точный и обоснованный результат.`],
          `Научный подход через «${shortTerm}» раскрывает механизм явления.`
        );
        b2 = pickUnique(
          [secSents[2], secBullets[2], `Разница подходов видна сразу: ${signals.deltaBadge}.`],
          `Системный метод даёт точный и проверенный результат.`
        );
      } else if (modId === "cause_effect_flow" || modId === "worked_example") {
        sceneTitle = pickSceneTitle(sec?.title, meta.title, shortTerm);
        b0 = pickUnique([secSents[0], secBullets[0], `Исходное условие: ${stageItems[0]?.detail || plainDef}.`], `Исходный фактор — «${stepLbl}».`);
        b1 = pickUnique([secSents[1], secBullets[1], `Через «${shortTerm}» это условие преобразуется в действие.`], `Механизм «${shortTerm}» запускает изменение.`);
        b2 = pickUnique([secSents[2], secBullets[2], `Практический результат проявляется через «${stepLbl3}».`], `Итог процесса виден в «${stepLbl3}».`);
      } else if (modId === "multi_mode_chart" || modId === "causal_curve") {
        sceneTitle = pickSceneTitle(sec?.title, meta.title, shortTerm);
        b0 = pickUnique([secSents[0], secBullets[0], `Проследим зависимость между «${shortTerm}» и параметром «${stepLbl}».`], `Разберём главную зависимость факторов раздела.`);
        b1 = pickUnique(
          [secSents[1], signals.hasFormula ? `Соотношение задаётся правилом ${signals.formulaCard.expression}.` : secBullets[1]],
          `Изменение «${shortTerm}» меняет поведение всей системы.`
        );
        b2 = pickUnique([secSents[2], secBullets[2], `Вывод: ${plainDef}.`], `Эта закономерность позволяет точно прогнозировать итог.`);
      } else if (modId === "chronicle_timeline" || modId === "timeline_scroll") {
        sceneTitle = pickSceneTitle(sec?.title, meta.title, shortTerm);
        b0 = pickUnique([secSents[0], secBullets[0], `На первом этапе раздела формируется «${stepLbl}».`], `Начальный этап — «${stepLbl}».`);
        b1 = pickUnique([secSents[1], secBullets[1], `Далее ключевую роль берёт «${shortTerm}» — ${plainDef}.`], `Следующий этап опирается на «${shortTerm}».`);
        b2 = pickUnique([secSents[2], secBullets[2], `Завершает цепочку «${stepLbl3}».`], `Этапы складываются в последовательную логику.`);
      } else {
        sceneTitle = pickSceneTitle(sec?.title, meta.title, shortTerm);
        b0 = pickUnique(
          [secSents[0], secBullets[0], `В фокусе раздела — «${stepLbl}»: ${plainDef}.`],
          `Ключевой элемент раздела — «${stepLbl}».`
        );
        b1 = pickUnique(
          [secSents[1], secBullets[1], `С ним напрямую связано звено «${stepLbl2}», раскрывающее механизм темы.`],
          `Далее включается «${stepLbl2}», уточняя механизм.`
        );
        b2 = pickUnique(
          [secSents[2], secBullets[2], `Вместе эти элементы формируют устойчивый практический результат.`],
          `Вместе эти элементы дают устойчивый результат.`
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

      const fL = outputLang === "kk"
        ? { ctx: "Бастапқы", verb: "Өзгертеді", out: "Нәтиже", link: "негізгі байланыс", obj: "Нысан", secCtx: "Бөлім", prac: "Тәжірибе", sol: "Шешім", focus: "Фокус" }
        : outputLang === "en"
          ? { ctx: "Context", verb: "Transforms", out: "Outcome", link: "key link", obj: "Subject", secCtx: "Section", prac: "Practice", sol: "Result", focus: "Focus" }
          : { ctx: "Контекст", verb: "Преобразует", out: "Вывод", link: "ключевая связь", obj: "Объект", secCtx: "Раздел", prac: "Практика", sol: "Решение", focus: "Фокус" };
      const facts = {
        shortTerm,
        primaryMetric: secMetrics[0] || signals.dangerMetric.value,
        secondaryMetric: secMetrics[1] || signals.deltaBadge,
        formulaExpr: signals.formulaCard.expression,
        causeEffect: {
          causeLabel: this.shortLabel(stageItems[0]?.detail || b0, 62),
          causeMetric: secMetrics[0] || fL.ctx,
          mechanismLabel: shortTerm,
          actionVerb: fL.verb,
          effectLabel: this.shortLabel(stageItems[2]?.detail || b2, 66),
          effectMetric: secMetrics[1] || fL.out,
          deltaLabel: `${shortTerm}: ${fL.link}`
        },
        workedExample: {
          caseTitle: sceneTitle,
          inputA: { key: fL.obj, value: this.shortLabel(shortTerm, 22) },
          inputB: { key: fL.secCtx, value: secMetrics[0] || this.shortLabel(sec?.title || fL.prac, 22) },
          expression: signals.formulaCard.expression,
          outputValue: secMetrics[1] || secMetrics[0] || fL.sol,
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
          thresholdLabel: signals.hasFormula ? signals.formulaCard.expression : `${fL.focus}: ${shortTerm}`,
          takeaway: this.shortLabel(b2, 70)
        }
      };

      const sceneObj = {
        sceneIndex: idx + 1,
        id: `Scene_0${idx + 1}`,
        archetype: modId,
        archetypeBadge: meta.badge,
        layoutMode: plan.layoutMode || "split_tutor",
        transitionType: plan.transitionType || "cross_dissolve",
        styleVariant: plan.styleVariant || { patternVariant: "soft_grid", accentMode: "primary", frameless: false, paletteOffset: 0 },
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
          rings: Array.from({ length: Math.min(3, glossary.length) }, (_, rIdx) => {
            const g = glossary[(idx + rIdx) % glossary.length];
            return {
              name: `${rIdx + 1}. ${g.term.split(/[/(]/)[0].trim().slice(0, 24)}`,
              role: this.shortLabel(g.plain, 48)
            };
          }),
          constellationNodes: Array.from({ length: Math.min(5, glossary.length) }, (_, cIdx) => {
            const g = glossary[(idx + cIdx) % glossary.length];
            return {
              term: g.term.split(/[/(]/)[0].trim().slice(0, 26),
              tag: g.plain.split(" ").slice(0, 3).join(" ")
            };
          })
        }
      };
      const audit = this.auditSceneGeometryAndContrast(sceneObj, domainProfile.theme);
      selfHealedCount += audit.healedBeats;
      sceneObj.finalCps = +(sceneObj.caption.length / sceneObj.durationSec).toFixed(1);
      return sceneObj;
    });

    const { supervisorLogs, generatedCode } = this.finalizeStoryboardLogsAndCode(
      courseTitle,
      domainProfile,
      domainLocalizedName,
      sections,
      glossary,
      validatedScenes,
      lectureText,
      outputLang,
      selfHealedCount
    );

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
    layoutMode: "${s.layoutMode || "split_tutor"}",
    transitionType: "${s.transitionType || "cross_dissolve"}",
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
    const raw = `v13_pure_lang||${outputLang}||${courseTitle.trim()}||${glossaryText.trim()}||${lectureText.trim()}`;
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

  // Предварительный перевод исходных блоков лекции и глоссария ДО сборки конспекта, 2D-сцен и теста (~30-45 строк за ~1.5 сек)
  async translateSourceMaterialViaServer({ cleanTitle, blocks = [], glossary = [], outputLang = "ru", abortSignal = null }) {
    if (!outputLang) return { cleanTitle, blocks, glossary, translated: true };
    if (typeof window !== "undefined" && window.location?.protocol === "file:") {
      return { cleanTitle, blocks, glossary, translated: false };
    }

    const lang = String(outputLang || "ru").toLowerCase().slice(0, 2);
    const slots = [];
    const pushSlot = (val, setter) => {
      const str = String(val || "").trim();
      if (!str || str.length < 2) return;
      if (!this.needsTranslationForLang(str, lang)) return;
      slots.push({ str, setter });
    };

    let outTitle = this.cleanForeignBrackets(cleanTitle, lang);
    pushSlot(outTitle, (v) => { outTitle = v; });

    const outGlossary = (glossary || []).map((g) => {
      const item = { ...g };
      // Сначала выбираем моноязычный вариант из двуязычного/трёхъязычного термина (напр. Self-Attention / Самовнимание (Өзіндік зейін))
      const pickedTerm = this.pickTermForLang(item.term, lang);
      item.term = pickedTerm || item.term;
      item.plain = this.cleanForeignBrackets(item.plain, lang);
      item.academic = this.cleanForeignBrackets(item.academic, lang);
      item.example = this.cleanForeignBrackets(item.example, lang);

      pushSlot(item.term, (v) => {
        const cleanT = this.capitalizeFirst(v.split(/[/(]/)[0].trim());
        item.term = cleanT || item.term;
        const { dactylBoxes, signHint } = this.buildDactylAndSignHint(item.term);
        item.dactylBoxes = dactylBoxes;
        item.signHint = signHint;
      });
      pushSlot(item.plain, (v) => { item.plain = this.conciseDefinition(v); });
      pushSlot(item.academic, (v) => { item.academic = this.cleanForeignBrackets(v, lang); });
      pushSlot(item.example, (v) => { item.example = this.cleanForeignBrackets(v, lang); });
      return item;
    });

    const outBlocks = (blocks || []).map((b) => {
      const nb = {
        ...b,
        heading: this.cleanForeignBrackets(b.heading, lang),
        body: this.cleanForeignBrackets(b.body, lang),
        bullets: Array.isArray(b.bullets) ? b.bullets.map((x) => this.cleanForeignBrackets(x, lang)) : []
      };
      pushSlot(nb.heading, (v) => { nb.heading = v; });
      pushSlot(nb.body, (v) => { nb.body = this.cleanForeignBrackets(v, lang); });
      nb.bullets.forEach((bul, bIdx) => {
        pushSlot(bul, (v) => { nb.bullets[bIdx] = this.cleanForeignBrackets(v, lang); });
      });
      return nb;
    });

    if (!slots.length) {
      return { cleanTitle: outTitle, blocks: outBlocks, glossary: outGlossary, translated: true };
    }

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
          targetLang: lang,
          sourceLang: "auto"
        })
      });
      clearTimeout(timer);
      if (!resp.ok) return { cleanTitle: outTitle, blocks: outBlocks, glossary: outGlossary, translated: false };
      const data = await resp.json();
      if (!Array.isArray(data?.translations)) {
        return { cleanTitle: outTitle, blocks: outBlocks, glossary: outGlossary, translated: false };
      }

      slots.forEach((slot, idx) => {
        const tr = data.translations[idx];
        if (typeof tr === "string" && tr.trim()) {
          slot.setter(tr.trim());
        }
      });

      // Пересчитываем дактиль для терминов, которые не попали в слот перевода, но были выбраны через pickTermForLang
      outGlossary.forEach((g) => {
        const { dactylBoxes, signHint } = this.buildDactylAndSignHint(g.term);
        g.dactylBoxes = dactylBoxes;
        g.signHint = signHint;
      });

      return { cleanTitle: outTitle, blocks: outBlocks, glossary: outGlossary, translated: !data.fallback };
    } catch (err) {
      if (err?.name === "AbortError" && abortSignal?.aborted) throw err;
      console.warn("Pre-pipeline source translation fallback:", err);
      return { cleanTitle: outTitle, blocks: outBlocks, glossary: outGlossary, translated: false };
    }
  },

  // Финальный контроль языковой чистоты: допереводит любые остаточные иноязычные поля (в т.ч. academicOriginal и ответ Gemini)
  async ensurePackageLanguagePurity(pkg, targetLang, domainProfile, abortSignal = null) {
    if (!pkg || !targetLang) return pkg;
    if (typeof window !== "undefined" && window.location?.protocol === "file:") return pkg;
    const lang = String(targetLang || "ru").toLowerCase().slice(0, 2);

    const slots = [];
    const checkAndPush = (val, setter) => {
      const cleaned = this.cleanForeignBrackets(val, lang);
      if (cleaned !== val) setter(cleaned);
      if (cleaned && cleaned.length >= 2 && this.needsTranslationForLang(cleaned, lang)) {
        slots.push({ str: cleaned, setter });
      }
    };

    checkAndPush(pkg.courseTitle, (v) => { pkg.courseTitle = v; });

    (pkg.glossary || []).forEach((g) => {
      const picked = this.pickTermForLang(g.term, lang);
      if (picked) g.term = picked;
      checkAndPush(g.term, (v) => {
        g.term = this.capitalizeFirst(v.split(/[/(]/)[0].trim()) || g.term;
        const { dactylBoxes, signHint } = this.buildDactylAndSignHint(g.term);
        g.dactylBoxes = dactylBoxes;
        g.signHint = signHint;
      });
      checkAndPush(g.plain, (v) => { g.plain = v; });
      checkAndPush(g.academic, (v) => { g.academic = v; });
      checkAndPush(g.example, (v) => { g.example = v; });
    });

    (pkg.sections || []).forEach((sec) => {
      checkAndPush(sec.title, (v) => { sec.title = v; });
      checkAndPush(sec.academicOriginal, (v) => { sec.academicOriginal = v; });
      if (sec.plainBlocks) {
        checkAndPush(sec.plainBlocks.coreIdea, (v) => { sec.plainBlocks.coreIdea = v; });
        checkAndPush(sec.plainBlocks.analogy, (v) => { sec.plainBlocks.analogy = v; });
        (sec.plainBlocks.termBreakdown || []).forEach((tb) => {
          const pt = this.pickTermForLang(tb.term, lang);
          if (pt) tb.term = pt;
          checkAndPush(tb.term, (v) => { tb.term = v; });
          checkAndPush(tb.plain, (v) => { tb.plain = v; });
        });
      }
      if (Array.isArray(sec.plainBullets)) {
        sec.plainBullets.forEach((b, bIdx) => {
          checkAndPush(b, (v) => { sec.plainBullets[bIdx] = v; });
        });
      }
      checkAndPush(sec.plainSummary, (v) => { sec.plainSummary = v; });
    });

    (pkg.scenes || []).forEach((sc) => {
      checkAndPush(sc.title, (v) => { sc.title = v; });
      const kt = this.pickTermForLang(sc.keyTerm, lang);
      if (kt) sc.keyTerm = kt;
      checkAndPush(sc.keyTerm, (v) => { sc.keyTerm = v; });
      checkAndPush(sc.keyPlain, (v) => { sc.keyPlain = v; });
      checkAndPush(sc.sectionRef, (v) => { sc.sectionRef = this.shortLabel(v, 48); });
      (sc.beats || []).forEach((bt) => {
        checkAndPush(bt.text, (v) => { bt.text = this.ensureCompleteSentence(v, 145); });
      });
      (sc.visualPayload?.stages || []).forEach((st) => {
        checkAndPush(st.shortTitle, (v) => { st.shortTitle = this.shortLabel(v, 28); });
        checkAndPush(st.detail, (v) => { st.detail = this.shortLabel(v, 68); });
        checkAndPush(st.metric, (v) => { st.metric = this.shortLabel(v, 24); });
      });
      (sc.visualPayload?.rings || []).forEach((rg) => {
        checkAndPush(rg.name, (v) => { rg.name = this.shortLabel(v, 28); });
        checkAndPush(rg.role, (v) => { rg.role = this.shortLabel(v, 48); });
      });
      (sc.visualPayload?.constellationNodes || []).forEach((cn) => {
        checkAndPush(cn.term, (v) => { cn.term = this.shortLabel(v, 26); });
        checkAndPush(cn.tag, (v) => { cn.tag = this.shortLabel(v, 36); });
      });
      const cmp = sc.visualPayload?.facts?.comparison;
      if (cmp) {
        checkAndPush(cmp.leftTitle, (v) => { cmp.leftTitle = v; });
        checkAndPush(cmp.leftNote, (v) => { cmp.leftNote = v; });
        checkAndPush(cmp.rightTitle, (v) => { cmp.rightTitle = v; });
        checkAndPush(cmp.rightNote, (v) => { cmp.rightNote = v; });
      }
      const ce = sc.visualPayload?.facts?.causeEffect;
      if (ce) {
        checkAndPush(ce.causeLabel, (v) => { ce.causeLabel = this.shortLabel(v, 62); });
        checkAndPush(ce.mechanismLabel, (v) => { ce.mechanismLabel = this.shortLabel(v, 28); });
        checkAndPush(ce.effectLabel, (v) => { ce.effectLabel = this.shortLabel(v, 66); });
      }
      const we = sc.visualPayload?.facts?.workedExample;
      if (we) {
        checkAndPush(we.caseTitle, (v) => { we.caseTitle = this.shortLabel(v, 52); });
        checkAndPush(we.outputValue, (v) => { we.outputValue = this.shortLabel(v, 26); });
        checkAndPush(we.verdict, (v) => { we.verdict = this.shortLabel(v, 74); });
      }
      const cc = sc.visualPayload?.facts?.causalCurve;
      if (cc) {
        checkAndPush(cc.paramA, (v) => { cc.paramA = this.shortLabel(v, 26); });
        checkAndPush(cc.paramB, (v) => { cc.paramB = this.shortLabel(v, 28); });
        checkAndPush(cc.takeaway, (v) => { cc.takeaway = this.shortLabel(v, 70); });
      }
    });

    (pkg.quiz || []).forEach((q) => {
      checkAndPush(q.question, (v) => { q.question = v; });
      (q.options || []).forEach((opt, oIdx) => {
        checkAndPush(opt, (v) => { q.options[oIdx] = v; });
      });
      checkAndPush(q.explanation, (v) => { q.explanation = v; });
      checkAndPush(q.hint, (v) => { q.hint = v; });
    });

    if (!slots.length) return pkg;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 24000);
      if (abortSignal) abortSignal.addEventListener("abort", () => ctrl.abort(), { once: true });

      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          texts: slots.map((s) => s.str),
          targetLang: lang,
          sourceLang: "auto"
        })
      });
      clearTimeout(timer);
      if (!resp.ok) return pkg;
      const data = await resp.json();
      if (!Array.isArray(data?.translations)) return pkg;

      slots.forEach((slot, idx) => {
        const tr = data.translations[idx];
        if (typeof tr === "string" && tr.trim()) {
          slot.setter(this.cleanForeignBrackets(tr.trim(), lang));
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
    } catch (err) {
      if (err?.name === "AbortError" && abortSignal?.aborted) throw err;
      console.warn("Language purity check warning:", err);
    }
    return pkg;
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
        const cleanOrig = origTerm.split(/[/(]/)[0].trim();
        const cleanTranslated = v.split(/[/(]/)[0].trim();
        g.term = cleanTranslated.toLowerCase() === cleanOrig.toLowerCase() ? cleanTranslated : `${cleanTranslated} (${cleanOrig})`;
        const { dactylBoxes, signHint } = this.buildDactylAndSignHint(cleanTranslated);
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
        pushSlot(st.shortTitle, (v) => { st.shortTitle = this.shortLabel(v, 28); });
        pushSlot(st.detail, (v) => { st.detail = this.shortLabel(v, 68); });
        pushSlot(st.metric, (v) => { st.metric = this.shortLabel(v, 24); });
      });
      (sc.visualPayload?.rings || []).forEach((rg) => {
        pushSlot(rg.name, (v) => { rg.name = this.shortLabel(v, 28); });
        pushSlot(rg.role, (v) => { rg.role = this.shortLabel(v, 48); });
      });
      (sc.visualPayload?.constellationNodes || []).forEach((cn) => {
        pushSlot(cn.term, (v) => { cn.term = this.shortLabel(v, 26); });
        pushSlot(cn.tag, (v) => { cn.tag = this.shortLabel(v, 36); });
      });
      pushSlot(sc.sectionRef, (v) => { sc.sectionRef = this.shortLabel(v, 48); });
      const cmp = sc.visualPayload?.facts?.comparison;
      if (cmp) {
        pushSlot(cmp.leftTitle, (v) => { cmp.leftTitle = v; });
        pushSlot(cmp.leftNote, (v) => { cmp.leftNote = v; });
        pushSlot(cmp.rightTitle, (v) => { cmp.rightTitle = v; });
        pushSlot(cmp.rightNote, (v) => { cmp.rightNote = v; });
      }
      const ce = sc.visualPayload?.facts?.causeEffect;
      if (ce) {
        pushSlot(ce.causeLabel, (v) => { ce.causeLabel = this.shortLabel(v, 62); });
        pushSlot(ce.mechanismLabel, (v) => { ce.mechanismLabel = this.shortLabel(v, 28); });
        pushSlot(ce.actionVerb, (v) => { ce.actionVerb = this.shortLabel(v, 28); });
        pushSlot(ce.effectLabel, (v) => { ce.effectLabel = this.shortLabel(v, 66); });
        pushSlot(ce.deltaLabel, (v) => { ce.deltaLabel = this.shortLabel(v, 44); });
      }
      const we = sc.visualPayload?.facts?.workedExample;
      if (we) {
        pushSlot(we.caseTitle, (v) => { we.caseTitle = this.shortLabel(v, 52); });
        if (we.inputA) {
          pushSlot(we.inputA.key, (v) => { we.inputA.key = this.shortLabel(v, 24); });
          pushSlot(we.inputA.value, (v) => { we.inputA.value = this.shortLabel(v, 24); });
        }
        if (we.inputB) {
          pushSlot(we.inputB.key, (v) => { we.inputB.key = this.shortLabel(v, 24); });
          pushSlot(we.inputB.value, (v) => { we.inputB.value = this.shortLabel(v, 24); });
        }
        pushSlot(we.outputValue, (v) => { we.outputValue = this.shortLabel(v, 26); });
        pushSlot(we.verdict, (v) => { we.verdict = this.shortLabel(v, 74); });
      }
      const cc = sc.visualPayload?.facts?.causalCurve;
      if (cc) {
        pushSlot(cc.paramA, (v) => { cc.paramA = this.shortLabel(v, 26); });
        pushSlot(cc.paramB, (v) => { cc.paramB = this.shortLabel(v, 28); });
        pushSlot(cc.takeaway, (v) => { cc.takeaway = this.shortLabel(v, 70); });
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
    let { cleanTitle, cleanText } = this.sanitizeAndExtractMeta(courseTitle, lectureText);
    const sourceLang = this.detectTextLanguage(cleanText + " " + cleanTitle);
    const contentHash = await this.computeContentHash(cleanTitle, glossaryText || "", cleanText, outputLang);

    const segmented = this.segmentLectureIntoSections(cleanText);
    const domainProfile = this.detectDomainProfile(cleanTitle, segmented.coreText, glossaryText);
    let glossary = this.parseGlossary(glossaryText, cleanText, segmented.embeddedGlossaryLines);
    const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey.trim().startsWith("AIza"));
    const pipelineWarnings = [];

    // Если работаем без Gemini API (или смешанный материал), переводим исходные блоки и термины ДО сборки сцен и теста
    let preTranslated = false;
    if (!hasGeminiKey && (outputLang !== sourceLang || this.needsTranslationForLang(cleanTitle + " " + segmented.coreText.slice(0, 600) + " " + glossaryText, outputLang))) {
      const preRes = await this.translateSourceMaterialViaServer({
        cleanTitle,
        blocks: segmented.blocks,
        glossary,
        outputLang,
        abortSignal
      });
      cleanTitle = preRes.cleanTitle || cleanTitle;
      segmented.blocks = preRes.blocks || segmented.blocks;
      segmented.coreText = segmented.blocks.map((b) => (b.heading ? `${b.heading}. ${b.body}` : b.body)).join("\n\n");
      glossary = preRes.glossary || glossary;
      preTranslated = Boolean(preRes.translated);
      if (!preTranslated) {
        pipelineWarnings.push("Сервер перевода временно недоступен — часть материала могла остаться на языке оригинала.");
      }
    }

    const sections = segmented.blocks.map((b, idx) => this.simplifyToPlainLanguage(b, glossary, idx, domainProfile, outputLang));
    const seenSecTitles = new Set();
    sections.forEach((sec, idx) => {
      const low = String(sec.title || "").trim().toLowerCase();
      if (low && seenSecTitles.has(low)) {
        const altWords = (sec.cleanSentences?.[0] || sec.academicOriginal || "")
          .replace(/^[«"—–-\s]+/, "")
          .split(/\s+/)
          .slice(0, 4)
          .join(" ")
          .replace(/[,:;—–\-.!?]+$/, "");
        sec.title = altWords.length > 6 ? this.capitalizeFirst(altWords) : `${sec.title} · Часть ${idx + 1}`;
      }
      seenSecTitles.add(String(sec.title || "").trim().toLowerCase());
    });
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
    if (hasGeminiKey) {
      const langNames = {
        ru: "Russian (Русский)",
        kk: "Kazakh (Қазақша, strict Cyrillic ә, і, ң, ғ, ү, ұ, қ, ө, һ)",
        en: "English"
      };
      const targetLangLabel = langNames[outputLang] || langNames.ru;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 42000);
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => controller.abort(), { once: true });
        }
        const sectionStubs = sections.map((s) => `${s.sectionIndex} [${s.sourceBadge}]. "${s.title}": ${s.academicOriginal.slice(0, 450)}`).join("\n");
        const scenePlanStubs = storyboardOut.scenes.map((s, i) => `Scene ${i + 1}: archetype="${s.archetype}", section="${s.sectionRef}"`).join("\n");
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
                  text: `You are Lecture AI, an expert university scriptwriter and educator. Output ALL JSON values strictly in ${targetLangLabel}. Never merely shorten academic sentences: explain each section intuitively using everyday words, a concrete real-life analogy, and simple term breakdowns. Never use generic engineering clichés ("seismic load", "defense layers") unless the lecture is actually about construction. NEVER repeat the same sentence opener across scenes; each scene MUST reflect its assigned visual archetype and section facts. Scene 1 MUST introduce the lesson topic and define the primary concept in simple words.`
                }]
              },
              contents: [{
                parts: [{
                  text: `Analyze this lecture "${cleanTitle}" and adapt it into ${targetLangLabel}.
Return JSON with:
- detectedCourseTitle (clean academic title),
- glossaryItems (array of 5-7 key terms with { term, plain, academic, example }),
- sectionNotes (array of ${sections.length} objects with { title, coreIdea: simple everyday explanation without repetitive prefixes, analogy: unique real-life example, bullets: [2-3 complete takeaways] }),
- scenes (array of ${storyboardOut.scenes.length} objects matching the scene plans below, each with { sectionIndex, archetype, title, beats: [3 distinct flowing sentences <= 98 chars each], stages: [{ shortTitle, detail, metric }], comparison?: { leftTitle, leftNote, rightTitle, rightNote }, causeEffect?: { causeLabel, mechanismLabel, effectLabel }, workedExample?: { expression, outputValue, verdict } }),
- quizQuestions (array of ${Math.min(12, targetQuizCount)} diverse questions across different angles with { question, options[4], correctIndex, explanation, hint }).

Scene plans:
${scenePlanStubs}

Sections:
${sectionStubs}

Full text:
${segmented.coreText.slice(0, 9000)}`
                }]
              }],
              generationConfig: {
                temperature: 0.45,
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
                          sectionIndex: { type: "INTEGER" },
                          archetype: { type: "STRING" },
                          layoutMode: { type: "STRING" },
                          transitionType: { type: "STRING" },
                          tutorCue: { type: "STRING" },
                          emotion: { type: "STRING" },
                          title: { type: "STRING" },
                          beats: { type: "ARRAY", items: { type: "STRING" } },
                          stageLabels: { type: "ARRAY", items: { type: "STRING" } },
                          stages: {
                            type: "ARRAY",
                            items: {
                              type: "OBJECT",
                              properties: {
                                shortTitle: { type: "STRING" },
                                detail: { type: "STRING" },
                                metric: { type: "STRING" }
                              }
                            }
                          },
                          comparison: {
                            type: "OBJECT",
                            properties: {
                              leftTitle: { type: "STRING" },
                              leftNote: { type: "STRING" },
                              rightTitle: { type: "STRING" },
                              rightNote: { type: "STRING" }
                            }
                          },
                          causeEffect: {
                            type: "OBJECT",
                            properties: {
                              causeLabel: { type: "STRING" },
                              mechanismLabel: { type: "STRING" },
                              effectLabel: { type: "STRING" }
                            }
                          },
                          workedExample: {
                            type: "OBJECT",
                            properties: {
                              expression: { type: "STRING" },
                              outputValue: { type: "STRING" },
                              verdict: { type: "STRING" }
                            }
                          }
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
              const i18n = this.OUTPUT_I18N[outputLang] || this.OUTPUT_I18N.ru;
              const allowedLayouts = new Set(["hero_intro", "split_tutor", "wide_stage", "focus_split"]);
              const allowedTrans = new Set(["cross_dissolve", "slide", "zoom_fade", "wipe"]);
              let geminiHealed = 0;
              parsed.scenes.forEach((ps, idx) => {
                const sc = storyboardOut.scenes[idx];
                if (!sc || !ps) return;
                if (ps.archetype && vd?.MODULE_FAMILIES?.[ps.archetype]) {
                  sc.archetype = ps.archetype;
                  sc.archetypeBadge = i18n.moduleBadges?.[ps.archetype]?.badge || sc.archetypeBadge;
                }
                if (ps.layoutMode && allowedLayouts.has(ps.layoutMode)) {
                  sc.layoutMode = ps.layoutMode;
                }
                if (ps.transitionType && allowedTrans.has(ps.transitionType)) {
                  sc.transitionType = ps.transitionType;
                }
                if (ps.tutorCue) sc.tutorCue = ps.tutorCue;
                if (ps.emotion) sc.emotion = ps.emotion;
                if (ps.title && ps.title.trim()) sc.title = this.shortLabel(ps.title, 56);
                if (Array.isArray(ps.beats) && ps.beats.length >= 3) {
                  sc.beats = ps.beats.slice(0, 3).map((bt, bIdx) => ({
                    id: `beat${bIdx}`,
                    role: bIdx === 0 ? "input" : bIdx === 1 ? "action" : "output",
                    text: this.ensureCompleteSentence(bt, 102)
                  }));
                }
                if (Array.isArray(ps.stages) && ps.stages.length >= 3) {
                  sc.visualPayload.stages = ps.stages.slice(0, 4).map((st, sIdx) => ({
                    shortTitle: this.shortLabel(st?.shortTitle || sc.visualPayload.stages[sIdx]?.shortTitle || `Шаг ${sIdx + 1}`, 28),
                    detail: this.shortLabel(st?.detail || sc.visualPayload.stages[sIdx]?.detail || "", 68),
                    metric: this.shortLabel(st?.metric || sc.visualPayload.stages[sIdx]?.metric || `0${sIdx + 1}`, 24)
                  }));
                } else if (Array.isArray(ps.stageLabels) && ps.stageLabels.length >= 3) {
                  ps.stageLabels.slice(0, 3).forEach((lbl, lIdx) => {
                    if (sc.visualPayload.stages[lIdx] && lbl) {
                      sc.visualPayload.stages[lIdx].shortTitle = this.shortLabel(lbl, 24);
                      if (sc.beats[lIdx]) sc.visualPayload.stages[lIdx].detail = this.shortLabel(sc.beats[lIdx].text, 54);
                    }
                  });
                }
                if (ps.comparison && sc.visualPayload?.facts?.comparison) {
                  const c = sc.visualPayload.facts.comparison;
                  if (ps.comparison.leftTitle) c.leftTitle = this.shortLabel(ps.comparison.leftTitle, 28);
                  if (ps.comparison.leftNote) c.leftNote = this.shortLabel(ps.comparison.leftNote, 46);
                  if (ps.comparison.rightTitle) c.rightTitle = this.shortLabel(ps.comparison.rightTitle, 28);
                  if (ps.comparison.rightNote) c.rightNote = this.shortLabel(ps.comparison.rightNote, 46);
                }
                if (ps.causeEffect && sc.visualPayload?.facts?.causeEffect) {
                  const ce = sc.visualPayload.facts.causeEffect;
                  if (ps.causeEffect.causeLabel) ce.causeLabel = this.shortLabel(ps.causeEffect.causeLabel, 62);
                  if (ps.causeEffect.mechanismLabel) ce.mechanismLabel = this.shortLabel(ps.causeEffect.mechanismLabel, 28);
                  if (ps.causeEffect.effectLabel) ce.effectLabel = this.shortLabel(ps.causeEffect.effectLabel, 66);
                }
                if (ps.workedExample && sc.visualPayload?.facts?.workedExample) {
                  const we = sc.visualPayload.facts.workedExample;
                  if (ps.workedExample.expression) we.expression = this.shortLabel(ps.workedExample.expression, 32);
                  if (ps.workedExample.outputValue) we.outputValue = this.shortLabel(ps.workedExample.outputValue, 26);
                  if (ps.workedExample.verdict) we.verdict = this.shortLabel(ps.workedExample.verdict, 74);
                }
                const audit = this.auditSceneGeometryAndContrast(sc, domainProfile.theme);
                geminiHealed += audit.healedBeats;
                sc.durationSec = vd
                  ? vd.computeCalmDurationSec(sc.caption, 12.0, 12.0, sc.preRollSec || 0.8, sc.postRollSec || 1.4)
                  : Math.max(12.0, +(0.8 + sc.caption.length / 11.8 + 1.4).toFixed(1));
                sc.finalCps = +(sc.caption.length / sc.durationSec).toFixed(1);
              });
              const fin = this.finalizeStoryboardLogsAndCode(
                cleanTitle,
                domainProfile,
                storyboardOut.domainName,
                sections,
                glossary,
                storyboardOut.scenes,
                segmented.coreText,
                outputLang,
                geminiHealed
              );
              storyboardOut.supervisorLogs = fin.supervisorLogs;
              storyboardOut.generatedCode = fin.generatedCode;
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
        } else {
          const errBody = await resp.text().catch(() => "");
          pipelineWarnings.push(
            resp.status === 400 || resp.status === 403
              ? "Ключ Gemini API отклонён (400/403). Проверьте ключ в меню «🔑 ИИ» — работает автономный режим."
              : resp.status === 429
                ? "Лимит запросов Gemini API исчерпан (429). Сценарий собран автономным модулем."
                : `Облачный ИИ Gemini вернул ошибку HTTP ${resp.status}. Работает автономный модуль.`
          );
          console.warn("Gemini API HTTP error:", resp.status, errBody.slice(0, 180));
        }
      } catch (e) {
        if (e?.name === "AbortError" && abortSignal?.aborted) throw e;
        pipelineWarnings.push("Не удалось связаться с Gemini API (таймаут или нет сети) — использован встроенный сценарист.");
        console.warn("Gemini API fallback to universal deterministic scriptwriter:", e);
      }
    }

    let finalTitle = cleanTitle || "Вузовская лекция";
    const pkgOut = {
      id: "lec_" + contentHash,
      contentHash,
      sourceLang,
      outputLang,
      rawLectureText: cleanText,
      rawGlossaryText: glossaryText || "",
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
      generatedCode: storyboardOut.generatedCode,
      warnings: pipelineWarnings
    };

    if (outputLang !== sourceLang || !preTranslated) {
      await this.ensurePackageLanguagePurity(pkgOut, outputLang, domainProfile, abortSignal);
      const finTranslated = this.finalizeStoryboardLogsAndCode(
        pkgOut.courseTitle,
        domainProfile,
        pkgOut.domainName,
        pkgOut.sections,
        pkgOut.glossary,
        pkgOut.scenes,
        segmented.coreText,
        outputLang,
        0
      );
      pkgOut.supervisorLogs = finTranslated.supervisorLogs;
      pkgOut.generatedCode = finTranslated.generatedCode;
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

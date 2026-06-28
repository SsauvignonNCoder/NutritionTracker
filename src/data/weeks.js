// Данные по неделям: план питания + список покупок.
// Чтобы добавить новую неделю — скопируй один объект из WEEKS, поменяй id/даты/recipeId-ссылки и список покупок.
// recipeId должен совпадать с id из recipes.js

export const WEEKS = [
  {
    id: '2026-06-29',
    label: '29.06 — 05.07',
    note: 'Среднее за день: ~1900–2000 ккал · Б 145–155 г · Вес 62 кг · рост 163 см · тренировка вечером 18:00–19:00',
    weekOfTheWeek: {
      title: 'Пенновани — грузинский омлет',
      desc: 'Яйца взбить с творогом, зеленью (кинза, укроп) и щепоткой соли, обжарить на сухой сковороде 4–5 мин под крышкой на слабом огне.',
    },
    logic: 'Чахохбили и куриная грудка с гречкой повторяются как опорные блюда. Хинкали и кучмачи — 1 раз в неделю как более калорийное разнообразие.',
    days: [
      {
        day: 'ПН', date: '29.06', kcal: 1950,
        breakfast: 'b3-tvorog-grechka-yagody',
        lunch: 'l1-chahohbili-kuritsa-ovoschi',
        pretrain: 'p3-proteinovyy-sheyk-banan',
        dinner: 'd1-lobio-legkoe-kurinaya-grudka',
      },
      {
        day: 'ВТ', date: '30.06', kcal: 1900,
        breakfast: 'b1-ovsyanka-banan-arahis',
        lunch: 'l4-kurinaya-grudka-kavkazski-grechka',
        pretrain: 'p2-ris-kuritsa-legkaya-portsiya',
        dinner: 'd3-tvorog-ovoschi-zelen',
      },
      {
        day: 'СР', date: '01.07', kcal: 2020,
        breakfast: 'b2-yaichnitsa-avokado-tost',
        lunch: 'l3-kuchmachi-govyadina-granat-orehi',
        pretrain: 'p1-tost-med-banan',
        dinner: 'd2-odzhahuri-oblegchennaya',
      },
      {
        day: 'ЧТ', date: '02.07', kcal: 1880,
        breakfast: 'b5-grecheskiy-yogurt-orehi-yagody',
        lunch: 'l2-lobio-lavash',
        lunchNote: '+ 100 г творога',
        pretrain: 'p3-proteinovyy-sheyk-banan',
        dinner: 'd1-lobio-legkoe-kurinaya-grudka',
      },
      {
        day: 'ПТ', date: '03.07', kcal: 1960,
        breakfast: 'b4-pankeyki-bez-proteina',
        lunch: 'l1-chahohbili-kuritsa-ovoschi',
        pretrain: 'p2-ris-kuritsa-legkaya-portsiya',
        dinner: 'd3-tvorog-ovoschi-zelen',
      },
      {
        day: 'СБ', date: '04.07', kcal: 2050,
        breakfast: null,
        breakfastCustom: 'Пенновани — грузинский омлет с творогом и зеленью (350 ккал · Б27 Ж24 У14)',
        lunch: 'l5-hinkali-govyadina',
        pretrain: 'p1-tost-med-banan',
        dinner: 'd2-odzhahuri-oblegchennaya',
      },
      {
        day: 'ВС', date: '05.07', kcal: 1900,
        breakfast: 'b3-tvorog-grechka-yagody',
        lunch: 'l4-kurinaya-grudka-kavkazski-grechka',
        pretrain: 'p3-proteinovyy-sheyk-banan',
        dinner: 'd1-lobio-legkoe-kurinaya-grudka',
      },
    ],
    supplements: [
      { name: 'Протеин', timing: 'отдельно от белковых блюд' },
      { name: 'Креатин', timing: 'после тренировки' },
      { name: 'Коллаген / рыбий жир', timing: 'с жирной едой' },
      { name: 'Магний', timing: 'вечером, перед сном' },
    ],
    shoppingList: {
      pantry: {
        title: 'Купить сразу на всю неделю',
        subtitle: 'Хранится долго — холодильник/морозилка/полка',
        groups: [
          {
            title: 'Белок (заморозка/холодильник)',
            items: [
              'Куриная грудка/филе — ~2400 г',
              'Говядина (вырезка + фарш) — ~710 г',
              'Свинина/говядина нежирная — 660 г',
              'Творог 5% — 1700 г',
              'Яйца — 17 шт',
              'Протеин сывороточный — есть запас',
            ],
          },
          {
            title: 'Крупы, бобовые, мука',
            items: [
              'Гречка — 420 г',
              'Рис — 200 г',
              'Овсянка — 130 г',
              'Овсяная мука — 85 г',
              'Мука пшеничная — 470 г',
              'Красная фасоль (сухая/баночная) — ~450 г сух.',
            ],
          },
          {
            title: 'Бакалея и приправы',
            items: [
              'Арахисовая паста — банка',
              'Мёд — небольшая банка',
              'Оливковое масло — бутылка',
              'Соевый соус — бутылка',
              'Грецкие орехи — 100 г',
              'Миндаль — 15 г',
              'Хмели-сунели — есть запас',
              'Уцхо-сунели — есть запас',
              'Зира — есть запас',
              'Разрыхлитель — есть запас',
              'Соль, чёрный перец — есть запас',
            ],
          },
          {
            title: 'Овощи долгого хранения',
            items: [
              'Лук — 5–6 шт',
              'Чеснок — 2 головки',
              'Картофель — 460 г',
            ],
          },
        ],
        footnote: 'Творог и грудку удобно сразу разделить порционно и заморозить часть — на ЧТ–ВС.',
      },
      fresh: {
        title: 'Докупать свежим в течение недели',
        subtitle: 'Срок хранения 2–4 дня — берём двумя заходами',
        batches: [
          {
            title: 'Заход 1 (на ПН–СР)',
            items: [
              'Бананы — 5 шт',
              'Авокадо — 1 шт',
              'Помидоры — 4 шт',
              'Болгарский перец — 3 шт',
              'Баклажан — 1 шт',
              'Гранат — 0.5 шт',
              'Ягоды (черника/клубника) — 150 г',
              'Молоко 2.5% — 450 мл',
              'Греческий йогурт — 380 г',
              'Кинза/зелень — 2 пучка',
              'Хлеб цельнозерновой — 1 буханка',
            ],
          },
          {
            title: 'Заход 2 (на ЧТ–ВС)',
            items: [
              'Бананы — 4 шт',
              'Помидоры — 2 шт',
              'Огурец — 4 шт',
              'Болгарский перец — 3 шт',
              'Ягоды — 150 г',
              'Зелень (кинза/укроп) — 2 пучка',
              'Лаваш — 1–2 шт',
              'Хлеб белый/цельнозерновой — для тостов',
            ],
          },
        ],
        footnote: 'Зелень и помидоры быстро портятся — лучше брать на 3–4 дня вперёд, а не сразу на неделю.',
      },
      overallFootnote: 'Подгоняй на глаз под реальные упаковки в магазине.',
    },
  },
];

export const getWeekById = (id) => WEEKS.find((w) => w.id === id);
export const getLatestWeek = () => WEEKS[WEEKS.length - 1];

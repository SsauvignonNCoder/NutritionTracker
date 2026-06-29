// Данные по неделям: план питания. Список покупок считается автоматически
// из ингредиентов выбранных рецептов (см. функцию buildShoppingList в App.jsx) —
// отдельно прописывать его вручную не нужно.
//
// Чтобы добавить новую неделю — скопируй один объект из WEEKS, поменяй id/даты/recipeId-ссылки.
// recipeId должен совпадать с id из recipes.js
//
// Слоты дня: breakfast / lunch / pretrain / dinner / snack (доп. перекус — добавлен,
// чтобы выйти на целевой калораж после точного пересчёта КБЖУ по стандартным таблицам;
// snack может быть любым рецептом из каталога, без ограничения по mealType).
//
// Если в какой-то день блюдо не из каталога рецептов (например, разовое "новое блюдо недели")
// или к обычному рецепту нужна ручная добавка ("+100 г творога") — используй breakfastCustom/
// lunchNote для текста на экране и breakfastExtra/lunchExtra (массив или один объект
// { item, label, qty, unit, category, shelfLife }) — это попадёт в расчёт списка покупок
// так же, как обычный ингредиент рецепта.

export const WEEKS = [
  {
    id: '2026-06-29',
    label: '29.06 — 05.07',
    note: 'Среднее за день: ~1900–2000 ккал · Б 145–155 г · Вес 62 кг · рост 163 см · тренировка вечером 18:00–19:00. КБЖУ блюд пересчитаны по стандартным таблицам — добавлен доп. перекус (snack) на каждый день, чтобы вернуться к целевому калоражу.',
    weekOfTheWeek: {
      title: 'Пенновани — грузинский омлет',
      desc: 'Яйца взбить с творогом, зеленью (кинза, укроп) и щепоткой соли, обжарить на сухой сковороде 4–5 мин под крышкой на слабом огне.',
    },
    logic: 'Чахохбили и куриная грудка с гречкой повторяются как опорные блюда. Хинкали и кучмачи — 1 раз в неделю как более калорийное разнообразие.',
    days: [
      {
        day: 'ПН', date: '29.06', kcal: 1977,
        breakfast: 'b3-tvorog-grechka-yagody',
        lunch: 'l1-chahohbili-kuritsa-ovoschi',
        pretrain: 'p3-proteinovyy-sheyk-banan',
        dinner: 'd1-lobio-legkoe-kurinaya-grudka',
        snack: 'b5-grecheskiy-yogurt-orehi-yagody',
      },
      {
        day: 'ВТ', date: '30.06', kcal: 1901,
        breakfast: 'b1-ovsyanka-banan-arahis',
        lunch: 'l4-kurinaya-grudka-kavkazski-grechka',
        pretrain: 'p2-ris-kuritsa-legkaya-portsiya',
        dinner: 'd3-tvorog-ovoschi-zelen',
        snack: 'b5-grecheskiy-yogurt-orehi-yagody',
      },
      {
        day: 'СР', date: '01.07', kcal: 1962,
        breakfast: 'b2-yaichnitsa-avokado-tost',
        lunch: 'l3-kuchmachi-govyadina-granat-orehi',
        pretrain: 'p1-tost-med-banan',
        dinner: 'd2-odzhahuri-oblegchennaya',
        snack: 'p3-proteinovyy-sheyk-banan',
      },
      {
        day: 'ЧТ', date: '02.07', kcal: 1936,
        breakfast: 'b5-grecheskiy-yogurt-orehi-yagody',
        lunch: 'l2-lobio-lavash',
        lunchNote: '+ 100 г творога',
        lunchExtra: { item: 'cottage_cheese', label: 'Творог 5%', qty: 100, unit: 'г', category: 'dairy', shelfLife: 'fresh' },
        pretrain: 'p3-proteinovyy-sheyk-banan',
        dinner: 'd1-lobio-legkoe-kurinaya-grudka',
        snack: 'b5-grecheskiy-yogurt-orehi-yagody',
      },
      {
        day: 'ПТ', date: '03.07', kcal: 1782,
        breakfast: 'b4-pankeyki-bez-proteina',
        lunch: 'l1-chahohbili-kuritsa-ovoschi',
        pretrain: 'p2-ris-kuritsa-legkaya-portsiya',
        dinner: 'd3-tvorog-ovoschi-zelen',
        snack: 'b5-grecheskiy-yogurt-orehi-yagody',
      },
      {
        day: 'СБ', date: '04.07', kcal: 2025,
        breakfast: null,
        breakfastCustom: 'Пенновани — грузинский омлет с творогом и зеленью (355 ккал · Б36 Ж21 У4)',
        breakfastExtra: [
          { item: 'eggs', label: 'Яйца', qty: 3, unit: 'шт', category: 'protein', shelfLife: 'long' },
          { item: 'cottage_cheese', label: 'Творог 5%', qty: 100, unit: 'г', category: 'dairy', shelfLife: 'fresh' },
          { item: 'herbs_dill_parsley', label: 'Зелень (кинза/укроп)', qty: 1, unit: 'пучок', category: 'produce', shelfLife: 'fresh' },
        ],
        lunch: 'l5-hinkali-govyadina',
        pretrain: 'p1-tost-med-banan',
        dinner: 'd2-odzhahuri-oblegchennaya',
        snack: 'p3-proteinovyy-sheyk-banan',
      },
      {
        day: 'ВС', date: '05.07', kcal: 1966,
        breakfast: 'b3-tvorog-grechka-yagody',
        lunch: 'l4-kurinaya-grudka-kavkazski-grechka',
        pretrain: 'p3-proteinovyy-sheyk-banan',
        dinner: 'd1-lobio-legkoe-kurinaya-grudka',
        snack: 'b5-grecheskiy-yogurt-orehi-yagody',
      },
    ],
    supplements: [
      { name: 'Протеин', timing: 'отдельно от белковых блюд' },
      { name: 'Креатин', timing: 'после тренировки' },
      { name: 'Коллаген / рыбий жир', timing: 'с жирной едой' },
      { name: 'Магний', timing: 'вечером, перед сном' },
    ],
  },
];

export const getWeekById = (id) => WEEKS.find((w) => w.id === id);
export const getLatestWeek = () => WEEKS[WEEKS.length - 1];

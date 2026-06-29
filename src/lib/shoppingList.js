// Автоматический расчёт списка покупок из плана недели.
// Логика: проходим по всем 7 дням недели, собираем ингредиенты всех выбранных
// рецептов (+ ручные добавки вроде "breakfastExtra"), суммируем одинаковые
// продукты (по полю item) и раскладываем по категориям и сроку хранения.
//
// Все ингредиенты в данных хранятся в граммах/мл для точного сложения.
// Но в магазине авокадо или хлеб не продаются "по 73 грамма" — поэтому для
// штучных продуктов (PIECE_WEIGHTS) список переводит итоговые граммы обратно
// в штуки и округляет ВВЕРХ (нельзя купить половину авокадо).
//
// Свежие продукты (shelfLife: 'fresh') разбиваются на два захода закупки —
// неделя делится на блок ПН–СР (закупка в Вс/Пн) и блок ЧТ–ВС (закупка в Ср) —
// чтобы не покупать всё сразу на 7 дней и не портить продукты с коротким сроком.

import { RECIPES_BY_ID } from '../data/recipes.js';

const MEAL_SLOTS = ['breakfast', 'lunch', 'pretrain', 'dinner', 'snack'];

// Средний вес одной штуки для продуктов, которые физически покупаются поштучно.
// Используется только для отображения в списке покупок — данные рецептов
// при этом продолжают хранить точные граммы.
const PIECE_WEIGHTS = {
  avocado: 200, banana: 120, bell_pepper: 150, cucumber: 150,
  eggs: 50, lavash: 60, onion: 100, tomato: 150,
  bread: 30, bread_wholegrain: 30,
};

// Разбивка недели на два блока закупки свежих продуктов.
// dayIndex 0-2 = ПН-СР (первый блок, закупка в Вс/Пн)
// dayIndex 3-6 = ЧТ-ВС (второй блок, закупка в Ср)
const FRESH_BATCHES = [
  { key: 'batch1', label: 'Заход 1 — купить в Вс/Пн (на ПН–СР)', dayIndexes: [0, 1, 2] },
  { key: 'batch2', label: 'Заход 2 — купить в Ср (на ЧТ–ВС)', dayIndexes: [3, 4, 5, 6] },
];

// Собирает массив ингредиентов одного дня (из рецептов + ручных Extra-добавок).
// Если блюдо заменено через override, ручная Extra-добавка к старому блюду
// больше не применяется, так как относилась именно к исходному рецепту.
function collectDayIngredients(day, dayIndex, getOverride) {
  const collected = [];

  MEAL_SLOTS.forEach((slot) => {
    const overrideRecipeId = getOverride ? getOverride(dayIndex, slot) : null;
    const recipeId = overrideRecipeId || day[slot];

    if (recipeId) {
      const recipe = RECIPES_BY_ID[recipeId];
      if (recipe) collected.push(...recipe.ingredients);
    }

    if (!overrideRecipeId) {
      const extraKey = `${slot}Extra`;
      const extra = day[extraKey];
      if (extra) {
        const extraList = Array.isArray(extra) ? extra : [extra];
        collected.push(...extraList);
      }
    }
  });

  return collected;
}

// Суммирует список ингредиентов по item+unit.
function aggregateIngredients(allIngredients) {
  const byKey = new Map();

  allIngredients.forEach((item) => {
    if (!item || item.shelfLife === 'skip') return;
    const key = `${item.item}__${item.unit}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        item: item.item,
        label: item.label,
        unit: item.unit,
        qty: 0,
        hasQty: false,
        category: item.category,
        shelfLife: item.shelfLife,
        count: 0,
      });
    }
    const agg = byKey.get(key);
    agg.count += 1;
    if (typeof item.qty === 'number') {
      agg.qty += item.qty;
      agg.hasQty = true;
    }
  });

  return [...byKey.values()];
}

// Форматирует количество для отображения в списке покупок.
// multiplier — коэффициент порций (1 = ровно по рецептам, 2 = на двоих и т.д.)
function formatQty(agg, multiplier) {
  if (!agg.hasQty) {
    return agg.count > 1 ? `× ${agg.count} раза за неделю` : 'по необходимости';
  }

  const totalGrams = agg.qty * multiplier;
  const pieceWeight = PIECE_WEIGHTS[agg.item];

  if (pieceWeight && agg.unit === 'г') {
    // Штучный продукт: переводим граммы в штуки и округляем ВВЕРХ —
    // нельзя купить половину авокадо или 4.3 ломтика хлеба
    const pieces = Math.ceil(totalGrams / pieceWeight);
    const roundedGrams = Math.round(totalGrams);
    return `${pieces} шт (≈${roundedGrams} г)`;
  }

  const q = Math.round(totalGrams);
  return `${q} ${agg.unit}`;
}

// Группирует агрегированные позиции по категориям, сортируя категории в заданном порядке.
function groupByCategory(aggregatedItems, categoriesMeta, multiplier) {
  const groups = {};
  aggregatedItems.forEach((agg) => {
    if (!groups[agg.category]) groups[agg.category] = [];
    groups[agg.category].push(agg);
  });

  return Object.entries(groups)
    .map(([key, items]) => ({
      key,
      title: categoriesMeta[key]?.label || key,
      order: categoriesMeta[key]?.order ?? 99,
      items: items
        .map((agg) => ({ ...agg, display: `${agg.label} — ${formatQty(agg, multiplier)}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.order - b.order);
}

// Главная функция: строит полный список покупок для недели.
// categoriesMeta — объект CATEGORIES из recipes.js (label + order на каждую категорию)
// multiplier — коэффициент порций, по умолчанию 1 (ровно по рецептам, без запаса)
// getOverride(dayIndex, mealSlot) — опциональная функция, возвращающая id рецепта-замены
// (из useMealOverrides), если пользователь отредактировал план
//
// Возвращает:
//   { long: [...группы...], freshBatches: [{ key, label, groups: [...] }, ...] }
// "long" — единый список на всю неделю (хранится долго).
// "freshBatches" — свежие продукты, разбитые на два захода закупки по дням использования.
export function buildShoppingList(week, categoriesMeta, multiplier = 1, getOverride = null) {
  if (!week) return { long: [], freshBatches: [] };

  // long-список считается по всей неделе сразу — срок хранения позволяет
  const allIngredients = week.days.flatMap((day, dayIndex) => collectDayIngredients(day, dayIndex, getOverride));
  const aggregated = aggregateIngredients(allIngredients);
  const longItems = aggregated.filter((a) => a.shelfLife === 'long');
  const long = groupByCategory(longItems, categoriesMeta, multiplier);

  // fresh-список считается отдельно для каждого блока дней (заход 1 / заход 2)
  const freshBatches = FRESH_BATCHES.map((batch) => {
    const batchIngredients = batch.dayIndexes.flatMap((dayIndex) =>
      collectDayIngredients(week.days[dayIndex], dayIndex, getOverride)
    );
    const batchAggregated = aggregateIngredients(batchIngredients).filter((a) => a.shelfLife === 'fresh');
    return {
      key: batch.key,
      label: batch.label,
      groups: groupByCategory(batchAggregated, categoriesMeta, multiplier),
    };
  });

  return { long, freshBatches };
}

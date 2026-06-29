// Автоматический расчёт списка покупок из плана недели.
// Логика: проходим по всем 7 дням недели, собираем ингредиенты всех выбранных
// рецептов (+ ручные добавки вроде "breakfastExtra"), суммируем одинаковые
// продукты (по полю item) и раскладываем по категориям и сроку хранения.

import { RECIPES_BY_ID } from '../data/recipes.js';

const MEAL_SLOTS = ['breakfast', 'lunch', 'pretrain', 'dinner', 'snack'];

// Собирает массив ингредиентов одного дня (из рецептов + ручных Extra-добавок).
// overridesForDay — объект { mealSlot: recipeId } с заменами блюд для этого дня
// (если блюдо заменено, ручная Extra-добавка к старому блюду больше не применяется,
// так как относилась именно к исходному рецепту).
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
// Если у одного item встречаются разные unit — считаем их раздельными строками
// (это сигнал, что в данных стоит унифицировать единицу для этого продукта).
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
        count: 0, // сколько раз встретился — пригодится для "по вкусу"/щепоток
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
    // Позиции без числа (щепотка, по вкусу) — просто отмечаем, что нужно докупить/иметь под рукой
    return agg.count > 1 ? `× ${agg.count} раза за неделю` : 'по необходимости';
  }
  // Округляем до 1 знака после запятой, если есть остаток
  const q = Math.round(agg.qty * multiplier * 10) / 10;
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
export function buildShoppingList(week, categoriesMeta, multiplier = 1, getOverride = null) {
  if (!week) return { long: [], fresh: [] };

  const allIngredients = week.days.flatMap((day, dayIndex) => collectDayIngredients(day, dayIndex, getOverride));
  const aggregated = aggregateIngredients(allIngredients);

  const longItems = aggregated.filter((a) => a.shelfLife === 'long');
  const freshItems = aggregated.filter((a) => a.shelfLife === 'fresh');

  return {
    long: groupByCategory(longItems, categoriesMeta, multiplier),
    fresh: groupByCategory(freshItems, categoriesMeta, multiplier),
  };
}

// Хук для редактирования плана недели: хранит переопределения блюд
// (какой день/приём заменён на какой рецепт) поверх дефолтного плана
// из weeks.js, и сохраняет их в Supabase — навсегда, без логина
// (общие на всех, кто открывает сайт; этого достаточно, раз сайт
// личный и без аккаунтов).
//
// Таблица в Supabase: meal_overrides
//   week_id     text
//   day_index   int
//   meal_slot   text  ('breakfast' | 'lunch' | 'pretrain' | 'dinner')
//   recipe_id   text
//   updated_at  timestamptz
// Уникальный ключ: (week_id, day_index, meal_slot)

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, isMissingTableError } from './supabase.js';

const TABLE = 'meal_overrides';

export function useMealOverrides(weekId) {
  const [overrides, setOverrides] = useState({}); // { "dayIndex:mealSlot": recipeId }
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  useEffect(() => {
    if (!weekId) return;
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoaded(false);
      try {
        const { data, error: err } = await supabase
          .from(TABLE)
          .select('day_index, meal_slot, recipe_id')
          .eq('week_id', weekId);
        if (cancelled) return;
        if (err) {
          if (isMissingTableError(err)) {
            // Схема ещё не применена — работаем на дефолтном плане, без красной ошибки
            console.warn('Таблица meal_overrides не найдена — запусти supabase/schema.sql.', err);
            setSchemaMissing(true);
            setError(null);
          } else {
            console.error('Supabase select error:', err);
            setError(`Не удалось загрузить изменения плана: ${err.message || err.code || 'неизвестная ошибка'}`);
          }
        } else {
          setSchemaMissing(false);
          const map = {};
          (data || []).forEach((row) => {
            map[`${row.day_index}:${row.meal_slot}`] = row.recipe_id;
          });
          setOverrides(map);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('Supabase network/exception error:', e);
        setError(`Не удалось загрузить изменения плана: ${e.message || 'ошибка сети'}`);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [weekId]);

  // Заменяет блюдо дня. recipeId === null -> вернуть дефолтное блюдо из weeks.js (удалить override)
  const setOverride = useCallback(async (dayIndex, mealSlot, recipeId) => {
    const key = `${dayIndex}:${mealSlot}`;

    if (recipeId === null) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (isSupabaseConfigured) {
        const { error: err } = await supabase
          .from(TABLE)
          .delete()
          .eq('week_id', weekId)
          .eq('day_index', dayIndex)
          .eq('meal_slot', mealSlot);
        if (err && !isMissingTableError(err)) setError('Не удалось сохранить изменение');
      }
      return;
    }

    setOverrides((prev) => ({ ...prev, [key]: recipeId }));

    if (isSupabaseConfigured) {
      const { error: err } = await supabase
        .from(TABLE)
        .upsert(
          {
            week_id: weekId,
            day_index: dayIndex,
            meal_slot: mealSlot,
            recipe_id: recipeId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'week_id,day_index,meal_slot' }
        );
      if (err && !isMissingTableError(err)) setError('Не удалось сохранить изменение');
    }
  }, [weekId]);

  const getOverride = useCallback((dayIndex, mealSlot) => {
    return overrides[`${dayIndex}:${mealSlot}`] ?? null;
  }, [overrides]);

  const hasOverride = useCallback((dayIndex, mealSlot) => {
    return Object.prototype.hasOwnProperty.call(overrides, `${dayIndex}:${mealSlot}`);
  }, [overrides]);

  return { loaded, error, schemaMissing, setError, getOverride, hasOverride, setOverride, isSupabaseConfigured };
}

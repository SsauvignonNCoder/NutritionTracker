// Хук для редактируемого списка БАДов: добавление, удаление, изменение
// порции/единицы/времени приёма. Хранится в Supabase — общий список,
// не привязан к неделе (БАДы принимаются постоянно).

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, isMissingTableError } from './supabase.js';

const TABLE = 'supplements';

const DEFAULT_SUPPLEMENTS = [
  { name: 'Протеин', amount: null, unit: null, timing: 'отдельно от белковых блюд' },
  { name: 'Креатин', amount: null, unit: null, timing: 'после тренировки' },
  { name: 'Коллаген / рыбий жир', amount: null, unit: null, timing: 'с жирной едой' },
  { name: 'Магний', amount: null, unit: null, timing: 'вечером, перед сном' },
];

function rowToSupplement(row) {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount != null ? Number(row.amount) : null,
    unit: row.unit,
    timing: row.timing,
    sortOrder: row.sort_order,
  };
}

export function useSupplements() {
  const [supplements, setSupplements] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from(TABLE)
        .select('*')
        .order('sort_order', { ascending: true });
      if (err) {
        if (isMissingTableError(err)) {
          console.warn('Таблица supplements не найдена — запусти supabase/schema.sql.', err);
        } else {
          console.error('Supabase supplements select error:', err);
          setError(`Не удалось загрузить БАДы: ${err.message || err.code}`);
        }
      } else if (data && data.length > 0) {
        setSupplements(data.map(rowToSupplement));
      } else if (data && data.length === 0) {
        // Таблица пуста — заполняем стандартным набором при первом запуске
        const inserts = DEFAULT_SUPPLEMENTS.map((s, i) => ({ ...s, sort_order: i }));
        const { data: inserted, error: insertErr } = await supabase.from(TABLE).insert(inserts).select();
        if (!insertErr && inserted) setSupplements(inserted.map(rowToSupplement));
      }
    } catch (e) {
      console.error('Supabase supplements exception:', e);
      setError(`Не удалось загрузить БАДы: ${e.message || 'ошибка сети'}`);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addSupplement = useCallback(async (supplement) => {
    const tempId = `temp-${Date.now()}`;
    const nextSortOrder = supplements.length;
    const optimistic = { id: tempId, sortOrder: nextSortOrder, ...supplement };
    setSupplements((prev) => [...prev, optimistic]);

    if (!isSupabaseConfigured) return;
    const { data, error: err } = await supabase
      .from(TABLE)
      .insert([{ ...supplement, sort_order: nextSortOrder }])
      .select()
      .single();
    if (err && !isMissingTableError(err)) {
      console.error('Supabase supplement insert error:', err);
      setError(`Не удалось сохранить БАД: ${err.message || err.code}`);
    } else if (data) {
      setSupplements((prev) => prev.map((s) => (s.id === tempId ? rowToSupplement(data) : s)));
    }
  }, [supplements]);

  const updateSupplement = useCallback(async (id, patch) => {
    setSupplements((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    if (!isSupabaseConfigured || id.startsWith('temp-')) return;
    const dbPatch = {};
    if ('name' in patch) dbPatch.name = patch.name;
    if ('amount' in patch) dbPatch.amount = patch.amount;
    if ('unit' in patch) dbPatch.unit = patch.unit;
    if ('timing' in patch) dbPatch.timing = patch.timing;
    dbPatch.updated_at = new Date().toISOString();
    const { error: err } = await supabase.from(TABLE).update(dbPatch).eq('id', id);
    if (err && !isMissingTableError(err)) {
      console.error('Supabase supplement update error:', err);
      setError(`Не удалось сохранить изменение: ${err.message || err.code}`);
    }
  }, []);

  const removeSupplement = useCallback(async (id) => {
    setSupplements((prev) => prev.filter((s) => s.id !== id));
    if (!isSupabaseConfigured || id.startsWith('temp-')) return;
    const { error: err } = await supabase.from(TABLE).delete().eq('id', id);
    if (err && !isMissingTableError(err)) {
      console.error('Supabase supplement delete error:', err);
      setError(`Не удалось удалить БАД: ${err.message || err.code}`);
    }
  }, []);

  return { supplements, loaded, error, addSupplement, updateSupplement, removeSupplement, isSupabaseConfigured };
}

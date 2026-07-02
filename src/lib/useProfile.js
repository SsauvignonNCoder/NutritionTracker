// Хук для хранения профиля пользователя (рост/вес/возраст/пол/активность/цель)
// в Supabase — навсегда, без повторного ввода при следующем визите.
// Сайт без логина — профиль один, общий (id = 'main').

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, isMissingTableError } from './supabase.js';

const TABLE = 'user_profile';
const ROW_ID = 'main';

const DEFAULT_PROFILE = {
  sex: 'male',
  age: 30,
  heightCm: 170,
  weightKg: 70,
  activity: 1.375,
  goal: 'recomp',
};

function rowToProfile(row) {
  if (!row) return DEFAULT_PROFILE;
  return {
    sex: row.sex,
    age: row.age,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    activity: Number(row.activity),
    goal: row.goal,
  };
}

export function useProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from(TABLE)
          .select('*')
          .eq('id', ROW_ID)
          .maybeSingle();
        if (cancelled) return;
        if (err) {
          if (isMissingTableError(err)) {
            console.warn('Таблица user_profile не найдена — запусти supabase/schema.sql.', err);
          } else {
            console.error('Supabase profile select error:', err);
            setError(`Не удалось загрузить профиль: ${err.message || err.code}`);
          }
        } else if (data) {
          setProfile(rowToProfile(data));
        }
      } catch (e) {
        if (cancelled) return;
        console.error('Supabase profile exception:', e);
        setError(`Не удалось загрузить профиль: ${e.message || 'ошибка сети'}`);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveProfile = useCallback(async (next) => {
    setProfile(next);
    if (!isSupabaseConfigured) return;
    try {
      const { error: err } = await supabase
        .from(TABLE)
        .upsert(
          {
            id: ROW_ID,
            sex: next.sex,
            age: next.age,
            height_cm: next.heightCm,
            weight_kg: next.weightKg,
            activity: next.activity,
            goal: next.goal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      if (err && !isMissingTableError(err)) {
        console.error('Supabase profile save error:', err);
        setError(`Не удалось сохранить профиль: ${err.message || err.code}`);
      }
    } catch (e) {
      console.error('Supabase profile save exception:', e);
      setError(`Не удалось сохранить профиль: ${e.message || 'ошибка сети'}`);
    }
  }, []);

  return { profile, loaded, error, saveProfile, isSupabaseConfigured };
}

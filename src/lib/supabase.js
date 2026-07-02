// Клиент Supabase. URL и ключ читаются из переменных окружения Vite —
// задаются в .env (локально) и в настройках проекта на Vercel
// (Settings → Environment Variables), для Production И Preview.
//
// VITE_SUPABASE_URL=...      (только базовый домен, БЕЗ пути /rest/v1/)
// VITE_SUPABASE_ANON_KEY=...

import { createClient } from '@supabase/supabase-js';

// Нормализуем URL: оставляем только базовый домен (origin).
// Самая частая причина ошибки "Не удалось загрузить изменения плана" —
// в VITE_SUPABASE_URL случайно попал путь вроде /rest/v1/ или слэш в конце,
// из-за чего каждый запрос уходит на несуществующий адрес и возвращает 404.
// new URL(...).origin отрезает любой путь/квери и оставляет https://xxxx.supabase.co
function normalizeSupabaseUrl(raw) {
  if (!raw) return raw;
  const trimmed = String(raw).trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  ? String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim()
  : undefined;

// Если переменные не заданы (например, проект Supabase ещё не подключен),
// приложение не должно падать — просто редактирование плана не будет сохраняться.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;

// Отличает ошибку "таблицы ещё нет" (schema.sql не запускали) от настоящих
// сбоев. В этом случае приложение продолжает работать на дефолтном плане,
// а не пугает красной ошибкой — просто изменения не сохраняются, пока не
// применена схема.
export function isMissingTableError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg = `${err.message || ''} ${err.details || ''} ${err.hint || ''}`.toLowerCase();
  return (
    code === '42P01' ||           // Postgres: relation does not exist
    code === 'PGRST205' ||        // PostgREST: table not found in schema cache
    code === 'PGRST202' ||        // PostgREST: not found
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

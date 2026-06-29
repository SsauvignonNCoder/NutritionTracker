// Клиент Supabase. URL и ключ читаются из переменных окружения Vite —
// задаются в .env (локально) и в настройках проекта на Vercel
// (Settings → Environment Variables), для Production И Preview.
//
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Если переменные не заданы (например, проект Supabase ещё не подключен),
// приложение не должно падать — просто редактирование плана не будет сохраняться.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;

-- Таблица для хранения замен блюд в плане недели.
-- Выполни этот скрипт в Supabase: Dashboard → SQL Editor → New query → вставить → Run.

create table if not exists meal_overrides (
  id          uuid primary key default gen_random_uuid(),
  week_id     text not null,
  day_index   int not null,
  meal_slot   text not null,
  recipe_id   text not null,
  updated_at  timestamptz not null default now(),
  unique (week_id, day_index, meal_slot)
);

-- Сайт работает без логина, поэтому открываем доступ всем (anon-ключ).
-- Это нормально для личного некоммерческого проекта без чувствительных данных.
alter table meal_overrides enable row level security;

create policy "Allow all access to meal_overrides"
  on meal_overrides
  for all
  using (true)
  with check (true);

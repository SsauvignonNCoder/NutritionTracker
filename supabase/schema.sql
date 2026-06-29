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

-- Если эта policy уже существует от первого запуска схемы — пересоздаём её,
-- чтобы точно покрывала роль anon (именно её использует anon-ключ из .env)
drop policy if exists "Allow all access to meal_overrides" on meal_overrides;

create policy "Allow all access to meal_overrides"
  on meal_overrides
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Таблица профиля пользователя для расчёта нормы КБЖУ (Миффлин-Сан Жеор).
-- Сайт без логина — здесь всегда ровно одна запись (id = 'main').
create table if not exists user_profile (
  id            text primary key default 'main',
  sex           text not null default 'male',     -- 'male' | 'female'
  age           int not null default 30,
  height_cm     numeric not null default 170,
  weight_kg     numeric not null default 70,
  activity      numeric not null default 1.3,      -- коэффициент активности (1.2–1.9)
  goal          text not null default 'recomp',     -- 'deficit' | 'recomp' | 'maintain' | 'surplus'
  updated_at    timestamptz not null default now()
);

alter table user_profile enable row level security;

drop policy if exists "Allow all access to user_profile" on user_profile;

create policy "Allow all access to user_profile"
  on user_profile
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Таблица БАДов пользователя — редактируемый список (название, порция, единица, когда принимать).
create table if not exists supplements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  amount      numeric,
  unit        text,
  timing      text,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table supplements enable row level security;

drop policy if exists "Allow all access to supplements" on supplements;

create policy "Allow all access to supplements"
  on supplements
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ════════════════════════════════════════════════════════════════════
-- Migration 0017 — Hoja de posteos de LinkedIn (Social Media)
-- ════════════════════════════════════════════════════════════════════
-- Reemplaza el Excel "Revision_PODs_<mes>" de seguimiento de posteos.
--
--   social_accounts — una fila por cuenta/cliente (Chile, Peru, USA…)
--                     agrupadas por cuenta de LinkedIn (CU Latinoamérica…)
--                     con su plan (active = 4 posteos/mes, semi_active = 2,
--                     none = sin seguimiento automático).
--   social_posts    — un posteo por fila: cuenta, semana (lunes), título,
--                     temática, estado, fecha de publicación (opcional),
--                     link, notas.
--
-- Estados válidos: en_proceso | listo | aprobado | programado
-- Los ids de temática son los de src/constants/worldDays.js.
--
-- Incluye el seed de las 18 cuentas del Excel (idempotente por `key`).
-- Los posteos de agosto y septiembre 2026 están en
-- supabase/seed/0017_social_posts_ago_sep_2026.sql (opcional).
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Cuentas ──
create table if not exists public.social_accounts (
  id          uuid primary key default gen_random_uuid(),
  key         text unique,                       -- id estable (seed / import)
  group_name  text not null,                     -- cuenta de LinkedIn
  name        text not null,                     -- cliente / país
  plan        text not null default 'none',      -- active | semi_active | none
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_social_accounts_updated_at on public.social_accounts;
create trigger trg_social_accounts_updated_at
  before update on public.social_accounts
  for each row execute function public.set_updated_at();

-- ── Posteos ──
create table if not exists public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.social_accounts(id) on delete cascade,
  week_start  date not null,                     -- lunes de la semana
  month_key   text not null,                     -- 'YYYY-MM' del mes al que pertenece la semana
  title       text not null default '',
  theme       text,                              -- id de WORLD_DAY_THEMES (opcional)
  status      text not null default 'en_proceso',
  publish_date date,                             -- fecha pactada de publicación (opcional) → aparece en el calendario
  link        text,
  notes       text,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint social_posts_status_check
    check (status in ('en_proceso', 'listo', 'aprobado', 'programado'))
);

drop trigger if exists trg_social_posts_updated_at on public.social_posts;
create trigger trg_social_posts_updated_at
  before update on public.social_posts
  for each row execute function public.set_updated_at();

create index if not exists idx_social_posts_account on public.social_posts (account_id);
create index if not exists idx_social_posts_month   on public.social_posts (month_key);
create index if not exists idx_social_posts_week    on public.social_posts (week_start);

-- ── RLS (mismo criterio que el resto de las tablas) ──
alter table public.social_accounts enable row level security;
alter table public.social_posts    enable row level security;

drop policy if exists "auth users full access" on public.social_accounts;
create policy "auth users full access" on public.social_accounts
  for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.social_accounts;
create policy "anon temp full access" on public.social_accounts
  for all to anon using (true) with check (true);

drop policy if exists "auth users full access" on public.social_posts;
create policy "auth users full access" on public.social_posts
  for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.social_posts;
create policy "anon temp full access" on public.social_posts
  for all to anon using (true) with check (true);

-- ── Realtime ──
do $$
declare
  t text;
begin
  foreach t in array array['social_accounts', 'social_posts'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Seed de cuentas (del Excel, hoja "CANT. POSTEOS") ──
insert into public.social_accounts (key, group_name, name, plan, sort_order) values
  ('cu-latam-chile',           'CU Latinoamérica',    'Chile',            'semi_active',  10),
  ('cu-latam-peru',            'CU Latinoamérica',    'Peru',             'active',       20),
  ('cu-latam-mexico',          'CU Latinoamérica',    'Mexico',           'semi_active',  30),
  ('cu-latam-ecuador',         'CU Latinoamérica',    'Ecuador',          'semi_active',  40),
  ('cu-latam-certificaciones', 'CU Latinoamérica',    'Certificaciones',  'active',       50),
  ('cu-latam-warrant-barcos',  'CU Latinoamérica',    'Warrant & Barcos', 'active',       60),
  ('cu-latam-brasil',          'CU Latinoamérica',    'Brasil',           'none',         70),
  ('cu-norte-norte',           'CU Norte',            'Norte',            'active',       80),
  ('cu-na-usa',                'CU NorthAmerica',     'USA',              'active',       90),
  ('cu-na-canada',             'CU NorthAmerica',     'Canada',           'active',      100),
  ('cu-es-espana',             'CU España',           'España',           'active',      110),
  ('cu-pt-portugal',           'CU Portugal',         'Portugal',         'active',      120),
  ('ps-iberam-argentina',      'PS Iberia & America', 'Argentina',        'none',        130),
  ('ps-iberam-espana',         'PS Iberia & America', 'España',           'none',        140),
  ('ps-iberam-usa',            'PS Iberia & America', 'USA',              'none',        150),
  ('ps-iberam-brasil',         'PS Iberia & America', 'Brasil',           'none',        160),
  ('ps-global-ptech',          'PS Global',           'PTech',            'none',        170),
  ('ps-global-academy',        'PS Global',           'Academy',          'none',        180)
on conflict (key) do nothing;

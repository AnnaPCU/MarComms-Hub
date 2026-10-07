-- ════════════════════════════════════════════════════════════════════
-- Migration 0027 — Planes de Marketing (reemplaza la sección CRM)
-- ════════════════════════════════════════════════════════════════════
-- Réplica del Excel "Seguimiento Planes Marketing": una fila por plan
-- (una pestaña del Excel) con sus datos generales, objetivos, seguimiento
-- mensual y tareas. El Excel es la fuente de verdad: se importa desde el
-- Hub (services/marketingPlansService.js → importMarketingPlans): upsert
-- de todos los planes por nombre, después se borran los que ya no están
-- en el Excel y se registra la importación. Si el borrado fallara, volver
-- a importar lo corrige.
-- (Se intentó una función RPC atómica, pero el conector no la pudo crear.)
--
--   marketing_plans         — un plan por pestaña (name = nombre de la pestaña)
--   marketing_plan_imports  — historial de importaciones (quién, cuándo, archivo)
--
-- Las tablas crm_entities / crm_trainings (0018) NO se borran: la sección
-- CRM se sacó del Hub pero los datos quedan en la base.
--
-- Aplicada desde Claude Code con el conector de Supabase (oct 2026).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.marketing_plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  position          int  not null default 0,
  brand             text,
  country           text,
  owner             text,
  cc                text,
  follow_up_meeting text,
  next_meeting      text,
  start_month       text,
  period            text,
  note              text,
  objectives        jsonb not null default '[]'::jsonb,
  monthly           jsonb not null default '[]'::jsonb,
  tasks             jsonb not null default '[]'::jsonb,
  sheet_stats       jsonb,
  imported_at       timestamptz not null default now(),
  imported_by       text,
  source_file       text,
  created_at        timestamptz not null default now()
);

create table if not exists public.marketing_plan_imports (
  id          uuid primary key default gen_random_uuid(),
  file_name   text,
  imported_by text,
  imported_at timestamptz not null default now(),
  summary     jsonb
);

-- ── RLS (mismo criterio que el resto de las tablas) ──
alter table public.marketing_plans enable row level security;
drop policy if exists "auth users full access" on public.marketing_plans;
create policy "auth users full access" on public.marketing_plans for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.marketing_plans;
create policy "anon temp full access" on public.marketing_plans for all to anon using (true) with check (true);

alter table public.marketing_plan_imports enable row level security;
drop policy if exists "auth users full access" on public.marketing_plan_imports;
create policy "auth users full access" on public.marketing_plan_imports for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.marketing_plan_imports;
create policy "anon temp full access" on public.marketing_plan_imports for all to anon using (true) with check (true);

-- ── Realtime: que todos vean la importación al instante ──
alter publication supabase_realtime add table public.marketing_plans, public.marketing_plan_imports;

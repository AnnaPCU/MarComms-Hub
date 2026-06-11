-- ════════════════════════════════════════════════════════════════════
-- Migration 0007 — success_cases (Casos de Éxito)
-- ════════════════════════════════════════════════════════════════════
-- Tabla para los casos de éxito armados por el equipo a partir de un
-- formulario guiado. Cada caso se puede descargar como PDF.
--
-- Cómo correr:
--   Supabase Dashboard → SQL Editor → pegar → Run
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.success_cases (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  client         text,
  country        text,
  business_unit  text,
  service_type   text,            -- 'webinar' | 'campaign' | 'event' | 'content' | 'otro'
  challenge      text,            -- situación / desafío inicial
  solution       text,            -- qué hizo Marcomms
  results        text,            -- resultados narrados
  metrics        text,            -- métricas clave (leads, deals, asistentes, etc.)
  testimonial    text,            -- testimonio del cliente (opcional)
  author         text,            -- quién armó el caso (team member)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_success_cases_updated_at on public.success_cases;
create trigger trg_success_cases_updated_at
  before update on public.success_cases
  for each row execute function public.set_updated_at();

create index if not exists idx_success_cases_created_at on public.success_cases (created_at desc);
create index if not exists idx_success_cases_country    on public.success_cases (country);

-- RLS
alter table public.success_cases enable row level security;

drop policy if exists "auth users full access" on public.success_cases;
create policy "auth users full access" on public.success_cases
  for all to authenticated using (true) with check (true);

drop policy if exists "anon temp full access" on public.success_cases;
create policy "anon temp full access" on public.success_cases
  for all to anon using (true) with check (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'success_cases'
  ) then
    alter publication supabase_realtime add table public.success_cases;
  end if;
end $$;

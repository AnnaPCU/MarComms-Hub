-- ════════════════════════════════════════════════════════════════════
-- Migration 0002 — webinars
-- ════════════════════════════════════════════════════════════════════
-- Tabla para los webinars del equipo. Usa `tasks` (jsonb) para guardar
-- las 21 sub-tareas embebidas (ppt, landing, mails, banners, etc.).
--
-- Cómo correr:
--   Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.webinars (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  main_date           date,
  client              text,
  client_password     text,                       -- short string para portal cliente
  monto               numeric(12, 2) default 0,
  pais                text,
  unidad_negocio      text,
  service_owner       text,                       -- nombre del miembro (futuro FK)
  linked_campaign_id  uuid,                       -- nullable FK a campaigns.id
  asistentes          text,
  deals_created       integer default 0,
  tasks               jsonb not null default '{}'::jsonb,  -- las 21 sub-tareas
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_webinars_updated_at on public.webinars;
create trigger trg_webinars_updated_at
  before update on public.webinars
  for each row execute function public.set_updated_at();

-- Índices
create index if not exists idx_webinars_main_date     on public.webinars (main_date);
create index if not exists idx_webinars_pais          on public.webinars (pais);
create index if not exists idx_webinars_unidad        on public.webinars (unidad_negocio);
create index if not exists idx_webinars_service_owner on public.webinars (service_owner);

-- RLS
alter table public.webinars enable row level security;

drop policy if exists "auth users full access" on public.webinars;
create policy "auth users full access" on public.webinars
  for all to authenticated using (true) with check (true);

-- TEMPORAL — quitar cuando haya Supabase Auth real
drop policy if exists "anon temp full access" on public.webinars;
create policy "anon temp full access" on public.webinars
  for all to anon using (true) with check (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'webinars'
  ) then
    alter publication supabase_realtime add table public.webinars;
  end if;
end $$;

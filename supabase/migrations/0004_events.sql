-- ════════════════════════════════════════════════════════════════════
-- Migration 0004 — events
-- ════════════════════════════════════════════════════════════════════
-- Tabla para eventos (5 fases con sus tareas embebidas).
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  date                date,
  country             text,
  business_unit       text,
  client              text,
  fee                 numeric(12, 2) default 0,
  service_owner       text,
  deals_created       integer default 0,
  tasks               jsonb not null default '{}'::jsonb,         -- 5 fases con tasks
  custom_tasks        jsonb not null default '[]'::jsonb,         -- tareas extra
  removed_defaults    text[] default array[]::text[],             -- IDs default removidos
  participants        jsonb default '[]'::jsonb,                  -- usuarios LinkedIn
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

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Índices
create index if not exists idx_events_date          on public.events (date);
create index if not exists idx_events_country       on public.events (country);
create index if not exists idx_events_bu            on public.events (business_unit);
create index if not exists idx_events_service_owner on public.events (service_owner);

-- RLS
alter table public.events enable row level security;

drop policy if exists "auth users full access" on public.events;
create policy "auth users full access" on public.events
  for all to authenticated using (true) with check (true);

drop policy if exists "anon temp full access" on public.events;
create policy "anon temp full access" on public.events
  for all to anon using (true) with check (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;

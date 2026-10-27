-- ════════════════════════════════════════════════════════════════════
-- Migration 0043 — CRM HubSpot · Weekly check
-- ════════════════════════════════════════════════════════════════════
-- Oct 2026: segunda vista de CRM HubSpot (al lado de «Facturación
-- HubSpot») para seguir la implementación del CRM en cada entidad.
--
-- 1) crm_weekly_checks: el checklist de cada entidad. Una fila por
--    entidad (código HubSpot, ej. '538') e ítem (ej. 'outlook', ver
--    src/constants/crmWeekly.js), con tildado + deadline. Si una entidad
--    no tiene fila para un ítem, ese ítem está sin tildar y sin fecha.
-- 2) crm_next_steps: próximos steps de cada entidad (tipo · step ·
--    detalle), como las iniciativas de los planes.
--
-- Las entidades viven en el código (CRM_ENTITIES), no en la base.
-- Se puede correr más de una vez (sin DROP: el conector de Supabase pide
-- confirmar las sentencias destructivas).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.crm_weekly_checks (
  id           uuid primary key default gen_random_uuid(),
  entity_code  text not null,
  item_id      text not null,
  done         boolean not null default false,
  deadline     date,
  done_at      timestamptz,
  updated_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_code, item_id)
);

create table if not exists public.crm_next_steps (
  id           uuid primary key default gen_random_uuid(),
  entity_code  text not null,
  category     text,
  title        text not null,
  detail       text,
  position     int  not null default 0,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_crm_next_steps_entity on public.crm_next_steps (entity_code, position);

alter table public.crm_weekly_checks enable row level security;
alter table public.crm_next_steps enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_weekly_checks_updated_at') then
    create trigger trg_crm_weekly_checks_updated_at before update on public.crm_weekly_checks for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_next_steps_updated_at') then
    create trigger trg_crm_next_steps_updated_at before update on public.crm_next_steps for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_weekly_checks' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.crm_weekly_checks for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_weekly_checks' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.crm_weekly_checks for all to anon using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_next_steps' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.crm_next_steps for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_next_steps' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.crm_next_steps for all to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_weekly_checks') then
    alter publication supabase_realtime add table public.crm_weekly_checks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_next_steps') then
    alter publication supabase_realtime add table public.crm_next_steps;
  end if;
end $$;

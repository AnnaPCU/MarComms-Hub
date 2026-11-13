-- ════════════════════════════════════════════════════════════════════
-- Migration 0071 — CRM HubSpot · Weekly check: deals nuevos por semana
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot). Los escribe la Edge Function
-- hubspot-weekly-deals (con la service role); el Hub solo los lee.
--
-- 1) crm_weekly_deal_counts: una fila por entidad (código HubSpot) y semana
--    (lunes, hora de Argentina). deals_ui = deals con Record source «CRM UI»
--    (cargados a mano); deals_other = el resto (sin las importaciones).
--    Los dos en null = la entidad no tiene opción en «PCU Entity» de
--    HubSpot (se muestra «sin PCU Entity en HubSpot», no 0).
-- 2) crm_weekly_deal_sync: una sola fila (id = 1) con la última corrida:
--    cuándo, si salió bien, el error y cuántos deals de cada semana no
--    tienen entidad (unassigned, { 'YYYY-MM-DD': n }).
--
-- Seguridad (el repo es público y la clave pública está en el bundle):
-- solo lectura para anon / authenticated; no hay políticas de escritura,
-- así que solo la service role (la Edge Function) puede escribir.
-- Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.crm_weekly_deal_counts (
  entity_code  text not null,
  week_start   date not null,
  deals_ui     int,
  deals_other  int,
  computed_at  timestamptz not null default now(),
  primary key (entity_code, week_start)
);

create index if not exists idx_crm_weekly_deal_counts_week on public.crm_weekly_deal_counts (week_start);

create table if not exists public.crm_weekly_deal_sync (
  id           int primary key default 1 check (id = 1),
  last_run_at  timestamptz,
  last_ok_at   timestamptz,
  ok           boolean,
  error        text,
  unassigned   jsonb not null default '{}'::jsonb,
  trigger      text,
  updated_at   timestamptz not null default now()
);

insert into public.crm_weekly_deal_sync (id) values (1) on conflict (id) do nothing;

alter table public.crm_weekly_deal_counts enable row level security;
alter table public.crm_weekly_deal_sync enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_weekly_deal_sync_updated_at') then
    create trigger trg_crm_weekly_deal_sync_updated_at before update on public.crm_weekly_deal_sync for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_weekly_deal_counts' and policyname = 'read only') then
    create policy "read only" on public.crm_weekly_deal_counts for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_weekly_deal_sync' and policyname = 'read only') then
    create policy "read only" on public.crm_weekly_deal_sync for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_weekly_deal_counts') then
    alter publication supabase_realtime add table public.crm_weekly_deal_counts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_weekly_deal_sync') then
    alter publication supabase_realtime add table public.crm_weekly_deal_sync;
  end if;
end $$;

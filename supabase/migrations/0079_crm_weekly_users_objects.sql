-- ════════════════════════════════════════════════════════════════════
-- Migration 0079 — CRM HubSpot · licencias, contactos y empresas por
-- oficina, y deals importados aparte
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot). La Edge Function hubspot-weekly-deals
-- suma dos partes (body.part):
--   'users'   → crm_hubspot_users: los usuarios de HubSpot de cada oficina
--               (de la lista de Facturación HubSpot, con su licencia Sales
--               Pro / Core, o por la mayoría de sus deals, sin licencia
--               conocida) y su última actividad: activo = creó o editó un
--               deal, contacto o empresa en los últimos 30 días.
--   'objects' → crm_weekly_object_counts: contactos y empresas creados por
--               oficina (por owner o, si no tiene, por quien lo creó), por
--               semana (últimas 8) y por mes desde enero; created_ui =
--               «CRM UI», created_other = el resto, sin importaciones;
--               null = la oficina no tiene ningún usuario asignado.
-- crm_weekly_crm_sync guarda la última corrida de cada parte (id = parte).
-- Además, deals_import en las dos tablas de deals: los deals importados
-- (ej. la Commercial Tool) se cuentan aparte para que el total cierre con
-- HubSpot.
--
-- Solo lectura para anon / authenticated (escribe la función con la
-- service role). Dos corridas diarias nuevas con pg_cron (06:14 y 06:24 de
-- Argentina), con la misma URL del Vault que la 0072. Se puede correr más
-- de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

alter table public.crm_weekly_deal_counts add column if not exists deals_import int;
alter table public.crm_weekly_deal_months add column if not exists deals_import int;

create table if not exists public.crm_hubspot_users (
  id               text primary key,          -- '<código>:<ownerId>' o '<código>:billing-<nombre>'
  entity_code      text not null,
  source           text not null,             -- 'billing' | 'deals'
  name             text not null,             -- como figura en Facturación HubSpot (o en HubSpot)
  hubspot_name     text,
  email            text,
  owner_id         text,
  user_id          text,
  license          text,                      -- 'salesPro' | 'core' | null
  matched          boolean not null default false, -- se encontró en HubSpot
  shared           boolean not null default false, -- «Usuario Compartido»
  archived         boolean not null default false, -- desactivado en HubSpot
  last_activity_at timestamptz,
  active           boolean not null default false,
  computed_at      timestamptz not null default now()
);
create index if not exists idx_crm_hubspot_users_entity on public.crm_hubspot_users (entity_code);

create table if not exists public.crm_weekly_object_counts (
  entity_code   text not null,
  object_type   text not null,               -- 'contacts' | 'companies'
  period        text not null,               -- 'week' | 'month'
  period_start  date not null,
  created_ui    int,
  created_other int,
  computed_at   timestamptz not null default now(),
  primary key (entity_code, object_type, period, period_start)
);
create index if not exists idx_crm_weekly_object_counts_start on public.crm_weekly_object_counts (period, period_start);

create table if not exists public.crm_weekly_crm_sync (
  id          text primary key,              -- 'users' | 'objects'
  last_run_at timestamptz,
  last_ok_at  timestamptz,
  ok          boolean,
  error       text,
  trigger     text,
  info        jsonb not null default '{}'::jsonb
);

alter table public.crm_hubspot_users enable row level security;
alter table public.crm_weekly_object_counts enable row level security;
alter table public.crm_weekly_crm_sync enable row level security;

do $$
declare t text;
begin
  foreach t in array array['crm_hubspot_users', 'crm_weekly_object_counts', 'crm_weekly_crm_sync'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'read only') then
      execute format('create policy "read only" on public.%I for select to anon, authenticated using (true)', t);
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Corridas diarias (después de la de deals de las 06:07): usuarios a las
-- 06:14 y contactos / empresas a las 06:24 (usan los usuarios)
select cron.schedule(
  'hubspot-weekly-users-daily',
  '14 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'hubspot_weekly_deals_url'),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "cron", "part": "users"}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
select cron.schedule(
  'hubspot-weekly-objects-daily',
  '24 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'hubspot_weekly_deals_url'),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "cron", "part": "objects"}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

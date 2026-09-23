-- ════════════════════════════════════════════════════════════════════
-- Migration 0018 — CRM: entidades y entrenamientos del CRM HubSpot
-- ════════════════════════════════════════════════════════════════════
-- Trackeo de los entrenamientos de uso del CRM (HubSpot) que MarComms
-- da a los clientes internos del grupo (CU Peru, PS España, PTech…) y
-- del estado de adopción de cada entidad.
--
--   crm_entities  — una fila por cliente interno: unidad (cu | ps | ptech),
--                   entidad legal, medio de facturación (smartsheet | mail),
--                   responsable, quien autoriza el pago, progreso (0..1) y
--                   checklist de adopción (jsonb con los ids de
--                   ADOPTION_CHECKS en src/constants/crm.js).
--   crm_trainings — un entrenamiento por fila: entidad, tipo (comercial |
--                   super_admin | implementacion | refuerzo), título, fecha,
--                   capacitador, asistentes, estado (planificado | realizado |
--                   cobrado | bonificado), mes en que se cobró ('YYYY-MM'),
--                   monto, moneda, notas.
--
-- Incluye el seed de las 24 entidades del Excel "CRM Peterson & Control
-- Union HubSpot Users - Seats" (hojas "Reglas Facturacion" y "Status"),
-- idempotente por `key`. Los entrenamientos históricos (marzo–mayo 2026)
-- están en supabase/seed/0018_crm_trainings_hist_2026.sql (opcional).
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Entidades ──
create table if not exists public.crm_entities (
  id              uuid primary key default gen_random_uuid(),
  key             text unique,                     -- id estable (seed / import)
  name            text not null,                   -- CU Peru, PS España…
  unit            text not null default 'cu',      -- cu | ps | ptech
  legal_entity    text,                            -- '536 - Control Union Services Peru S.A.C.'
  billing_medium  text,                            -- smartsheet | mail
  currency        text not null default 'USD',
  responsible     text,                            -- quien factura (MarComms)
  approver        text,                            -- quien autoriza el pago en la entidad
  progress        numeric(4,3),                    -- 0..1 (progreso de adopción, manual)
  checks          jsonb not null default '{}'::jsonb,
  notes           text,
  sort_order      integer not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint crm_entities_unit_check check (unit in ('cu', 'ps', 'ptech')),
  constraint crm_entities_billing_medium_check check (billing_medium is null or billing_medium in ('smartsheet', 'mail'))
);

drop trigger if exists trg_crm_entities_updated_at on public.crm_entities;
create trigger trg_crm_entities_updated_at
  before update on public.crm_entities
  for each row execute function public.set_updated_at();

-- ── Entrenamientos ──
create table if not exists public.crm_trainings (
  id            uuid primary key default gen_random_uuid(),
  entity_id     uuid not null references public.crm_entities(id) on delete cascade,
  type          text not null default 'comercial',
  title         text not null default '',
  date          date,                              -- cuándo se dio (null si no se registró)
  trainer       text,                              -- quién lo dio
  attendees     integer,
  status        text not null default 'planificado',
  billed_month  text,                              -- 'YYYY-MM' en que se cobró
  amount        numeric(12,2),                     -- monto cobrado (null si va dentro del total del mes)
  currency      text not null default 'USD',
  notes         text,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint crm_trainings_type_check   check (type in ('comercial', 'super_admin', 'implementacion', 'refuerzo')),
  constraint crm_trainings_status_check check (status in ('planificado', 'realizado', 'cobrado', 'bonificado'))
);

drop trigger if exists trg_crm_trainings_updated_at on public.crm_trainings;
create trigger trg_crm_trainings_updated_at
  before update on public.crm_trainings
  for each row execute function public.set_updated_at();

create index if not exists idx_crm_trainings_entity on public.crm_trainings (entity_id);
create index if not exists idx_crm_trainings_date   on public.crm_trainings (date);
create index if not exists idx_crm_trainings_status on public.crm_trainings (status);

-- ── RLS (mismo criterio que el resto de las tablas) ──
alter table public.crm_entities  enable row level security;
alter table public.crm_trainings enable row level security;

drop policy if exists "auth users full access" on public.crm_entities;
create policy "auth users full access" on public.crm_entities
  for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.crm_entities;
create policy "anon temp full access" on public.crm_entities
  for all to anon using (true) with check (true);

drop policy if exists "auth users full access" on public.crm_trainings;
create policy "auth users full access" on public.crm_trainings
  for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.crm_trainings;
create policy "anon temp full access" on public.crm_trainings
  for all to anon using (true) with check (true);

-- ── Realtime ──
do $$
declare
  t text;
begin
  foreach t in array array['crm_entities', 'crm_trainings'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Seed de entidades (Excel: hojas "Reglas Facturacion" + "Status") ──
-- checks: pipeline, deals_imported, integrations, outlook, reports,
--         training_commercial, training_super_admin, playlists, email_sequences
insert into public.crm_entities (key, name, unit, legal_entity, billing_medium, currency, responsible, approver, progress, checks, sort_order) values
  ('cu-espana',         'CU España',            'cu',    '518 - CU WG Spain S.A.',                        'smartsheet', 'USD', 'Tino',    'Adelaida Alarcon',     0.2,  '{"pipeline":true,"deals_imported":false,"integrations":true,"outlook":false,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":false,"email_sequences":false}',  10),
  ('cu-portugal',       'CU Portugal',          'cu',    '522 - Control Union Portugal, Unipessoal, Lda.', 'smartsheet', 'USD', 'Tino',    'Carina Goncalves',     0.2,  '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":false,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":false,"email_sequences":false}',   20),
  ('cu-peru',           'CU Peru',              'cu',    '536 - Control Union Services Peru S.A.C.',       'smartsheet', 'USD', 'Tino',    'Yemil Zarzar',         0.8,  '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":false,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":true,"email_sequences":false}',    30),
  ('cu-usa',            'CU USA',               'cu',    '537 - Control Union (United States) Inc.',        'smartsheet', 'USD', 'Tino',    'Robert Demaniew',      0.3,  '{"pipeline":true,"deals_imported":false,"integrations":true,"outlook":false,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":false,"email_sequences":false}',  40),
  ('cu-canada',         'CU Canada',            'cu',    '583 - Control Union Canada Inc.',                'smartsheet', 'USD', 'Tino',    'Carlos Rainero',       0.6,  '{"pipeline":true,"deals_imported":false,"integrations":true,"outlook":true,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":false,"email_sequences":true}',   50),
  ('cu-mexico',         'CU Mexico',            'cu',    '598 - Control Union de Mexico S.A.',             'smartsheet', 'USD', 'Tino',    'Rodrigo Duret',        0.9,  '{"pipeline":true,"deals_imported":false,"integrations":true,"outlook":true,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":true,"email_sequences":false}',   60),
  ('ps-espana',         'PS España',            'ps',    '765 - Peterson Iberoamerica SL',                 'smartsheet', 'USD', 'Tino',    'Martin Tezanos Pinto', 0.8,  '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":true,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":true,"email_sequences":true}',     70),
  ('ps-usa',            'PS USA',               'ps',    '767 - Peterson USA',                             'smartsheet', 'USD', 'Tino',    'Robert Demaniew',      0.5,  '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":true,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":false,"email_sequences":false}',   80),
  ('cu-chile',          'CU Chile',             'cu',    '848 - Control Union Chile SpA',                  'smartsheet', 'USD', 'Tino',    'Jorge Rios',           0.05, '{"pipeline":true,"deals_imported":false,"integrations":false,"outlook":false,"reports":false,"training_commercial":false,"training_super_admin":false,"playlists":false,"email_sequences":false}', 90),
  ('cu-cert-argentina', 'CU Cert Argentina',    'cu',    '538 - Control Union Argentina S.A.',             'mail',       'USD', 'Tino',    'Juan Gebbie',          1,    '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":true,"reports":true,"training_commercial":true,"training_super_admin":true,"playlists":true,"email_sequences":true}',      100),
  ('ps-argentina',      'PS Argentina',         'ps',    '592 - Peterson Consultancy S.A.',                'mail',       'USD', 'Tino',    'Martin Dacharry',      1,    '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":false,"reports":true,"training_commercial":true,"training_super_admin":true,"playlists":true,"email_sequences":true}',     110),
  ('ps-switzerland',    'PS Switzerland',       'ps',    '700 - PSO BEHEER B.V.',                          'mail',       'USD', 'Agus B.', 'Andrea Ferrazzo',      0.6,  '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":false,"reports":false,"training_commercial":true,"training_super_admin":true,"playlists":false,"email_sequences":false}',   120),
  ('ptech-global',      'PTech Global',         'ptech', '752 - Peterson Technologies GmbH',               'mail',       'USD', 'Tino',    'Luis Correia',         1,    '{"pipeline":true,"deals_imported":true,"integrations":true,"outlook":true,"reports":true,"training_commercial":true,"training_super_admin":true,"playlists":true,"email_sequences":true}',      130),
  ('ps-textile',        'PS Textile',           'ps',    '771 - Peterson Solutions B.V.',                  'mail',       'USD', 'Agus B.', 'Elizabeth Keegan',     null, '{}', 140),
  ('ps-mexico',         'PS Mexico',            'ps',    null, null, 'USD', null, null, 0.05, '{}', 150),
  ('ps-brazil',         'PS Brazil',            'ps',    null, null, 'USD', null, null, 0,    '{}', 160),
  ('cu-brazil',         'CU Brazil',            'cu',    null, null, 'USD', null, null, 0,    '{}', 170),
  ('cu-colombia',       'CU Colombia',          'cu',    '520 - Control Union Colombia Ltd.', null, 'USD', null, null, 0, '{}', 180),
  ('cu-guatemala',      'CU Guatemala',         'cu',    null, null, 'USD', null, null, 0,    '{}', 190),
  ('pcu-paraguay',      'PCU Paraguay',         'cu',    null, null, 'USD', null, null, 0,    '{}', 200),
  ('cu-ecuador',        'CU Ecuador',           'cu',    '566 - Control Union Ecuador (branch office)', null, 'USD', null, null, 0, '{}', 210),
  ('pcu-uruguay',       'PCU Uruguay',          'cu',    null, null, 'USD', null, null, 0,    '{}', 220),
  ('cu-norte',          'CU Norte (Argentina)', 'cu',    null, null, 'USD', null, null, 0,    '{}', 230),
  ('ps-ecuador',        'PS Ecuador',           'ps',    null, null, 'USD', null, null, 0,    '{}', 240)
on conflict (key) do nothing;

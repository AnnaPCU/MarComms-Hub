-- ════════════════════════════════════════════════════════════════════
-- Migration 0028 — CRM HubSpot: facturación de licencias por entidad
-- ════════════════════════════════════════════════════════════════════
-- Réplica del Excel "Facturacion_HUBSPOT": una fila por entidad (cada
-- columna del Excel: CU Cert Argentina, PS Argentina…) con razón social,
-- manager, usuarios (° = Sales Pro, - = Core) y los 12 meses (precio +
-- detalle). El Excel es la fuente de verdad: se importa desde el Hub
-- (services/hubspotBillingService.js): upsert por `key`, se borran las
-- entidades que ya no están y se registra la importación con los datos
-- generales del archivo (tarifas de la hoja Summary, TOTAL del Excel).
--
--   hubspot_billing_entities — una entidad por columna del Excel
--   hubspot_billing_imports  — historial + meta (tarifas, totales del Excel)
--
-- Aplicada desde Claude Code con el conector de Supabase (oct 2026).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.hubspot_billing_entities (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  position     int  not null default 0,
  legal_entity text,
  manager      text,
  users        jsonb not null default '[]'::jsonb,
  months       jsonb not null default '[]'::jsonb,
  imported_at  timestamptz not null default now(),
  imported_by  text,
  source_file  text,
  created_at   timestamptz not null default now()
);

create table if not exists public.hubspot_billing_imports (
  id          uuid primary key default gen_random_uuid(),
  file_name   text,
  imported_by text,
  imported_at timestamptz not null default now(),
  summary     jsonb,
  meta        jsonb
);

alter table public.hubspot_billing_entities enable row level security;
create policy "auth users full access" on public.hubspot_billing_entities for all to authenticated using (true) with check (true);
create policy "anon temp full access" on public.hubspot_billing_entities for all to anon using (true) with check (true);

alter table public.hubspot_billing_imports enable row level security;
create policy "auth users full access" on public.hubspot_billing_imports for all to authenticated using (true) with check (true);
create policy "anon temp full access" on public.hubspot_billing_imports for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.hubspot_billing_entities, public.hubspot_billing_imports;

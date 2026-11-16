-- ════════════════════════════════════════════════════════════════════
-- Migration 0074 — CRM HubSpot · deals por semana separados por opción
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot): una entidad puede tener varias opciones
-- en «PCU Entity» de HubSpot con el mismo código (ej. 538 Certifications
-- e Inspections, 544 Cert + Insp + Academy). Además de la suma por
-- entidad (deals_ui / deals_other), la Edge Function hubspot-weekly-deals
-- guarda el detalle por opción:
--   by_option = { "<label de la opción>": { "ui": n, "other": n }, … }
-- con todas las opciones del código (también las que dan 0). La ficha de
-- la entidad deja elegir «Todas» o una opción.
--
-- Solo agrega una columna; se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

alter table public.crm_weekly_deal_counts add column if not exists by_option jsonb not null default '{}'::jsonb;

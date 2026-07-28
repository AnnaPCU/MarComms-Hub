-- ════════════════════════════════════════════════════════════════════
-- Migration 0013 — Persistir datos de piezas del Content Hub
-- ════════════════════════════════════════════════════════════════════
-- Hasta ahora, lo que se cargaba por pieza en el Content Hub
-- (responsable, doble validación, comentarios, archivos de wording y
-- diseño) vivía SOLO en memoria: al refrescar la página se perdía.
--
-- Esta migración agrega la columna `content` (jsonb) a webinars,
-- events y campaigns para que todo eso quede guardado en Supabase.
--
-- (El modo Always On / One Shot de Paid Media se guarda dentro del
-- jsonb `data` de campaigns, que ya existe — no necesita columna.)
--
-- Es idempotente — correr varias veces no rompe.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

alter table public.webinars
  add column if not exists content jsonb default '{}'::jsonb;

alter table public.events
  add column if not exists content jsonb default '{}'::jsonb;

alter table public.campaigns
  add column if not exists content jsonb default '{}'::jsonb;

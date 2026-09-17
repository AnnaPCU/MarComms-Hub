-- ════════════════════════════════════════════════════════════════════
-- Migration 0015 — Temática en pedidos de Social Media (ex Content Hub)
-- ════════════════════════════════════════════════════════════════════
-- Agrega la columna `theme` a `requests` para poder filtrar los pedidos
-- por temática. Los valores válidos son los ids de WORLD_DAY_THEMES en
-- src/constants/worldDays.js (sustentabilidad, clima, energia, agua,
-- biodiversidad, forestal, agro, alimentos, textil, circular, social,
-- calidad). Null = sin temática.
--
-- Es idempotente (add column if not exists) — correr varias veces no rompe.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

alter table public.requests
  add column if not exists theme text;

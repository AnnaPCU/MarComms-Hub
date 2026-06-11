-- ════════════════════════════════════════════════════════════════════
-- Migration 0006 — quotation_validated en webinars / campaigns / events
-- ════════════════════════════════════════════════════════════════════
-- Agrega un flag booleano para marcar si la cotización del proyecto
-- fue validada o no. Default false (no validada).
--
-- Cómo correr:
--   Supabase Dashboard → SQL Editor → pegar → Run
-- ════════════════════════════════════════════════════════════════════

alter table public.webinars
  add column if not exists quotation_validated boolean default false;

alter table public.campaigns
  add column if not exists quotation_validated boolean default false;

alter table public.events
  add column if not exists quotation_validated boolean default false;

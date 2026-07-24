-- ════════════════════════════════════════════════════════════════════
-- Migration 0012 — Links de Planner y ticket HubSpot por proyecto
-- ════════════════════════════════════════════════════════════════════
-- Agrega dos columnas de link a cada tabla de proyectos/pedidos:
--   planner_link  → link al plan en Microsoft Planner
--   hubspot_link  → link al ticket en HubSpot
--
-- Aplica a: webinars, events, campaigns (pilares) y requests (Content Hub).
--
-- Es idempotente (add column if not exists) — correr varias veces no rompe.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

alter table public.webinars
  add column if not exists planner_link text,
  add column if not exists hubspot_link text;

alter table public.events
  add column if not exists planner_link text,
  add column if not exists hubspot_link text;

alter table public.campaigns
  add column if not exists planner_link text,
  add column if not exists hubspot_link text;

alter table public.requests
  add column if not exists planner_link text,
  add column if not exists hubspot_link text;

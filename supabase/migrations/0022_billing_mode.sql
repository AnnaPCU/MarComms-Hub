-- ════════════════════════════════════════════════════════════════════
-- Migration 0022 — Modo de cobro de cada pilar: USD o incluido en el plan
-- ════════════════════════════════════════════════════════════════════
-- Algunos servicios no se cobran aparte porque entran en el plan mensual
-- del país. `billing` = 'usd' (monto en dólares, el default) | 'plan'
-- (incluido en el plan mensual: no suma a la inversión del Portal).
--
-- Aplicada desde Claude Code con el conector de Supabase (sep 2026).
-- ════════════════════════════════════════════════════════════════════

alter table public.webinars  add column if not exists billing text not null default 'usd';
alter table public.campaigns add column if not exists billing text not null default 'usd';
alter table public.events    add column if not exists billing text not null default 'usd';

alter table public.webinars  drop constraint if exists webinars_billing_check;
alter table public.webinars  add constraint webinars_billing_check  check (billing in ('usd', 'plan'));
alter table public.campaigns drop constraint if exists campaigns_billing_check;
alter table public.campaigns add constraint campaigns_billing_check check (billing in ('usd', 'plan'));
alter table public.events    drop constraint if exists events_billing_check;
alter table public.events    add constraint events_billing_check    check (billing in ('usd', 'plan'));

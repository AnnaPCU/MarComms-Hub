-- ════════════════════════════════════════════════════════════════════
-- 0035 — Pilares en varios países (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Una misma acción (webinar, campaña, evento, programa) puede ser para
-- varios países. `country` / `pais` sigue siendo el país que la paga (el
-- que cuenta para inversión, facturación y planes); `extra_countries`
-- son los otros países a los que también apunta.
-- Idempotente. Se puede correr más de una vez.
-- ════════════════════════════════════════════════════════════════════

alter table public.webinars  add column if not exists extra_countries text[] not null default '{}';
alter table public.events    add column if not exists extra_countries text[] not null default '{}';
alter table public.campaigns add column if not exists extra_countries text[] not null default '{}';
alter table public.programs  add column if not exists extra_countries text[] not null default '{}';

-- ════════════════════════════════════════════════════════════════════
-- Migration 0023 — Planes que cubren pilares (en vez de un monto en USD)
-- ════════════════════════════════════════════════════════════════════
-- Un pilar puede cobrarse aparte (billing = 'usd', con monto) o estar
-- cubierto por un plan (billing = 'plan'). `plan_id` indica QUÉ plan lo
-- cubre. Los planes se pueden sumar desde el propio selector del Hub.
--
--   billing_plans — nombre del plan (único)
--   webinars.plan_id / campaigns.plan_id / events.plan_id
--
-- Al borrar un plan, los pilares quedan en 'plan' sin plan asignado
-- (on delete set null) y el Hub los muestra como "Plan: Sin especificar".
--
-- Aplicada desde Claude Code con el conector de Supabase (oct 2026),
-- sentencia por sentencia. El paso de realtime (último bloque) NO se
-- aplicó: se rechazó al pedir permiso. Sin él, los planes nuevos se ven
-- en otros navegadores al recargar. Correrlo cuando se quiera en vivo.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.billing_plans (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_billing_plans_name on public.billing_plans (lower(name));

insert into public.billing_plans (name) values
  ('Control Union Argentina'),
  ('Peterson Solutions Argentina'),
  ('Control Union Estados Unidos Orgánico')
on conflict do nothing;

-- ── Vínculo desde los pilares ──
alter table public.webinars  add column if not exists plan_id uuid references public.billing_plans(id) on delete set null;
alter table public.campaigns add column if not exists plan_id uuid references public.billing_plans(id) on delete set null;
alter table public.events    add column if not exists plan_id uuid references public.billing_plans(id) on delete set null;

-- ── RLS (mismo criterio que el resto de las tablas) ──
alter table public.billing_plans enable row level security;
drop policy if exists "auth users full access" on public.billing_plans;
create policy "auth users full access" on public.billing_plans
  for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.billing_plans;
create policy "anon temp full access" on public.billing_plans
  for all to anon using (true) with check (true);

-- ── Realtime ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'billing_plans'
  ) then
    execute 'alter publication supabase_realtime add table public.billing_plans';
  end if;
end $$;

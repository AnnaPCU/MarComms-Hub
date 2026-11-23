-- ════════════════════════════════════════════════════════════════════
-- Migration 0078 — CRM HubSpot · deals nuevos por mes desde enero
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot): la Edge Function hubspot-weekly-deals
-- también cuenta los deals de cada mes desde enero del año en curso (mes
-- de Argentina, sin importaciones) y los guarda acá: una fila por entidad
-- y mes, con los mismos campos que crm_weekly_deal_counts (deals_ui =
-- «CRM UI», deals_other = el resto, null = la entidad no tiene opción en
-- «PCU Entity»; by_option = detalle por opción). La ficha de la entidad
-- lo muestra en «Since January».
--
-- Solo lectura para anon / authenticated (escribe la función con la
-- service role). Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.crm_weekly_deal_months (
  entity_code  text not null,
  month_start  date not null,
  deals_ui     int,
  deals_other  int,
  by_option    jsonb not null default '{}'::jsonb,
  computed_at  timestamptz not null default now(),
  primary key (entity_code, month_start)
);

create index if not exists idx_crm_weekly_deal_months_month on public.crm_weekly_deal_months (month_start);

alter table public.crm_weekly_deal_months enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'crm_weekly_deal_months' and policyname = 'read only') then
    create policy "read only" on public.crm_weekly_deal_months for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_weekly_deal_months') then
    alter publication supabase_realtime add table public.crm_weekly_deal_months;
  end if;
end $$;

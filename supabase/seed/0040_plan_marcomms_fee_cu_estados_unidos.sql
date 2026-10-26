-- ════════════════════════════════════════════════════════════════════
-- Planes · Investment: Plan MarComms USD 1.500 (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Control Union Estados Unidos Orgánico: el Plan MarComms es USD 1.500 por
-- mes. Se carga una sola vez en el mes de inicio del plan (agosto 2026) y,
-- como el KPI `planFee` se arrastra (src/utils/planKpis.js → carriedKpis),
-- se ve igual todos los meses siguientes hasta que se cargue otro monto.
-- Suma la clave al mes sin pisar los demás KPIs. Aplicado el 26 oct 2026.
-- ════════════════════════════════════════════════════════════════════

insert into public.plan_kpis (plan_id, month_key, kpis, updated_by)
select p.id, '2026-08', '{"planFee":{"value":1500,"currency":"USD"}}'::jsonb, 'Plan MarComms USD 1.500 (oct 2026)'
  from public.billing_plans p where p.name = 'Control Union Estados Unidos Orgánico'
on conflict (plan_id, month_key) do update set kpis = public.plan_kpis.kpis || excluded.kpis;

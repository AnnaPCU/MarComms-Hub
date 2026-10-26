-- ════════════════════════════════════════════════════════════════════
-- Planes · KPIs de Control Union Estados Unidos Orgánico (26 oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Ajuste pedido por Anna. Deals generados pasa a ser una cantidad (sin
-- moneda); MQLs y Ventas: monto en USD + cantidad (`count`).
--   Septiembre 2026: deals 15 (antes USD 848.160, se conserva la nota) ·
--                    MQLs USD 8.772 · 2 MQLs (antes USD 40.000 · 8 MQLs) ·
--                    ventas USD 16.000 · 2 ventas (antes USD 10.000 · 2)
--   Octubre 2026:    deals 26 · MQLs USD 29.115 · 7 MQLs (las ventas de
--                    octubre, USD 11.465, no se tocan)
-- Reemplaza solo esas claves del mes; el resto de los KPIs queda igual.
-- ════════════════════════════════════════════════════════════════════

insert into public.plan_kpis (plan_id, month_key, kpis, updated_by)
select p.id, v.month_key, v.kpis::jsonb, 'Ajuste KPIs CU Estados Unidos (26 oct 2026)'
  from (values
    ('2026-09', '{"deals":{"value":15,"note":"20 % proveniente de bases de datos creadas con la Commercial Tool"},"mqls":{"value":8772,"currency":"USD","count":2},"sales":{"value":16000,"currency":"USD","count":2}}'),
    ('2026-10', '{"deals":{"value":26},"mqls":{"value":29115,"currency":"USD","count":7}}')
  ) as v(month_key, kpis)
  join public.billing_plans p on p.name = 'Control Union Estados Unidos Orgánico'
on conflict (plan_id, month_key) do update set kpis = public.plan_kpis.kpis || excluded.kpis, updated_by = excluded.updated_by;

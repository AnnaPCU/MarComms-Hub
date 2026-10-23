-- ════════════════════════════════════════════════════════════════════
-- Planes · KPIs del mes e iniciativas cargados del Excel "Planes_MarComms_KPIs"
-- (oct 2026): septiembre 2026 de Control Union Estados Unidos Orgánico,
-- Control Union Argentina y Peterson Solutions Argentina (y agosto de
-- Peterson Solutions Argentina). Transcripción de los informes mensuales.
-- ════════════════════════════════════════════════════════════════════
-- · KPIs: Entregables y Reuniones van como valor del informe (corrección a
--   mano sobre el cálculo automático). "Sin dato" / "No se mide" no se carga.
--   Si el mes ya tiene KPIs en el Hub, se suman: el Excel pisa solo los KPIs
--   que trae.
-- · Iniciativas: por plan (no por mes). No se duplica una iniciativa que ya
--   exista en el plan con el mismo nombre.
-- Se puede correr más de una vez.
-- ════════════════════════════════════════════════════════════════════

insert into public.plan_kpis (plan_id, month_key, kpis, updated_by)
select p.id, v.month_key, v.kpis::jsonb, 'Carga Excel KPIs (oct 2026)'
  from (values
    ('Control Union Estados Unidos Orgánico', '2026-09', '{"deliverables":{"value":8},"meetings":{"value":9},"contacts":{"value":800,"note":"Top 5 estados USDA"},"deals":{"value":848160,"currency":"USD","note":"20 % proveniente de bases de datos creadas con la Commercial Tool"},"mqls":{"value":40000,"currency":"USD","tag":"8 MQLs"},"sales":{"value":10000,"currency":"USD","tag":"2 ventas"}}'),
    ('Peterson Solutions Argentina', '2026-08', '{"deliverables":{"value":5},"meetings":{"value":2,"note":"12/8 y 19/8"},"contacts":{"value":2001,"note":"Hecha por MarComms · base total 5.403"}}'),
    ('Peterson Solutions Argentina', '2026-09', '{"deliverables":{"value":5},"meetings":{"value":3,"note":"16/9, 17/9 y 30/9"},"contacts":{"value":76,"note":"Base Ígaris · 24 empresas"},"deals":{"value":70},"mqls":{"value":1}}'),
    ('Control Union Argentina', '2026-09', '{"deliverables":{"value":8},"meetings":{"value":2,"note":"28/9"},"contacts":{"value":786,"note":"Base de la campaña GHG"},"deals":{"value":340},"mqls":{"value":2}}')
  ) as v(plan_name, month_key, kpis)
  join public.billing_plans p on p.name = v.plan_name
on conflict (plan_id, month_key) do update set kpis = public.plan_kpis.kpis || excluded.kpis;

insert into public.plan_initiatives (plan_id, category, title, detail, position, created_by)
select p.id, v.category, v.title, v.detail, v.position, 'Carga Excel KPIs (oct 2026)'
  from (values
    ('Control Union Estados Unidos Orgánico', 'Generación de demanda', 'Webinars', 'Temas a definir con WOLF y eventos a calendarizar.', 0),
    ('Control Union Estados Unidos Orgánico', 'Generación de demanda', 'Base de datos de TC de Perú', 'Alineación con Fiorella y Álvaro para usar los leads de los TC de Perú para generar demanda.', 1),
    ('Control Union Estados Unidos Orgánico', 'Generación de demanda', 'Seguimiento BDR', 'Servicio de BDR montado desde MarComms, con una persona del equipo dedicada al seguimiento de leads.', 2),
    ('Control Union Estados Unidos Orgánico', 'Generación de demanda', 'Steal Services', 'Automatización de email marketing dirigida a la base de datos de los competidores.', 3),
    ('Control Union Estados Unidos Orgánico', 'Generación de demanda', 'Seguimiento de leads del evento orgánico', 'Acción de seguimiento con los leads del evento orgánico.', 4),
    ('Peterson Solutions Argentina', 'Próximos pasos', 'Estrategia 2027', 'A la espera de los archivos con los resultados del año (industrias y datos adicionales al Power BI) para analizarlos y empezar a armar la estrategia 2027.', 5),
    ('Peterson Solutions Argentina', 'Próximos pasos', 'Acciones en curso', 'Campañas de Paid Media, bases de datos activas y soporte de comunicación en temáticas específicas.', 6)
  ) as v(plan_name, category, title, detail, position)
  join public.billing_plans p on p.name = v.plan_name
 where not exists (select 1 from public.plan_initiatives i where i.plan_id = p.id and lower(i.title) = lower(v.title));

-- Verificación
select p.name, k.month_key, k.kpis from public.plan_kpis k join public.billing_plans p on p.id = k.plan_id order by p.name, k.month_key;
select p.name, i.category, i.title from public.plan_initiatives i join public.billing_plans p on p.id = i.plan_id order by p.name, i.position;

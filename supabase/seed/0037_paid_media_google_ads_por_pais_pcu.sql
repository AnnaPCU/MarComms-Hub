-- ════════════════════════════════════════════════════════════════════
-- Paid Media · Google Ads por unidad y país · PCU (la paga Control Union España) (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Una tarjeta por unidad y país que paga, con la lista de sus campañas de
-- Google Ads (nombre y estado) en data.google_ads.campanas.
-- 1 tarjeta, 4 campañas, inversión en pauta USD 878.16 (Google Ads API, 2026-10-22).
-- · Tarjeta en proceso si tiene alguna campaña activa; completada (paso
--   finished + completed_at) si todas están pausadas.
-- · Borra las filas sueltas por campaña del seed 0036 que pasan a la tarjeta.
-- · Se puede volver a correr con datos nuevos: actualiza inversión, lista de
--   campañas y, si se pausaron todas, la marca como completada. No pisa Fee,
--   plan, responsable, HubSpot, deals, cotización, comentarios, programa ni
--   otros países.
-- ════════════════════════════════════════════════════════════════════

with g as (
  select * from jsonb_to_recordset($gads$[{"clave":"gads-grupo:PCU:España","name":"PCU España","country":"España","business_unit":"PCU","extra_countries":["Argentina"],"platform_investment":878.16,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-09-08T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 08/09/2026","detail":"Google Ads Search · 4 campañas (4 activas). La lista de campañas y su estado está en la ficha.","facturar_a":{"unidad":"Control Union","pais":"España"},"google_ads":{"clave_externa":"gads-grupo:PCU:España","grupo":"PCU España","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24231149725","nombre":"PCU - Argentina - Competidores ISO 27001 - Search","nombre_corto":"Argentina - Competidores ISO 27001","estado":"Activa","primer_dia":"2026-09-09","ultimo_dia":"2026-10-20","inversion_usd":13.5},{"clave":"gads:1606422184:24231149722","nombre":"PCU - Argentina - ISO 27001 - Search","nombre_corto":"Argentina - ISO 27001","estado":"Activa","primer_dia":"2026-09-08","ultimo_dia":"2026-10-21","inversion_usd":366.44},{"clave":"gads:1606422184:24231149731","nombre":"PCU - España - Competidores ISO 27001 - Search","nombre_corto":"España - Competidores ISO 27001","estado":"Activa","primer_dia":"2026-09-09","ultimo_dia":"2026-10-21","inversion_usd":50.81},{"clave":"gads:1606422184:24231149728","nombre":"PCU - España - ISO 27001 - Search","nombre_corto":"España - ISO 27001","estado":"Activa","primer_dia":"2026-09-08","ultimo_dia":"2026-10-21","inversion_usd":447.41}]}}}]$gads$::jsonb) as x(
    clave text, name text, country text, business_unit text, extra_countries text[],
    platform_investment numeric, completed_steps text[], completed_at timestamptz,
    created_at timestamptz, data jsonb)
),
-- Campañas sueltas (una fila por campaña, seed 0036) que pasan a su tarjeta
sueltas as (
  select jsonb_array_elements(g.data->'google_ads'->'campanas')->>'clave' as clave from g
),
del as (
  delete from public.campaigns c
   where c.type = 'paid' and c.data->'google_ads'->>'clave_externa' in (select clave from sueltas)
  returning c.id
),
upd as (
  update public.campaigns c
     set platform_investment = g.platform_investment,
         data = coalesce(c.data, '{}'::jsonb) || jsonb_build_object('google_ads', g.data->'google_ads'),
         completed_steps = case when g.completed_at is not null and not ('finished' = any(coalesce(c.completed_steps, '{}')))
                                then coalesce(c.completed_steps, '{}') || array['finished'] else c.completed_steps end,
         completed_at = case when g.completed_at is not null and c.completed_at is null then g.completed_at else c.completed_at end
    from g
   where c.type = 'paid' and c.data->'google_ads'->>'clave_externa' = g.clave
  returning c.id
)
insert into public.campaigns (name, type, country, business_unit, extra_countries, platform_investment,
                              completed_steps, completed_at, created_at, data)
select g.name, 'paid', g.country, g.business_unit, g.extra_countries, g.platform_investment,
       g.completed_steps, g.completed_at, g.created_at, g.data
  from g
 where not exists (select 1 from public.campaigns c
                    where c.type = 'paid' and c.data->'google_ads'->>'clave_externa' = g.clave);

-- Verificación: 1 tarjeta, 4 campañas, USD 878.16
select name, country, extra_countries, jsonb_array_length(data->'google_ads'->'campanas') as campanas, platform_investment
  from public.campaigns
 where type = 'paid' and data->'google_ads'->>'clave_externa' = any(array['gads-grupo:PCU:España'])
 order by name;

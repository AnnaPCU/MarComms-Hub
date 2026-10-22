-- ════════════════════════════════════════════════════════════════════
-- Paid Media · Google Ads por unidad y país · Peterson Solutions (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Una tarjeta por unidad y país que paga, con la lista de sus campañas de
-- Google Ads (nombre y estado) en data.google_ads.campanas.
-- 1 tarjeta, 8 campañas, inversión en pauta USD 1,049.45 (Google Ads API, 2026-10-22).
-- · Tarjeta en proceso si tiene alguna campaña activa; completada (paso
--   finished + completed_at) si todas están pausadas.
-- · Borra las filas sueltas por campaña del seed 0036 que pasan a la tarjeta.
-- · Se puede volver a correr con datos nuevos: actualiza inversión, lista de
--   campañas y, si se pausaron todas, la marca como completada. No pisa Fee,
--   plan, responsable, HubSpot, deals, cotización, comentarios, programa ni
--   otros países.
-- ════════════════════════════════════════════════════════════════════

with g as (
  select * from jsonb_to_recordset($gads$[{"clave":"gads-grupo:Peterson Solutions:Argentina","name":"PS Argentina","country":"Argentina","business_unit":"Peterson Solutions","extra_countries":[],"platform_investment":1049.45,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-05-18T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 18/05/2026","detail":"Google Ads Search · 8 campañas (8 activas). La lista de campañas y su estado está en la ficha.","facturar_a":{"unidad":"Peterson Solutions","pais":"Argentina"},"google_ads":{"clave_externa":"gads-grupo:Peterson Solutions:Argentina","grupo":"PS Argentina","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24057321071+6527967282:23863492270","nombre":"PS Argentina - Bioenergia / Biocombustibles - Search","nombre_corto":"Bioenergia / Biocombustibles","estado":"Activa","primer_dia":"2026-05-21","ultimo_dia":"2026-10-21","inversion_usd":118.54},{"clave":"gads:1606422184:24057321050+6527967282:23853590112","nombre":"PS Argentina - CeSu - Preparacion para certificaciones - Search","nombre_corto":"CeSu - Preparacion para certificaciones","estado":"Activa","primer_dia":"2026-05-22","ultimo_dia":"2026-10-21","inversion_usd":52.99},{"clave":"gads:1606422184:24057321056+6527967282:23857166371","nombre":"PS Argentina - SuSe - ESG / Reportes - Search","nombre_corto":"SuSe - ESG / Reportes","estado":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":219.4},{"clave":"gads:1606422184:24052475412+6527967282:23847235596","nombre":"PS Argentina - SuSe - Huella de agua - Search","nombre_corto":"SuSe - Huella de agua","estado":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":178.46},{"clave":"gads:1606422184:24057321044+6527967282:23852277320","nombre":"PS Argentina - SuSe - Huella de carbono / GEI - Search","nombre_corto":"SuSe - Huella de carbono / GEI","estado":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":202.54},{"clave":"gads:1606422184:24052475403+6527967282:23843910153","nombre":"PS Argentina - SuSo - Abastecimiento sostenible - Search","nombre_corto":"SuSo - Abastecimiento sostenible","estado":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":11.06},{"clave":"gads:1606422184:24057321053+6527967282:23856763408","nombre":"PS Argentina - SuSo - Agricultura regenerativa- Search","nombre_corto":"SuSo - Agricultura regenerativa","estado":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":236.55},{"clave":"gads:1606422184:24052475406+6527967282:23844031386","nombre":"PS Argentina - SuSo - Trazabilidad / EUDR - Search","nombre_corto":"SuSo - Trazabilidad / EUDR","estado":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":29.91}]}}}]$gads$::jsonb) as x(
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

-- Verificación: 1 tarjeta, 8 campañas, USD 1049.45
select name, country, extra_countries, jsonb_array_length(data->'google_ads'->'campanas') as campanas, platform_investment
  from public.campaigns
 where type = 'paid' and data->'google_ads'->>'clave_externa' = any(array['gads-grupo:Peterson Solutions:Argentina'])
 order by name;

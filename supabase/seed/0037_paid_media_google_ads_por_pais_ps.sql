-- ════════════════════════════════════════════════════════════════════
-- Paid Media · Google Ads por unidad y país · Peterson Solutions (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Una tarjeta por unidad y país que paga, con la lista de sus campañas de
-- Google Ads (nombre y estado) en data.google_ads.campanas.
-- 1 tarjeta, 8 campañas, inversión en pauta USD 1,049.45 (Google Ads API, 2026-10-22).
-- · Tarjeta en proceso si tiene alguna campaña activa; completada (paso
--   finished + completed_at) si todas están pausadas.
-- · Borra las filas sueltas por campaña del seed 0036 que pasan a la tarjeta.
-- · Se puede volver a correr (con estos datos o con nuevos de Google Ads)
--   sin perder lo cargado en el Hub: de cada campaña actualiza el nombre en
--   Google Ads, las fechas y la inversión, y suma las campañas nuevas.
--   Respeta los nombres cortos, las campañas agregadas a mano y los estados
--   que el equipo cambió en el Hub (las demás toman el estado de Google Ads).
--   La inversión en pauta suma la diferencia, así no se pierde un ajuste a
--   mano. Si en Google Ads se pausaron todas y en el Hub no queda ninguna
--   activa, la marca como completada. No pisa Fee, plan, responsable,
--   HubSpot, deals, cotización, comentarios, programa ni otros países.
-- ════════════════════════════════════════════════════════════════════

with g as (
  select * from jsonb_to_recordset($gads$[{"clave":"gads-grupo:Peterson Solutions:Argentina","name":"PS Argentina","country":"Argentina","business_unit":"Peterson Solutions","extra_countries":[],"platform_investment":1049.45,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-05-18T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 18/05/2026","detail":"Google Ads Search. La lista de campañas y su estado está en «Campañas», más abajo.","facturar_a":{"unidad":"Peterson Solutions","pais":"Argentina"},"google_ads":{"clave_externa":"gads-grupo:Peterson Solutions:Argentina","grupo":"PS Argentina","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24057321071+6527967282:23863492270","nombre":"PS Argentina - Bioenergia / Biocombustibles - Search","nombre_corto":"Bioenergia / Biocombustibles","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-21","ultimo_dia":"2026-10-21","inversion_usd":118.54},{"clave":"gads:1606422184:24057321050+6527967282:23853590112","nombre":"PS Argentina - CeSu - Preparacion para certificaciones - Search","nombre_corto":"CeSu - Preparacion para certificaciones","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-22","ultimo_dia":"2026-10-21","inversion_usd":52.99},{"clave":"gads:1606422184:24057321056+6527967282:23857166371","nombre":"PS Argentina - SuSe - ESG / Reportes - Search","nombre_corto":"SuSe - ESG / Reportes","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":219.4},{"clave":"gads:1606422184:24052475412+6527967282:23847235596","nombre":"PS Argentina - SuSe - Huella de agua - Search","nombre_corto":"SuSe - Huella de agua","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":178.46},{"clave":"gads:1606422184:24057321044+6527967282:23852277320","nombre":"PS Argentina - SuSe - Huella de carbono / GEI - Search","nombre_corto":"SuSe - Huella de carbono / GEI","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":202.54},{"clave":"gads:1606422184:24052475403+6527967282:23843910153","nombre":"PS Argentina - SuSo - Abastecimiento sostenible - Search","nombre_corto":"SuSo - Abastecimiento sostenible","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":11.06},{"clave":"gads:1606422184:24057321053+6527967282:23856763408","nombre":"PS Argentina - SuSo - Agricultura regenerativa- Search","nombre_corto":"SuSo - Agricultura regenerativa","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":236.55},{"clave":"gads:1606422184:24052475406+6527967282:23844031386","nombre":"PS Argentina - SuSo - Trazabilidad / EUDR - Search","nombre_corto":"SuSo - Trazabilidad / EUDR","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":29.91}]}}}]$gads$::jsonb) as x(
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
-- Tarjetas que ya existen: la lista guardada (con lo cambiado en el Hub) y
-- la nueva de Google Ads
actual as (
  select c.id, g.clave,
         case when jsonb_typeof(c.data->'google_ads'->'campanas') = 'array'
              then c.data->'google_ads'->'campanas' else '[]'::jsonb end as antes,
         g.data->'google_ads'->'campanas' as nuevas
    from public.campaigns c
    join g on c.type = 'paid' and c.data->'google_ads'->>'clave_externa' = g.clave
),
-- Lista combinada. De cada campaña que ya estaba se actualizan el nombre en
-- Google Ads, las fechas y la inversión; el nombre corto queda el del Hub y
-- el estado se toma de Google Ads salvo que el equipo lo haya cambiado en el
-- Hub (estado distinto de estado_ads). Las agregadas a mano quedan igual y
-- las campañas nuevas de Google Ads se suman al final.
mezcla as (
  select a.id, a.clave, a.antes,
         (select coalesce(jsonb_agg(x.val order by x.ord), '[]'::jsonb) from (
            select case when n.val is null then e.val
                        else e.val || jsonb_build_object(
                               'nombre', n.val->'nombre', 'primer_dia', n.val->'primer_dia',
                               'ultimo_dia', n.val->'ultimo_dia', 'inversion_usd', n.val->'inversion_usd',
                               'estado', case when e.val->>'estado' is distinct from coalesce(e.val->>'estado_ads', e.val->>'estado')
                                              then e.val->'estado' else n.val->'estado' end,
                               'estado_ads', n.val->'estado')
                   end as val, e.ord
              from jsonb_array_elements(a.antes) with ordinality as e(val, ord)
              left join lateral (select n.val from jsonb_array_elements(a.nuevas) as n(val)
                                  where n.val->>'clave' = e.val->>'clave' limit 1) n on true
            union all
            select n.val, 100000 + n.ord
              from jsonb_array_elements(a.nuevas) with ordinality as n(val, ord)
             where not exists (select 1 from jsonb_array_elements(a.antes) as e(val)
                                where e.val->>'clave' = n.val->>'clave')
          ) x) as despues
    from actual a
),
-- La inversión en pauta suma la diferencia (conserva lo ajustado a mano).
-- Completa la tarjeta solo si en Google Ads se pausaron todas y en el Hub
-- no queda ninguna activa.
upd as (
  update public.campaigns c
     set platform_investment = coalesce(c.platform_investment, 0)
           + (select coalesce(sum((v->>'inversion_usd')::numeric), 0) from jsonb_array_elements(m.despues) as v)
           - (select coalesce(sum((v->>'inversion_usd')::numeric), 0) from jsonb_array_elements(m.antes) as v),
         data = coalesce(c.data, '{}'::jsonb) || jsonb_build_object('google_ads',
           coalesce(c.data->'google_ads', '{}'::jsonb) || (g.data->'google_ads') || jsonb_build_object('campanas', m.despues)),
         completed_steps = case when g.completed_at is not null
                                     and not exists (select 1 from jsonb_array_elements(m.despues) as v where v->>'estado' = 'Activa')
                                     and not ('finished' = any(coalesce(c.completed_steps, '{}')))
                                then coalesce(c.completed_steps, '{}') || array['finished'] else c.completed_steps end,
         completed_at = case when g.completed_at is not null and c.completed_at is null
                                  and not exists (select 1 from jsonb_array_elements(m.despues) as v where v->>'estado' = 'Activa')
                             then g.completed_at else c.completed_at end
    from mezcla m
    join g on g.clave = m.clave
   where c.id = m.id
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

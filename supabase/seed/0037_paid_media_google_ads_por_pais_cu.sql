-- ════════════════════════════════════════════════════════════════════
-- Paid Media · Google Ads por unidad y país · Control Union (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Una tarjeta por unidad y país que paga, con la lista de sus campañas de
-- Google Ads (nombre y estado) en data.google_ads.campanas.
-- 5 tarjetas, 31 campañas, inversión en pauta USD 5,707.81 (Google Ads API, 2026-10-22).
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
  select * from jsonb_to_recordset($gads$[{"clave":"gads-grupo:Control Union:Argentina","name":"CU Argentina","country":"Argentina","business_unit":"Control Union","extra_countries":[],"platform_investment":410.39,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-09-18T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 18/09/2026","detail":"Google Ads Search. La lista de campañas y su estado está en «Campañas», más abajo.","facturar_a":{"unidad":"Control Union","pais":"Argentina"},"google_ads":{"clave_externa":"gads-grupo:Control Union:Argentina","grupo":"CU Argentina","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24256799941","nombre":"CU Argentina - Agro sostentible - Search","nombre_corto":"Agro sostentible","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-09-30","ultimo_dia":"2026-10-21","inversion_usd":12.86},{"clave":"gads:1606422184:24251193083","nombre":"CU Argentina - Agroexportación - Search","nombre_corto":"Agroexportación","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-09-18","ultimo_dia":"2026-10-21","inversion_usd":174.32},{"clave":"gads:1606422184:24256799938","nombre":"CU Argentina - Biocombustible - Search","nombre_corto":"Biocombustible","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-09-19","ultimo_dia":"2026-10-21","inversion_usd":39.25},{"clave":"gads:1606422184:24256799947","nombre":"CU Argentina - Cadena de Custodia - Search","nombre_corto":"Cadena de Custodia","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-09-30","ultimo_dia":"2026-10-21","inversion_usd":30.24},{"clave":"gads:1606422184:24256799950","nombre":"CU Argentina - GHG - Search","nombre_corto":"GHG","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-09-19","ultimo_dia":"2026-10-21","inversion_usd":97.66},{"clave":"gads:1606422184:24256799944","nombre":"CU Argentina - Industria - Search","nombre_corto":"Industria","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-09-18","ultimo_dia":"2026-10-21","inversion_usd":56.06}]}}},{"clave":"gads-grupo:Control Union:Canada","name":"CU Canada","country":"Canada","business_unit":"Control Union","extra_countries":[],"platform_investment":804.53,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-04-13T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 13/04/2026","detail":"Google Ads Search. La lista de campañas y su estado está en «Campañas», más abajo.","facturar_a":{"unidad":"Control Union","pais":"Canada"},"google_ads":{"clave_externa":"gads-grupo:Control Union:Canada","grupo":"CU Canada","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24052475400+6527967282:23840019312","nombre":"CU Canada - Canada Gap - Search","nombre_corto":"Canada Gap","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-18","ultimo_dia":"2026-10-21","inversion_usd":195.56},{"clave":"gads:1606422184:24052475415+6527967282:23848448294","nombre":"CU Canada - Forestry - Search","nombre_corto":"Forestry","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-19","ultimo_dia":"2026-10-21","inversion_usd":306.56},{"clave":"gads:1606422184:24052475409+6527967282:23845340120","nombre":"CU Canada - GLOBALG.A.P. - Search","nombre_corto":"GLOBALG.A.P.","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-19","ultimo_dia":"2026-10-21","inversion_usd":77.66},{"clave":"gads:1606422184:24052475277+6527967282:23730225570","nombre":"CU Canada - Smeta - Search","nombre_corto":"Smeta","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-04-13","ultimo_dia":"2026-10-21","inversion_usd":142.03},{"clave":"gads:1606422184:24057321047+6527967282:23853091093","nombre":"CU Canada- Aqua / Fisheries - Search","nombre_corto":"Aqua / Fisheries","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-06-25","ultimo_dia":"2026-10-21","inversion_usd":82.72}]}}},{"clave":"gads-grupo:Control Union:España","name":"CU España","country":"España","business_unit":"Control Union","extra_countries":[],"platform_investment":2553.98,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-02-12T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 12/02/2026","detail":"Google Ads Search. La lista de campañas y su estado está en «Campañas», más abajo.","facturar_a":{"unidad":"Control Union","pais":"España"},"google_ads":{"clave_externa":"gads-grupo:Control Union:España","grupo":"CU España","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24057321086+6527967282:23870791342","nombre":"CU España - Bioenergia - Search","nombre_corto":"Bioenergia","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-24","ultimo_dia":"2026-10-21","inversion_usd":171.37},{"clave":"gads:1606422184:24057321059+6527967282:23860528206","nombre":"CU España - Biomasa - Search","nombre_corto":"Biomasa","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":67.91},{"clave":"gads:1606422184:24057321098","nombre":"CU España - CAEs - Search","nombre_corto":"CAEs","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-08-07","ultimo_dia":"2026-10-21","inversion_usd":135.06},{"clave":"gads:6527967282:23993092024","nombre":"CU España - Car - Search","nombre_corto":"Car","estado":"Pausada","estado_ads":"Pausada","primer_dia":"2026-07-02","ultimo_dia":"2026-07-23","inversion_usd":52.56},{"clave":"gads:1606422184:24057321092+6527967282:23870835547","nombre":"CU España - Forestal - Search","nombre_corto":"Forestal","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":214.75},{"clave":"gads:1606422184:24052475274+6527967282:23560818640","nombre":"CU España - GMP+ - Search","nombre_corto":"GMP+","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-02-12","ultimo_dia":"2026-10-21","inversion_usd":703.24},{"clave":"gads:1606422184:24052475271+6527967282:23556195596","nombre":"CU España - IFS - SEARCH","nombre_corto":"IFS","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-02-13","ultimo_dia":"2026-10-21","inversion_usd":634.28},{"clave":"gads:1606422184:24057321083+6527967282:23870225920","nombre":"CU España - Plasticos - Search","nombre_corto":"Plasticos","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":181.68},{"clave":"gads:1606422184:24057321074+6527967282:23865793847","nombre":"CU España - Smeta - Search","nombre_corto":"Smeta","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":177.44},{"clave":"gads:1606422184:24057321089+6527967282:23870806531","nombre":"CU España - Textile - Search","nombre_corto":"Textile","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":215.69}]}}},{"clave":"gads-grupo:Control Union:Estados Unidos","name":"CU Estados Unidos","country":"Estados Unidos","business_unit":"Control Union","extra_countries":[],"platform_investment":606.53,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-08-21T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 21/08/2026","detail":"Google Ads Search. La lista de campañas y su estado está en «Campañas», más abajo.","facturar_a":{"unidad":"Control Union","pais":"Estados Unidos"},"google_ads":{"clave_externa":"gads-grupo:Control Union:Estados Unidos","grupo":"CU Estados Unidos","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24329920730","nombre":"CU United States - IFPA event - Search","nombre_corto":"IFPA event","estado":"Pausada","estado_ads":"Pausada","primer_dia":"2026-10-08","ultimo_dia":"2026-10-18","inversion_usd":174.22},{"clave":"gads:1606422184:24164538908","nombre":"CU United States - Organic - PrimusGFS - Search","nombre_corto":"Organic - PrimusGFS","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-08-21","ultimo_dia":"2026-09-11","inversion_usd":17.3},{"clave":"gads:1606422184:24164537216","nombre":"CU United States - Organic - USDA NOP - Search","nombre_corto":"Organic - USDA NOP","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-08-21","ultimo_dia":"2026-10-21","inversion_usd":415.01}]}}},{"clave":"gads-grupo:Control Union:Portugal","name":"CU Portugal","country":"Portugal","business_unit":"Control Union","extra_countries":[],"platform_investment":1332.38,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-02-12T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 12/02/2026","detail":"Google Ads Search. La lista de campañas y su estado está en «Campañas», más abajo.","facturar_a":{"unidad":"Control Union","pais":"Portugal"},"google_ads":{"clave_externa":"gads-grupo:Control Union:Portugal","grupo":"CU Portugal","tipo":"Search","fuente":"Google Ads API","extraido":"2026-10-22","campanas":[{"clave":"gads:1606422184:24057321068+6527967282:23861207970","nombre":"CU Portugal - Bioenergia - Search","nombre_corto":"Bioenergia","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":140.66},{"clave":"gads:1606422184:24057321065+6527967282:23861207967","nombre":"CU Portugal - Biomasa - Search","nombre_corto":"Biomasa","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-22","ultimo_dia":"2026-10-20","inversion_usd":26.49},{"clave":"gads:1606422184:24057321062+6527967282:23861207688","nombre":"CU Portugal - Forestal - Search","nombre_corto":"Forestal","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-26","ultimo_dia":"2026-10-21","inversion_usd":95.06},{"clave":"gads:1606422184:24052475268+6527967282:23556159815","nombre":"CU Portugal - GMP+ - SEARCH","nombre_corto":"GMP+","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-02-12","ultimo_dia":"2026-10-19","inversion_usd":590.1},{"clave":"gads:1606422184:24057321095+6527967282:23870903698","nombre":"CU Portugal - Plasticos - Search","nombre_corto":"Plasticos","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-26","ultimo_dia":"2026-10-21","inversion_usd":125.49},{"clave":"gads:1606422184:24057321077+6527967282:23866443020","nombre":"CU Portugal - Smeta - Search","nombre_corto":"Smeta","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-25","ultimo_dia":"2026-10-21","inversion_usd":140.67},{"clave":"gads:1606422184:24057321080+6527967282:23866443026","nombre":"CU Portugal - Textile - Search","nombre_corto":"Textile","estado":"Activa","estado_ads":"Activa","primer_dia":"2026-05-23","ultimo_dia":"2026-10-21","inversion_usd":213.91}]}}}]$gads$::jsonb) as x(
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

-- Verificación: 5 tarjetas, 31 campañas, USD 5707.81
select name, country, extra_countries, jsonb_array_length(data->'google_ads'->'campanas') as campanas, platform_investment
  from public.campaigns
 where type = 'paid' and data->'google_ads'->>'clave_externa' = any(array['gads-grupo:Control Union:Argentina', 'gads-grupo:Control Union:Canada', 'gads-grupo:Control Union:España', 'gads-grupo:Control Union:Estados Unidos', 'gads-grupo:Control Union:Portugal'])
 order by name;

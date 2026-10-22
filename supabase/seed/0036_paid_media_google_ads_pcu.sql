-- ════════════════════════════════════════════════════════════════════
-- Paid Media · histórico de Google Ads · PCU (la paga Control Union España) (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- 4 campañas, inversión en pauta USD 878.16. Fuente: Google Ads API
-- (extraído el 2026-10-22), un archivo por marca.
-- · Activas → en proceso (pasos brief, creativities, launch).
-- · Pausadas → completadas (+ paso finished y completed_at = último día con impresiones).
-- · country = país que paga; extra_countries = otros países.
-- · created_at = primer día de la campaña.
-- Clave sin duplicados: data.google_ads.clave_externa. Si se corre de nuevo,
-- solo actualiza lo que viene de Google Ads (inversión, resultados y, si se
-- pausó, la marca como completada); no toca Fee Marcomms, plan, responsable,
-- HubSpot, deals, cotización, comentarios ni programa.
-- ════════════════════════════════════════════════════════════════════

with g as (
  select * from jsonb_to_recordset($gads$[{"clave":"gads:1606422184:24231149722","name":"PCU - Argentina - ISO 27001 - Search","country":"España","business_unit":"PCU","extra_countries":["Argentina"],"platform_investment":366.44,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-09-08T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 08/09/2026","detail":"Google Ads Search (ISO 27001) · Puja: Maximizar clics · Presupuesto: 12.750 ARS/día · Ubicaciones: Argentina · Idiomas: English, Spanish · 3 grupos de anuncios, 31 keywords · Landing: https://argentina.controlunion.com/programa-de-certificacion/iso-27001/ · Cuentas: Control Union - (en ARG) (1606422184) id 24231149722","facturar_a":{"unidad":"Control Union","pais":"España"},"google_ads":{"clave_externa":"gads:1606422184:24231149722","ids":["1606422184:24231149722"],"estado":"Activa","tipo":"Search","estrategia_puja":"Maximizar clics","primer_dia":"2026-09-08","ultimo_dia":"2026-10-21","landings":["https://argentina.controlunion.com/programa-de-certificacion/iso-27001/"],"resultados":{"impresiones":4890,"clics":278,"ctr_pct":5.69,"cpc_usd":1.32,"conversiones":1.0,"cpl_usd":366.44},"gasto_original":{"ARS":555603.79},"fuente":"Google Ads API","extraido":"2026-10-22","mensual":[{"mes":"2026-09","usd":193.72,"impresiones":2597,"clics":150,"conversiones":1.0},{"mes":"2026-10","usd":172.72,"impresiones":2293,"clics":128,"conversiones":0.0}]}}},{"clave":"gads:1606422184:24231149725","name":"PCU - Argentina - Competidores ISO 27001 - Search","country":"España","business_unit":"PCU","extra_countries":["Argentina"],"platform_investment":13.5,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-09-09T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 09/09/2026","detail":"Google Ads Search (Competidores ISO 27001) · Puja: Maximizar clics · Presupuesto: 2.000 ARS/día · Ubicaciones: Argentina · Idiomas: English, Spanish · 1 grupos de anuncios, 8 keywords · Landing: https://argentina.controlunion.com/programa-de-certificacion/iso-27001/ · Cuentas: Control Union - (en ARG) (1606422184) id 24231149725","facturar_a":{"unidad":"Control Union","pais":"España"},"google_ads":{"clave_externa":"gads:1606422184:24231149725","ids":["1606422184:24231149725"],"estado":"Activa","tipo":"Search","estrategia_puja":"Maximizar clics","primer_dia":"2026-09-09","ultimo_dia":"2026-10-20","landings":["https://argentina.controlunion.com/programa-de-certificacion/iso-27001/"],"resultados":{"impresiones":331,"clics":11,"ctr_pct":3.32,"cpc_usd":1.23,"conversiones":0.0,"cpl_usd":null},"gasto_original":{"ARS":20453.97},"fuente":"Google Ads API","extraido":"2026-10-22","mensual":[{"mes":"2026-09","usd":11.06,"impresiones":298,"clics":9,"conversiones":0.0},{"mes":"2026-10","usd":2.44,"impresiones":33,"clics":2,"conversiones":0.0}]}}},{"clave":"gads:1606422184:24231149728","name":"PCU - España - ISO 27001 - Search","country":"España","business_unit":"PCU","extra_countries":[],"platform_investment":447.41,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-09-08T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 08/09/2026","detail":"Google Ads Search (ISO 27001) · Puja: Maximizar clics · Presupuesto: 15.300 ARS/día · Idiomas: English, Spanish · 3 grupos de anuncios, 31 keywords · Landing: https://espana.controlunion.com/programa-de-certificacion/certification-program-iso-27001-certification/ · Cuentas: Control Union - (en ARG) (1606422184) id 24231149728","facturar_a":{"unidad":"Control Union","pais":"España"},"google_ads":{"clave_externa":"gads:1606422184:24231149728","ids":["1606422184:24231149728"],"estado":"Activa","tipo":"Search","estrategia_puja":"Maximizar clics","primer_dia":"2026-09-08","ultimo_dia":"2026-10-21","landings":["https://espana.controlunion.com/programa-de-certificacion/certification-program-iso-27001-certification/"],"resultados":{"impresiones":16402,"clics":1001,"ctr_pct":6.1,"cpc_usd":0.45,"conversiones":1.0,"cpl_usd":447.41},"gasto_original":{"ARS":678410.88},"fuente":"Google Ads API","extraido":"2026-10-22","mensual":[{"mes":"2026-09","usd":231.88,"impresiones":5480,"clics":360,"conversiones":1.0},{"mes":"2026-10","usd":215.54,"impresiones":10922,"clics":641,"conversiones":0.0}]}}},{"clave":"gads:1606422184:24231149731","name":"PCU - España - Competidores ISO 27001 - Search","country":"España","business_unit":"PCU","extra_countries":[],"platform_investment":50.81,"completed_steps":["brief","creativities","launch"],"completed_at":null,"created_at":"2026-09-09T12:00:00-03:00","data":{"platforms":["google"],"paidMode":"always_on","objective":"posicionamiento","duration":"Sin fecha de fin · desde 09/09/2026","detail":"Google Ads Search (Competidores ISO 27001) · Puja: Maximizar clics · Presupuesto: 2.500 ARS/día · Idiomas: English, Spanish · 1 grupos de anuncios, 8 keywords · Landing: https://espana.controlunion.com/programa-de-certificacion/certification-program-iso-27001-certification/ · Cuentas: Control Union - (en ARG) (1606422184) id 24231149731","facturar_a":{"unidad":"Control Union","pais":"España"},"google_ads":{"clave_externa":"gads:1606422184:24231149731","ids":["1606422184:24231149731"],"estado":"Activa","tipo":"Search","estrategia_puja":"Maximizar clics","primer_dia":"2026-09-09","ultimo_dia":"2026-10-21","landings":["https://espana.controlunion.com/programa-de-certificacion/certification-program-iso-27001-certification/"],"resultados":{"impresiones":386,"clics":22,"ctr_pct":5.7,"cpc_usd":2.31,"conversiones":0.0,"cpl_usd":null},"gasto_original":{"ARS":77024.19},"fuente":"Google Ads API","extraido":"2026-10-22","mensual":[{"mes":"2026-09","usd":30.81,"impresiones":191,"clics":13,"conversiones":0.0},{"mes":"2026-10","usd":20.0,"impresiones":195,"clics":9,"conversiones":0.0}]}}}]$gads$::jsonb) as x(
    clave text, name text, country text, business_unit text, extra_countries text[],
    platform_investment numeric, completed_steps text[], completed_at timestamptz,
    created_at timestamptz, data jsonb)
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

-- Verificación: debería dar 4 campañas y USD 878.16
select business_unit, count(*) as campanas, sum(platform_investment) as inversion_usd,
       count(*) filter (where completed_at is not null) as completadas
  from public.campaigns
 where type = 'paid' and data->'google_ads'->>'clave_externa' = any(array['gads:1606422184:24231149722', 'gads:1606422184:24231149725', 'gads:1606422184:24231149728', 'gads:1606422184:24231149731'])
 group by business_unit;

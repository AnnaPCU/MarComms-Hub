-- ════════════════════════════════════════════════════════════════════
-- Migration 0025 — País "USA" pasa a "Estados Unidos" (todo en español)
-- ════════════════════════════════════════════════════════════════════
-- El Hub maneja todos los nombres en español. La clave del país en
-- constants/markets.js pasa de "USA" a "Estados Unidos" y se migran los
-- datos guardados. También revierte la 0024: el plan vuelve a llamarse
-- "Control Union Estados Unidos Orgánico" (mismo id).
--
-- NO se tocan:
--   · utm_links.utm_campaign / url: links ya publicados (código "usa").
--     Los UTMs nuevos de Estados Unidos también salen con "usa" (ver
--     UTM_COUNTRY_CODES en src/utils/utm.js) para no partir los reportes.
--   · Nombres escritos a mano (títulos de campañas) ni razones sociales
--     ("767 - Peterson USA").
--
-- Una sola sentencia (CTEs de modificación): se aplica todo o nada.
-- Aplicada desde Claude Code con el conector de Supabase (oct 2026).
-- ════════════════════════════════════════════════════════════════════

with
  w  as (update public.webinars      set pais    = 'Estados Unidos' where pais    = 'USA' returning 1),
  c  as (update public.campaigns     set country = 'Estados Unidos' where country = 'USA' returning 1),
  e  as (update public.events        set country = 'Estados Unidos' where country = 'USA' returning 1),
  p  as (update public.programs      set country = 'Estados Unidos' where country = 'USA' returning 1),
  r  as (update public.requests      set country = 'Estados Unidos' where country = 'USA' returning 1),
  sc as (update public.success_cases set country = 'Estados Unidos' where country = 'USA' returning 1),
  u  as (update public.utm_links     set country = regexp_replace(country, '\mUSA\M', 'Estados Unidos', 'g')
          where country ~ '\mUSA\M' returning 1),
  sa as (update public.social_accounts set name = 'Estados Unidos' where name = 'USA' returning 1),
  ce as (update public.crm_entities  set name = replace(name, ' USA', ' Estados Unidos')
          where name in ('CU USA', 'PS USA') returning 1),
  bp as (update public.billing_plans set name = 'Control Union Estados Unidos Orgánico'
          where name = 'Control Union USA Orgánico' returning 1)
select (select count(*) from w)  as webinars,
       (select count(*) from c)  as campaigns,
       (select count(*) from e)  as events,
       (select count(*) from p)  as programs,
       (select count(*) from r)  as requests,
       (select count(*) from sc) as success_cases,
       (select count(*) from u)  as utm_links,
       (select count(*) from sa) as social_accounts,
       (select count(*) from ce) as crm_entities,
       (select count(*) from bp) as billing_plans;

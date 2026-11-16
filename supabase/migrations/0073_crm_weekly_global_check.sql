-- ════════════════════════════════════════════════════════════════════
-- Migration 0073 — CRM HubSpot · Global check (Américas, EMEA y APAC)
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot), para el viaje a Holanda: una tercera
-- pestaña «Global check» con todas las entidades y filtro por región. El
-- Weekly check sigue mostrando solo Américas (España y Portugal incluidas).
--
-- 1) crm_weekly_entities.region: 'Américas' | 'EMEA' | 'APAC'. Las 19 que
--    ya estaban quedan en Américas (default).
-- 2) Ítem nuevo del checklist, para todas las entidades: «Deals de la
--    Commercial Tool importados» (id commercialTool).
-- 3) Las entidades nuevas de la lista de Anna (13/16 nov 2026): 3 de
--    Américas, 11 de EMEA y 5 de APAC. Si el código ya existe no se toca.
--    Mismo código con varias opciones en HubSpot (524 Romania Cert + Insp,
--    544 Malaysia Cert + Insp + Academy) = una sola entidad.
--
-- Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

alter table public.crm_weekly_entities add column if not exists region text not null default 'Américas';

insert into public.crm_check_items (id, label, hint, position) values
  ('commercialTool', 'Deals de la Commercial Tool importados', null, 8)
on conflict (id) do nothing;

insert into public.crm_weekly_entities (code, name, brand, country, region, position) values
  -- Américas
  ('849', 'Peterson Solutions Chile', 'Peterson', 'Chile', 'Américas', 100),
  ('879', 'Peterson Academy Chile', 'Peterson', 'Chile', 'Américas', 101),
  ('723', 'Delphy Agadvisory Inc.', 'Otra', null, 'Américas', 102),
  -- EMEA
  ('383', 'Control Union Germany', 'Control Union', 'Alemania', 'EMEA', 200),
  ('524', 'Control Union Romania', 'Control Union', 'Rumania', 'EMEA', 201),
  ('555', 'Control Union Poland', 'Control Union', 'Polonia', 'EMEA', 202),
  ('847', 'Control Union Switzerland', 'Control Union', 'Suiza', 'EMEA', 203),
  ('506', 'Control Union Certifications B.V.', 'Control Union', 'Países Bajos', 'EMEA', 204),
  ('760', 'Control Union Vessel Performance Centre B.V.', 'Control Union', 'Países Bajos', 'EMEA', 205),
  ('818', 'Control Union South Africa', 'Control Union', 'Sudáfrica', 'EMEA', 206),
  ('579', 'Secal Israel', 'Otra', 'Israel', 'EMEA', 207),
  ('551', 'Peterson Projects Swiss', 'Peterson', 'Suiza', 'EMEA', 208),
  ('381', 'Peterson Polska', 'Peterson', 'Polonia', 'EMEA', 209),
  ('771', 'Peterson Solutions B.V.', 'Peterson', 'Países Bajos', 'EMEA', 210),
  -- APAC
  ('544', 'Control Union Malaysia', 'Control Union', 'Malasia', 'APAC', 300),
  ('821', 'CU Inspections & Certifications India', 'Control Union', 'India', 'APAC', 301),
  ('593', 'Control Union Certification (Shanghai)', 'Control Union', 'China', 'APAC', 302),
  ('756', 'Peterson Projects & Solutions Singapore', 'Peterson', 'Singapur', 'APAC', 303),
  ('763', 'Peterson Solutions Japan', 'Peterson', 'Japón', 'APAC', 304)
on conflict (code) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- Migration 0076 — CRM HubSpot · datos del Weekly / Global check en inglés
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot): toda la sección CRM HubSpot pasa al
-- inglés, también los datos que no cargó el equipo a mano:
--   · crm_weekly_entities.region: «Américas» → «Americas» (y el default)
--   · crm_weekly_entities.brand:  «Otra» → «Other»
--   · crm_weekly_entities.country: países en inglés
--   · crm_check_items: labels / hint de los ítems de siempre en inglés y
--     «Américas» → «Americas» en target_regions
-- Los próximos steps (títulos, tipos, detalle), los tags y los nombres
-- legales de las entidades quedan como los cargaron.
--
-- Solo UPDATE y un nuevo default; se puede correr más de una vez.
-- El Hub lee igual «Américas» / «Otra» (normRegion / normBrand en
-- src/constants/crmWeekly.js) por si queda algún dato viejo.
-- ════════════════════════════════════════════════════════════════════

alter table public.crm_weekly_entities alter column region set default 'Americas';

update public.crm_weekly_entities set region = 'Americas' where region = 'Américas';
update public.crm_weekly_entities set brand = 'Other' where brand = 'Otra';

update public.crm_weekly_entities e set country = m.en
from (values
  ('Alemania', 'Germany'), ('Brasil', 'Brazil'), ('China', 'China'), ('España', 'Spain'),
  ('Estados Unidos', 'United States'), ('India', 'India'), ('Israel', 'Israel'), ('Japón', 'Japan'),
  ('Malasia', 'Malaysia'), ('México', 'Mexico'), ('Países Bajos', 'Netherlands'), ('Perú', 'Peru'),
  ('Polonia', 'Poland'), ('Republica Dominicana', 'Dominican Republic'), ('República Dominicana', 'Dominican Republic'),
  ('Rep. Dominicana', 'Dominican Republic'), ('Rumania', 'Romania'), ('Singapur', 'Singapore'),
  ('Sudáfrica', 'South Africa'), ('Suiza', 'Switzerland'), ('Panamá', 'Panama'), ('Haití', 'Haiti'),
  ('Belice', 'Belize'), ('Reino Unido', 'United Kingdom'), ('Francia', 'France'), ('Italia', 'Italy'),
  ('Bélgica', 'Belgium'), ('Turquía', 'Turkey'), ('Tailandia', 'Thailand'), ('Vietnam', 'Vietnam')
) as m(es, en)
where e.country = m.es;

update public.crm_check_items c set label = m.label, hint = m.hint
from (values
  ('outlook', 'Outlook & calendar connected', null),
  ('deals', 'New deals logged', 'And renewals, in certification entities'),
  ('meetings', 'Meeting scheduler in use', null),
  ('documents', 'Documents in use', null),
  ('adoption', 'Adoption reports in use', null),
  ('claude', 'Claude connection', null),
  ('trainingSales', 'Sales trainings', null),
  ('trainingAdmin', 'SuperAdmin trainings', null),
  ('commercialTool', 'Commercial Tool deals imported', null)
) as m(id, label, hint)
where c.id = m.id;

update public.crm_check_items set target_regions = array_replace(target_regions, 'Américas', 'Americas')
where 'Américas' = any(target_regions);

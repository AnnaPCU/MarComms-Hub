-- ════════════════════════════════════════════════════════════════════
-- Seed 0077 — CRM HubSpot · entidades con deals en HubSpot que faltaban
-- ════════════════════════════════════════════════════════════════════
-- 23 nov 2026 (sesión CRM HubSpot), a pedido: todo código de «PCU Entity»
-- (pcu_office) con deals en HubSpot que no estaba en crm_weekly_entities
-- se suma al Global check (y las de Americas también al Weekly check).
-- Deals en HubSpot (todos, al 23 nov 2026): 589 → 133, 761 → 17, 590 → 14,
-- 754 → 12, 769 → 9, 301 → 8, 766 → 5, 822 → 5, 548 → 5, 811 → 3, 837 → 3,
-- 759 → 2, 539 → 1, 873 → 1, 858 → 1.
-- Sin código (no se pueden sumar): «Malaysia Ticket Sales Team» (108) y
-- «PS China» (8).
-- Si el código ya existe no se toca. Se puede correr más de una vez.
-- ════════════════════════════════════════════════════════════════════

insert into public.crm_weekly_entities (code, name, brand, country, region, position) values
  -- Americas
  ('590', 'Control Union Paraguay S.A.', 'Control Union', 'Paraguay', 'Americas', 400),
  ('858', 'Peterson Consultancy Ecuador', 'Peterson', 'Ecuador', 'Americas', 401),
  ('873', 'Control Union Academy SpA', 'Control Union', 'Chile', 'Americas', 402),
  -- EMEA
  ('301', 'Peterson Nederland B.V.', 'Peterson', 'Netherlands', 'EMEA', 410),
  ('766', 'Peterson Solutions GmbH', 'Peterson', 'Germany', 'EMEA', 411),
  ('811', 'EcO2 Kontrollu Atm. Ltd', 'Peterson', 'Turkey', 'EMEA', 412),
  ('837', 'MacAlister Elliot & Partners Ltd.', 'Peterson', 'United Kingdom', 'EMEA', 413),
  -- APAC
  ('539', 'CU Inspections India Pvt Ltd', 'Control Union', 'India', 'APAC', 420),
  ('548', 'PT Peterson Mitra Indonesia', 'Peterson', 'Indonesia', 'APAC', 421),
  ('589', 'Control Union Philippines Inc', 'Control Union', 'Philippines', 'APAC', 422),
  ('754', 'Peterson Services Vietnam Co., Ltd.', 'Peterson', 'Vietnam', 'APAC', 423),
  ('759', 'Peterson Projects & Solutions Malaysia', 'Peterson', 'Malaysia', 'APAC', 424),
  ('761', 'Peterson Projects & Solutions (Thailand) Co.', 'Peterson', 'Thailand', 'APAC', 425),
  ('769', 'Peterson Projects & Solutions Sri Lanka Ltd', 'Peterson', 'Sri Lanka', 'APAC', 426),
  ('822', 'Peterson Services India Pvt Ltd', 'Peterson', 'India', 'APAC', 427)
on conflict (code) do nothing;

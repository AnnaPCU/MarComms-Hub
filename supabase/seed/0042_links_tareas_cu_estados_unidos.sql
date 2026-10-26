-- ════════════════════════════════════════════════════════════════════
-- Seed 0042 — Links de las tareas de Control Union Estados Unidos
-- Orgánico, sacados de los reportes de referencia (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Los reportes mensuales HTML (CU Estados Unidos · Septiembre 2026,
-- CU Argentina · Septiembre 2026, PS Argentina · multi período) traen un
-- link por entregable. En CU Argentina y PS Argentina las tareas ya tenían
-- esos links; en CU Estados Unidos faltaban los 7 de abajo.
--
-- Formato de la columna Link: "Nombre" en una línea y la URL en la
-- siguiente (se ve como un link con ese nombre, ver TaskLinks).
-- Solo completa tareas que no tienen link: si alguien ya cargó uno en el
-- Hub, no lo pisa. Se puede volver a correr.
-- Aplicado el 26 oct 2026 con el conector de Supabase.
-- ════════════════════════════════════════════════════════════════════

update public.plan_tasks as t
set link = v.link
from (values
  -- Optimización web 2.0 (agosto)
  ('21c303ed-6ac4-4e17-a137-74fd9db87a0f'::uuid,
   'USDA Organic' || E'\n' || 'https://northamerica.controlunion.com/certification-program/usda-organic-nop-certification/' || E'\n' ||
   'PrimusGFS' || E'\n' || 'https://northamerica.controlunion.com/certification-program/primusgfs-certification/'),
  -- Benchmarking: Investigacion SCS (agosto) = «Benchmarking: investigación competitiva» (33 programas)
  ('a7d4c620-8eed-4234-82bf-3a8af8466d24'::uuid,
   'Benchmarking' || E'\n' || 'https://pcugroup.sharepoint.com/:x:/r/sites/CommunicationsLATAM/Gedeelde%20documenten/General/000.Planes%20MarComms/CU%20-%20Certificaciones%20USA%20-%20Org%C3%A1nico/Reportes/Benchmarking%20-%20competitive%20research.xlsx?d=we8e5f90e90f64f6a952a8139908d6e0b&csf=1&web=1&e=cp8RqZ'),
  -- Branding CUC (agosto)
  ('7a255639-f1db-40c9-84d5-6487ee6bdd2f'::uuid,
   'Decisión de marca CUC' || E'\n' || 'https://pcugroup.sharepoint.com/:i:/r/sites/CommunicationsLATAM/Gedeelde%20documenten/General/000.Planes%20MarComms/CU%20-%20Certificaciones%20USA%20-%20Org%C3%A1nico/Branding/Decisi%C3%B3n%20de%20marca%20CUC.png?d=w776c45cffd994c2aa776053ea6b3e59f&csf=1&web=1&e=dI4D75'),
  -- Creacion de BBDD Commercial Tool (agosto)
  ('8e479045-e90f-489e-9835-85834d6654a1'::uuid,
   'Pipeline en HubSpot' || E'\n' || 'https://app.hubspot.com/contacts/47081900/objects/0-3/views/73376389/board'),
  -- Social Media Optmization: Profile Pro (agosto)
  ('ea61080a-722f-490a-8512-99c74237b259'::uuid,
   'Perfil de Karl en LinkedIn' || E'\n' || 'https://www.linkedin.com/in/karlosoriodiaz/'),
  -- Benchmarking: Top Priority CBs (septiembre) = «Benchmarking digital: competidores» (redes, web, anuncios)
  ('75d82d2b-0825-43b9-8fa8-955b5c5e2166'::uuid,
   'Benchmarking digital' || E'\n' || 'https://pcugroup.sharepoint.com/:p:/r/sites/CommunicationsLATAM/Gedeelde%20documenten/General/000.Planes%20MarComms/CU%20-%20Certificaciones%20USA%20-%20Org%C3%A1nico/Reportes/Digital%20Benchmarking%20-%20competitors.pptx?d=w4e030068a6734f899ca1e329d95278e0&csf=1&web=1&e=aGiRgH'),
  -- USDA Report (septiembre)
  ('9c08671c-8334-4411-ab38-5a956777c4d7'::uuid,
   'Informe de mercado USDA' || E'\n' || 'https://pcugroup.sharepoint.com/:b:/r/sites/CommunicationsLATAM/Gedeelde%20documenten/General/000.Planes%20MarComms/CU%20-%20Certificaciones%20USA%20-%20Org%C3%A1nico/Reportes/USDA%20Market%20report.pdf?d=wdeb81a494a394019aac6094650f7857e&csf=1&web=1&e=vUmHCw')
) as v(id, link)
where t.id = v.id
  and coalesce(btrim(t.link), '') = '';

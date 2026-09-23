-- ════════════════════════════════════════════════════════════════════
-- Seed 0018 — Entrenamientos históricos del CRM (importados del Excel)
-- ════════════════════════════════════════════════════════════════════
-- OPCIONAL. Carga lo que el Excel "CRM Peterson & Control Union HubSpot
-- Users - Seats" registra sobre entrenamientos, para no arrancar de cero.
--
-- Qué había en el Excel y cómo se interpretó:
--   · Hoja "Price", columnas "Detalle a SS MARZO / ABRIL / MAYO": qué se
--     facturó cada mes por entidad ("5 Licencias + 1 Entrenamiento", etc.).
--     → Esos entrenamientos entran como `cobrado` con billed_month = ese mes.
--     Supuesto: el año es 2026 (el Excel no lo dice; las columnas van de
--     octubre a diciembre del año siguiente y hoy es septiembre 2026).
--   · El Excel NO tiene fecha del entrenamiento, quién lo dio ni cuántos
--     asistieron → date, trainer y attendees quedan en null.
--   · El monto del entrenamiento va dentro del total del mes junto con las
--     licencias, así que `amount` queda null salvo CU Chile, donde el mes
--     solo tenía el entrenamiento (150) o la implementación (250).
--   · Hoja "Status", columnas "Entrenamientos Comerciales" / "Entrenamiento
--     Super Admin" en TRUE para entidades que NO aparecen con entrenamiento
--     facturado en "Detalle a SS" → entran como `realizado`, sin fecha ni
--     cobro registrados (PTech, CU Cert Argentina, PS Argentina, CU Mexico,
--     CU Canada, CU Peru, PS Switzerland).
--   · CU Colombia y CU Ecuador tienen cobros en julio (250) y agosto (390)
--     sin detalle: NO se cargan, porque no se sabe si fueron entrenamientos.
--
-- Correr DESPUÉS de 0018_crm_trainings.sql. Es idempotente: no duplica si
-- ya existe un entrenamiento con la misma entidad, tipo, título y mes.
-- ════════════════════════════════════════════════════════════════════

insert into public.crm_trainings (entity_id, type, title, status, billed_month, amount, currency, notes, created_by)
select e.id, v.type, v.title, v.status, v.billed_month, v.amount::numeric, 'USD', v.notes, 'Import Excel'
from (values
  -- ── Facturados (hoja Price, "Detalle a SS") ──
  ('cu-espana',      'comercial',      'Entrenamiento comercial',        'cobrado',   '2026-03', null, 'Detalle a Smartsheet marzo: "5 Licencias CRM HubSpot + 1 Entrenamiento". Fecha del entrenamiento no registrada en el Excel.'),
  ('ps-espana',      'implementacion', 'Implementación CRM HubSpot',     'cobrado',   '2026-03', null, 'Detalle a Smartsheet marzo: "3 Licencias CRM HubSpot + Implementacion + Entrenamiento".'),
  ('ps-espana',      'comercial',      'Entrenamiento comercial',        'cobrado',   '2026-03', null, 'Detalle a Smartsheet marzo: "3 Licencias CRM HubSpot + Implementacion + Entrenamiento". Fecha no registrada.'),
  ('ps-espana',      'super_admin',    'Entrenamiento Super Admin',      'cobrado',   '2026-04', null, 'Detalle a Smartsheet abril: "6 Licencias CRM HubSpot + Entrenamiento SuperAdmin". Fecha no registrada.'),
  ('cu-portugal',    'comercial',      'Entrenamiento comercial (1 de 2)', 'cobrado', '2026-03', null, 'Detalle a Smartsheet marzo: "2 Licencias CRM HubSpot + 2 Entrenamientos". Fecha no registrada.'),
  ('cu-portugal',    'comercial',      'Entrenamiento comercial (2 de 2)', 'cobrado', '2026-03', null, 'Detalle a Smartsheet marzo: "2 Licencias CRM HubSpot + 2 Entrenamientos". Fecha no registrada.'),
  ('cu-portugal',    'super_admin',    'Entrenamiento Super Admin',      'cobrado',   '2026-04', null, 'Detalle a Smartsheet abril: "1 Licencias CRM HubSpot + Entrenamiento SuperAdmin". Fecha no registrada.'),
  ('ps-usa',         'comercial',      'Entrenamiento comercial (1 de 2)', 'cobrado', '2026-03', null, 'Detalle a Smartsheet marzo: "5 Licencias CRM HubSpot + 2 Entrenamientos". Fecha no registrada.'),
  ('ps-usa',         'comercial',      'Entrenamiento comercial (2 de 2)', 'cobrado', '2026-03', null, 'Detalle a Smartsheet marzo: "5 Licencias CRM HubSpot + 2 Entrenamientos". Fecha no registrada.'),
  ('cu-usa',         'comercial',      'Entrenamiento comercial (1 de 2)', 'cobrado', '2026-03', null, 'Detalle a Smartsheet marzo: "4 Licencias CRM HubSpot + 2 Entrenamientos". Fecha no registrada.'),
  ('cu-usa',         'comercial',      'Entrenamiento comercial (2 de 2)', 'cobrado', '2026-03', null, 'Detalle a Smartsheet marzo: "4 Licencias CRM HubSpot + 2 Entrenamientos". Fecha no registrada.'),
  ('cu-chile',       'implementacion', 'Implementación CRM HubSpot',     'cobrado',   '2026-03', 250,  'Detalle a Smartsheet marzo: "Implementacion CRM HubSpot" (único ítem del mes: USD 250).'),
  ('cu-chile',       'comercial',      'Entrenamiento comercial',        'cobrado',   '2026-05', 150,  'Detalle a Smartsheet mayo: "1 Entrenamiento" (único ítem del mes: USD 150). Fecha no registrada.'),
  ('ps-switzerland', 'implementacion', 'Implementación CRM HubSpot (50%)', 'cobrado', '2026-03', null, 'Detalle marzo (700 - PSO BEHEER B.V.): "2 Licencias CRM HubSpot + 50% implementacion".'),
  ('ps-switzerland', 'implementacion', 'Implementación CRM HubSpot (50%)', 'cobrado', '2026-04', null, 'Detalle abril (700 - PSO BEHEER B.V.): "2 Licencias CRM HubSpot + 50% implementacion".'),
  -- ── Realizados según hoja Status (sin fecha ni cobro registrados) ──
  ('ptech-global',      'comercial',   'Entrenamiento comercial',   'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('ptech-global',      'super_admin', 'Entrenamiento Super Admin', 'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-cert-argentina', 'comercial',   'Entrenamiento comercial',   'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-cert-argentina', 'super_admin', 'Entrenamiento Super Admin', 'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('ps-argentina',      'comercial',   'Entrenamiento comercial',   'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('ps-argentina',      'super_admin', 'Entrenamiento Super Admin', 'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-mexico',         'comercial',   'Entrenamiento comercial',   'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-mexico',         'super_admin', 'Entrenamiento Super Admin', 'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-canada',         'comercial',   'Entrenamiento comercial',   'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-canada',         'super_admin', 'Entrenamiento Super Admin', 'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-peru',           'comercial',   'Entrenamiento comercial',   'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('cu-peru',           'super_admin', 'Entrenamiento Super Admin', 'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('ps-switzerland',    'comercial',   'Entrenamiento comercial',   'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.'),
  ('ps-switzerland',    'super_admin', 'Entrenamiento Super Admin', 'realizado', null, null, 'Marcado como hecho en la hoja Status del Excel. Sin fecha ni cobro registrados.')
) as v(entity_key, type, title, status, billed_month, amount, notes)
join public.crm_entities e on e.key = v.entity_key
where not exists (
  select 1 from public.crm_trainings t
  where t.entity_id = e.id and t.type = v.type and t.title = v.title
    and coalesce(t.billed_month, '') = coalesce(v.billed_month, '')
);

-- ════════════════════════════════════════════════════════════════════
-- Migration 0019 — Limpiar del repositorio los UTMs con el esquema viejo
-- ════════════════════════════════════════════════════════════════════
-- Desde sep 2026 el UTM Generator usa listas cerradas:
--   utm_source : content | linkedin | meta | google | mailchimp | apollo | hubspot
--   utm_medium : email_marketing | social | paid_media | webinar
--   organización: Control Union | Peterson Solutions | PCU
--   unidad     : MARCOMMS | Control Union | CU Barcos | CU Warrants |
--                CU Certificaciones | CU Norte | Peterson Solutions
--   utm_campaign sin segmento de servicio: unidad_pais_marcomms_campaña
--
-- Se eliminan los UTMs guardados que no cumplen alguna de esas reglas
-- (fuente "contenido"/"paid_media", medio "email_mkt"/"linkedin"/"google",
-- organización o unidad "Peterson"/"BELE", o con servicio cargado).
-- Es destructivo: hacer un export de utm_links antes si se quiere guardar.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

delete from public.utm_links
where coalesce(source, '') not in ('content', 'linkedin', 'meta', 'google', 'mailchimp', 'apollo', 'hubspot')
   or coalesce(medium, '') not in ('email_marketing', 'social', 'paid_media', 'webinar')
   or coalesce(organization, '') not in ('Control Union', 'Peterson Solutions', 'PCU')
   or coalesce(business_unit, '') not in ('MARCOMMS', 'Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'CU Norte', 'Peterson Solutions')
   or coalesce(service, '') <> '';

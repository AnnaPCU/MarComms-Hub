-- ════════════════════════════════════════════════════════════════════
-- Migration 0020 — Sacar la unidad de negocio "MARCOMMS" del repositorio
-- ════════════════════════════════════════════════════════════════════
-- "MARCOMMS" dejó de ser una unidad de negocio del UTM Generator (el
-- identificador marcomms ya va fijo en el utm_campaign). Se eliminan los
-- UTMs guardados con esa unidad, siguiendo el mismo criterio que 0019.
-- Es destructivo: exportar utm_links antes si se quiere guardar.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

delete from public.utm_links
where coalesce(business_unit, '') not in ('Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'CU Norte', 'Peterson Solutions');

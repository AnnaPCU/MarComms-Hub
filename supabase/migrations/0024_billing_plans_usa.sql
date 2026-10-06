-- ════════════════════════════════════════════════════════════════════
-- Migration 0024 — Plan de Estados Unidos con el nombre de país del Hub
-- ════════════════════════════════════════════════════════════════════
-- En todo el Hub (países, Portal Cliente, Social Media, CRM y los datos
-- de webinars/campañas) Estados Unidos figura como "USA". El plan sembrado
-- en la 0023 decía "Estados Unidos": se unifica. El id no cambia, así que
-- los pilares que ya apunten al plan siguen vinculados.
--
-- Aplicada desde Claude Code con el conector de Supabase (oct 2026).
-- ════════════════════════════════════════════════════════════════════

update public.billing_plans
   set name = 'Control Union USA Orgánico'
 where name = 'Control Union Estados Unidos Orgánico';

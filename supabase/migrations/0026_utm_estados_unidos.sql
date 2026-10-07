-- ════════════════════════════════════════════════════════════════════
-- Migration 0026 — UTMs guardados: código "usa" → "estados_unidos"
-- ════════════════════════════════════════════════════════════════════
-- Todo el Hub usa los países en español, también dentro del utm_campaign.
-- Se reescribe el segmento de país "usa" en utm_campaign y el mismo
-- parámetro dentro de la url guardada (solo ese parámetro, el resto de
-- la url no se toca). Ej.:
--   cu_certificaciones_usa-mexico_marcomms_ifpa_landing_page
--   → cu_certificaciones_estados_unidos-mexico_marcomms_ifpa_landing_page
--
-- Ojo: los links que ya se pegaron afuera (mails enviados, anuncios)
-- siguen con "usa"; esto actualiza la versión del repositorio del Hub.
--
-- Aplicada desde Claude Code con el conector de Supabase (oct 2026).
-- ════════════════════════════════════════════════════════════════════

update public.utm_links l
   set utm_campaign = n.new_campaign,
       url          = replace(l.url, 'utm_campaign=' || l.utm_campaign, 'utm_campaign=' || n.new_campaign)
  from (
    select id, regexp_replace(utm_campaign, '(^|_|-)usa(?=[_-]|$)', '\1estados_unidos', 'g') as new_campaign
      from public.utm_links
     where utm_campaign ~ '(^|_|-)usa([_-]|$)'
  ) n
 where l.id = n.id
returning l.id, l.utm_campaign, l.url;

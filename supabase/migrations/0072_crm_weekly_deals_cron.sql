-- ════════════════════════════════════════════════════════════════════
-- Migration 0072 — CRM HubSpot · corrida diaria de hubspot-weekly-deals
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot). Correr DESPUÉS de deployar la Edge
-- Function. Activa pg_cron y pg_net y programa una llamada diaria a las
-- 06:07 de Argentina (09:07 UTC). Los lunes esa corrida cierra la semana
-- anterior.
--
-- La URL de la función no va en el repo: se lee del Vault (secret
-- 'hubspot_weekly_deals_url', ej. https://<ref>.supabase.co/functions/v1/
-- hubspot-weekly-deals). Cargarlo antes con:
--   select vault.create_secret('<url>', 'hubspot_weekly_deals_url');
-- La función se deploya sin JWT (ver index.ts), así que no hace falta
-- guardar ninguna clave para el cron.
--
-- Se puede correr más de una vez: cron.schedule con el mismo nombre
-- reemplaza la programación anterior.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'hubspot-weekly-deals-daily',
  '7 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'hubspot_weekly_deals_url'),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- ════════════════════════════════════════════════════════════════════
-- Migration 0005 — extender team_members con columnas opcionales
-- ════════════════════════════════════════════════════════════════════
-- Agrega columnas para personalizar la experiencia por miembro sin
-- requerir cambios de código:
--
--   - service_owner_for : text[]  — qué tipos de servicio gestiona
--                                   (e.g. ['webinar', 'event'])
--   - greeting          : text    — saludo personalizado del dashboard
--   - accent_color      : text    — color del acento de notificaciones
--   - accent_emoji      : text    — emoji característico
--   - accent_vibe       : text    — "vibe" descriptiva
--
-- Todas son opcionales (NULL ok). El frontend cae a defaults de
-- constants/userNotifications.js si están vacías.
-- ════════════════════════════════════════════════════════════════════

alter table public.team_members
  add column if not exists service_owner_for text[] default array[]::text[],
  add column if not exists greeting          text,
  add column if not exists accent_color      text,
  add column if not exists accent_emoji      text,
  add column if not exists accent_vibe       text;

-- Índice para queries del tipo "quién es service owner de webinar"
create index if not exists idx_team_members_service_owner_for
  on public.team_members using gin (service_owner_for);

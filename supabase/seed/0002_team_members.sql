-- ════════════════════════════════════════════════════════════════════
-- Seed 0002 — team_members
-- ════════════════════════════════════════════════════════════════════
-- ⚠️ Tu tabla team_members en Supabase YA está poblada. Este archivo
-- es solo referencia / para otras instancias. (Fatima Lacroze está
-- inactiva desde julio 2026 — ver migration 0011. Se siembra con
-- active=false para conservar el historial de sus tareas.)
--
-- Schema actual de team_members (según tu Dashboard):
--   id (uuid PK), profile_key, name, initials, role, active,
--   created_at, service_owner_for, greeting,
--   accent_color, accent_emoji, accent_vibe  (estos últimos
--   agregados por migration 0005)
--
-- Convenciones:
--   role: 'Comms' | 'MKT'  (código corto)
--
-- Corrér esto DESPUÉS de la migration 0005_team_members_extras.sql
-- ════════════════════════════════════════════════════════════════════

insert into public.team_members
  (profile_key, name, initials, role, active,
   service_owner_for, greeting, accent_color, accent_emoji, accent_vibe)
values
  ('agus',  'Agus',  'A', 'Comms', true,
   array['standalone'],
   '¡Hola Agus! 👋 Acá están tus piezas de contenido',
   'pink', '🎨', 'creativa'),

  ('vicky', 'Vicky', 'V', 'Comms', true,
   array['webinar', 'event'],
   '¡Hola Vicky! 👋 Mirá los webinars y eventos del día',
   'purple', '✨', 'lideresa'),

  ('delfi', 'Delfi', 'D', 'Comms', true,
   array[]::text[],
   '¡Hola Delfi! 👋 Tus diseños están aquí',
   'fuchsia', '🖌️', 'metódica'),

  ('fati',  'Fatima Lacroze', 'F', 'Comms', false,
   array[]::text[],
   '¡Hola Fati! 👋 Que siga la creatividad',
   'rose', '💫', 'energética'),

  ('ale',   'Ale',   'A', 'MKT', true,
   array[]::text[],
   '¡Hola Ale! 📊 Mirá el pipeline de campañas',
   'blue', '📊', 'analítica'),

  ('felo',  'Felo',  'F', 'MKT', true,
   array['campaign'],
   '¡Hola Felo! 📈 Acá están tus responsabilidades',
   'cyan', '📈', 'estratégica'),

  ('fran',  'Fran',  'F', 'MKT', true,
   array[]::text[],
   '¡Hola Fran! 🎯 Venga con las estrategias',
   'indigo', '🎯', 'ejecutora'),

  ('tomi',  'Tomi',  'T', 'MKT', true,
   array[]::text[],
   '¡Hola Tomi! 🚀 Mirá qué hay para hoy',
   'sky', '🚀', 'innovadora'),

  ('boli',  'Boli',  'B', 'MKT', true,
   array[]::text[],
   '¡Hola Boli! 💡 Tus tareas están listas',
   'teal', '🌿', 'equilibrada')

on conflict (profile_key) do update set
  name              = excluded.name,
  initials          = excluded.initials,
  role              = excluded.role,
  active            = excluded.active,
  service_owner_for = excluded.service_owner_for,
  greeting          = excluded.greeting,
  accent_color      = excluded.accent_color,
  accent_emoji      = excluded.accent_emoji,
  accent_vibe       = excluded.accent_vibe;

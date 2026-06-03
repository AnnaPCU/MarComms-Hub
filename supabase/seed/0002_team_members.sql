-- ════════════════════════════════════════════════════════════════════
-- Seed 0002 — team_members
-- ════════════════════════════════════════════════════════════════════
-- Popula los 9 miembros oficiales con TODA la información:
--   - datos básicos (name, team, area, role, color)
--   - service_owner_for (qué tipos de servicio lideran)
--   - greeting (saludo personalizado)
--   - accent_* (color/emoji/vibe de notificaciones)
--
-- Corré esto DESPUÉS de la migration 0005_team_members_extras.sql
-- (que agrega las columnas opcionales).
--
-- Idempotente: usa ON CONFLICT (name) DO UPDATE.
-- ════════════════════════════════════════════════════════════════════

insert into public.team_members
  (name, team, area, role, color, service_owner_for, greeting, accent_color, accent_emoji, accent_vibe)
values
  ('Agus',  'Comunicación', 'comunicacion', 'Content & Design',
   'from-pink-500 to-rose-500',
   array['standalone'],
   '¡Hola Agus! 👋 Acá están tus piezas de contenido',
   'pink', '🎨', 'creativa'),

  ('Vicky', 'Comunicación', 'comunicacion', 'Content & Design',
   'from-purple-500 to-pink-500',
   array['webinar', 'event'],
   '¡Hola Vicky! 👋 Mirá los webinars y eventos del día',
   'purple', '✨', 'lideresa'),

  ('Delfi', 'Comunicación', 'comunicacion', 'Content & Design',
   'from-fuchsia-500 to-purple-500',
   array[]::text[],
   '¡Hola Delfi! 👋 Tus diseños están aquí',
   'fuchsia', '🖌️', 'metódica'),

  ('Fati',  'Comunicación', 'comunicacion', 'Content & Design',
   'from-rose-500 to-orange-500',
   array[]::text[],
   '¡Hola Fati! 👋 Que siga la creatividad',
   'rose', '💫', 'energética'),

  ('Ale',   'Marketing',    'marketing',    'Marketing',
   'from-blue-500 to-cyan-500',
   array[]::text[],
   '¡Hola Ale! 📊 Mirá el pipeline de campañas',
   'blue', '📊', 'analítica'),

  ('Felo',  'Marketing',    'marketing',    'Marketing',
   'from-cyan-500 to-teal-500',
   array['campaign'],
   '¡Hola Felo! 📈 Acá están tus responsabilidades',
   'cyan', '📈', 'estratégica'),

  ('Fran',  'Marketing',    'marketing',    'Marketing',
   'from-indigo-500 to-blue-500',
   array[]::text[],
   '¡Hola Fran! 🎯 Venga con las estrategias',
   'indigo', '🎯', 'ejecutora'),

  ('Tomi',  'Marketing',    'marketing',    'Marketing',
   'from-sky-500 to-blue-500',
   array[]::text[],
   '¡Hola Tomi! 🚀 Mirá qué hay para hoy',
   'sky', '🚀', 'innovadora'),

  ('Boli',  'Marketing',    'marketing',    'Marketing',
   'from-teal-500 to-emerald-500',
   array[]::text[],
   '¡Hola Boli! 💡 Tus tareas están listas',
   'teal', '🌿', 'equilibrada')

on conflict (name) do update set
  team              = excluded.team,
  area              = excluded.area,
  role              = excluded.role,
  color             = excluded.color,
  service_owner_for = excluded.service_owner_for,
  greeting          = excluded.greeting,
  accent_color      = excluded.accent_color,
  accent_emoji      = excluded.accent_emoji,
  accent_vibe       = excluded.accent_vibe;

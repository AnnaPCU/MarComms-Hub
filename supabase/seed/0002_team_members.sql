-- ════════════════════════════════════════════════════════════════════
-- Seed 0002 — team_members
-- ════════════════════════════════════════════════════════════════════
-- Popula la tabla `public.team_members` con los 9 miembros oficiales.
-- Despues de correr esto, la app deja de usar el fallback de
-- src/constants/team.js y empieza a leer de Supabase.
--
-- IMPORTANTE: este script asume que la tabla `team_members` tiene
-- AL MENOS las columnas: name, team, role, color, area.
-- Si tu tabla tiene mas columnas (email, etc.), las dejara en NULL
-- y se pueden completar despues desde el Dashboard.
--
-- Si la tabla NO tiene alguna de estas columnas, ALTER TABLE antes:
--   alter table public.team_members add column if not exists area text;
--   alter table public.team_members add column if not exists color text;
--
-- Cómo correr:
--   Supabase Dashboard → SQL Editor → pegar → Run
-- ════════════════════════════════════════════════════════════════════

insert into public.team_members (name, team, area, role, color)
values
  ('Agus',  'Comunicación', 'comunicacion', 'Content & Design', 'from-pink-500 to-rose-500'),
  ('Vicky', 'Comunicación', 'comunicacion', 'Content & Design', 'from-purple-500 to-pink-500'),
  ('Delfi', 'Comunicación', 'comunicacion', 'Content & Design', 'from-fuchsia-500 to-purple-500'),
  ('Fati',  'Comunicación', 'comunicacion', 'Content & Design', 'from-rose-500 to-orange-500'),
  ('Ale',   'Marketing',    'marketing',    'Marketing',        'from-blue-500 to-cyan-500'),
  ('Felo',  'Marketing',    'marketing',    'Marketing',        'from-cyan-500 to-teal-500'),
  ('Fran',  'Marketing',    'marketing',    'Marketing',        'from-indigo-500 to-blue-500'),
  ('Tomi',  'Marketing',    'marketing',    'Marketing',        'from-sky-500 to-blue-500'),
  ('Boli',  'Marketing',    'marketing',    'Marketing',        'from-teal-500 to-emerald-500')
on conflict (name) do update set
  team  = excluded.team,
  area  = excluded.area,
  role  = excluded.role,
  color = excluded.color;

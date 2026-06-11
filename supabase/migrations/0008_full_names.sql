-- ════════════════════════════════════════════════════════════════════
-- Migration 0008 — Nombres completos del equipo + migración de datos
-- ════════════════════════════════════════════════════════════════════
-- Cambia el identificador de cada miembro del nombre corto al nombre
-- y apellido completo, y migra los owners ya cargados en los datos.
--
-- ⚠️ Corré esto UNA vez. Es idempotente para team_members (por profile_key)
--    pero los UPDATE de datos asumen valores cortos previos.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar → Run
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Renombrar miembros (por profile_key, que no cambia) ──
update public.team_members set name = 'Agustina Ball'              where profile_key = 'agus';
update public.team_members set name = 'Victoria Colombo'           where profile_key = 'vicky';
update public.team_members set name = 'Delfina Palmero'            where profile_key = 'delfi';
update public.team_members set name = 'Fatima Lacroze'             where profile_key = 'fati';
update public.team_members set name = 'Alejandro Juan Sanguinetti' where profile_key = 'ale';
update public.team_members set name = 'Felipe Señorans'            where profile_key = 'felo';
update public.team_members set name = 'Francisco Capoulat'         where profile_key = 'fran';
update public.team_members set name = 'Tomas Misrahi'              where profile_key = 'tomi';
update public.team_members set name = 'Eugenio Marotta'            where profile_key = 'boli';

-- ── 2. Helper: mapear nombre corto (o UPPERCASE) → completo ──
-- Se aplica a los campos owner PLANOS de cada tabla.
create or replace function public._full_name(v text)
returns text language sql immutable as $$
  select case lower(trim(coalesce(v, '')))
    when 'agus'  then 'Agustina Ball'
    when 'vicky' then 'Victoria Colombo'
    when 'delfi' then 'Delfina Palmero'
    when 'fati'  then 'Fatima Lacroze'
    when 'ale'   then 'Alejandro Juan Sanguinetti'
    when 'felo'  then 'Felipe Señorans'
    when 'fran'  then 'Francisco Capoulat'
    when 'tino'  then 'Tomas Misrahi'
    when 'tomi'  then 'Tomas Misrahi'
    when 'boli'  then 'Eugenio Marotta'
    else v  -- ya está completo o es desconocido → se deja igual
  end;
$$;

-- ── 3. Migrar campos owner PLANOS ──
update public.campaigns set service_owner = public._full_name(service_owner);
update public.events    set service_owner = public._full_name(service_owner);
update public.webinars  set service_owner = public._full_name(service_owner);
update public.requests  set owner_name    = public._full_name(owner_name);
update public.tasks     set assigned_to   = public._full_name(assigned_to),
                            assigned_by    = public._full_name(assigned_by);

-- ── 4. Migrar owners dentro del jsonb `tasks` de webinars y events ──
-- Cada sub-tarea tiene { owner: '...' }. Recorremos las claves y
-- reescribimos el owner con el nombre completo.
update public.webinars w
set tasks = (
  select coalesce(jsonb_object_agg(key,
    case when value ? 'owner'
      then jsonb_set(value, '{owner}', to_jsonb(public._full_name(value->>'owner')))
      else value end), '{}'::jsonb)
  from jsonb_each(w.tasks)
)
where w.tasks is not null and w.tasks <> '{}'::jsonb;

update public.events e
set tasks = (
  select coalesce(jsonb_object_agg(key,
    case when value ? 'owner'
      then jsonb_set(value, '{owner}', to_jsonb(public._full_name(value->>'owner')))
      else value end), '{}'::jsonb)
  from jsonb_each(e.tasks)
)
where e.tasks is not null and e.tasks <> '{}'::jsonb;

-- customTasks (array jsonb) de events
update public.events e
set custom_tasks = (
  select coalesce(jsonb_agg(
    case when elem ? 'owner'
      then jsonb_set(elem, '{owner}', to_jsonb(public._full_name(elem->>'owner')))
      else elem end), '[]'::jsonb)
  from jsonb_array_elements(e.custom_tasks) elem
)
where e.custom_tasks is not null and jsonb_array_length(e.custom_tasks) > 0;

-- ── 5. Limpieza ──
drop function if exists public._full_name(text);

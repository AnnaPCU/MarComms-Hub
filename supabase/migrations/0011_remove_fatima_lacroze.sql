-- ════════════════════════════════════════════════════════════════════
-- Migration 0011 — Eliminar a Fatima Lacroze del equipo
-- ════════════════════════════════════════════════════════════════════
-- 1. Reasigna todo lo que tenía como owner/asignado a Agustina Ball
--    (owners planos + owners dentro de los jsonb de tareas).
-- 2. Borra su fila de team_members (desaparece del login y de los
--    selectores de responsables).
--
-- Es idempotente: se puede correr varias veces sin romper nada.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Helper: ¿este valor es Fatima? → devuelve el reemplazo ──
create or replace function public._sin_fatima(v text)
returns text language sql immutable as $$
  select case
    when lower(trim(coalesce(v, ''))) in ('fatima lacroze', 'fátima lacroze', 'fati')
      then 'Agustina Ball'
    else v
  end;
$$;

-- ── 2. Campos owner PLANOS ──
update public.campaigns set service_owner = public._sin_fatima(service_owner)
  where lower(coalesce(service_owner, '')) like '%fati%';
update public.events    set service_owner = public._sin_fatima(service_owner)
  where lower(coalesce(service_owner, '')) like '%fati%';
update public.webinars  set service_owner = public._sin_fatima(service_owner)
  where lower(coalesce(service_owner, '')) like '%fati%';
update public.requests  set owner_name    = public._sin_fatima(owner_name)
  where lower(coalesce(owner_name, '')) like '%fati%';
update public.tasks     set assigned_to   = public._sin_fatima(assigned_to),
                            assigned_by   = public._sin_fatima(assigned_by)
  where lower(coalesce(assigned_to, '')) like '%fati%'
     or lower(coalesce(assigned_by, '')) like '%fati%';

-- ── 3. Owners dentro del jsonb `tasks` de webinars y events ──
update public.webinars w
set tasks = (
  select coalesce(jsonb_object_agg(key,
    case when value ? 'owner'
      then jsonb_set(value, '{owner}', to_jsonb(public._sin_fatima(value->>'owner')))
      else value end), '{}'::jsonb)
  from jsonb_each(w.tasks)
)
where w.tasks::text ilike '%fati%';

update public.events e
set tasks = (
  select coalesce(jsonb_object_agg(key,
    case when value ? 'owner'
      then jsonb_set(value, '{owner}', to_jsonb(public._sin_fatima(value->>'owner')))
      else value end), '{}'::jsonb)
  from jsonb_each(e.tasks)
)
where e.tasks::text ilike '%fati%';

-- custom_tasks (array jsonb) de events
update public.events e
set custom_tasks = (
  select coalesce(jsonb_agg(
    case when elem ? 'owner'
      then jsonb_set(elem, '{owner}', to_jsonb(public._sin_fatima(elem->>'owner')))
      else elem end), '[]'::jsonb)
  from jsonb_array_elements(e.custom_tasks) elem
)
where e.custom_tasks::text ilike '%fati%';

-- ── 4. Borrar a Fatima del equipo ──
delete from public.team_members
  where profile_key = 'fati'
     or lower(name) in ('fatima lacroze', 'fátima lacroze', 'fati');

-- ── 5. Limpieza ──
drop function if exists public._sin_fatima(text);

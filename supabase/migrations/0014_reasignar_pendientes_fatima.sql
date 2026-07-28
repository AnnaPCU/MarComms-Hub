-- ════════════════════════════════════════════════════════════════════
-- Migration 0014 — Reasignar tareas PENDIENTES de Fatima a Delfina
-- ════════════════════════════════════════════════════════════════════
-- Las tareas de webinars que Fatima dejó SIN terminar pasan a
-- Delfina Palmero (así aparecen en su "Mi Semana" y en el Content Hub).
-- Las tareas que Fatima YA completó quedan a su nombre — historial.
--
-- Es idempotente — correr varias veces no rompe.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

update public.webinars w
set tasks = (
  select coalesce(jsonb_object_agg(key,
    case
      when (value->>'owner') ilike '%fati%'
       and coalesce((value->>'done')::boolean, false) = false
        then jsonb_set(value, '{owner}', '"Delfina Palmero"')
      else value
    end), '{}'::jsonb)
  from jsonb_each(w.tasks)
)
where w.tasks::text ilike '%fati%';

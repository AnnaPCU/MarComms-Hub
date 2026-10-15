-- ════════════════════════════════════════════════════════════════════
-- 0032 — Se reactiva el link externo de cada plan (sección Planes)
-- ════════════════════════════════════════════════════════════════════
-- Oct 2026: la 0031 lo había quitado (se descartó) y al final se activa.
-- Es lo mismo que la 0030: el cliente abre https://<hub>/?plan=<token>
-- sin entrar al Hub y ve el avance y las tareas de SU plan (mes actual +
-- histórico por mes), sin Responsable ni Deadline y sin editar.
--
-- 1) Cada plan tiene un token propio. Para desactivar un link, se genera
--    uno nuevo desde el Hub (el anterior deja de funcionar).
-- 2) get_public_plan(token) es lo único que usa la página externa: devuelve
--    el nombre del plan y las tareas con las columnas de la vista externa.
--    Es security definer para no depender de las políticas de las tablas.
--
-- Se puede correr más de una vez. Aplicada a mano desde el SQL Editor de
-- Supabase (oct 2026).
-- ════════════════════════════════════════════════════════════════════

alter table public.billing_plans
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists billing_plans_public_token_key
  on public.billing_plans (public_token);

create or replace function public.get_public_plan(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'name', p.name,
    'tasks', coalesce((
      select json_agg(json_build_object(
        'id', t.id,
        'monthKey', t.month_key,
        'title', t.title,
        'status', t.status,
        'objective', t.objective,
        'result', t.result,
        'detail', t.detail,
        'link', t.link,
        'position', t.position,
        'createdAt', t.created_at
      ) order by t.position, t.created_at)
      from public.plan_tasks t
      where t.plan_id = p.id
    ), '[]'::json)
  )
  from public.billing_plans p
  where p.public_token = p_token;
$$;

revoke all on function public.get_public_plan(uuid) from public;
grant execute on function public.get_public_plan(uuid) to anon, authenticated;

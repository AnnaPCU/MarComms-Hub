-- ════════════════════════════════════════════════════════════════════
-- 0031 — Se descarta el link externo de los planes + plan de Canada
-- ════════════════════════════════════════════════════════════════════
-- 1) Oct 2026: la vista externa / link externo de los planes no se va a
--    implementar. Se quita lo que agregó la 0030 (función pública y token).
-- 2) Control Union Canada no tiene plan: se borra de billing_plans (solo
--    si ninguna tarea ni pilar lo usa; hoy no lo usa nada).
--
-- Aplicada a mano desde el SQL Editor de Supabase (oct 2026).
-- ════════════════════════════════════════════════════════════════════

drop function if exists public.get_public_plan(uuid);

drop index if exists public.billing_plans_public_token_key;

alter table public.billing_plans drop column if exists public_token;

delete from public.billing_plans p
where p.name = 'Control Union Canada'
  and not exists (select 1 from public.plan_tasks t where t.plan_id = p.id)
  and not exists (select 1 from public.webinars w where w.plan_id = p.id)
  and not exists (select 1 from public.campaigns c where c.plan_id = p.id)
  and not exists (select 1 from public.events e where e.plan_id = p.id);

-- ════════════════════════════════════════════════════════════════════
-- Migration 0029 — Planes: tareas de cada plan (seguimiento en tiempo real)
-- ════════════════════════════════════════════════════════════════════
-- Sección "Planes" del menú. Cada plan es un `billing_plans` (los mismos
-- del selector de presupuesto: "Control Union Argentina"…). Sus tareas
-- replican la sección "3) TAREAS" de cada pestaña del Excel "Seguimiento
-- Planes Marketing", pero se cargan y editan en el Hub, como la hoja de
-- posteos de Social Media.
--
-- Columnas (pedido oct 2026):
--   mes · acción / tarea · responsable (solo vista interna) · deadline
--   (solo vista interna) · estado · objetivo · resultado · detalle (ex
--   "Comentario") · link (opcional). Sin "Fecha" ni "Prioridad".
--
-- `month_key` = 'YYYY-MM' (el Excel solo tenía el nombre del mes; así se
-- ordena bien un plan que cruza de año, ej. Agosto → Enero).
--
-- Aplicada desde Claude Code con el conector de Supabase (oct 2026):
-- tabla, índice, trigger, permisos, realtime y el plan "Control Union
-- Canada". La carga inicial de tareas desde el Excel NO se aplicó (quedó
-- en pausa a pedido): la tabla está vacía. Todavía no hay UI que la use.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.plan_tasks (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.billing_plans(id) on delete cascade,
  month_key   text check (month_key is null or month_key ~ '^\d{4}-\d{2}$'),
  title       text not null,
  owner       text,
  deadline    date,
  status      text not null default 'Pendiente'
              check (status in ('Pendiente', 'En curso', 'Bloqueado', 'Completado', 'Cancelado')),
  objective   text,
  result      text,
  detail      text,
  link        text,
  position    int  not null default 0,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_plan_tasks_plan on public.plan_tasks (plan_id, month_key, position);

drop trigger if exists trg_plan_tasks_updated_at on public.plan_tasks;
create trigger trg_plan_tasks_updated_at
  before update on public.plan_tasks
  for each row execute function public.set_updated_at();

alter table public.plan_tasks enable row level security;
create policy "auth users full access" on public.plan_tasks for all to authenticated using (true) with check (true);
create policy "anon temp full access" on public.plan_tasks for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.plan_tasks;

-- El Excel tiene la pestaña "CU Canada": se suma su plan
insert into public.billing_plans (name) values ('Control Union Canada') on conflict do nothing;

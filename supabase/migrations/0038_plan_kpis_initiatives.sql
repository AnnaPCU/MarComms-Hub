-- ════════════════════════════════════════════════════════════════════
-- Migration 0038 — Planes: KPIs del mes e Iniciativas (vista interna y link)
-- ════════════════════════════════════════════════════════════════════
-- Oct 2026: la vista de cada plan (interna y link externo) se acerca al
-- reporte mensual que se entrega al cliente.
--
-- 1) plan_kpis: los 6 KPIs del mes de cada plan, una fila por plan y mes
--    ('YYYY-MM'). `kpis` es un jsonb por KPI:
--      { "deliverables": { "value": 8 },
--        "meetings":     { "value": 7, "note": "…" },
--        "contacts":     { "value": 800, "note": "Top 5 estados USDA" },
--        "deals":        { "value": 848160, "currency": "USD", "note": "…" },
--        "mqls":         { "value": 40000, "currency": "USD", "tag": "8 MQLs" },
--        "sales":        { "value": 10000, "currency": "USD", "tag": "2 ventas" } }
--    Entregables completados y Reuniones internas se calculan solos desde
--    las tareas del mes; lo guardado acá es una corrección a mano. Un KPI
--    sin valor no se muestra en el link.
-- 2) plan_initiatives: iniciativas de cada plan (en definición o en
--    marcha), agrupadas por tipo (ej. "Generación de demanda"). No van por
--    mes.
-- 3) get_public_plan devuelve también los KPIs (por mes) y las iniciativas.
--
-- Se puede correr más de una vez. Aplicada en producción el 23 oct 2026
-- con el conector de Supabase (execute_sql, en partes).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.plan_kpis (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.billing_plans(id) on delete cascade,
  month_key   text not null check (month_key ~ '^\d{4}-\d{2}$'),
  kpis        jsonb not null default '{}'::jsonb,
  updated_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (plan_id, month_key)
);

create table if not exists public.plan_initiatives (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.billing_plans(id) on delete cascade,
  category    text,
  title       text not null,
  detail      text,
  position    int  not null default 0,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_plan_initiatives_plan on public.plan_initiatives (plan_id, position);

alter table public.plan_kpis enable row level security;
alter table public.plan_initiatives enable row level security;

-- Sin DROP: el conector de Supabase pide confirmar las sentencias
-- destructivas y se corta; así se puede volver a correr igual.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_plan_kpis_updated_at') then
    create trigger trg_plan_kpis_updated_at before update on public.plan_kpis for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_plan_initiatives_updated_at') then
    create trigger trg_plan_initiatives_updated_at before update on public.plan_initiatives for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plan_kpis' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.plan_kpis for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plan_kpis' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.plan_kpis for all to anon using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plan_initiatives' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.plan_initiatives for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plan_initiatives' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.plan_initiatives for all to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plan_kpis') then
    alter publication supabase_realtime add table public.plan_kpis;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plan_initiatives') then
    alter publication supabase_realtime add table public.plan_initiatives;
  end if;
end $$;

-- Link externo: lo mismo que la 0032 + kpis e iniciativas
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
    ), '[]'::json),
    'kpis', coalesce((
      select json_object_agg(k.month_key, k.kpis)
      from public.plan_kpis k
      where k.plan_id = p.id
    ), '{}'::json),
    'initiatives', coalesce((
      select json_agg(json_build_object(
        'id', i.id,
        'category', i.category,
        'title', i.title,
        'detail', i.detail,
        'position', i.position,
        'createdAt', i.created_at
      ) order by i.position, i.created_at)
      from public.plan_initiatives i
      where i.plan_id = p.id
    ), '[]'::json)
  )
  from public.billing_plans p
  where p.public_token = p_token;
$$;

revoke all on function public.get_public_plan(uuid) from public;
grant execute on function public.get_public_plan(uuid) to anon, authenticated;

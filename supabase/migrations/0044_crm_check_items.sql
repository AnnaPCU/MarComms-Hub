-- ════════════════════════════════════════════════════════════════════
-- Migration 0044 — CRM HubSpot · ítems del checklist del Weekly check
-- ════════════════════════════════════════════════════════════════════
-- Oct 2026: los ítems del checklist pasan a la base para poder agregar
-- nuevos desde el Hub (valen para todas las entidades), renombrarlos y
-- eliminarlos. Arranca con los 8 que estaban en el código
-- (CRM_CHECK_ITEMS en src/constants/crmWeekly.js, que queda como respaldo
-- si la tabla todavía no existe). El id es lo que usa crm_weekly_checks
-- (item_id): los 8 originales mantienen el suyo ('outlook', 'deals'…).
--
-- Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.crm_check_items (
  id          text primary key,
  label       text not null,
  hint        text,
  position    int  not null default 0,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.crm_check_items (id, label, hint, position) values
  ('outlook', 'Outlook y calendario conectados', null, 0),
  ('deals', 'Deals nuevos cargados', 'Y las renovaciones, en las entidades de certificación', 1),
  ('meetings', 'Meeting scheduler en uso', null, 2),
  ('documents', 'Documents en uso', null, 3),
  ('adoption', 'Reportes de adopción en uso', null, 4),
  ('claude', 'Conexión con Claude', null, 5),
  ('trainingSales', 'Entrenamientos comerciales', null, 6),
  ('trainingAdmin', 'Entrenamientos SuperAdmin', null, 7)
on conflict (id) do nothing;

alter table public.crm_check_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_check_items_updated_at') then
    create trigger trg_crm_check_items_updated_at before update on public.crm_check_items for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_check_items' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.crm_check_items for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_check_items' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.crm_check_items for all to anon using (true) with check (true);
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_check_items') then
    alter publication supabase_realtime add table public.crm_check_items;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════
-- Migration 0048 — Facturación MarComms (réplica del Excel mensual)
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026: la sección Facturación reemplaza al Excel
-- «Facturacion_MarComms_<Mes>». Cada mes tiene sus hojas:
--   fijo       → «Fijo y facturas -CARGA ADMIN»
--   variables  → «Variables (todos)»
--   mkt        → «MKT Plan (Felo)» (tabla de planes)
--   mkt_libre  → «MKT Plan (Felo)» (zona libre de abajo: una sola fila,
--                 cada celda es una clave de data, ej. "A11")
--   crm        → «CRM (Ale)» (licencias por entidad)
--   crm_extra  → «CRM (Ale)» (conceptos y totales de abajo)
--   notas      → notas del mes de cada hoja (una sola fila)
-- y la hoja fija, que no depende del mes:
--   entidades  → «Entidades» (month en null)
--
-- Cada fila guarda sus celdas en `data` (jsonb). Los números se guardan
-- como se escribieron ("450", "=350/4*3"); el Hub calcula el valor.
-- invoicing_patch_row cambia solo las celdas tocadas (dos personas
-- pueden editar la misma fila a la vez sin pisarse).
--
-- Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.invoicing_months (
  month       text primary key check (month ~ '^\d{4}-\d{2}$'),
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.invoicing_rows (
  id          uuid primary key default gen_random_uuid(),
  month       text references public.invoicing_months(month) on delete cascade,
  sheet       text not null check (sheet in ('fijo', 'variables', 'mkt', 'mkt_libre', 'crm', 'crm_extra', 'notas', 'entidades')),
  position    double precision not null default 0,
  data        jsonb not null default '{}'::jsonb,
  created_by  text,
  updated_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists invoicing_rows_month_sheet_idx on public.invoicing_rows (month, sheet, position);

-- Cambia solo algunas celdas de una fila: suma p_patch y saca p_remove
create or replace function public.invoicing_patch_row(p_id uuid, p_patch jsonb, p_remove text[] default '{}', p_by text default null)
returns jsonb
language sql
as $$
  update public.invoicing_rows
     set data = (data || coalesce(p_patch, '{}'::jsonb)) - coalesce(p_remove, '{}'::text[]),
         updated_by = p_by
   where id = p_id
  returning data;
$$;

grant execute on function public.invoicing_patch_row(uuid, jsonb, text[], text) to anon, authenticated;

alter table public.invoicing_months enable row level security;
alter table public.invoicing_rows enable row level security;

do $$
declare t text;
begin
  foreach t in array array['invoicing_months', 'invoicing_rows'] loop
    if not exists (select 1 from pg_trigger where tgname = 'trg_' || t || '_updated_at') then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'trg_' || t || '_updated_at', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'auth users full access') then
      execute format('create policy "auth users full access" on public.%I for all to authenticated using (true) with check (true)', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'anon temp full access') then
      execute format('create policy "anon temp full access" on public.%I for all to anon using (true) with check (true)', t);
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

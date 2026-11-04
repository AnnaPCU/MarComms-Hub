-- ════════════════════════════════════════════════════════════════════
-- Migration 0051 — Facturación · historial de cambios
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026: cada cambio en una celda de Facturación queda registrado
-- (quién, cuándo, en qué fila, qué celda, antes y después) para la vista
-- «Historial». Lo escribe un trigger de invoicing_rows:
--   insert → una fila 'insert' con la fila completa (new_value)
--   update → una fila 'update' por cada celda que cambió (las claves que
--            empiezan con "_" son de uso interno y no se registran)
--   delete → una fila 'delete' con la fila completa (old_value)
-- Al borrar, el Hub primero guarda quién (updated_by) y después borra, así
-- la fila 'delete' sabe quién fue.
--
-- Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.invoicing_changes (
  id          bigserial primary key,
  row_id      uuid not null,
  month       text,
  sheet       text not null,
  row_label   text,
  action      text not null check (action in ('insert', 'update', 'delete')),
  key         text,
  old_value   jsonb,
  new_value   jsonb,
  changed_by  text,
  changed_at  timestamptz not null default now()
);

create index if not exists invoicing_changes_at_idx on public.invoicing_changes (changed_at desc, id desc);
create index if not exists invoicing_changes_month_idx on public.invoicing_changes (month, changed_at desc);

-- Nombre corto de una fila para el historial («Argentina · CU Barcos»)
create or replace function public.invoicing_row_label(d jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(concat_ws(' · ', nullif(d->>'pais', ''), nullif(d->>'empresa', '')), ''),
    nullif(d->>'entidad', ''),
    nullif(d->>'concepto', ''),
    nullif(d->>'oficina', ''),
    nullif(d->>'cliente', '')
  );
$$;

create or replace function public.invoicing_log_changes()
returns trigger
language plpgsql
as $$
declare
  k text;
  keys text[];
begin
  if tg_op = 'INSERT' then
    insert into public.invoicing_changes (row_id, month, sheet, row_label, action, new_value, changed_by)
    values (new.id, new.month, new.sheet, public.invoicing_row_label(new.data), 'insert', new.data, coalesce(new.updated_by, new.created_by));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.invoicing_changes (row_id, month, sheet, row_label, action, old_value, changed_by)
    values (old.id, old.month, old.sheet, public.invoicing_row_label(old.data), 'delete', old.data, old.updated_by);
    return old;
  end if;
  if new.data is distinct from old.data then
    select array_agg(distinct x) into keys
      from (select jsonb_object_keys(old.data) as x union select jsonb_object_keys(new.data)) s;
    foreach k in array coalesce(keys, '{}'::text[]) loop
      if left(k, 1) <> '_' and (old.data -> k) is distinct from (new.data -> k) then
        insert into public.invoicing_changes (row_id, month, sheet, row_label, action, key, old_value, new_value, changed_by)
        values (new.id, new.month, new.sheet, public.invoicing_row_label(new.data), 'update', k, old.data -> k, new.data -> k, new.updated_by);
      end if;
    end loop;
  end if;
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_invoicing_rows_log') then
    create trigger trg_invoicing_rows_log
      after insert or update or delete on public.invoicing_rows
      for each row execute function public.invoicing_log_changes();
  end if;
end $$;

alter table public.invoicing_changes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'invoicing_changes' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.invoicing_changes for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'invoicing_changes' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.invoicing_changes for all to anon using (true) with check (true);
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'invoicing_changes') then
    alter publication supabase_realtime add table public.invoicing_changes;
  end if;
end $$;

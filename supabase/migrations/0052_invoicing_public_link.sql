-- ════════════════════════════════════════════════════════════════════
-- Migration 0052 — Facturación · link externo de solo lectura
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026: como el link de cada plan (0030 / 0032), Facturación tiene un
-- link externo https://<hub>/?facturacion=<token> que se abre sin login y
-- muestra todas las hojas de todos los meses (Fijo, Variables, MKT Plan,
-- CRM, Entidades y Mes a mes), sin editar. Se actualiza solo.
--
-- 1) Un único token (tabla de una sola fila). Para desactivar el link se
--    cambia el token (el anterior deja de funcionar):
--      update public.invoicing_public_link set public_token = gen_random_uuid() where id = 1;
-- 2) get_public_invoicing(token) es lo único que usa la página externa:
--    devuelve los meses y las filas de las hojas. No devuelve las notas del
--    mes (con las etiquetas @ y los avisos revisados), la zona libre de
--    MKT Plan ni el historial. Es security definer para no depender de las
--    políticas de las tablas.
--
-- Se puede correr más de una vez (sin DROP ni DELETE).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.invoicing_public_link (
  id           smallint primary key default 1 check (id = 1),
  public_token uuid not null unique default gen_random_uuid(),
  created_at   timestamptz not null default now()
);

insert into public.invoicing_public_link (id) values (1) on conflict (id) do nothing;

alter table public.invoicing_public_link enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'invoicing_public_link' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.invoicing_public_link for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'invoicing_public_link' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.invoicing_public_link for all to anon using (true) with check (true);
  end if;
end $$;

create or replace function public.get_public_invoicing(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'months', coalesce((select json_agg(m.month order by m.month) from public.invoicing_months m), '[]'::json),
    'rows', coalesce((
      select json_agg(json_build_object(
        'id', r.id,
        'month', r.month,
        'sheet', r.sheet,
        'position', r.position,
        'data', r.data
      ) order by r.position, r.id)
      from public.invoicing_rows r
      where r.sheet in ('fijo', 'variables', 'mkt', 'crm', 'crm_extra', 'entidades')
    ), '[]'::json),
    'updatedAt', (select max(r.updated_at) from public.invoicing_rows r)
  )
  from public.invoicing_public_link l
  where l.public_token = p_token;
$$;

revoke all on function public.get_public_invoicing(uuid) from public;
grant execute on function public.get_public_invoicing(uuid) to anon, authenticated;

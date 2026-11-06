-- ════════════════════════════════════════════════════════════════════
-- Migration 0053 — Facturación · meses históricos
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026: los Excel de enero a agosto 2026 se cargan como historia
-- (seed 0054). Un mes histórico se ve en «Mes a mes» (gráfico, tabla y
-- porcentajes por categoría) pero no en el selector de mes de las hojas:
-- no se trabaja día a día. Sacarle la marca lo vuelve un mes más.
--
-- get_public_invoicing (0052) devuelve además 'historic': la lista de
-- meses históricos, para que el link externo haga lo mismo.
--
-- Se puede correr más de una vez (sin DROP ni DELETE).
-- ════════════════════════════════════════════════════════════════════

alter table public.invoicing_months
  add column if not exists historic boolean not null default false;

create or replace function public.get_public_invoicing(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'months', coalesce((select json_agg(m.month order by m.month) from public.invoicing_months m), '[]'::json),
    'historic', coalesce((select json_agg(m.month order by m.month) from public.invoicing_months m where m.historic), '[]'::json),
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

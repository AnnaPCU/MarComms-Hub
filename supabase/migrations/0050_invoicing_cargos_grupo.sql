-- ════════════════════════════════════════════════════════════════════
-- Migration 0050 — Facturación · cargos, fórmulas =grupo y Rep. Dominicana
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (datos, no estructura):
--   · «Variables (todos)»: las claves por columna del Excel
--     ("campanasDetalle", "campanasCc", "campanasPrecio"…) pasan a cargos
--     ("cargo:<id>" = { cat, detalle, cc, precio, pos }), que permiten
--     varios cargos por categoría. Los totales no cambian.
--   · «Fijo y facturas»: las filas que en el Excel seguían a la fila gris
--     con =G3/3 (Argentina y Brasil: Barcos, Warrants, Certificaciones)
--     vuelven a seguirla: "=grupo/3" en Valor y Country Website. Los
--     valores no cambian (450/3 y 262,5/3 ó 350/3).
--   · País «RD» → «Rep. Dominicana» (Fijo y Variables).
--
-- Se puede correr más de una vez: lo ya convertido no se toca.
-- Correrla ANTES de la 0051 (historial), así estos cambios no quedan
-- registrados como ediciones.
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  r record;
  d jsonb;
  cat text;
  cats text[] := array['campanas', 'bbdd', 'eventos', 'content', 'website', 'otros'];
  obj jsonb;
  pos int;
begin
  for r in select id, data from public.invoicing_rows where sheet = 'variables' loop
    d := r.data;
    pos := 0;
    if exists (select 1 from jsonb_object_keys(d) k where k like 'cargo:%') then continue; end if;
    foreach cat in array cats loop
      if coalesce(d->>(cat || 'Detalle'), '') <> '' or coalesce(d->>(cat || 'Cc'), '') <> '' or coalesce(d->>(cat || 'Precio'), '') <> '' then
        obj := jsonb_build_object('cat', cat, 'pos', pos);
        if coalesce(d->>(cat || 'Detalle'), '') <> '' then obj := obj || jsonb_build_object('detalle', d->>(cat || 'Detalle')); end if;
        if coalesce(d->>(cat || 'Cc'), '') <> '' then obj := obj || jsonb_build_object('cc', d->>(cat || 'Cc')); end if;
        if coalesce(d->>(cat || 'Precio'), '') <> '' then obj := obj || jsonb_build_object('precio', d->>(cat || 'Precio')); end if;
        d := d || jsonb_build_object('cargo:' || left(replace(gen_random_uuid()::text, '-', ''), 12), obj);
        pos := pos + 1;
      end if;
      d := d - (cat || 'Detalle') - (cat || 'Cc') - (cat || 'Precio');
    end loop;
    if d is distinct from r.data then
      update public.invoicing_rows set data = d, updated_by = 'Migración 0050 (cargos)' where id = r.id;
    end if;
  end loop;
end $$;

-- Filas que seguían a la fila gris en el Excel (=G3/3): vuelven a seguirla
update public.invoicing_rows
   set data = data || '{"valor": "=grupo/3", "website": "=grupo/3"}'::jsonb,
       updated_by = 'Migración 0050 (grupo)'
 where sheet = 'fijo'
   and data->>'valor' = '=450/3'
   and data->>'website' in ('=262.5/3', '=350/3');

-- País como se prefiere en Facturación
update public.invoicing_rows
   set data = jsonb_set(data, '{pais}', '"Rep. Dominicana"'::jsonb),
       updated_by = 'Migración 0050 (país)'
 where sheet in ('fijo', 'variables')
   and data->>'pais' in ('RD', 'República Dominicana', 'Republica Dominicana');

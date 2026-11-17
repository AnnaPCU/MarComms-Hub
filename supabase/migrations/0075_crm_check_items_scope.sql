-- ════════════════════════════════════════════════════════════════════
-- Migration 0075 — CRM HubSpot · alcance de cada ítem del checklist
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot): un ítem del checklist ya no vale siempre
-- para todas las entidades.
--   target_codes   — si tiene códigos, el ítem va en esas entidades
--   target_regions — si tiene regiones (Américas / EMEA / APAC), va en
--                    las entidades de esas regiones
--   (los dos vacíos o null = todas las entidades, como hasta ahora; si hay
--    de los dos, vale la unión)
--   excluded_codes — entidades de las que se quitó el ítem («Eliminar solo
--                    de esta entidad»)
-- Los ítems que ya existen quedan para todas las entidades.
--
-- Solo agrega columnas; se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

alter table public.crm_check_items add column if not exists target_codes text[];
alter table public.crm_check_items add column if not exists target_regions text[];
alter table public.crm_check_items add column if not exists excluded_codes text[] not null default '{}';

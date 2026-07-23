-- ════════════════════════════════════════════════════════════════════
-- Migration 0011 — Desactivar a Fatima Lacroze (conservando historial)
-- ════════════════════════════════════════════════════════════════════
-- Marca su perfil como inactivo (`active = false`). Con eso:
--   ✓ Desaparece del login y de los selectores de responsables
--   ✓ No se le pueden asignar cosas nuevas
--   ✓ TODO el historial queda intacto: las tareas, webinars, eventos
--     y pedidos que ya tenía asignados siguen mostrando su nombre
--
-- NO borra su fila ni toca ningún otro dato. Es idempotente
-- (se puede correr varias veces sin problema) y reversible: para
-- reactivarla, volver a poner active = true.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

update public.team_members
set active = false
where profile_key = 'fati'
   or lower(name) in ('fatima lacroze', 'fátima lacroze', 'fati');

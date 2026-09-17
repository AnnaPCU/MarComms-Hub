-- ════════════════════════════════════════════════════════════════════
-- Migration 0016 — Realtime para requests, tasks y team_members
-- ════════════════════════════════════════════════════════════════════
-- Las tablas webinars, campaigns, events, success_cases y utm_links ya
-- están en la publicación `supabase_realtime` (migraciones 0002–0009).
-- requests, tasks y team_members existían de antes y ninguna migración
-- del repo las publicó. Sin esto, la app SÍ guarda en esas tablas pero
-- los demás usuarios no ven los cambios hasta recargar, y las
-- notificaciones nuevas (pedidos, tareas asignadas) no llegan en vivo.
--
-- Es idempotente — correr varias veces no rompe.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar todo → Run
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array['requests', 'tasks', 'team_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

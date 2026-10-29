-- ════════════════════════════════════════════════════════════════════
-- 0047 — Equipo: se suma Valentino Redín (Marketing) (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Entra al Hub como el resto (elige su nombre en el login y usa la
-- contraseña compartida). Sin configuración especial por ahora.
-- Idempotente. Aplicada el 29 oct 2026 con el conector de Supabase.
-- ════════════════════════════════════════════════════════════════════

insert into public.team_members (profile_key, name, initials, role, active, service_owner_for)
select 'valen', 'Valentino Redín', 'V', 'MKT', true, '{}'
where not exists (select 1 from public.team_members where name = 'Valentino Redín');

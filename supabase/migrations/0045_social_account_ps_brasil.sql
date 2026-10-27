-- ════════════════════════════════════════════════════════════════════
-- 0045 — Social Media: vuelve la cuenta PS Iberia & America · Brasil
-- (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- La 0034 la había borrado. Vuelve con la misma key, el mismo grupo, sin
-- plan y en su lugar de antes (sort_order 160: entre Estados Unidos y PS
-- Global · Academy). Los 4 posteos de septiembre 2026 que se borraron con
-- la 0034 no vuelven (no quedó copia).
-- Idempotente: se puede correr más de una vez. Aplicada el 27 oct 2026
-- con el conector de Supabase.
-- ════════════════════════════════════════════════════════════════════

insert into public.social_accounts (key, group_name, name, plan, sort_order, active)
values ('ps-iberam-brasil', 'PS Iberia & America', 'Brasil', 'none', 160, true)
on conflict (key) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- 0034 — Social Media: borra las cuentas PS Iberia & America · España,
-- PS Iberia & America · Brasil y PS Global · PTech (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- España y PTech no tenían posteos. Brasil tenía 4 de septiembre 2026
-- (Agricultura regenerativa, Programas privados, Consultoria agrícola,
-- Avaliação do ciclo de vida): se borran con la cuenta, como se pidió.
-- Idempotente. Se corre a mano en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════

begin;

delete from public.social_posts
where account_id in (select id from public.social_accounts where key in ('ps-iberam-espana', 'ps-iberam-brasil', 'ps-global-ptech'));

delete from public.social_accounts
where key in ('ps-iberam-espana', 'ps-iberam-brasil', 'ps-global-ptech');

commit;

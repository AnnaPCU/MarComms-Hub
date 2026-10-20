-- ════════════════════════════════════════════════════════════════════
-- 0033 — Social Media: cuentas «TLR Peru» y «Bel» (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- · TLR Peru: grupo CU Latinoamérica, plan Active, justo debajo de Peru.
-- · Bel: grupo propio «Bel» (no es Control Union ni Peterson Solutions),
--   sin plan.
-- · Mueve de Peru a TLR Peru los 2 posteos de TLR de octubre 2026:
--   «TLR - Expoalimentaria» y «TLR | Arándanos». «Expoalimentaria»
--   (semana del 26/10) queda en Peru.
-- Idempotente: se puede correr más de una vez. Se corre a mano en el
-- SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════

begin;

insert into public.social_accounts (key, group_name, name, plan, sort_order, active)
values
  ('cu-latam-tlr-peru', 'CU Latinoamérica', 'TLR Peru', 'active', 25, true),
  ('bel',               'Bel',              'Bel',      'none',   190, true)
on conflict (key) do nothing;

update public.social_posts p
set account_id = (select id from public.social_accounts where key = 'cu-latam-tlr-peru')
where p.id in ('419e814b-7b9d-4a02-9d81-6b2c32908e44', '2b5d8adc-74a4-4013-9522-1f68481f011a')
  and p.account_id = (select id from public.social_accounts where key = 'cu-latam-peru');

commit;

-- Verificación: TLR Peru debería tener 2 posteos y Peru 5
select a.name, a.group_name, a.plan, a.sort_order, count(p.id) as posteos
from public.social_accounts a
left join public.social_posts p on p.account_id = a.id
where a.key in ('cu-latam-peru', 'cu-latam-tlr-peru', 'bel')
group by a.id
order by a.sort_order;

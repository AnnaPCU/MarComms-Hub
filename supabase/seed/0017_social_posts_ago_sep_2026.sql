-- ════════════════════════════════════════════════════════════════════
-- Seed 0017 — Posteos de agosto y septiembre 2026 (importados del Excel)
-- ════════════════════════════════════════════════════════════════════
-- OPCIONAL. Carga los posteos que estaban en Revision_PODs_08_AGOSTO y
-- Revision_PODs_09_SEPTIEMBRE para que Delfi no arranque de cero.
--
-- Supuesto: el Excel no tenía fecha por posteo (columnas "Posteo 1..N"),
-- así que "Posteo N" se ubica en la semana N del mes; los que exceden la
-- cantidad de semanas van a la última. Se pueden mover después desde la app.
-- Los posteos sin estado en el Excel entran como "en_proceso".
--
-- Correr DESPUÉS de 0017_social_posts.sql. Es idempotente: no duplica si
-- ya existe un posteo con la misma cuenta, semana y título.
-- ════════════════════════════════════════════════════════════════════

insert into public.social_posts (account_id, week_start, month_key, title, status)
select a.id, v.week_start::date, v.month_key, v.title, v.status
from (values
  ('cu-latam-certificaciones', '2026-08-03', '2026-08', 'EUDR + Webinar (Lula Rey) – C1397 (1era parte) y C1398 (2da parte)', 'programado'),
  ('cu-latam-certificaciones', '2026-08-10', '2026-08', 'Orgánico (Bauti Bourse) – C1392.', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-08-17', '2026-08', 'CFR y EPA (Eloy Zavalia) – C1400', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-08-24', '2026-08', 'FSC (Lula Rey) – C1410', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-08-24', '2026-08', 'Cómo es una auditoría (Jaime + Martín E.) - C1412 (1era parte) y C1408 (2da parte)', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-08-24', '2026-08', 'SMETA  (onenote)', 'en_proceso'),
  ('cu-latam-brasil', '2026-08-03', '2026-08', 'post 1: Soluções Monitoramento de Gado', 'en_proceso'),
  ('cu-latam-brasil', '2026-08-10', '2026-08', 'pst', 'en_proceso'),
  ('cu-na-canada', '2026-08-03', '2026-08', 'https://pellet.org/events/2026-wpac-conference/', 'listo'),
  ('cu-pt-portugal', '2026-08-03', '2026-08', 'SLCP', 'programado'),
  ('cu-pt-portugal', '2026-08-10', '2026-08', 'ISCC EU Biometano', 'programado'),
  ('cu-pt-portugal', '2026-08-17', '2026-08', 'carbono vs. Greenwashing', 'programado'),
  ('cu-pt-portugal', '2026-08-24', '2026-08', 'turismo', 'en_proceso'),
  ('cu-latam-chile', '2026-08-31', '2026-09', 'feria de inocuidad en la que participamos', 'programado'),
  ('cu-latam-chile', '2026-09-07', '2026-09', 'certificación Flustix', 'programado'),
  ('cu-latam-mexico', '2026-08-31', '2026-09', 'evento de la huella  liverpool', 'aprobado'),
  ('cu-latam-mexico', '2026-09-07', '2026-09', 'servicio incheck- zdhc', 'aprobado'),
  ('cu-latam-certificaciones', '2026-08-31', '2026-09', 'EUDR + Webinar (Lula Rey) – C1397 (1era parte) y C1398 (2da parte)', 'programado'),
  ('cu-latam-certificaciones', '2026-09-07', '2026-09', 'Orgánico (Bauti Bourse) – C1392.', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-09-14', '2026-09', 'CFR y EPA (Eloy Zavalia) – C1400', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-09-21', '2026-09', 'FSC (Lula Rey) – C1410', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-09-21', '2026-09', 'Cómo es una auditoría (Jaime + Martín E.) - C1412 (1era parte) y C1408 (2da parte)', 'en_proceso'),
  ('cu-latam-certificaciones', '2026-09-21', '2026-09', 'SMETA  (onenote)', 'en_proceso'),
  ('cu-latam-brasil', '2026-08-31', '2026-09', 'post 1: Soluções Monitoramento de Gado', 'en_proceso'),
  ('cu-latam-brasil', '2026-09-07', '2026-09', 'pst', 'en_proceso'),
  ('cu-latam-brasil', '2026-09-14', '2026-09', 'ISCC EU pelo programa LCFS administrado pelo CARB', 'en_proceso'),
  ('cu-na-usa', '2026-08-31', '2026-09', 'Evento ISCC', 'programado'),
  ('cu-na-usa', '2026-09-07', '2026-09', 'SMETA video', 'programado'),
  ('cu-na-usa', '2026-09-14', '2026-09', 'SMETA  post', 'programado'),
  ('cu-na-usa', '2026-09-21', '2026-09', 'ISCC EU certification to be compliant with California LCFS', 'programado'),
  ('cu-na-canada', '2026-08-31', '2026-09', 'evento WPAC', 'programado'),
  ('cu-na-canada', '2026-09-07', '2026-09', 'recordatorio WPAC', 'en_proceso'),
  ('cu-pt-portugal', '2026-08-31', '2026-09', 'SLCP', 'programado'),
  ('cu-pt-portugal', '2026-09-07', '2026-09', 'ISCC EU Biometano', 'programado'),
  ('cu-pt-portugal', '2026-09-14', '2026-09', 'ISO14064', 'programado'),
  ('ps-iberam-brasil', '2026-08-31', '2026-09', 'CONSULTORIA AGRÍCOLA', 'programado'),
  ('ps-iberam-brasil', '2026-09-07', '2026-09', 'PROGRAMAS PRIVADOS', 'programado'),
  ('ps-iberam-brasil', '2026-09-14', '2026-09', 'AGRICULTURA REGENERATIVA', 'programado'),
  ('ps-iberam-brasil', '2026-09-21', '2026-09', 'AVALIAÇÃO DO CICLO DE VIDA', 'programado'),
  ('ps-global-academy', '2026-08-31', '2026-09', 'Course 1: CU-001 – Forced Labor Awareness and Prevention', 'programado'),
  ('ps-global-academy', '2026-09-07', '2026-09', 'Course 1: CU-001 – Forced Labor Awareness and Prevention', 'programado'),
  ('ps-global-academy', '2026-09-14', '2026-09', 'Course 2: From Claims to Confidence – Understanding EmpCo', 'programado'),
  ('ps-global-academy', '2026-09-21', '2026-09', 'Course 2: From Claims to Confidence – Understanding EmpCo', 'programado')
) as v(account_key, week_start, month_key, title, status)
join public.social_accounts a on a.key = v.account_key
where not exists (
  select 1 from public.social_posts p
  where p.account_id = a.id and p.week_start = v.week_start::date and p.title = v.title
);

-- ════════════════════════════════════════════════════════════════════
-- 0046 — Social Media: hora y plataforma de los posteos programados
-- (oct 2026)
-- ════════════════════════════════════════════════════════════════════
-- Al pasar un posteo a «Programado» se pide dónde se programó (HubSpot o
-- LinkedIn), la fecha de publicación (publish_date, ya existía) y la hora.
--   publish_time  time — hora de publicación (24 h)
--   scheduled_on  text — 'hubspot' | 'linkedin'
-- Los posteos programados antes de esto quedan sin hora ni plataforma
-- hasta que se editen.
-- Se puede correr más de una vez (sin DROP). Aplicada el 28 oct 2026 con
-- el conector de Supabase.
-- ════════════════════════════════════════════════════════════════════

alter table public.social_posts add column if not exists publish_time time;
alter table public.social_posts add column if not exists scheduled_on text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'social_posts_scheduled_on_check') then
    alter table public.social_posts
      add constraint social_posts_scheduled_on_check check (scheduled_on is null or scheduled_on in ('hubspot', 'linkedin'));
  end if;
end $$;

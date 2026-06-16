-- ════════════════════════════════════════════════════════════════════
-- Migration 0009 — utm_links (UTM Repository)
-- ════════════════════════════════════════════════════════════════════
-- Repositorio de UTMs generados. Permite reutilizar UTMs existentes en
-- lugar de crear uno nuevo cada vez.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pegar → Run
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.utm_links (
  id             uuid primary key default gen_random_uuid(),
  label          text,            -- nombre legible para buscar
  url            text not null,   -- URL final con tracking
  source         text,            -- utm_source
  medium         text,            -- utm_medium
  business_unit  text,
  organization   text,            -- "Peterson o Control Union" (clasificación)
  country        text,
  service        text,
  campaign_name  text,
  utm_campaign   text,            -- el utm_campaign armado
  created_by     text,            -- miembro que lo guardó
  created_at     timestamptz not null default now()
);

create index if not exists idx_utm_links_created_at on public.utm_links (created_at desc);
create index if not exists idx_utm_links_country     on public.utm_links (country);

-- RLS
alter table public.utm_links enable row level security;

drop policy if exists "auth users full access" on public.utm_links;
create policy "auth users full access" on public.utm_links
  for all to authenticated using (true) with check (true);

drop policy if exists "anon temp full access" on public.utm_links;
create policy "anon temp full access" on public.utm_links
  for all to anon using (true) with check (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'utm_links'
  ) then
    alter publication supabase_realtime add table public.utm_links;
  end if;
end $$;

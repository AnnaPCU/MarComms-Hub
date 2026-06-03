-- ════════════════════════════════════════════════════════════════════
-- Migration 0003 — campaigns
-- ════════════════════════════════════════════════════════════════════
-- Tabla para campañas (email, paid, database, research, webinar-linked).
-- `data` jsonb guarda todo el contenido interno (contenidos, dates,
-- extras, sender, etc.) para evitar 30+ columnas.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.campaigns (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                text not null check (type in ('email', 'paid', 'database', 'research')),
  variant             text check (variant in ('webinar', null)),  -- 'webinar' si está linkeada
  linked_webinar_id   uuid,                                       -- nullable FK
  country             text,
  business_unit       text,
  service_owner       text,
  budget              numeric(12, 2) default 0,
  platform_investment numeric(12, 2) default 0,
  num_emails          integer default 0,
  deals_created       integer default 0,
  completed_steps     text[] default array[]::text[],
  deadlines           jsonb default '{}'::jsonb,
  data                jsonb default '{}'::jsonb,   -- contenidos, sender, tag, dates, etc.
  report              jsonb,                       -- reporte Mailchimp parseado (nullable)
  comments            jsonb default '[]'::jsonb,   -- array inline (futuro: tabla aparte)
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Trigger updated_at (reusa la función de la migration 0002 si ya existe)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- Índices
create index if not exists idx_campaigns_type      on public.campaigns (type);
create index if not exists idx_campaigns_variant   on public.campaigns (variant);
create index if not exists idx_campaigns_country   on public.campaigns (country);
create index if not exists idx_campaigns_bu        on public.campaigns (business_unit);
create index if not exists idx_campaigns_linked_wb on public.campaigns (linked_webinar_id);

-- RLS
alter table public.campaigns enable row level security;

drop policy if exists "auth users full access" on public.campaigns;
create policy "auth users full access" on public.campaigns
  for all to authenticated using (true) with check (true);

drop policy if exists "anon temp full access" on public.campaigns;
create policy "anon temp full access" on public.campaigns
  for all to anon using (true) with check (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'campaigns'
  ) then
    alter publication supabase_realtime add table public.campaigns;
  end if;
end $$;

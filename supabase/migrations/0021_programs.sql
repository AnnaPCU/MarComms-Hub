-- ════════════════════════════════════════════════════════════════════
-- Migration 0021 — Programas: una campaña integral que agrupa pilares
-- ════════════════════════════════════════════════════════════════════
-- Un "programa" (ej. "ISO 27001 España") agrupa varios pilares: un
-- webinar, un email marketing, una pauta, una BBDD… Cada pilar sigue
-- siendo su proyecto propio (webinars / campaigns / events) y queda
-- vinculado por `program_id`. Al borrar el programa los proyectos NO se
-- borran: quedan sueltos (on delete set null).
--
--   programs — nombre, cliente, país, unidad, objetivo, fechas, notas
--   webinars.program_id / campaigns.program_id / events.program_id
--
-- Aplicada desde Claude Code con el conector de Supabase (sep 2026).
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.programs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  client        text,
  country       text,
  business_unit text,
  objective     text,
  start_date    date,
  end_date      date,
  notes         text,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_programs_updated_at on public.programs;
create trigger trg_programs_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

create index if not exists idx_programs_country on public.programs (country);

-- ── Vínculo desde los pilares ──
alter table public.webinars  add column if not exists program_id uuid references public.programs(id) on delete set null;
alter table public.campaigns add column if not exists program_id uuid references public.programs(id) on delete set null;
alter table public.events    add column if not exists program_id uuid references public.programs(id) on delete set null;
create index if not exists idx_webinars_program  on public.webinars  (program_id);
create index if not exists idx_campaigns_program on public.campaigns (program_id);
create index if not exists idx_events_program    on public.events    (program_id);

-- ── RLS (mismo criterio que el resto de las tablas) ──
alter table public.programs enable row level security;
drop policy if exists "auth users full access" on public.programs;
create policy "auth users full access" on public.programs
  for all to authenticated using (true) with check (true);
drop policy if exists "anon temp full access" on public.programs;
create policy "anon temp full access" on public.programs
  for all to anon using (true) with check (true);

-- ── Realtime ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'programs'
  ) then
    execute 'alter publication supabase_realtime add table public.programs';
  end if;
end $$;

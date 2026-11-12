-- ════════════════════════════════════════════════════════════════════
-- Migration 0070 — CRM HubSpot · Weekly check: entidades en la base,
-- importancia + tags, y fecha / estado en los próximos steps
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026 (sesión CRM HubSpot):
--
-- 1) crm_weekly_entities: las entidades (países) del Weekly check pasan a
--    la base para poder sumarlas, editarlas y borrarlas desde el Hub.
--    code = código de la entidad en HubSpot (ej. '538'): es lo que usan
--    crm_weekly_checks.entity_code y crm_next_steps.entity_code, por eso
--    no se edita. Arranca con las 16 de CRM_ENTITIES
--    (src/constants/crmWeekly.js, que queda de respaldo si la tabla no
--    está). priority = 'alta' | 'media' | 'baja' | null; tags = etiquetas
--    libres.
-- 2) crm_next_steps: due_date (fecha de la actividad, opcional), done y
--    done_at, para la vista «Próximas actividades».
--
-- Se puede correr más de una vez (sin DROP: el conector de Supabase pide
-- confirmar las sentencias destructivas).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.crm_weekly_entities (
  code        text primary key,
  name        text not null,
  brand       text not null default 'Control Union',
  country     text,
  priority    text,
  tags        text[] not null default '{}',
  position    int  not null default 0,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.crm_weekly_entities (code, name, brand, country, position) values
  ('538', 'Control Union Argentina S.A.', 'Control Union', 'Argentina', 0),
  ('592', 'Peterson Consultancy S.A.', 'Peterson', 'Argentina', 1),
  ('583', 'Control Union Canada Inc.', 'Control Union', 'Canada', 2),
  ('518', 'CU WG Spain S.A.', 'Control Union', 'España', 3),
  ('765', 'Peterson Iberoamerica SL', 'Peterson', 'España', 4),
  ('598', 'Control Union de Mexico S.A.', 'Control Union', 'México', 5),
  ('536', 'Control Union Services Peru S.A.C.', 'Control Union', 'Perú', 6),
  ('522', 'Control Union Portugal, Unipessoal, Lda.', 'Control Union', 'Portugal', 7),
  ('767', 'Peterson USA', 'Peterson', 'Estados Unidos', 8),
  ('537', 'Control Union (United States) Inc.', 'Control Union', 'Estados Unidos', 9),
  ('848', 'Control Union Chile SpA', 'Control Union', 'Chile', 10),
  ('752', 'Peterson Technologies GmbH', 'Peterson', 'Alemania', 11),
  ('566', 'Control Union Ecuador (branch office)', 'Control Union', 'Ecuador', 12),
  ('520', 'Control Union Colombia Ltd.', 'Control Union', 'Colombia', 13),
  ('442', 'Peterson Consultoria e Logistica', 'Peterson', 'Brasil', 14),
  ('880', 'Peterson Projects & Solution México S.A. de C.V.', 'Peterson', 'México', 15)
on conflict (code) do nothing;

alter table public.crm_next_steps add column if not exists due_date date;
alter table public.crm_next_steps add column if not exists done boolean not null default false;
alter table public.crm_next_steps add column if not exists done_at timestamptz;

alter table public.crm_weekly_entities enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_weekly_entities_updated_at') then
    create trigger trg_crm_weekly_entities_updated_at before update on public.crm_weekly_entities for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_weekly_entities' and policyname = 'auth users full access') then
    create policy "auth users full access" on public.crm_weekly_entities for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crm_weekly_entities' and policyname = 'anon temp full access') then
    create policy "anon temp full access" on public.crm_weekly_entities for all to anon using (true) with check (true);
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_weekly_entities') then
    alter publication supabase_realtime add table public.crm_weekly_entities;
  end if;
end $$;

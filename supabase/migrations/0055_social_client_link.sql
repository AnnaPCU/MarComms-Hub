-- ════════════════════════════════════════════════════════════════════
-- 0055 — Social Media: link externo por cuenta + pedidos de posteo del cliente
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026. Cada cuenta de Social Media tiene un link propio
-- (https://<hub>/?social=<token>), como los planes: sin login, muestra el
-- calendario con los posteos de ESA cuenta y un formulario para pedir un
-- posteo. El pedido entra como un posteo más de la cuenta (hoja Posteos y
-- Calendario del Hub), en estado «En proceso» y marcado como pedido del
-- cliente.
--
-- 1) social_accounts.public_token: el token del link (uno por cuenta).
-- 2) social_posts: columnas del pedido (quién lo pide, redes, tipo, copy,
--    notas del cliente, archivos). Las notas internas siguen en `notes`.
-- 3) get_public_social_account(token): lo único que lee la página externa
--    (cuenta + sus posteos, sin las notas internas). Security definer.
-- 4) submit_public_social_post(token, pedido): crea el posteo. Valida los
--    campos y que los archivos estén en la carpeta del token.
-- 5) Bucket público «social-requests» (imágenes y videos, hasta 50 MB por
--    archivo): se sube solo dentro de la carpeta de un token válido.
--
-- Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

-- 1) Token del link de cada cuenta
alter table public.social_accounts
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists social_accounts_public_token_key
  on public.social_accounts (public_token);

-- 2) Datos del pedido del cliente
alter table public.social_posts
  add column if not exists source        text,                       -- 'cliente' = pedido desde el link
  add column if not exists requested_by  text,                       -- nombre y apellido de quien lo pide
  add column if not exists requested_at  timestamptz,
  add column if not exists networks      text[] not null default '{}', -- linkedin / instagram
  add column if not exists post_type     text,                       -- webinar / evento / informativo / otros
  add column if not exists copy          text,                       -- texto exacto a publicar
  add column if not exists request_notes text,                       -- aclaraciones del cliente
  add column if not exists media         jsonb not null default '[]'::jsonb; -- [{ path, name, type, size }]

-- 3) Lectura del link externo
create or replace function public.get_public_social_account(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', a.id,
    'name', a.name,
    'group', a.group_name,
    'posts', coalesce((
      select json_agg(json_build_object(
        'id', p.id,
        'title', p.title,
        'theme', p.theme,
        'status', p.status,
        'weekStart', p.week_start,
        'publishDate', p.publish_date,
        'publishTime', to_char(p.publish_time, 'HH24:MI'),
        'scheduledOn', p.scheduled_on,
        'source', p.source,
        'requestedBy', p.requested_by,
        'requestedAt', p.requested_at,
        'networks', p.networks,
        'postType', p.post_type,
        'copy', p.copy,
        'requestNotes', p.request_notes,
        'media', p.media,
        -- el link interno (Drive, Canva…) solo se muestra en lo que pidió el cliente
        'link', case when p.source = 'cliente' then p.link else null end
      ) order by p.publish_date nulls last, p.week_start)
      from public.social_posts p
      where p.account_id = a.id
    ), '[]'::json)
  )
  from public.social_accounts a
  where a.public_token = p_token and a.active;
$$;

revoke all on function public.get_public_social_account(uuid) from public;
grant execute on function public.get_public_social_account(uuid) to anon, authenticated;

-- 4) Pedido de posteo desde el link
create or replace function public.submit_public_social_post(p_token uuid, p_post jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account   public.social_accounts%rowtype;
  v_name      text := btrim(coalesce(p_post->>'requestedBy', ''));
  v_type      text := coalesce(p_post->>'postType', '');
  v_copy      text := btrim(coalesce(p_post->>'copy', ''));
  v_title     text := btrim(coalesce(p_post->>'title', ''));
  v_theme     text := nullif(btrim(coalesce(p_post->>'theme', '')), '');
  v_link      text := nullif(btrim(coalesce(p_post->>'link', '')), '');
  v_notes     text := nullif(btrim(coalesce(p_post->>'requestNotes', '')), '');
  v_date      date;
  v_week      date;
  v_networks  text[];
  v_media     jsonb := coalesce(p_post->'media', '[]'::jsonb);
  v_id        uuid;
begin
  select * into v_account from public.social_accounts where public_token = p_token and active;
  if not found then raise exception 'link inválido'; end if;

  begin
    v_date := (p_post->>'publishDate')::date;
  exception when others then
    raise exception 'fecha inválida';
  end;
  if v_date is null then raise exception 'falta la fecha de publicación'; end if;
  if v_date < (now() at time zone 'America/Argentina/Buenos_Aires')::date then
    raise exception 'la fecha de publicación ya pasó';
  end if;

  select coalesce(array_agg(distinct n), '{}') into v_networks
  from jsonb_array_elements_text(coalesce(p_post->'networks', '[]'::jsonb)) n
  where n in ('linkedin', 'instagram');

  if v_name = '' or length(v_name) > 120 then raise exception 'falta el nombre'; end if;
  if cardinality(v_networks) = 0 then raise exception 'falta la red social'; end if;
  if v_type not in ('webinar', 'evento', 'informativo', 'otros') then raise exception 'tipo de posteo inválido'; end if;
  if v_copy = '' or length(v_copy) > 5000 then raise exception 'falta el copy'; end if;
  if length(coalesce(v_link, '')) > 1000 or length(coalesce(v_notes, '')) > 3000 then raise exception 'texto demasiado largo'; end if;
  if v_title = '' then v_title := left(v_copy, 80); end if;
  v_title := left(v_title, 160);

  -- Archivos: lista de hasta 10, todos dentro de la carpeta del token
  if jsonb_typeof(v_media) <> 'array' or jsonb_array_length(v_media) > 10 then raise exception 'archivos inválidos'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_media) m
    where coalesce(m->>'path', '') not like p_token::text || '/%'
  ) then raise exception 'archivos inválidos'; end if;

  v_week := date_trunc('week', v_date)::date; -- lunes (ISO)

  insert into public.social_posts (
    account_id, week_start, month_key, title, theme, status, publish_date, link,
    source, requested_by, requested_at, networks, post_type, copy, request_notes, media, created_by
  ) values (
    v_account.id, v_week, to_char(v_week + 3, 'YYYY-MM'), v_title, v_theme, 'en_proceso', v_date, v_link,
    'cliente', v_name, now(), v_networks, v_type, v_copy, v_notes, v_media, v_name
  ) returning id into v_id;

  return json_build_object('id', v_id);
end;
$$;

revoke all on function public.submit_public_social_post(uuid, jsonb) from public;
grant execute on function public.submit_public_social_post(uuid, jsonb) to anon, authenticated;

-- 5) Archivos del pedido (imágenes y videos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-requests', 'social-requests', true, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'social requests upload with token'
  ) then
    create policy "social requests upload with token" on storage.objects
      for insert to anon, authenticated
      with check (
        bucket_id = 'social-requests'
        and exists (
          select 1 from public.social_accounts a
          where a.active and a.public_token::text = (storage.foldername(name))[1]
        )
      );
  end if;
end $$;

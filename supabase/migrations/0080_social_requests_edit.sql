-- ════════════════════════════════════════════════════════════════════
-- 0080 — Social Media · link del cliente: tipo «Artículo LinkedIn»,
--        copy de hasta 3.000 caracteres y edición del propio pedido
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026, a pedido de Delfina Palmero.
--
-- 1) social_posts.client_edited_at: cuándo el cliente cambió su pedido
--    desde el link (el Hub lo muestra en «Pedido del cliente» y avisa).
-- 2) submit_public_social_post: suma el tipo 'articulo_linkedin' y baja el
--    copy a 3.000 caracteres (el máximo de un posteo de LinkedIn).
-- 3) update_public_social_post(token, id, pedido): el cliente edita un
--    pedido suyo (source = 'cliente', de la cuenta del token) solo mientras
--    está «En proceso». En cualquier otro estado devuelve el error
--    «pedido no editable» (el link le dice que le escriba a Delfina).
--    No cambia quién lo pidió, ni el estado, ni las notas internas.
-- 4) get_public_social_account: devuelve también clientEditedAt.
--
-- Se puede correr más de una vez (sin DROP).
-- ════════════════════════════════════════════════════════════════════

-- 1) Marca de edición del cliente
alter table public.social_posts
  add column if not exists client_edited_at timestamptz;

-- 2) Alta del pedido (mismo contrato que la 0055)
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
  if v_type not in ('webinar', 'evento', 'informativo', 'articulo_linkedin', 'otros') then raise exception 'tipo de posteo inválido'; end if;
  if v_copy = '' then raise exception 'falta el copy'; end if;
  if length(v_copy) > 3000 then raise exception 'copy demasiado largo'; end if;
  if length(coalesce(v_link, '')) > 1000 or length(coalesce(v_notes, '')) > 3000 then raise exception 'texto demasiado largo'; end if;
  if v_title = '' then v_title := left(v_copy, 80); end if;
  v_title := left(v_title, 160);

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

-- 3) Edición del pedido por el cliente (solo «En proceso»)
create or replace function public.update_public_social_post(p_token uuid, p_id uuid, p_post jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account   public.social_accounts%rowtype;
  v_post      public.social_posts%rowtype;
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
begin
  select * into v_account from public.social_accounts where public_token = p_token and active;
  if not found then raise exception 'link inválido'; end if;

  select * into v_post from public.social_posts
  where id = p_id and account_id = v_account.id and source = 'cliente'
  for update;
  if not found then raise exception 'pedido no encontrado'; end if;
  if v_post.status <> 'en_proceso' then raise exception 'pedido no editable'; end if;

  begin
    v_date := (p_post->>'publishDate')::date;
  exception when others then
    raise exception 'fecha inválida';
  end;
  if v_date is null then raise exception 'falta la fecha de publicación'; end if;
  -- Una fecha nueva tiene que ser de hoy en adelante; la que ya tenía se puede dejar
  if v_date is distinct from v_post.publish_date
     and v_date < (now() at time zone 'America/Argentina/Buenos_Aires')::date then
    raise exception 'la fecha de publicación ya pasó';
  end if;

  select coalesce(array_agg(distinct n), '{}') into v_networks
  from jsonb_array_elements_text(coalesce(p_post->'networks', '[]'::jsonb)) n
  where n in ('linkedin', 'instagram');

  if cardinality(v_networks) = 0 then raise exception 'falta la red social'; end if;
  if v_type not in ('webinar', 'evento', 'informativo', 'articulo_linkedin', 'otros') then raise exception 'tipo de posteo inválido'; end if;
  if v_copy = '' then raise exception 'falta el copy'; end if;
  if length(v_copy) > 3000 then raise exception 'copy demasiado largo'; end if;
  if length(coalesce(v_link, '')) > 1000 or length(coalesce(v_notes, '')) > 3000 then raise exception 'texto demasiado largo'; end if;
  if v_title = '' then v_title := v_post.title; end if;
  v_title := left(v_title, 160);

  if jsonb_typeof(v_media) <> 'array' or jsonb_array_length(v_media) > 10 then raise exception 'archivos inválidos'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_media) m
    where coalesce(m->>'path', '') not like p_token::text || '/%'
  ) then raise exception 'archivos inválidos'; end if;

  v_week := date_trunc('week', v_date)::date;

  update public.social_posts set
    week_start = v_week,
    month_key = to_char(v_week + 3, 'YYYY-MM'),
    title = v_title,
    theme = v_theme,
    publish_date = v_date,
    link = v_link,
    networks = v_networks,
    post_type = v_type,
    copy = v_copy,
    request_notes = v_notes,
    media = v_media,
    client_edited_at = now(),
    updated_at = now()
  where id = v_post.id;

  return json_build_object('id', v_post.id);
end;
$$;

revoke all on function public.update_public_social_post(uuid, uuid, jsonb) from public;
grant execute on function public.update_public_social_post(uuid, uuid, jsonb) to anon, authenticated;

-- 4) Lectura del link externo (igual que la 0055 + clientEditedAt)
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
        'clientEditedAt', p.client_edited_at,
        'networks', p.networks,
        'postType', p.post_type,
        'copy', p.copy,
        'requestNotes', p.request_notes,
        'media', p.media,
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

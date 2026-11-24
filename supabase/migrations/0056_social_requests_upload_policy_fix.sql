-- ════════════════════════════════════════════════════════════════════
-- 0056 — Arreglo de la política de subida del bucket «social-requests»
-- ════════════════════════════════════════════════════════════════════
-- Nov 2026. La política de la 0055 comparaba el token con
-- storage.foldername(name), pero adentro del EXISTS sobre social_accounts
-- `name` se resolvía como social_accounts.name (el nombre de la cuenta,
-- ej. «Chile»), no como el nombre del archivo: ninguna subida pasaba
-- («new row violates row-level security policy for table objects»).
-- Ahora se usa objects.name explícito. Mismo efecto buscado: solo se sube
-- dentro de la carpeta del token de una cuenta activa.
--
-- Sin DROP: ALTER POLICY. Se puede correr más de una vez.
-- ════════════════════════════════════════════════════════════════════

alter policy "social requests upload with token" on storage.objects
  with check (
    bucket_id = 'social-requests'
    and exists (
      select 1 from public.social_accounts a
      where a.active and a.public_token::text = (storage.foldername(objects.name))[1]
    )
  );

# Backend Plan — Migración a Supabase

Plan de integración del backend para Marcomms Hub.

> ✅ **Hecho en este turno**: el módulo **requests** ya quedó migrado a Supabase (tabla `public.requests`).
> Cliente: `src/lib/supabaseClient.js`. Servicio: `src/services/requestsService.js`. Hook: `src/hooks/useRequests.js`. UI conectada en `ContentHubApp.jsx` y `MyWeekApp.jsx`. Realtime activo.
>
> 🚧 **Resto pendiente**: tasks, comments, files, campaigns, webinars, events, auth real. Las tablas de tasks/comments/files ya existen en Supabase — falta crear sus servicios y refactorizar las UIs correspondientes.

---

## 🎯 Objetivos

1. **Persistencia real**: los datos sobreviven al refresh y se comparten entre usuarios
2. **Auth real**: cada miembro tiene su propia cuenta (no password compartida)
3. **Permisos**: control de acceso por rol (admin / editor / viewer)
4. **Sync en tiempo real**: cambios de un usuario aparecen en otros sin reload
5. **API segura para IA**: edge function que llame a Anthropic sin exponer la key

---

## 🗄️ Esquema de base de datos (Supabase Postgres)

### Tabla `team_members`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `name` | `text` | "Agus", "Vicky", etc. |
| `area` | `text` | enum: `comunicacion` | `marketing` |
| `role` | `text` | enum: `admin` | `editor` | `viewer` |
| `email` | `text` UNIQUE | login |
| `color_gradient` | `text` | clases Tailwind |
| `created_at` | `timestamptz` | `now()` |

### Tabla `webinars`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | "ISO 9001 ESPAÑA" |
| `main_date` | `date` | |
| `client` | `text` | |
| `monto` | `numeric` | fee |
| `pais` | `text` | |
| `unidad_negocio` | `text` | |
| `service_owner` | `uuid` FK → team_members | "Vicky" |
| `linked_campaign_id` | `uuid` FK → campaigns | nullable |
| `deals_created` | `integer` | default 0 |
| `tasks` | `jsonb` | 21 tareas con `{done, owner, date, completedAt}` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | trigger |

### Tabla `campaigns`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `type` | `text` | enum: `email` | `paid` | `database` | `research` |
| `variant` | `text` | `webinar` si está linked, else null |
| `country` | `text` | |
| `business_unit` | `text` | |
| `service_owner` | `uuid` FK → team_members | |
| `budget` | `numeric` | |
| `linked_webinar_id` | `uuid` FK → webinars | nullable |
| `data` | `jsonb` | todo el state interno (steps, dates, contents, etc.) |
| `completed_steps` | `text[]` | array de step IDs |
| `deadlines` | `jsonb` | `{finalDelivery, byStep: {...}}` |
| `report` | `jsonb` | reporte Mailchimp parseado |
| `comments` | `jsonb` | array de `{author, text, timestamp}` |
| `files` | `jsonb` | array de archivos en base64 (max 5MB c/u) |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### Tabla `events`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `date` | `date` | |
| `country` | `text` | |
| `business_unit` | `text` | |
| `client` | `text` | |
| `fee` | `numeric` | |
| `service_owner` | `uuid` FK → team_members | |
| `tasks` | `jsonb` | 5 fases con sus tareas |
| `custom_tasks` | `jsonb` | tareas extra por fase |
| `removed_defaults` | `text[]` | IDs de tareas default eliminadas |
| `participants` | `jsonb` | usuarios para LinkedIn tasks |
| `deals_created` | `integer` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### Tabla `standalone_requests`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `category` | `text` | enum: `one_pager` | `ppt` | `formulario` | `branding` | `landing` | `video` |
| `country` | `text` | |
| `business_unit` | `text` | |
| `requester` | `text` | |
| `budget` | `numeric` | |
| `detail` | `text` | brief |
| `owner` | `uuid` FK → team_members | |
| `status` | `text` | enum: `pending` | `in_progress` | `done` |
| `completed_at` | `timestamptz` | nullable |
| `content` | `jsonb` | `{comments, files}` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### Tabla `assigned_tasks`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `text` | |
| `detail` | `text` | nullable |
| `assigned_to` | `uuid` FK → team_members | |
| `assigned_by` | `uuid` FK → team_members | |
| `deadline` | `date` | nullable |
| `done` | `boolean` | default false |
| `project` | `jsonb` | referencia opcional `{type, id, name}` |
| `assigned_at` | `timestamptz` | `now()` |

### Tabla `notifications`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → team_members | destinatario |
| `type` | `text` | enum: `assigned` | `overdue` | `soon` | `responsible` | `new` |
| `title` | `text` | |
| `body` | `text` | |
| `link_to` | `jsonb` | `{section, id}` para deep-linking |
| `read` | `boolean` | default false |
| `created_at` | `timestamptz` | |

---

## 🔐 Row Level Security (RLS)

### Política inicial (uso interno, baja seguridad)
Cualquier usuario autenticado puede leer/escribir todo:

```sql
-- Habilitar RLS en todas las tablas
alter table webinars enable row level security;
alter table campaigns enable row level security;
-- ... etc

-- Política permisiva inicial
create policy "Authenticated users can do everything"
  on webinars
  for all
  using (auth.role() = 'authenticated');
```

### Política avanzada (cuando madure el producto)
- `viewer` solo puede leer
- `editor` puede leer/escribir
- `admin` puede leer/escribir/borrar y manejar usuarios

---

## 🔑 Autenticación

### Método: Supabase Auth con Magic Link

1. El usuario ingresa su email
2. Recibe un link mágico por email
3. Click → loggeado
4. Sin passwords

### Restricción: solo emails del dominio `controlunion.com` (o whitelist)

```sql
-- En signup hook
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.email not like '%@controlunion.com' then
    raise exception 'Solo emails de @controlunion.com';
  end if;
  -- crear team_member asociado
  insert into team_members (id, email, name) values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;
```

---

## ⚡ Edge functions (Supabase)

### 1. `analyze-mailchimp-pdf`
Para que el Reporte Mailchimp funcione en producción sin exponer la API key:

```ts
// supabase/functions/analyze-mailchimp-pdf/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  const { pdfBase64 } = await req.json();
  
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }},
          { type: 'text', text: 'Extraé las métricas de este reporte de Mailchimp en JSON...' }
        ]
      }]
    })
  });
  
  return new Response(await r.text(), { headers: { 'Content-Type': 'application/json' }});
});
```

### 2. `generate-newsletter` (futuro)
Para el Generador de Newsletter cuando se integre.

---

## 🔄 Real-time subscriptions

Para sync automático entre usuarios:

```js
// Cuando un user edita un webinar, otros usuarios ven el cambio sin reload
supabase
  .channel('webinars-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'webinars' }, (payload) => {
    // Actualizar state local
  })
  .subscribe();
```

---

## 📋 Migración paso a paso

### Fase 1 — Setup (1 día)
1. Crear proyecto Supabase
2. Correr migrations SQL (las 7 tablas)
3. Habilitar RLS con política permisiva
4. Setear ANTHROPIC_API_KEY como secret
5. Agregar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY a Vercel

### Fase 2 — Auth (2 días)
1. Reemplazar `LoginScreen` con Supabase Magic Link
2. Crear hook `useAuth()` que devuelve `{ user, login, logout }`
3. Gate la app detrás del login real

### Fase 3 — Data layer (3-5 días)
1. Crear servicio `src/services/supabase.js` con cliente Supabase
2. Implementar la rama no-mock en cada servicio existente (`requestsService`, `tasksService`, `campaignsService`, `webinarsService`, `eventsService`, `usersService`, `commentsService`, `filesService`)
3. Crear hooks `useWebinars`, `useCampaigns`, `useEvents` siguiendo el patrón de los ya existentes (`useRequests`, `useTasks`)
4. Refactorizar `App.jsx`: reemplazar `globalCampaigns`, `globalWebinars`, `globalEvents`, `globalStandaloneRequests`, `globalAssignedTasks` por hooks
5. Dejar los archivos de `src/data/mock*.js` y `seed.js` como **seed** (utilidad para `npm run seed`)

### Fase 4 — Real-time (1-2 días)
1. Agregar subscriptions a cada tabla
2. Testear que cambios de un user aparecen en otros

### Fase 5 — Edge function Mailchimp (1 día)
1. Crear edge function `analyze-mailchimp-pdf`
2. Reemplazar en `MailchimpReportTool` la llamada directa a Anthropic
3. Apuntar a `${VITE_SUPABASE_URL}/functions/v1/analyze-mailchimp-pdf`

### Fase 6 — Notificaciones (2 días)
1. Crear cron job en Supabase que recalcule notifs cada hora
2. Hook `useNotifications(userId)` con real-time
3. Eliminar lógica `buildNotifications` del cliente

---

## 🚨 Cosas a NO olvidar

- ❌ **Nunca commitear** `.env.local` con keys reales
- ❌ **Nunca exponer** `ANTHROPIC_API_KEY` en el cliente (debe ser server-only en edge function)
- ✅ La `VITE_SUPABASE_ANON_KEY` SÍ se puede exponer (es pública por diseño)
- ✅ Backup automático de Supabase: habilitar en Project Settings
- ✅ Logs: revisar regularmente en Supabase Dashboard → Logs

---

## 💰 Costos estimados

| Servicio | Plan | Costo/mes | Suficiente para |
|---|---|---|---|
| Supabase | Free | $0 | Hasta 500MB DB, 1GB storage, 2GB transfer |
| Supabase | Pro | $25 | 8GB DB, 100GB storage, 250GB transfer |
| Vercel | Hobby | $0 | Equipo interno |
| Vercel | Pro | $20/user | Si necesitamos analytics y domains custom |
| Anthropic API | Pay-as-you-go | ~$5-20 | Depende de uso del Mailchimp tool |

**Total estimado**: $0-50/mes para arrancar.

---

## 📚 Recursos

- [Supabase docs](https://supabase.com/docs)
- [Supabase + Vite quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/vite-react)
- [Anthropic API reference](https://docs.claude.com/en/api/messages)
- [Vercel docs](https://vercel.com/docs)

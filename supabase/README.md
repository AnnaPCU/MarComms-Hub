# Supabase — Migrations & Setup

Esta carpeta contiene los SQL para crear las tablas del proyecto.

## Estado actual

| Tabla | Migration | En la app |
|---|---|---|
| `requests` (Content Hub) | ✅ Ya existe en tu Supabase | ✅ Conectada |
| `tasks` (assigned) | ✅ Ya existe en tu Supabase | 🚧 Por conectar |
| `comments` | ✅ Ya existe en tu Supabase | 🚧 Por conectar |
| `files` | ✅ Ya existe en tu Supabase | 🚧 Por conectar |
| `team_members` | ✅ Ya existe en tu Supabase | 🚧 No usada todavía |
| `webinars` | `0002_webinars.sql` | ❌ Tabla por crear |
| `campaigns` | `0003_campaigns.sql` | ❌ Tabla por crear |
| `events` | `0004_events.sql` | ❌ Tabla por crear |

## Cómo aplicar las migrations

Para cada archivo `.sql` que necesites:

1. **Supabase Dashboard** → tu proyecto
2. **SQL Editor** → **New query**
3. Pegar el contenido completo del archivo
4. **Run**

El orden recomendado:

```
0002_webinars.sql
0003_campaigns.sql
0004_events.sql
```

Las migrations son idempotentes (`if not exists`) — podés correrlas varias veces sin romper nada.

## Después de correr cada migration

Avisame y conecto el módulo correspondiente. NO conecto un módulo hasta que la tabla esté creada — porque la app rompería al fetchear.

## Realtime

Cada migration ya agrega su tabla a la publicación `supabase_realtime`. Si por alguna razón no funciona, verificar en:

**Database → Replication → supabase_realtime**

## RLS temporal

Cada migration incluye dos policies:

1. `auth users full access` → para cuando haya Supabase Auth
2. `anon temp full access` → policy permisiva mientras el login compartido no use Supabase Auth

**Importante**: cuando integremos Supabase Auth, hay que quitar las policies `anon temp full access` (están marcadas con `TEMPORAL` en cada migration).

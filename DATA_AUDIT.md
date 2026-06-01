# DATA AUDIT — MarComms Hub

Inventario del estado del data layer **antes de conectar Supabase**.
Este documento describe qué hay hoy, dónde están los hardcodes, y cómo
quedó preparado el código para una migración limpia.

> 📅 Última actualización: turno de preparación para Supabase.

---

## 🧭 Resumen

- **Persistencia hoy**:
  - **Requests** (Content Hub) → ✅ Supabase (tabla `public.requests`) con realtime.
  - **Resto** (campaigns, webinars, events, assigned tasks) → ❌ in-memory (se pierde al refrescar).
- **Auth**: password compartida (`marcomms2026`) — TODO migrar a Supabase Auth.
- **localStorage / IndexedDB**: NO se usa.
- **Vite / Vercel / package.json**: estructura sin cambios — sólo se agregó `@supabase/supabase-js`.

---

## 📂 Capa de datos (mock)

Ubicación: `src/data/`

| Archivo | Qué contiene | Tabla Supabase futura |
|---|---|---|
| `mockUsers.js`     | 9 miembros del equipo, deriva de `constants/team.js` | `team_members` |
| `mockRequests.js`  | Pedidos del Content Hub (re-export de demoStandalones) | `standalone_requests` |
| `mockTasks.js`     | Tareas asignadas entre usuarios | `assigned_tasks` |
| `mockCampaigns.js` | Campañas | `campaigns` |
| `mockWebinars.js`  | Webinars con sus 21 tareas embebidas | `webinars` |
| `mockEvents.js`    | Eventos | `events` |
| `mockComments.js`  | Comentarios (store vacío, ready para uso) | `comments` |
| `mockFiles.js`     | Archivos (store vacío, ready para Supabase Storage) | Bucket `files` |
| `seed.js`          | **Punto único** de entrada — `SEED.users`, `SEED.campaigns`, etc. | `npm run seed` (futuro) |

Los archivos `demo*.js` originales se mantienen y se re-exportan desde los `mock*.js` para no romper imports existentes.

---

## ⚙️ Capa de servicios (mock)

Ubicación: `src/services/`

| Archivo | Operaciones | Status |
|---|---|---|
| `dataService.js`     | factory: `getDataMode()`, `isMockMode()`, `mockDelay()`, `newId()`, `clone()` (mocks restantes) | ✅ |
| `../lib/supabaseClient.js` | Cliente Supabase singleton — falla rápido si faltan env vars | ✅ |
| `storage.js`         | `isBackendReady()`, `getBackendName()`, stubs Supabase | ✅ |
| `auth.js`            | `checkPassword`, `isValidMember`, `sharedLogin`, `isUsingDefaultPassword` | ✅ |
| `usersService.js`    | `listUsers`, `findUserByName`, `findUserById`, `listUsersByArea` | ✅ |
| `requestsService.js` | `listRequests`, `getRequestById`, `createRequest`, `updateRequest`, `deleteRequest`, `subscribeRequests` (+ mappers) | ✅ **Supabase real, tabla `public.requests`** |
| `tasksService.js`    | `listTasks`, `getTaskById`, `createTask`, `updateTask`, `toggleTaskDone`, `deleteTask` | ✅ |
| `commentsService.js` | `listComments`, `createComment`, `deleteComment` | ✅ |
| `filesService.js`    | `listFiles`, `uploadFile`, `deleteFile` | ✅ |
| `campaignsService.js`| `listCampaigns`, `getCampaignById`, CRUD | ✅ |
| `webinarsService.js` | `listWebinars`, `getWebinarById`, CRUD | ✅ |
| `eventsService.js`   | `listEvents`, `getEventById`, CRUD | ✅ |
| `pdf.js`             | Generación de PDFs (sin cambios) | ✅ |

### Contrato

Todos los servicios:
- Son **async** (devuelven `Promise`) — mismo shape que tendrá Supabase.
- Internamente usan `isMockMode()` para decidir si leen del store local o del backend.
- Aplican `mockDelay()` para simular latencia (~80ms) y validar que la UI maneja loading states.
- Devuelven **clones** (no entregan refs internas) — protege contra mutaciones accidentales.

---

## 🪝 Hooks

Ubicación: `src/hooks/`

| Hook | Qué hace |
|---|---|
| `useRequests(filters)` | `{ data, loading, error, refetch, create, update, remove }` |
| `useTasks(filters)`    | `{ data, loading, error, refetch, create, update, toggleDone, remove }` |
| `useAuth(initialUser)` | `{ user, loading, error, login, logout, isAuthenticated }` |
| `useFilters(initial)`  | `{ filters, setFilter, setFilters, clearFilters, hasFilters }` + helper `applyFilters` |
| `useWebinarCampaignSync` | Placeholder existente (sync bidireccional) — se llenará al refactorizar App.jsx |

> Estos hooks **todavía no se usan** en `App.jsx` / componentes grandes. Quedan listos para el próximo refactor cuando se decida moverse del `useState` global.

---

## 🔒 Hardcodes detectados

| Lugar | Valor | Cómo se resuelve |
|---|---|---|
| `services/auth.js` | password `'marcomms2026'` (fallback) | ✅ Override por `VITE_SHARED_PASSWORD`; flag `isUsingDefaultPassword()` |
| `data/demoCampaigns.js` | IDs 2001, 2002, 2101, 2102 con datos fijos | ✅ Es mock data; se reemplaza por seed en Supabase |
| `data/demoWebinars.js` | IDs 1001, 1002 con fechas y owners | ✅ Idem |
| `utils/webinar.js` | Owners default ('FRAN', 'VICKY', 'AGUS', 'FATI', 'TINO', 'DELFI', 'FELO') | ⚠️ Pendiente: convertir a referencia por user.id cuando exista DB |
| `constants/team.js` | 9 miembros del equipo | ✅ Se mueve a tabla `team_members` |
| `constants/webinar.js` | 12 piezas de contenido con default owners | ⚠️ Pendiente: idem owners |
| `constants/services.js` | Catálogo de servicios y owners | ⚠️ Pendiente: revisar al integrar DB |

> ⚠️ = no urgente — el shape actual sigue funcionando, solo conviene cambiarlo cuando los `team_members` tengan UUID.

---

## 🚦 Modo actual y switch a Supabase

```js
import { getBackendName } from '@/services/storage';
import { getDataMode } from '@/services/dataService';

getBackendName(); // 'mock' o 'supabase'
getDataMode();    // ídem (mismo origen de verdad)
```

El switch ocurre **solo** cuando se definen ambas env vars:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Mientras no estén, los servicios usan su store interno (mock).

---

## 🧪 Estado de conexión a Supabase

✅ **Migrado** (este turno)
- `@supabase/supabase-js` instalado.
- Cliente único en `src/lib/supabaseClient.js` (lanza si faltan env vars).
- `requestsService.js` conectado a la tabla `public.requests` con mappers DB↔UI.
- `useRequests` con realtime (`postgres_changes` event `*` sobre `public.requests`).
- `App.jsx` consume el hook y pasa acciones a `ContentHubApp` / `MyWeekApp`.
- `ContentHubApp.jsx` y `MyWeekApp.jsx` ya no muta arrays locales — todo pasa por las acciones del hook.

⚠️ **Limitación conocida**
- La tabla `public.requests` actual NO tiene columna `content`. Comments y files quedan en un overlay local del hook (no persisten al refrescar). TODO: agregar columna `content jsonb` o tablas separadas `comments` / `files`.

🚧 **Pendiente** (cuando se decida)
1. Migrar `tasks` → tabla `tasks` (ya existe en Supabase).
2. Migrar `comments` → tabla `comments` (ya existe).
3. Migrar `files` + integrar Supabase Storage.
4. Migrar `campaigns`, `webinars`, `events` — crear tablas + servicios.
5. Mover los callbacks de sync (`onWebinarCreated`, etc.) al hook `useWebinarCampaignSync`.
6. Reemplazar el login compartido por Supabase Auth (Magic Link).

Ver `BACKEND_PLAN.md` para el plan paso a paso completo.

---

## 📝 Cambios en este turno (resumen)

### Archivos creados
```
src/data/mockUsers.js
src/data/mockRequests.js
src/data/mockTasks.js
src/data/mockCampaigns.js
src/data/mockWebinars.js
src/data/mockEvents.js
src/data/mockComments.js
src/data/mockFiles.js
src/data/seed.js

src/services/dataService.js
src/services/usersService.js
src/services/requestsService.js
src/services/tasksService.js
src/services/commentsService.js
src/services/filesService.js
src/services/campaignsService.js
src/services/webinarsService.js
src/services/eventsService.js

src/hooks/useRequests.js
src/hooks/useTasks.js
src/hooks/useAuth.js
src/hooks/useFilters.js

DATA_AUDIT.md (este archivo)
SERVICE_LAYER.md
```

### Archivos modificados
```
src/services/auth.js     — agregado sharedLogin + isUsingDefaultPassword
src/services/storage.js  — agregado getBackendName
README.md                — sección "Data layer (mock)"
BACKEND_PLAN.md          — referencia al data layer mockeado
.env.example             — comentado mejor el override de password
```

### Archivos NO modificados (preserva UI)
```
src/App.jsx
src/components/**/*.jsx
src/data/demo*.js  (se mantienen, los mock* los re-exportan)
package.json
vite.config.js
tailwind.config.js
```

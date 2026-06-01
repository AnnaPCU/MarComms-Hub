# SERVICE LAYER — Cómo usar la capa de servicios

Guía rápida para consumir los servicios y hooks que se crearon en
preparación para Supabase. Hoy todos corren en modo **mock** (in-memory).

---

## 📐 Arquitectura

```
┌─────────────────────────┐
│   UI (componentes)      │
└──────────┬──────────────┘
           │ (usan)
           ▼
┌─────────────────────────┐
│   src/hooks/            │  useRequests, useTasks, useAuth, useFilters
└──────────┬──────────────┘
           │ (llaman a)
           ▼
┌─────────────────────────┐
│   src/services/         │  requestsService, tasksService, ...
└──────────┬──────────────┘
           │ (lee/escribe)
           ▼
┌─────────────────────────┐
│   src/data/seed.js      │  MOCK_REQUESTS, MOCK_TASKS, ...
└─────────────────────────┘
```

- **UI** nunca toca data directamente. Habla con hooks.
- **Hooks** encapsulan `useState`/`useEffect` y llaman a servicios.
- **Servicios** son async + retornan clones. Hoy leen de `src/data/`.
- **Data (mock)** es el seed inicial. Mañana será Supabase.

---

## 🚀 Ejemplos de uso

### Listar pedidos del Content Hub

```jsx
import { useRequests } from '@/hooks/useRequests';

function ContentHubList() {
  const { data, loading, error, create } = useRequests({ status: 'pending' });
  if (loading) return <Spinner />;
  if (error) return <ErrorBox e={error} />;
  return (
    <>
      {data.map((req) => <RequestCard key={req.id} req={req} />)}
      <button onClick={() => create({
        name: 'Nuevo pedido',
        category: 'one_pager',
        country: 'Argentina',
        businessUnit: 'CU Certificaciones',
        owner: 'Agus',
      })}>+ Crear</button>
    </>
  );
}
```

### Marcar una tarea como hecha

```jsx
import { useTasks } from '@/hooks/useTasks';

function MyTasks({ userName }) {
  const { data, toggleDone } = useTasks({ assignedTo: userName });
  return data.map((t) => (
    <label key={t.id}>
      <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} />
      {t.title}
    </label>
  ));
}
```

### Login

```jsx
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const { login, loading, error } = useAuth();
  const onSubmit = async (e) => {
    e.preventDefault();
    const r = await login({ name: e.target.name.value, password: e.target.pwd.value });
    if (r.ok) navigateToApp();
  };
  return (
    <form onSubmit={onSubmit}>
      <input name="name" />
      <input name="pwd" type="password" />
      {error && <p>{error.message}</p>}
      <button disabled={loading}>Entrar</button>
    </form>
  );
}
```

### Filtros reutilizables

```jsx
import { useFilters, applyFilters } from '@/hooks/useFilters';

function CampaignsView({ allCampaigns }) {
  const { filters, setFilter, clearFilters, hasFilters } = useFilters({
    country: null,
    businessUnit: null,
  });
  const visible = applyFilters(allCampaigns, filters);
  return (
    <>
      <select onChange={(e) => setFilter('country', e.target.value || null)}>...</select>
      {hasFilters && <button onClick={clearFilters}>Limpiar</button>}
      {visible.map((c) => <CampaignCard key={c.id} c={c} />)}
    </>
  );
}
```

---

## 🛠️ Operaciones disponibles por servicio

### `requestsService` ✅ **mock + Supabase**
- `listRequests(filters?)` → `Request[]`
- `getRequestById(id)` → `Request | null`
- `createRequest(data)` → `Request`
- `updateRequest(id, patch)` → `Request | null`
- `deleteRequest(id)` → `boolean`
- `subscribeRequests(onChange)` → `unsubscribe` (solo Supabase; en mock devuelve no-op)

Mapeo JS ↔ DB:
| JS (camelCase) | DB (snake_case) |
|---|---|
| `businessUnit` | `business_unit` |
| `completedAt`  | `completed_at`  |
| `createdAt`    | `created_at`    |
| `updatedAt`    | `updated_at`    |

Realtime con el hook:
```jsx
const { data } = useRequests({}, { realtime: true });
// Cuando otro cliente inserta/edita/borra, refetch automático.
```

### `tasksService`
- `listTasks(filters?)`, `getTaskById(id)`
- `createTask(data)`, `updateTask(id, patch)`
- `toggleTaskDone(id)`, `deleteTask(id)`

### `campaignsService` / `webinarsService` / `eventsService`
- Mismo patrón: `list`, `getById`, `create`, `update`, `delete`.

### `commentsService`
- `listComments({ parentType, parentId })`
- `createComment({ parentType, parentId, author, text })`
- `deleteComment(id)`

### `filesService`
- `listFiles({ parentType, parentId })`
- `uploadFile({ parentType, parentId, name, mimeType, size, dataBase64, uploadedBy })`
- `deleteFile(id)`

### `usersService`
- `listUsers()`, `findUserByName(name)`, `findUserById(id)`, `listUsersByArea(area)`

---

## 🔁 Reset de stores (útil para tests/Storybook)

Cada servicio expone un `__resetXStore()` que vuelve los datos al seed inicial:

```js
import { __resetRequestsStore } from '@/services/requestsService';
__resetRequestsStore();
```

---

## 🔌 Switch a Supabase (futuro)

Cuando se configuren las env vars (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`):

1. `isBackendReady()` empieza a devolver `true`.
2. `getDataMode()` devuelve `'supabase'`.
3. Hay que implementar la rama no-mock en cada `*Service.js` (todas marcadas con `// TODO Supabase`).
4. La **UI no cambia** — los hooks siguen exponiendo la misma API.

---

## ⚠️ Notas importantes

- Los servicios devuelven **clones**, no refs. Si pasás un objeto a `update()`, asumí que es inmutable.
- Hoy hay un `mockDelay(80ms)` para que la UI maneje loading correctamente. En tests podés mockear `mockDelay` a 0.
- El `_store` interno de cada servicio se reinicia al recargar la página — porque vive en memoria.

# Marcomms Hub

Plataforma de gestión operativa para el equipo de **Marketing & Comunicaciones de Control Union LATAM**.

Maneja webinars, campañas, eventos, pedidos de contenido, facturación, países, login, notificaciones, asignación de tareas entre usuarios, y 3 herramientas integradas (UTM Builder, Reportes Mailchimp, Generador Newsletter).

---

## 🚀 Stack tecnológico

- **React 18** + **Vite 5** (single-page app)
- **Tailwind CSS 3** (utility-first)
- **lucide-react** (~70 íconos)
- **recharts** (gráficos)
- **papaparse + xlsx** (procesamiento CSV/Excel)
- **jsPDF** (generación de PDFs nativos, cargado desde CDN)

**Sin backend todavía** — toda la data vive en memoria. La capa de servicios mock + hooks **ya está preparada** para Supabase (ver [`DATA_AUDIT.md`](./DATA_AUDIT.md) y [`SERVICE_LAYER.md`](./SERVICE_LAYER.md)). Plan de migración a Supabase: [`BACKEND_PLAN.md`](./BACKEND_PLAN.md).

---

## 📦 Instalación local

### Prerrequisitos
- Node.js 18+ ([descargar](https://nodejs.org/))
- npm (incluido con Node)

### Pasos

```bash
# 1. Clonar el repo (o entrar a la carpeta si ya lo descargaste)
git clone https://github.com/TU_USUARIO/marcomms-hub.git
cd marcomms-hub

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env.local

# 4. Levantar el servidor de desarrollo
npm run dev
```

La app va a estar en **http://localhost:5173** y se abre sola en tu navegador.

---

## 🛠️ Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta servidor de desarrollo con hot reload |
| `npm run build` | Build de producción a `dist/` |
| `npm run preview` | Previsualiza el build de producción local |

---

## 🌐 Deploy en Vercel

### Opción A — Desde el navegador (sin terminal)

1. Subí el proyecto a GitHub (drag & drop en [github.com/new](https://github.com/new))
2. Andá a [vercel.com/new](https://vercel.com/new)
3. Importá el repo
4. Framework Preset: **Vite** (auto-detectado)
5. **Build Command**: `npm run build` (default)
6. **Output Directory**: `dist` (default)
7. Click **Deploy**

### Opción B — Desde terminal

```bash
npm install -g vercel
vercel deploy --prod
```

### Variables de entorno

#### En local (`.env.local`)

Copiar `.env.example` a `.env.local` y completar:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxxxx
VITE_SHARED_PASSWORD=marcomms2026
```

> ⚠️ La app **lanza error** al iniciar si `VITE_SUPABASE_URL` o `VITE_SUPABASE_PUBLISHABLE_KEY` faltan — `src/lib/supabaseClient.js` valida que estén presentes.

Las claves se obtienen del **Dashboard de Supabase → Project Settings → API**:
- `URL` → `VITE_SUPABASE_URL`
- `Publishable key` (también llamada "anon" en proyectos viejos) → `VITE_SUPABASE_PUBLISHABLE_KEY`

❌ **Nunca** poner en variables `VITE_*` el service role key, database password, ni connection string completa — todo lo que empiece con `VITE_` queda expuesto en el bundle del cliente.

#### En Vercel

**Project Settings → Environment Variables**:

| Variable | Necesaria | Ejemplo |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | `eyJxxxxx...` |
| `VITE_SHARED_PASSWORD` | opcional | `marcomms2026` |
| `VITE_APP_NAME` | opcional | `Marcomms Hub` |

Después de agregar las variables, **redeployar** para que el bundle las incluya (Vercel → Deployments → Redeploy).

---

## 🗂️ Estructura del proyecto

```
marcomms-hub/
├── public/               # Assets estáticos (favicon, imágenes públicas)
├── src/
│   ├── components/       # Componentes UI organizados por módulo
│   │   ├── shared/       # Componentes reutilizables (OwnerPicker, etc.)
│   │   ├── login/        # LoginScreen
│   │   ├── webinar/      # WebinarApp
│   │   ├── campaigns/    # CampaignsApp + CampaignReportClient
│   │   ├── events/       # EventsApp
│   │   ├── content/      # ContentHubApp + MailchimpReportTool
│   │   ├── facturacion/  # FacturacionApp
│   │   ├── country/      # CountryDetail
│   │   ├── myweek/       # MyWeekApp
│   │   └── client/       # ClientReportApp (portal externo)
│   ├── constants/        # Configuración (no datos)
│   ├── data/             # Mock data + seed (futuro Supabase)
│   │   ├── mock*.js      # Stores normalizados (Users, Requests, Tasks, etc.)
│   │   ├── seed.js       # Punto único de entrada de la data
│   │   └── demo*.js      # Originales — re-exportados por mock*
│   ├── hooks/            # useRequests, useTasks, useAuth, useFilters, ...
│   ├── services/         # Capa de servicios mock + auth + storage + PDF
│   ├── utils/            # Funciones puras (progress, slugify, csv, date, html, pdf)
│   ├── App.jsx           # Componente raíz + routing
│   ├── main.jsx          # Bootstrap React
│   └── index.css         # Tailwind + clases custom
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.example          # Template de variables de entorno
├── .gitignore
├── README.md             # Este archivo
├── BACKEND_PLAN.md       # Plan de migración a Supabase
└── CLAUDE.md             # Instrucciones para Claude Code
```

---

## 👥 Equipo (datos demo)

### Comunicación
- **Agus** — Content & Design
- **Vicky** — Content & Design (Líder)
- **Delfi** — Content & Design
- **Fati** — Content & Design

### Marketing
- **Ale** — Estrategia general
- **Felo** — Líder de Campañas
- **Fran** — Operaciones, Webinars
- **Tomi** — Marketing digital
- **Boli** — Soporte y operaciones

**Login**: cualquier miembro → password compartida `marcomms2026` (se cambia en `.env.local` → `VITE_SHARED_PASSWORD`).

---

## 🗄️ Data layer (mock, lista para Supabase)

Toda la data inicial vive en `src/data/` y se consume vía servicios async en `src/services/` + hooks en `src/hooks/`. La UI no toca data directamente.

```
src/data/        — MOCK_USERS, MOCK_REQUESTS, MOCK_CAMPAIGNS, ... + seed.js
src/services/    — requestsService, tasksService, campaignsService, ...
src/hooks/       — useRequests, useTasks, useAuth, useFilters
```

**Estado actual de conexiones:**
| Servicio | Modo | Tabla |
|---|---|---|
| `requestsService` (Content Hub) | ✅ **Supabase** (CRUD + realtime) | `public.requests` |
| Resto (tasks, campaigns, webinars, events, ...) | 🚧 Mock (in-memory) | — |

El módulo de pedidos persiste todo en Supabase: al crear, editar o borrar un pedido, el cambio impacta la DB y se propaga a los demás navegadores via realtime (`postgres_changes` sobre `public.requests`).

Documentación detallada:
- [`DATA_AUDIT.md`](./DATA_AUDIT.md) — inventario completo (hardcodes, archivos, tablas futuras)
- [`SERVICE_LAYER.md`](./SERVICE_LAYER.md) — cómo usar los servicios y hooks

---

## ⚠️ Limitaciones actuales (modo demo)

- ❌ **No persiste data** — refresh = pierde todo lo editado
- ❌ **Sin auth real** — password compartida hardcoded
- ❌ **Reporte Mailchimp con IA** no funciona en producción (necesita edge function)
- ❌ **PDF generation** funciona ✅ (jsPDF nativo, sin html2canvas)
- ❌ **Sin tests** automatizados

Todo esto se resuelve cuando integremos Supabase. Ver [`BACKEND_PLAN.md`](./BACKEND_PLAN.md).

---

## 🐛 Troubleshooting

### `npm install` falla

Verificá tu versión de Node:
```bash
node --version  # debe ser 18 o superior
```

### El build falla

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Página en blanco después de deploy

Abrí F12 → Console del navegador. Si ves errores rojos, copialos y reportá el bug.

---

## 📞 Contacto

Proyecto interno de **Control Union LATAM** — Marketing & Comunicaciones.

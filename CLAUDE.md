# Instrucciones para Claude Code

Este archivo le indica a **Claude Code** cómo trabajar con este proyecto. Cuando uses Claude Code en este repo, lee este archivo primero.

---

## 🎯 ¿Qué es este proyecto?

**Marcomms Hub** — plataforma web interna para el equipo de Marketing & Comunicaciones de **Control Union LATAM**.

- ~8 usuarios internos + un link público de solo lectura por plan para clientes (sección Planes, oct 2026)
- Idioma: **100% Español argentino**
- Maneja: webinars, pilares (campañas), eventos, programas (campaña integral que agrupa pilares), Social Media (hoja de posteos de LinkedIn + calendario de días mundiales), reportes por país, Planes (tareas de cada plan en tiempo real + link externo por plan para el cliente, oct 2026), CRM HubSpot (facturación de licencias HubSpot por entidad, importada desde el Excel; reemplazó a la vieja sección CRM en oct 2026)
- Stack: **React 18 + Vite + Tailwind**
- Backend: **pendiente** (plan en `BACKEND_PLAN.md`)

---

## 📋 Convenciones del proyecto

### Lenguaje y tono
- **Toda la UI en español argentino** (no neutro, no español de España)
- Nombres de países en español ("Estados Unidos", no "USA"), también dentro de los UTMs (`estados_unidos`)
- Comentarios en español también
- Variables en inglés (`webinar`, `campaign`, no `seminario`, `campaña`)
- Strings de UI: usar "vos" (no "tú"), "cliquear", "tildar", "subir archivo", etc.

### Estructura de archivos
- **NUNCA** poner un componente de 500+ líneas en un solo archivo — separar en sub-componentes
- Componentes UI → `src/components/[modulo]/`
- Funciones puras (sin React) → `src/utils/`
- Hooks personalizados → `src/hooks/`
- Constantes (configs, mappings, defaults) → `src/constants/`
- Datos demo (mock data) → `src/data/`
- Lógica de auth / storage / PDF / Supabase → `src/services/`

### Naming
- Componentes: `PascalCase.jsx` (`WebinarApp.jsx`)
- Hooks: `useCamelCase.js` (`useLocalStorage.js`)
- Utils: `camelCase.js` (`progress.js`, `slugify.js`)
- Constantes module-level: `SCREAMING_SNAKE_CASE` (`TEAM_MEMBERS`, `MARKETS`)
- Estado React: `camelCase` (`globalWebinars`, `currentUser`)

### Imports
- Usar alias `@/` para imports relativos largos:
  ```js
  // ✅ Bueno
  import { TEAM_MEMBERS } from '@/constants/team';
  
  // ❌ Evitar
  import { TEAM_MEMBERS } from '../../../constants/team';
  ```
- Agrupar imports: React → libs externas → internas → estilos

### Tailwind
- Hay un **safelist en `tailwind.config.js`** para colores dinámicos como `bg-${color}-500`. Si agregás un color nuevo construido dinámicamente, **agregalo al safelist**.
- Fuentes: `font-sans` = DM Sans, `font-mono` = JetBrains Mono
- Para números/datos: usar `font-mono`

---

## 🔄 Sincronización entre módulos

Hay **sync bidireccional Webinar ↔ Campaign**:

- Al crear un webinar → se auto-crea una campaña (`variant: 'webinar'`) con 5 mailings
- Tildar un mail en el webinar → tilda el step correspondiente en la campaña
- Eliminar el webinar → elimina la campaña linkeada
- Eliminar la campaña linkeada → desvincula del webinar

**Mappings importantes**:
- `WEBINAR_MAIL_TO_STEP` y `STEP_TO_WEBINAR_MAIL` en `src/constants/webinar.js`

**Callbacks centralizados en `App.jsx`**:
- `onWebinarCreated`, `onWebinarMailToggled`, `onWebinarDeleted`
- `onCampaignWebinarStepToggled`, `onCampaignDeleted`

⚠️ **Cuidado**: si tocás esta lógica, testear que ambos lados queden consistentes.

---

## 🎨 Paleta de colores por módulo

| Módulo | Color principal | Tailwind class |
|---|---|---|
| Webinars | Índigo / Púrpura | `from-indigo-500 to-purple-500` |
| Pilares (ex Campañas) | Violeta / Rosa | `from-purple-600 to-pink-600` |
| Eventos | Naranja / Rojo | `from-orange-500 to-red-500` |
| Social Media (ex Content Hub) | Rosa / Rose | `from-pink-500 to-rose-500` |
| Facturación (oculta, ver `constants/sections.js`) | Esmeralda / Teal | `from-emerald-500 to-teal-500` |
| Portal Cliente (ex Países + Portal) | Cyan / Teal | `from-cyan-500 to-teal-500` |
| CRM HubSpot (facturación de licencias) | Sky / Azul | `from-sky-500 to-blue-600` |
| Planes (tareas de cada plan + pilares que cubre) | Esmeralda / Verde | `from-emerald-500 to-green-600` |
| Programas (campaña integral de pilares) | Violeta / Fucsia | `from-violet-600 to-fuchsia-600` |
| Mi Semana (oculta, ver `constants/sections.js`) | Naranja / Ámbar | `from-orange-500 to-amber-500` |

Mantené consistencia con esta paleta al agregar features.

---

## 🐛 TODOs pendientes / Issues conocidos

### 🔴 Alta prioridad

1. **Persistencia de datos** — ✅ Supabase + realtime para webinars, pilares, eventos, pedidos, tareas asignadas, casos de éxito, UTMs y equipo.
   - ⚠️ Todavía **solo en memoria** (se pierden al recargar): comentarios, archivos y aprobaciones de los **pedidos** de Social Media (`useRequests` overlay `content`) y los **ítems manuales de Facturación** (`manualItems` en `FacturacionApp`).
   - ⚠️ Estado "leída" de las notificaciones vive en `localStorage` (por navegador, no por usuario en la DB).
   - ⚠️ **Seguridad**: casi todas las tablas tienen la política RLS "anon temp full access" y el login es una contraseña compartida que queda dentro del bundle (`src/services/auth.js`). Con el link externo de Planes, quien lo reciba carga el código del Hub: con la clave pública podría leer y modificar cualquier tabla (incluidos los planes de la otra marca) y ver la contraseña compartida. El link en sí solo usa `get_public_plan`. Cerrarlo de verdad: pasar el login a Supabase Auth y reemplazar las políticas anon por políticas para `authenticated` (la función del link sigue andando porque es security definer). Hasta entonces, compartir links solo con contactos de confianza.
   - Migraciones: corridas en producción hasta la 0031 (tareas de planes, oct 2026: las 55 tareas del Excel se cargaron una sola vez con SQL; desde entonces se cargan y editan solo desde el Hub). La 0030 agregó el link externo de los planes, la 0031 lo quitó y borró el plan "Control Union Canada", y la 0032 lo vuelve a activar (se corre a mano; hasta que esté, el detalle de cada plan avisa que el link no está activado). La 0033 (Social Media: cuentas «TLR Peru» y «Bel», y mueve a TLR Peru los 2 posteos de TLR que estaban en Peru) se corre a mano. De la 0023 quedó sin aplicar solo el paso de realtime de `billing_plans`: un plan nuevo se ve en otros navegadores al recargar o al volver a la pestaña. Desde la 0021 se aplican con el conector de Supabase de Claude Code (quedan registradas en el historial de Supabase), salvo de la 0030 en adelante, que se corren a mano en el SQL Editor de Supabase; todas se guardan además en `supabase/migrations/`.

2. ~~**Reporte Mailchimp**~~ ✅ ELIMINADO del Hub (jul 2026)
   - La herramienta se movió al sitio de reportes de Anna (proyecto aparte)
   - Se borró `MailchimpReportTool.jsx`, el proxy `api/anthropic.js` y la dependencia `@anthropic-ai/sdk`
   - El import de CSV Mailchimp del **paso 12 de Campañas** (Reporte al Cliente) NO se tocó — sigue funcionando

### 🟡 Media prioridad

3. **Generador de Newsletter** — feature placeholder, esperar código del usuario para integrar.

4. **Sin tests automatizados** — agregar Vitest + Testing Library cuando estabilice.

5. **alert() nativos** — varios lugares usan `alert()` que es feo. Reemplazar con sistema de toasts.

### 🟢 Baja prioridad

6. **Mobile responsive** — la app está optimizada para desktop. Mobile funciona pero no es ideal.

7. ~~**Modo oscuro**~~ ✅ Implementado (sep 2026) vía `useTheme` + remapeo de utilidades en `src/index.css`. Default: claro para todos; oscuro solo si la persona lo activa (no sigue al sistema operativo). Si agregás un color claro nuevo (ej. `bg-lime-50`) y no se ve bien en oscuro, sumalo al remapeo.

8. **Multi-idioma** — solo español por ahora.

---

## ✅ Antes de hacer un commit

1. Validar que el build pasa: `npm run build`
2. Probar el flujo afectado en `npm run dev`
3. Si tocaste sync Webinar ↔ Campaign, probar ambos lados
4. Si agregaste un color dinámico, ¿está en el safelist de Tailwind?
5. Mensaje de commit en español: `"Arreglar PDF generación"`, `"Agregar campo cliente a webinar"`, etc.

---

## 🚫 NO hacer

- ❌ No commiteár `.env.local` (ya está en .gitignore)
- ❌ No exponer `ANTHROPIC_API_KEY` en código cliente
- ❌ No agregar dependencias sin justificación (mantener el bundle chico)
- ❌ No rediseñar UI sin pedirle al usuario primero
- ❌ No usar `dark:` en componentes: el modo oscuro se resuelve con el remapeo de `src/index.css` (ver `useTheme`)
- ❌ No recrear el Reporte Mailchimp en el Hub — esa herramienta vive en el sitio de reportes de Anna (proyecto aparte)
- ❌ No usar `localStorage` directamente sin un hook que lo wrappee (cuando exista). Única excepción: el script de `index.html` que aplica el modo oscuro antes de React (misma clave que `useTheme`)
- ❌ No mezclar Control Union y Peterson Solutions en piezas que ve el cliente (logos, colores, tono, taglines): usar `src/constants/brands.js`

---

## 💡 Tips para Claude Code

### Cuando te pidan agregar una feature

1. **Preguntá primero** si tiene sentido y dónde va (qué módulo, qué archivo)
2. **Pegada visual**: usá la paleta del módulo correspondiente
3. **Sync**: si afecta state global, asegurate de pasar callbacks por props
4. **Testear**: probar el flujo en `npm run dev` antes de declarar listo

### Cuando te pidan arreglar un bug

1. **Reproducir primero** (entender qué pasa exactamente)
2. **Buscar la causa raíz**, no parchar el síntoma
3. **Buscar otros lugares** que tengan el mismo bug (suele haber)

### Cuando te pidan refactorizar

1. **No romper APIs públicas** (props, contratos de funciones exportadas)
2. **Cambios pequeños** en cada commit
3. **Build pasa** después de cada cambio

---

## 📚 Archivos clave del proyecto

| Archivo | Para qué sirve |
|---|---|
| `src/App.jsx` | Routing por state, login gate, callbacks de sync |
| `src/constants/team.js` | Equipo (8 miembros), DESIGNERS, MARCOMMS, PEOPLE |
| `src/constants/markets.js` | 17 países, 7 unidades de negocio |
| `src/constants/webinar.js` | 21 tareas, mappings webinar↔campaign |
| `src/constants/events.js` | 5 fases de eventos |
| `src/constants/campaigns.js` | `PILLARS` (Webinars, Eventos, Email Mkt, Paid Media, Creación BBDD, Investigación): fuente única para las tabs de Pilares y el filtro del Portal Cliente. También fuentes/medios del UTM Generator |
| `src/constants/sections.js` | `HIDDEN_SECTIONS`: secciones ocultas temporalmente (hoy Mi Semana, Facturación, Casos de Éxito y Programas). `HIDDEN_PILLARS`: pilares ocultos (hoy Eventos) en Pilares, Programas y el filtro del Portal. Sacar el id de la lista para reactivarlos |
| `src/constants/markets.js` → `PORTAL_UNITS` | Portal Cliente: unidades activas (Control Union Certificaciones por país; Peterson Solutions Iberoamérica / Global / país) y sus alcances. UI en `src/components/client/PortalHome.jsx` + `ClientReportApp.jsx` |
| `src/hooks/useTheme.js` | Modo claro/oscuro. El tema oscuro remapea utilidades claras desde `src/index.css` (sección MODO OSCURO), no hace falta `dark:` en cada clase |
| `src/constants/socialPosts.js` | Hoja de posteos de LinkedIn: estados, planes, cuentas por defecto. Lógica de semanas y avisos en `src/utils/socialPosts.js`. UI en `src/components/social/PostsSheet.jsx` (las columnas se muestran como "Posteo 1..n", sin fechas; por debajo siguen siendo semanas lun–dom; el + de cada celda carga título + estado, la temática queda en el editor completo). El grupo «Bel» no es Control Union ni Peterson Solutions |
| `src/constants/worldDays.js` | Calendario de días mundiales + temáticas (Social Media). `WORLD_DAY_COUNTRIES`: países donde repercute más cada día (sin entrada = global, todas las cuentas). Lógica y cuentas sugeridas en `src/utils/worldDays.js` |
| `src/constants/programs.js` | Programas: pilares que se pueden generar y estados. Un programa agrupa webinar/evento/campañas por `programId` (migration 0021). Lógica en `src/utils/programs.js` (armado de pilares, progreso), datos en `src/hooks/usePrograms.js` + `src/services/programsService.js`, UI en `src/components/programs/`. La creación (programa + pilares) se orquesta en `App.jsx` → `createProgramWithPillars`. Desde oct 2026 la vista Programas está oculta (`HIDDEN_SECTIONS`): queda el botón «Nuevo programa» del header para crear varios pilares juntos (sin campo Cliente: el cliente se identifica por país + unidad) y al terminar se abre el primer pilar creado en Pilares. En Pilares, el botón de alta lleva el nombre de la pestaña («Nueva creación de BBDD»…) y arranca con ese tipo |
| `src/constants/hubspotBilling.js` | CRM HubSpot: réplica del Excel "Facturacion_HUBSPOT" (una columna por entidad; filas Entidad / Manager / Usuarios y "<Mes> - Precio" / "<Mes> - Detalle"; hoja Summary con las tarifas Sales Pro / Core). En los usuarios, "°" = Sales Pro y "-" = Core. Lectura y cálculos en `src/utils/hubspotBilling.js` (suma real por mes, precio esperado = licencias × tarifa, aviso cuando el TOTAL del Excel no suma todas las entidades). Datos en `src/hooks/useHubspotBilling.js` + `src/services/hubspotBillingService.js` (tablas `hubspot_billing_entities` y `hubspot_billing_imports` con la meta de la última importación, migration 0028, con realtime). UI en `src/components/hubspot/` (gráfico por mes a ancho completo y debajo «Para revisar en el Excel»). Las advertencias (aviso del TOTAL y cada ítem de «Para revisar») se pueden borrar con confirmación: los ids quedan en `meta.dismissedWarnings` de la última importación (las ve borradas todo el equipo; una importación nueva las vuelve a mostrar si siguen sin cuadrar). El Excel es la fuente de verdad: importar reemplaza las entidades |
| `src/constants/planTasks.js` | Planes (oct 2026): tareas de cada plan de `billing_plans`, con las columnas de la tabla «3) TAREAS» del Excel "Seguimiento Planes Marketing": Mes, Acción / Tarea, Responsable (todo el equipo, `useTeam`), Estado, Objetivo, Resultado, Detalle (ex "Comentario"), Link (opcional); sin Fecha ni Prioridad. Deadline existe en la tabla pero está oculto en todo el front (`SHOW_TASK_DEADLINE = false`). Las tareas se cargan y editan solo desde el Hub: el Excel se cargó una sola vez por SQL y no hay importación. La tabla interna abre en el mes actual con selector de mes y avisa si quedan tareas sin completar de meses anteriores; clic en una tarea abre siempre el editor. Lógica en `src/utils/planTasks.js` (meses, `monthHistory` para el link, avance como el Excel: canceladas no cuentan, filtros, links con texto + URL, pilares de cada plan). Datos en `src/hooks/usePlanTasks.js` + `src/services/planTasksService.js` (tabla `plan_tasks`, migration 0029, con realtime). UI en `src/components/plans/`. Muestra también los pilares que cubre cada plan (lo que antes era la pestaña "Por plan" del Portal; solo en la vista interna). **Vista externa** = link por plan `/?plan=<token>` (`PublicPlanPage` + `PlanExternalView`, sin login, solo lectura, sin Responsable ni Deadline, con la marca del plan según `src/constants/brands.js`; abre en el mes actual y recorre como histórico los meses con acciones; lee solo la función `get_public_plan`, migrations 0030/0032). En el Hub, "Vista externa" muestra ese link en un iframe (el alto se ajusta por postMessage). El viejo módulo "Planes de Marketing" se borró; sus tablas `marketing_plans` / `marketing_plan_imports` siguen en la base, igual que `crm_entities` / `crm_trainings` |
| `src/main.jsx` | Entrada: `/?plan=<token>` abre el link externo de un plan sin login ni el resto del Hub (carga diferida); cualquier otra URL abre el Hub (`App`) |
| `src/hooks/useBillingPlans.jsx` | Planes que cubren pilares (tabla `billing_plans`, migration 0023): "Control Union Argentina", etc. Los nombres usan el país como figura en el Hub, en español (`COUNTRY_ALIASES` en `constants/markets.js`: "USA" / "EE.UU." → "Estados Unidos"). Cada pilar tiene `billing` ('usd' \| 'plan') + `planId`. El selector es `src/components/shared/BudgetInput.jsx` (permite agregar planes), helpers en `src/utils/billing.js`. Los pilares de cada plan se ven en la sección Planes (`planPillarItems` en `src/utils/planTasks.js`). Lo cubierto por un plan no suma a inversión ni facturación |
| `src/hooks/useNotificationAlerts.js` | Capa de avisos: modal al loguearse, toasts, título de pestaña, Notification API. Helpers en `src/utils/notificationAlerts.js` |
| `src/data/demo*.js` | Data inicial (futuro: seed de Supabase) |
| `src/utils/pdf.js` | `generateProjectPDF` con jsPDF nativo |
| `src/services/auth.js` | Login compartido (futuro: Supabase Auth) |
| `BACKEND_PLAN.md` | Roadmap de migración a Supabase |

---

## 🆘 Si algo no anda

1. `rm -rf node_modules dist && npm install && npm run dev`
2. Si el problema persiste, revisar la **consola del browser** (F12)
3. Si es un build error, leer **completo** el mensaje de Vite (suele dar la respuesta)
4. Si nada funciona, preguntarle al usuario qué cambió antes del bug

---

**Última actualización**: Turno 1 de la migración a Vite completado.

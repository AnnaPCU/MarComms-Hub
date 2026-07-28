# Instrucciones para Claude Code

Este archivo le indica a **Claude Code** cómo trabajar con este proyecto. Cuando uses Claude Code en este repo, lee este archivo primero.

---

## 🎯 ¿Qué es este proyecto?

**Marcomms Hub** — plataforma web interna para el equipo de Marketing & Comunicaciones de **Control Union LATAM**.

- ~8 usuarios internos (no exposición pública)
- Idioma: **100% Español argentino**
- Maneja: webinars, campañas, eventos, pedidos de contenido, facturación, reportes por país
- Stack: **React 18 + Vite + Tailwind**
- Backend: **pendiente** (plan en `BACKEND_PLAN.md`)

---

## 📋 Convenciones del proyecto

### Lenguaje y tono
- **Toda la UI en español argentino** (no neutro, no español de España)
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
| Campañas | Violeta / Rosa | `from-purple-600 to-pink-600` |
| Eventos | Naranja / Rojo | `from-orange-500 to-red-500` |
| Content Hub | Rosa / Rose | `from-pink-500 to-rose-500` |
| Facturación | Esmeralda / Teal | `from-emerald-500 to-teal-500` |
| Países | Cyan / Teal | `from-cyan-500 to-teal-500` |
| Mi Semana | Naranja / Ámbar | `from-orange-500 to-amber-500` |

Mantené consistencia con esta paleta al agregar features.

---

## 🐛 TODOs pendientes / Issues conocidos

### 🔴 Alta prioridad

1. **Persistencia de datos** — actualmente todo está en memoria, refresh = pierde todo.
   - **Solución**: integrar Supabase según `BACKEND_PLAN.md`
   - **Workaround temporal**: `useLocalStorage` hook (no implementado, esperar Supabase)

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

7. **Modo oscuro** — no implementado.

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
- ❌ No recrear el Reporte Mailchimp en el Hub — esa herramienta vive en el sitio de reportes de Anna (proyecto aparte)
- ❌ No usar `localStorage` directamente sin un hook que lo wrappee (cuando exista)

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

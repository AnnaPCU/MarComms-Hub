# Marcomms Hub

Contexto del proyecto para retomarlo en Claude Code. Reconstruido desde el export
de la cuenta anterior de Claude (chat "Marcomms Hub app code", 09/04/2026, 16 mensajes).

## Qué es

App interna del equipo de marcomms de Peterson Control Union World Group para
**planificar y trackear webinars**. Tiene dos caras:

1. **Panel interno** — vista tipo planilla, un webinar por fila, columnas agrupadas
   por fase del proceso. El equipo tilda avances y carga fechas.
2. **Portal de cliente** — el cliente entra al mismo link, elige su proyecto de una
   lista, mete un PIN y ve el estado de su webinar: anillo de progreso, asistentes
   confirmados y el detalle de cada hito.

## Estado actual

| Archivo | Qué es | Estado |
|---|---|---|
| `src/marcomms-hub.jsx` | Versión artifact de Claude. Persiste con `window.storage` en modo `shared: true`. | Funcional dentro de Claude |
| `src/marcomms-hub.html` | Standalone. React + Babel por CDN, sin build step. Sync por JSONBin, fallback a `localStorage`. | Funcional, **sin credenciales cargadas** |
| `reference/original-firebase-v0.jsx` | Código de partida (Firebase/Firestore). Ya no se usa. | Histórico |
| `reference/historial-conversacion.md` | Transcript del chat original. | Referencia |

**Lo último que quedó pendiente:** el HTML no tiene las credenciales de JSONBin
cargadas. Sin eso corre en modo local y cada persona ve sus propios datos. El plan
era completar `CFG.JSONBIN_KEY` y `CFG.JSONBIN_BIN_ID` y subir el archivo a Netlify
Drop para tener un link compartible. **No hay evidencia en el export de que eso se
haya hecho** — si ya lo desplegaste después, ese dato no está acá.

## Modelo de datos

Un webinar es un objeto plano. Cada hito es un sub-objeto con `done`, `owner` y a
veces `date` / `text`.

```js
{
  id, name, mainDate, client,
  clientPassword,            // 6 chars, autogenerado, es el PIN del cliente
  asistentes,                // número, carga manual
  updatedAt,                 // ISO, se estampa en CADA cambio de cualquier campo
  teamsGroup, presentacion, onePager, testDay, bbdd,
  lknAnuncio, lknReminder,
  mailPre1, mailPre2, mailPre3,
  mailPost, hubspot, reporte
}
```

## Regla de negocio central: cálculo automático de fechas

Al cargar `mainDate` (la fecha del webinar), se derivan sola todas las demás.
Esto es el corazón de la app:

| Hito | Offset |
|---|---|
| Mailing 1 (`mailPre1`) | T-15 |
| Test Day (`testDay`) | T-10 |
| Mailing 2 (`mailPre2`) | T-8 |
| Mailing 3 (`mailPre3`) | T-1 |
| LKN Reminder (`lknReminder`) | T-1 |
| Mailing Post (`mailPost`) | T+1 |
| Carga HubSpot (`hubspot`) | T+3 |
| Reporte Final (`reporte`) | T+7 |

`lknAnuncio` tiene fecha pero **no** se autocalcula — se carga a mano.

El progreso es el % de 13 hitos con `done: true`. `asistentes` y `clientPassword`
no cuentan para el progreso.

## Fases y responsables por defecto

| Fase | Columnas | Owner default |
|---|---|---|
| **Setup Estratégico** | Grupo Teams | FRAN |
| | Presentación | AGUS |
| | OnePager | AGUS |
| | Test Day | FRAN |
| | BBDD (dropdown: Propia / Externa) | FELO |
| **Plan de Difusión** | LKN Anuncio | FATI |
| | LKN Reminder | FATI |
| **Canal Email** | Mailing 1, 2 y 3 | FRAN |
| **Resultados & Post** | Mailing Post | FRAN |
| | Carga HubSpot | TINO |
| | Reporte Final | FRAN |

La columna **Asistentes** va primero, antes de Setup Estratégico, y muestra debajo
la fecha del último cambio.

## Accesos

- PIN del equipo interno: `MARCOMMS2025` (constante `TEAM_PIN`, hardcodeada)
- PIN de cliente: se autogenera por webinar, 6 caracteres alfanuméricos en mayúscula

## Decisiones ya tomadas — no volver sobre ellas

**Firebase se descartó.** El código original usaba Firestore con `__firebase_config`
y `__initial_auth_token`. No servía fuera del entorno donde nació.

**El link con query params no funciona.** Se intentó compartir el portal con
`?webinarId=...`. Los artifacts corren en iframe y no reciben query params. La
solución fue el selector: el portal lista los nombres de los webinars disponibles,
el cliente elige el suyo y recién ahí pide el PIN. Si en Claude Code lo pasás a una
app con routing real, esta restricción ya no aplica y se puede volver a deep links.

**Storage compartido, no por usuario.** En la versión artifact todo va a
`window.storage` con `shared: true` bajo la clave `marcomms-webinars-v2`, con polling
para que el cliente vea los cambios del equipo. En el HTML el equivalente es JSONBin.

## Cosas a decidir si seguís el proyecto

**Marca.** La UI usa azul genérico (`#3b82f6`) sobre slate oscuro (`#0f172a`). No es
la paleta de ninguna de las dos marcas del grupo. Como el portal lo ven **clientes**,
esto no es un detalle menor: habría que definir si el Hub va bajo Control Union
(cyan `#3eb2ed`), bajo Peterson Solutions (aqua `#44cbce` / amarillo `#f1e747`), o si
queda como herramienta interna neutra sin marca. **No asumir** — preguntar antes de
retocar colores o copy.

**Seguridad.** El PIN del equipo está hardcodeado en el cliente y los datos van a un
bin público de JSONBin sin auth por usuario. Aceptable para trackear estados de
webinar; no lo es si en algún momento entran datos de contactos o bases.

**Migración a proyecto real.** Hoy es un archivo suelto. Pasarlo a Vite + React con
componentes separados y un backend propio es la evolución natural — el JSX de 585
líneas tiene todos los componentes en un solo archivo con estilos inline.

## Nota sobre cómo se reconstruyó esto

El export de Claude guarda el texto de los mensajes pero **no** el contenido de los
artifacts. Los archivos de `src/` se reconstruyeron replayando las operaciones de
herramienta del chat original (un `create_file` y las ediciones posteriores) en
orden. El replay dio los mismos marcadores de salida que la sesión original
(mismo conteo de `AsistentesCol`, mismas 705 líneas de HTML), así que el resultado
coincide con lo que había al cerrar la conversación.

Lo que **no** está cubierto: cualquier cambio hecho después del 09/04/2026 por fuera
de ese chat.

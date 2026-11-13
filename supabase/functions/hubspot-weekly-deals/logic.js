// ════════════════════════════════════════════════════════════════════
// hubspot-weekly-deals · lógica pura (sin Deno, sin red, sin Supabase)
// ════════════════════════════════════════════════════════════════════
// La usan la Edge Function (index.ts) y el Hub (src/utils/crmWeeklyDeals.js),
// y se testea con Vitest (src/utils/crmWeeklyDeals.test.js).
//
// Semana = lunes 00:00 a domingo 23:59 en hora de Argentina (UTC−3 todo el
// año, sin horario de verano). `createdate` de HubSpot está en UTC.
//
// Deal → entidad: por el código al principio del LABEL de la opción de
// «PCU Entity» (ej. «538 - Control Union Argentina SA (Certifications)»).
// El valor interno de la opción no sirve (ej. «CU Cert. Argentina»).
// Todas las opciones con el mismo código suman a la misma entidad.
// ════════════════════════════════════════════════════════════════════

export const AR_OFFSET_HOURS = 3; // Argentina = UTC−3
export const WEEKS_TO_LOAD = 8;
export const PCU_ENTITY_LABEL = 'PCU Entity';
export const SOURCE_PROPERTY = 'hs_object_source_label';
export const SOURCE_UI = 'CRM_UI';        // «CRM UI»: lo cargó una persona a mano
export const SOURCE_IMPORT = 'IMPORT';    // no se cuenta
export const MANUAL_COOLDOWN_MINUTES = 10;
export const FAILED_COOLDOWN_MINUTES = 1; // si la última corrida falló, se puede reintentar al minuto

const DAY_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const isoOfUtc = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

// Lunes (YYYY-MM-DD) de la semana de Argentina que contiene ese instante
export const weekStartAr = (date = new Date()) => {
  const local = new Date(new Date(date).getTime() - AR_OFFSET_HOURS * 3600000); // reloj de Argentina en campos UTC
  const dow = (local.getUTCDay() + 6) % 7; // 0 = lunes
  return isoOfUtc(new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow)));
};

// Semana → rango en milisegundos UTC [start, end)
export const weekRangeMs = (weekStart) => {
  const [y, m, d] = weekStart.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d, AR_OFFSET_HOURS);
  return { start, end: start + 7 * DAY_MS };
};

export const addWeeks = (weekStart, n) => isoOfUtc(new Date(weekRangeMs(weekStart).start - AR_OFFSET_HOURS * 3600000 + n * 7 * DAY_MS));

// Las últimas `count` semanas, de la más vieja a la actual
export const lastWeeks = (count = WEEKS_TO_LOAD, now = new Date()) => {
  const current = weekStartAr(now);
  return Array.from({ length: count }, (_, i) => addWeeks(current, i - (count - 1)));
};

// «538 - Control Union …» → '538'; «573U - Control Union Uruguay» → '573U';
// «PS China» → null
export const codeFromLabel = (label) => {
  const m = String(label || '').match(/^\s*(\d+[A-Za-z]?)\s*-/);
  return m ? m[1].toUpperCase() : null;
};
export const normCode = (code) => String(code || '').trim().toUpperCase();

// Propiedad «PCU Entity» de la lista de propiedades de deals de HubSpot:
// → { name, valueToCode: { [valor interno]: código }, codes: Set de códigos }
export const pcuEntityProperty = (properties = []) => {
  const prop = properties.find((p) => String(p?.label || '').trim().toLowerCase() === PCU_ENTITY_LABEL.toLowerCase());
  if (!prop) return null;
  const valueToCode = {};
  const codes = new Set();
  (prop.options || []).forEach((o) => {
    const code = codeFromLabel(o.label);
    if (code) { valueToCode[o.value] = code; codes.add(code); }
  });
  return { name: prop.name, valueToCode, codes };
};

// Cuenta los deals de una semana por código de entidad.
// deals: [{ pcu: valor interno de PCU Entity, source: hs_object_source_label }]
// entityCodes: códigos de crm_weekly_entities
// → { byCode: { [code]: { ui, other } }, unassigned, outside }
//   unassigned = deals SIN «PCU Entity» (lo que hay que completar en HubSpot)
//   outside    = deals de entidades que no están en el Hub (el portal de
//                HubSpot es global: Malasia, Reino Unido…), no es un problema
export const countWeek = (deals = [], valueToCode = {}, entityCodes = []) => {
  const known = new Set(entityCodes.map(normCode));
  const byCode = {};
  let unassigned = 0;
  let outside = 0;
  deals.forEach((d) => {
    if (d.source === SOURCE_IMPORT) return;
    if (!d.pcu) { unassigned += 1; return; }
    const code = valueToCode[d.pcu];
    if (!code || !known.has(code)) { outside += 1; return; }
    const c = (byCode[code] = byCode[code] || { ui: 0, other: 0 });
    if (d.source === SOURCE_UI) c.ui += 1; else c.other += 1;
  });
  return { byCode, unassigned, outside };
};

// Filas para crm_weekly_deal_counts de una semana: una por entidad del Hub.
// Las entidades sin opción en PCU Entity van con null (no con 0).
export const weekRows = (entities = [], pcuCodes = new Set(), counted = { byCode: {} }, weekStart, computedAt) => entities.map((e) => {
  const code = normCode(e.code);
  const mapped = pcuCodes.has(code);
  const c = counted.byCode[code] || { ui: 0, other: 0 };
  return {
    entity_code: e.code,
    week_start: weekStart,
    deals_ui: mapped ? c.ui : null,
    deals_other: mapped ? c.other : null,
    computed_at: computedAt,
  };
});

// ¿Se puede correr a mano? (freno para el botón «Actualizar»)
export const cooldownLeft = (lastRunAt, now = new Date(), minutes = MANUAL_COOLDOWN_MINUTES) => {
  if (!lastRunAt) return 0;
  const left = new Date(lastRunAt).getTime() + minutes * 60000 - new Date(now).getTime();
  return left > 0 ? Math.ceil(left / 60000) : 0;
};

// Minutos de freno según cómo salió la última corrida
export const cooldownFor = (sync, now = new Date()) => cooldownLeft(sync?.last_run_at, now, sync?.ok === false ? FAILED_COOLDOWN_MINUTES : MANUAL_COOLDOWN_MINUTES);

// Forma de la clave, para diagnosticar un 401 sin mostrarla nunca:
// largo (ya limpia), si empieza con «pat-» y si traía espacios o saltos
// de línea (que se sacan).
export const tokenShape = (raw) => {
  const text = String(raw || '');
  const clean = text.trim();
  return { clean, length: clean.length, pat: /^pat-/i.test(clean), hadSpaces: clean !== text || /\s/.test(clean) };
};

// Borra de un texto cualquier cosa que parezca una clave (por si HubSpot
// la repite en un mensaje de error)
export const redactSecrets = (text) => String(text || '')
  .replace(/pat-[a-z0-9-]+/gi, 'pat-***')
  .replace(/[A-Za-z0-9_-]{32,}/g, '***');

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

// ── Meses (nov 2026, migration 0078): deals por mes desde enero ──
// Mes = del 1 a las 00:00 al último día a las 23:59, hora de Argentina.
// Primer día (YYYY-MM-01) del mes de Argentina que contiene ese instante
export const monthStartAr = (date = new Date()) => {
  const local = new Date(new Date(date).getTime() - AR_OFFSET_HOURS * 3600000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-01`;
};

// Mes → rango en milisegundos UTC [start, end)
export const monthRangeMs = (monthStart) => {
  const [y, m] = monthStart.split('-').map(Number);
  return { start: Date.UTC(y, m - 1, 1, AR_OFFSET_HOURS), end: Date.UTC(y, m, 1, AR_OFFSET_HOURS) };
};

// Los meses desde enero del año en curso hasta el actual (incluido)
export const monthsSinceJanuary = (now = new Date()) => {
  const [y, m] = monthStartAr(now).split('-').map(Number);
  return Array.from({ length: m }, (_, i) => `${y}-${pad(i + 1)}-01`);
};

// Filas de weekRows → filas de crm_weekly_deal_months (month_start en vez de week_start)
export const toMonthRows = (rows = []) => rows.map(({ week_start: monthStart, ...r }) => ({ ...r, month_start: monthStart }));

// «538 - Control Union …» → '538'; «573U - Control Union Uruguay» → '573U';
// «PS China» → null
export const codeFromLabel = (label) => {
  const m = String(label || '').match(/^\s*(\d+[A-Za-z]?)\s*-/);
  return m ? m[1].toUpperCase() : null;
};
export const normCode = (code) => String(code || '').trim().toUpperCase();

// Propiedad «PCU Entity» de la lista de propiedades de deals de HubSpot:
// → { name, valueToCode: { [valor interno]: código }, valueToLabel,
//     codes: Set de códigos, optionsByCode: { [código]: [labels] } }
export const pcuEntityProperty = (properties = []) => {
  const prop = properties.find((p) => String(p?.label || '').trim().toLowerCase() === PCU_ENTITY_LABEL.toLowerCase());
  if (!prop) return null;
  const valueToCode = {};
  const valueToLabel = {};
  const codes = new Set();
  const optionsByCode = {};
  (prop.options || []).forEach((o) => {
    const code = codeFromLabel(o.label);
    if (!code) return;
    valueToCode[o.value] = code;
    valueToLabel[o.value] = String(o.label).trim();
    codes.add(code);
    (optionsByCode[code] = optionsByCode[code] || []).push(String(o.label).trim());
  });
  return { name: prop.name, valueToCode, valueToLabel, codes, optionsByCode };
};

// Cuenta los deals de una semana por código de entidad.
// deals: [{ pcu: valor interno de PCU Entity, source: hs_object_source_label }]
// entityCodes: códigos de crm_weekly_entities
// valueToLabel (opcional): para separar por opción de PCU Entity
// → { byCode: { [code]: { ui, other } }, byOption: { [code]: { [label]: { ui, other } } },
//     unassigned, outside }
//   unassigned = deals SIN «PCU Entity» (lo que hay que completar en HubSpot)
//   outside    = deals de entidades que no están en el Hub (el portal de
//                HubSpot es global: Malasia, Reino Unido…), no es un problema
export const countWeek = (deals = [], valueToCode = {}, entityCodes = [], valueToLabel = {}) => {
  const known = new Set(entityCodes.map(normCode));
  const byCode = {};
  const byOption = {};
  let unassigned = 0;
  let outside = 0;
  deals.forEach((d) => {
    if (d.source === SOURCE_IMPORT) return;
    if (!d.pcu) { unassigned += 1; return; }
    const code = valueToCode[d.pcu];
    if (!code || !known.has(code)) { outside += 1; return; }
    const c = (byCode[code] = byCode[code] || { ui: 0, other: 0 });
    const label = valueToLabel[d.pcu] || d.pcu;
    const o = ((byOption[code] = byOption[code] || {})[label] = byOption[code][label] || { ui: 0, other: 0 });
    if (d.source === SOURCE_UI) { c.ui += 1; o.ui += 1; } else { c.other += 1; o.other += 1; }
  });
  return { byCode, byOption, unassigned, outside };
};

// Filas para crm_weekly_deal_counts de una semana: una por entidad del Hub.
// Las entidades sin opción en PCU Entity van con null (no con 0).
// by_option (0074): el detalle por opción de PCU Entity, con todas las
// opciones del código (las que no tuvieron deals, en 0).
export const weekRows = (entities = [], pcuCodes = new Set(), counted = { byCode: {} }, weekStart, computedAt, optionsByCode = {}) => entities.map((e) => {
  const code = normCode(e.code);
  const mapped = pcuCodes.has(code);
  const c = counted.byCode[code] || { ui: 0, other: 0 };
  const byOption = {};
  if (mapped) {
    (optionsByCode[code] || []).forEach((label) => { byOption[label] = { ui: 0, other: 0 }; });
    Object.entries((counted.byOption || {})[code] || {}).forEach(([label, v]) => { byOption[label] = { ...v }; });
  }
  return {
    entity_code: e.code,
    week_start: weekStart,
    deals_ui: mapped ? c.ui : null,
    deals_other: mapped ? c.other : null,
    by_option: byOption,
    computed_at: computedAt,
  };
});

// «538 - Control Union Argentina SA (Certifications)» → «Certifications»;
// sin paréntesis, el label sin el código
export const optionShortLabel = (label) => {
  const text = String(label || '').trim();
  const paren = text.match(/\(([^()]+)\)\s*$/);
  if (paren) return paren[1].trim();
  const dash = text.match(/-\s*(Certifications?|Inspections?|Academy|Laboratory|Solutions)\s*$/i);
  if (dash) return dash[1];
  return text.replace(/^\s*\d+[A-Za-z]?\s*-\s*/, '');
};

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

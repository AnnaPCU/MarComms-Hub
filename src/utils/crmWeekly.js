// ════════════════════════════════════════════════════════════════════
// crmWeekly — «Weekly check» de CRM HubSpot (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   daysUntil, deadlineTone, formatShortDate, parseDmy, maskDmy,
//   checksByEntity, entitySummary, weeklyTotals, newCheckItemId,
//   trafficLight, sortEntities, filterEntities, entityTags, cleanTags,
//   entityProblem, entityActivities, activityGroups, countryOptions
//
// Los ítems del checklist vienen de la base (crm_check_items, migration
// 0044); CRM_CHECK_ITEMS es el respaldo si la tabla no está.
//
// Deadline de cada ítem del checklist: cuanto más cerca está, más rojo
// (verde con DEADLINE_CALM_DAYS o más por delante → amarillo → naranja →
// rojo con DEADLINE_RED_DAYS días o menos y después del vencimiento).
// Tildado, deja de llamar la atención. Cuando se pone en rojo, avisa a
// CRM_WEEKLY_NOTIFY_USER (redDeadlines → utils/notifications).
// ════════════════════════════════════════════════════════════════════

import { AMERICA_COUNTRIES, CRM_CHECK_ITEMS, CRM_ENTITIES, CRM_PRIORITIES, DEADLINE_CALM_DAYS, DEADLINE_RED_DAYS, TRAFFIC_LIGHTS, TRAFFIC_YELLOW_PCT } from '@/constants/crmWeekly';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const utcDay = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

// Días de hoy al deadline ('YYYY-MM-DD'): 0 = hoy, negativo = vencido
export const daysUntil = (deadline, todayIso) => {
  if (!DATE_RE.test(deadline || '') || !DATE_RE.test((todayIso || '').slice(0, 10))) return null;
  return Math.round((utcDay(deadline) - utcDay(todayIso.slice(0, 10))) / 86400000);
};

// '2026-11-05' → '05/11/2026' (las fechas en español viven en utils/date)
export { formatDmy as formatShortDate, parseDmy, maskDmy } from '@/utils/date';

// Id de un ítem nuevo del checklist (lo que se guarda en item_id)
export const newCheckItemId = () => `item-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Cómo se ve el deadline de un ítem. null = sin fecha.
// { tone: 'done' | 'open', days, label, hue, text, bg, border }
//   done: tildado → sin color (text/bg/border en null).
//   open: hue de 140 (verde) a 0 (rojo) según los días que faltan.
export const deadlineTone = (deadline, done, todayIso, dark = false) => {
  const days = daysUntil(deadline, todayIso);
  if (days === null) return null;
  if (done) return { tone: 'done', days, label: 'Cumplido', hue: null, text: null, bg: null, border: null };
  const span = DEADLINE_CALM_DAYS - DEADLINE_RED_DAYS;
  const hue = Math.round(140 * Math.min(Math.max(days - DEADLINE_RED_DAYS, 0), span) / span);
  const overdue = days < 0;
  const label = overdue ? (days === -1 ? 'Venció ayer' : `Venció hace ${plural(-days, 'día', 'días')}`)
    : days === 0 ? 'Vence hoy' : days === 1 ? 'Vence mañana' : `Vence en ${plural(days, 'día', 'días')}`;
  return {
    tone: 'open',
    days,
    label,
    hue,
    text: `hsl(${hue}, 70%, ${dark ? 66 : 34}%)`,
    bg: `hsla(${hue}, 85%, 50%, ${overdue ? (dark ? 0.28 : 0.2) : dark ? 0.16 : 0.1})`,
    border: `hsla(${hue}, 75%, ${dark ? 55 : 45}%, ${overdue ? 0.85 : 0.5})`,
  };
};

// [{ entityCode, itemId, done, deadline, ... }] → { [code]: { [itemId]: row } }
export const checksByEntity = (rows = []) => {
  const map = {};
  rows.forEach((r) => {
    if (!r || !r.entityCode || !r.itemId) return;
    (map[r.entityCode] = map[r.entityCode] || {})[r.itemId] = r;
  });
  return map;
};

// Resumen de una entidad: cumplidos, vencidos y los que vencen en 7 días
// o menos (sin tildar). items: los ítems del checklist.
export const entitySummary = (entityChecks = {}, todayIso, items = CRM_CHECK_ITEMS) => {
  let done = 0; let overdue = 0; let soon = 0;
  items.forEach((it) => {
    const c = entityChecks?.[it.id];
    if (c?.done) { done += 1; return; }
    const d = daysUntil(c?.deadline, todayIso);
    if (d === null) return;
    if (d < 0) overdue += 1;
    else if (d <= 7) soon += 1;
  });
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0, overdue, soon };
};

// Totales de las entidades que se ven (filtro de marca)
export const weeklyTotals = (entities = [], map = {}, todayIso, items = CRM_CHECK_ITEMS) => entities.reduce((acc, e) => {
  const s = entitySummary(map[e.code], todayIso, items);
  acc.done += s.done; acc.total += s.total; acc.overdue += s.overdue; acc.soon += s.soon;
  if (s.total && s.done === s.total) acc.complete += 1;
  return acc;
}, { done: 0, total: 0, overdue: 0, soon: 0, complete: 0 });

// Deadlines en rojo (sin tildar, con DEADLINE_RED_DAYS días o menos o
// vencidos), de las entidades e ítems que existen:
// [{ entity, item, deadline, days }], los más urgentes primero.
export const redDeadlines = (checks = [], items = CRM_CHECK_ITEMS, todayIso, entities = CRM_ENTITIES) => {
  const itemById = Object.fromEntries(items.map((it) => [it.id, it]));
  const entityByCode = Object.fromEntries(entities.map((e) => [e.code, e]));
  return checks
    .map((c) => ({ c, entity: entityByCode[c.entityCode], item: itemById[c.itemId], days: daysUntil(c.deadline, todayIso) }))
    .filter(({ c, entity, item, days }) => entity && item && !c.done && days !== null && days <= DEADLINE_RED_DAYS)
    .map(({ c, entity, item, days }) => ({ entity, item, deadline: c.deadline, days }))
    .sort((a, b) => a.days - b.days || a.entity.code.localeCompare(b.entity.code));
};

// ── Semáforo del avance (nov 2026) ──
// summary = entitySummary(...). 100 % → verde; TRAFFIC_YELLOW_PCT % o más →
// amarillo; menos → rojo. Sin ítems en el checklist: null.
export const trafficLight = (summary) => {
  if (!summary || !summary.total) return null;
  if (summary.done >= summary.total) return TRAFFIC_LIGHTS.green;
  const pct = (summary.done / summary.total) * 100; // sin redondear: 49,6 % sigue en rojo
  return pct >= TRAFFIC_YELLOW_PCT ? TRAFFIC_LIGHTS.yellow : TRAFFIC_LIGHTS.red;
};

const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const PRIORITY_RANK = Object.fromEntries(CRM_PRIORITIES.map((p) => [p.id, p.rank]));
const priorityRank = (e) => PRIORITY_RANK[e?.priority] ?? CRM_PRIORITIES.length;
const exactPct = (s) => (s && s.total ? s.done / s.total : 0);

// Ordena las entidades. summaries: { [code]: entitySummary }.
//   manual: como están (position); redFirst / greenFirst: por color del
//   semáforo y, dentro del color, por avance; priority: alta → baja (sin
//   importancia al final); country: país A–Z.
// Desempate: position y código.
export const sortEntities = (entities = [], sort = 'manual', summaries = {}) => {
  const base = (a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.code).localeCompare(String(b.code));
  const light = (e) => trafficLight(summaries[e.code])?.rank ?? -1;
  const cmp = {
    manual: base,
    redFirst: (a, b) => light(a) - light(b) || exactPct(summaries[a.code]) - exactPct(summaries[b.code]) || priorityRank(a) - priorityRank(b) || base(a, b),
    greenFirst: (a, b) => light(b) - light(a) || exactPct(summaries[b.code]) - exactPct(summaries[a.code]) || priorityRank(a) - priorityRank(b) || base(a, b),
    priority: (a, b) => priorityRank(a) - priorityRank(b) || light(a) - light(b) || base(a, b),
    country: (a, b) => norm(a.country).localeCompare(norm(b.country)) || base(a, b),
  }[sort] || base;
  return [...entities].sort(cmp);
};

// Filtros: marca, color del semáforo, importancia y tag (vacío = todos)
export const filterEntities = (entities = [], { brand = '', light = '', priority = '', tag = '' } = {}, summaries = {}) => entities.filter((e) => (
  (!brand || e.brand === brand)
  && (!light || trafficLight(summaries[e.code])?.id === light)
  && (!priority || (priority === 'none' ? !e.priority : e.priority === priority))
  && (!tag || (e.tags || []).some((t) => norm(t) === norm(tag)))
));

// Tags: sin repetidos (sin distinguir acentos ni mayúsculas), sin vacíos
export const cleanTags = (tags = []) => {
  const seen = new Map();
  tags.forEach((t) => { const v = String(t || '').trim().replace(/\s+/g, ' '); if (v && !seen.has(norm(v))) seen.set(norm(v), v); });
  return [...seen.values()];
};
// Todos los tags que se usan (para sugerir y filtrar), A–Z
export const entityTags = (entities = []) => cleanTags(entities.flatMap((e) => e.tags || [])).sort((a, b) => norm(a).localeCompare(norm(b)));

// Valida el alta / edición de una entidad. null = está bien; si no, el
// texto del problema. isNew: el código no se puede repetir.
export const entityProblem = ({ code, name }, entities = [], isNew = true) => {
  const c = String(code || '').trim();
  if (!c) return 'Falta el código de HubSpot.';
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(c)) return 'El código solo puede tener letras, números, - o _ (sin espacios).';
  if (!String(name || '').trim()) return 'Falta el nombre de la entidad.';
  if (isNew && entities.some((e) => norm(e.code) === norm(c))) return `Ya hay una entidad con el código ${c}.`;
  return null;
};

// ── Próximas actividades (nov 2026) ──
// De una entidad: los ítems del checklist sin tildar que tienen deadline y
// los próximos steps sin completar (con fecha o sin fecha).
// maxDays: solo las que vencen en esos días o antes (las vencidas siempre
// entran); null = todas. Las sin fecha solo entran con null, pero se
// cuentan en `undated`.
// → { items: [{ kind: 'check' | 'step', id, title, detail, category, date, days, source }], undated, overdue }
//   ordenadas: vencidas y más cercanas primero, sin fecha al final.
export const entityActivities = (entity, { checks = {}, steps = [], items = CRM_CHECK_ITEMS, todayIso, maxDays = null } = {}) => {
  const out = [];
  items.forEach((it) => {
    const c = checks?.[it.id];
    if (!c || c.done || !c.deadline) return;
    out.push({ kind: 'check', id: `check:${it.id}`, title: it.label, detail: it.hint || '', category: 'Checklist', date: c.deadline, days: daysUntil(c.deadline, todayIso), source: it, pos: it.position ?? 0 });
  });
  steps.filter((s) => s.entityCode === entity?.code && !s.done).forEach((s) => {
    out.push({ kind: 'step', id: `step:${s.id}`, title: s.title, detail: s.detail || '', category: s.category || 'Próximo step', date: s.dueDate || '', days: daysUntil(s.dueDate, todayIso), source: s, pos: 1000 + (s.position ?? 0) });
  });
  const undated = out.filter((a) => a.days === null).length;
  const kept = out.filter((a) => (maxDays === null ? true : a.days !== null && a.days <= maxDays));
  kept.sort((a, b) => (a.days === null) - (b.days === null) || (a.days ?? 0) - (b.days ?? 0) || a.pos - b.pos);
  return { items: kept, undated: maxDays === null ? 0 : undated, overdue: kept.filter((a) => a.days !== null && a.days < 0).length };
};

// Agrupa las entidades para la vista de actividades: por entidad (una por
// grupo) o por país (las entidades del mismo país juntas). Mantiene el
// orden de `entities` (el primero de cada país marca su lugar).
// → [{ key, label, entities: [...] }]
export const activityGroups = (entities = [], by = 'entity') => {
  if (by !== 'country') return entities.map((e) => ({ key: e.code, label: e.name, entities: [e] }));
  const groups = new Map();
  entities.forEach((e) => {
    const label = String(e.country || '').trim() || 'Sin país';
    const key = norm(label);
    if (!groups.has(key)) groups.set(key, { key, label, entities: [] });
    groups.get(key).entities.push(e);
  });
  return [...groups.values()];
};

// Países para el campo País de una entidad: los 35 de América más los que
// ya usan las entidades (ej. España, Alemania), sin repetir (sin distinguir
// acentos ni mayúsculas) y en orden alfabético.
export const countryOptions = (entities = []) => {
  const seen = new Map();
  [...AMERICA_COUNTRIES, ...entities.map((e) => e.country)].forEach((c) => {
    const v = String(c || '').trim();
    if (v && !seen.has(norm(v))) seen.set(norm(v), v);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

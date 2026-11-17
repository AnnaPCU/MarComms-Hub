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
// Alcance de cada ítem (migration 0075, nov 2026): targetCodes /
// targetRegions (vacíos = todas las entidades; si no, las de esos códigos
// O de esas regiones) y excludedCodes (entidades donde se quitó). Ver
// itemAppliesTo / itemsFor / itemScopeLabel / itemTargets.
//
// Deadline de cada ítem del checklist: cuanto más cerca está, más rojo
// (verde con DEADLINE_CALM_DAYS o más por delante → amarillo → naranja →
// rojo con DEADLINE_RED_DAYS días o menos y después del vencimiento).
// Tildado, deja de llamar la atención. Cuando se pone en rojo, avisa a
// CRM_WEEKLY_NOTIFY_USER (redDeadlines → utils/notifications).
// ════════════════════════════════════════════════════════════════════

import { AMERICA_COUNTRIES, CRM_CHECK_ITEMS, CRM_REGIONS, CRM_ENTITIES, CRM_PRIORITIES, DEADLINE_CALM_DAYS, DEADLINE_RED_DAYS, TRAFFIC_LIGHTS, TRAFFIC_YELLOW_PCT } from '@/constants/crmWeekly';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const utcDay = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

// Días de hoy al deadline ('YYYY-MM-DD'): 0 = hoy, negativo = vencido
export const daysUntil = (deadline, todayIso) => {
  if (!DATE_RE.test(deadline || '') || !DATE_RE.test((todayIso || '').slice(0, 10))) return null;
  return Math.round((utcDay(deadline) - utcDay(todayIso.slice(0, 10))) / 86400000);
};

// ── Alcance de los ítems del checklist (migration 0075) ──
const regionOf = (entity) => entity?.region || 'Américas';
export const itemAppliesTo = (item, entity) => {
  if (!item || !entity) return false;
  if ((item.excludedCodes || []).includes(entity.code)) return false;
  const codes = item.targetCodes || [];
  const regions = item.targetRegions || [];
  if (!codes.length && !regions.length) return true;
  return codes.includes(entity.code) || regions.includes(regionOf(entity));
};
// Los ítems del checklist de una entidad
export const itemsFor = (entity, items = CRM_CHECK_ITEMS) => items.filter((it) => itemAppliesTo(it, entity));

// Alta: lo tildado en «Agregar en» → { targetCodes, targetRegions }.
// Las tres regiones = todas las entidades (sin restricción, como antes).
export const itemTargets = ({ entityCode = '', thisEntity = false, regions = [] } = {}) => {
  const regs = CRM_REGIONS.filter((r) => regions.includes(r));
  if (regs.length === CRM_REGIONS.length) return { targetCodes: null, targetRegions: null };
  return { targetCodes: thisEntity && entityCode ? [entityCode] : null, targetRegions: regs.length ? regs : null };
};

// Texto corto del alcance (para la etiqueta del ítem). '' = todas.
export const itemScopeLabel = (item, entity) => {
  const codes = item?.targetCodes || [];
  const regions = item?.targetRegions || [];
  const parts = [];
  if (codes.length) parts.push(codes.length === 1 && entity && codes[0] === entity.code ? 'Solo esta entidad' : `${codes.length === 1 ? 'Entidad' : 'Entidades'} ${codes.join(', ')}`);
  if (regions.length) parts.push(regions.join(' + '));
  const base = parts.join(' + ');
  const excluded = (item?.excludedCodes || []).length;
  return [base, excluded ? `sin ${excluded} ${excluded === 1 ? 'entidad' : 'entidades'}` : ''].filter(Boolean).join(' · ');
};

// ¿Quitar el ítem de esta entidad lo deja sin ninguna? (solo estaba en ella)
export const onlyInEntity = (item, entity) => {
  const codes = item?.targetCodes || [];
  return !(item?.targetRegions || []).length && codes.length === 1 && codes[0] === entity?.code;
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
    .filter(({ c, entity, item, days }) => entity && item && itemAppliesTo(item, entity) && !c.done && days !== null && days <= DEADLINE_RED_DAYS)
    .map(({ c, entity, item, days }) => ({ entity, item, deadline: c.deadline, days }))
    .sort((a, b) => a.days - b.days || a.entity.code.localeCompare(b.entity.code));
};

// Próximos steps con fecha en rojo (nov 2026): sin completar y con la fecha
// en DEADLINE_RED_DAYS días o menos (o vencida), de las entidades que se
// pasan (las del Weekly check). → [{ entity, step, days }]
export const redSteps = (steps = [], todayIso, entities = CRM_ENTITIES) => {
  const entityByCode = Object.fromEntries(entities.map((e) => [e.code, e]));
  return steps
    .map((step) => ({ step, entity: entityByCode[step.entityCode], days: daysUntil(step.dueDate, todayIso) }))
    .filter(({ step, entity, days }) => entity && !step.done && days !== null && days <= DEADLINE_RED_DAYS)
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
// sort: un criterio o una lista de criterios que se aplican en orden (el
// segundo desempata al primero; nov 2026: «semáforo y después importancia»
// o al revés). Criterios:
//   manual: como están (position); redFirst / greenFirst: por color del
//   semáforo y, dentro del color, por avance; priority: alta → baja (sin
//   importancia al final); country: país A–Z.
// Al final siempre desempata position y código.
export const sortEntities = (entities = [], sort = 'manual', summaries = {}) => {
  const base = (a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.code).localeCompare(String(b.code));
  const light = (e) => trafficLight(summaries[e.code])?.rank ?? -1;
  const by = {
    redFirst: (a, b) => light(a) - light(b) || exactPct(summaries[a.code]) - exactPct(summaries[b.code]),
    greenFirst: (a, b) => light(b) - light(a) || exactPct(summaries[b.code]) - exactPct(summaries[a.code]),
    priority: (a, b) => priorityRank(a) - priorityRank(b),
    country: (a, b) => norm(a.country).localeCompare(norm(b.country)),
  };
  const keys = (Array.isArray(sort) ? sort : [sort]).filter((k) => by[k]);
  return [...entities].sort((a, b) => {
    for (const k of keys) { const d = by[k](a, b); if (d) return d; }
    return base(a, b);
  });
};

// Filtros: región, marca, color del semáforo, importancia y tag (vacío = todos)
export const filterEntities = (entities = [], { brand = '', light = '', priority = '', tag = '', region = '' } = {}, summaries = {}) => entities.filter((e) => (
  (!brand || e.brand === brand)
  && (!region || (e.region || 'Américas') === region)
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
  itemsFor(entity, items).forEach((it) => {
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
// grupo), por país (las entidades del mismo país juntas) o por región. Mantiene el
// orden de `entities` (el primero de cada país marca su lugar).
// → [{ key, label, entities: [...] }]
export const activityGroups = (entities = [], by = 'entity') => {
  if (by !== 'country' && by !== 'region') return entities.map((e) => ({ key: e.code, label: e.name, entities: [e] }));
  const groups = new Map();
  entities.forEach((e) => {
    const label = by === 'region' ? (e.region || 'Américas') : String(e.country || '').trim() || 'Sin país';
    const key = norm(label);
    if (!groups.has(key)) groups.set(key, { key, label, entities: [] });
    groups.get(key).entities.push(e);
  });
  return [...groups.values()];
};

// Lista de «Por entidad» con las entidades del mismo país juntas en una
// sola tarjeta (nov 2026). Respeta el orden y los filtros que ya traen
// (cada país queda donde aparece su primera entidad). Las entidades sin
// país van solas. → [{ key, country, entities: [...] }]
export const countryCards = (entities = []) => {
  const cards = [];
  const byKey = new Map();
  entities.forEach((e) => {
    const country = String(e.country || '').trim();
    if (!country) { cards.push({ key: `entity:${e.code}`, country: '', entities: [e] }); return; }
    const key = `country:${norm(country)}`;
    if (!byKey.has(key)) { const card = { key, country, entities: [] }; byKey.set(key, card); cards.push(card); }
    byKey.get(key).entities.push(e);
  });
  return cards;
};

// Suma los resúmenes (entitySummary) de varias entidades: avance del país
export const sumSummaries = (summaries = []) => {
  const t = summaries.filter(Boolean).reduce((acc, s) => ({ done: acc.done + s.done, total: acc.total + s.total, overdue: acc.overdue + s.overdue, soon: acc.soon + s.soon }), { done: 0, total: 0, overdue: 0, soon: 0 });
  return { ...t, pct: t.total ? Math.round((t.done / t.total) * 100) : 0 };
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

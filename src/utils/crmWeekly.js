// ════════════════════════════════════════════════════════════════════
// crmWeekly — «Weekly check» de CRM HubSpot (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   daysUntil, deadlineTone, formatShortDate, parseDmy, maskDmy,
//   checksByEntity, entitySummary, weeklyTotals, newCheckItemId
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

import { CRM_CHECK_ITEMS, CRM_ENTITIES, DEADLINE_CALM_DAYS, DEADLINE_RED_DAYS } from '@/constants/crmWeekly';

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

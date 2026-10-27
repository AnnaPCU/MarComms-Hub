// ════════════════════════════════════════════════════════════════════
// crmWeekly — «Weekly check» de CRM HubSpot (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   daysUntil, deadlineTone, formatShortDate, checksByEntity,
//   entitySummary, weeklyTotals
//
// Deadline de cada ítem del checklist: cuanto más cerca está, más rojo
// (verde con DEADLINE_CALM_DAYS o más por delante → amarillo → naranja →
// rojo el día del vencimiento y después). Tildado, deja de llamar la
// atención.
// ════════════════════════════════════════════════════════════════════

import { CRM_CHECK_ITEMS, DEADLINE_CALM_DAYS } from '@/constants/crmWeekly';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const utcDay = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

// Días de hoy al deadline ('YYYY-MM-DD'): 0 = hoy, negativo = vencido
export const daysUntil = (deadline, todayIso) => {
  if (!DATE_RE.test(deadline || '') || !DATE_RE.test((todayIso || '').slice(0, 10))) return null;
  return Math.round((utcDay(deadline) - utcDay(todayIso.slice(0, 10))) / 86400000);
};

// '2026-11-05' → '05/11/2026'
export const formatShortDate = (iso) => (DATE_RE.test(iso || '') ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Cómo se ve el deadline de un ítem. null = sin fecha.
// { tone: 'done' | 'open', days, label, hue, text, bg, border }
//   done: tildado → sin color (text/bg/border en null).
//   open: hue de 140 (verde) a 0 (rojo) según los días que faltan.
export const deadlineTone = (deadline, done, todayIso, dark = false) => {
  const days = daysUntil(deadline, todayIso);
  if (days === null) return null;
  if (done) return { tone: 'done', days, label: 'Cumplido', hue: null, text: null, bg: null, border: null };
  const hue = Math.round(140 * Math.min(Math.max(days, 0), DEADLINE_CALM_DAYS) / DEADLINE_CALM_DAYS);
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

// Resumen de una entidad: cumplidos, vencidos, los que vencen en 7 días o
// menos (sin tildar) y la última actualización (checklist o steps).
export const entitySummary = (entityChecks = {}, todayIso, steps = []) => {
  let done = 0; let overdue = 0; let soon = 0;
  CRM_CHECK_ITEMS.forEach((it) => {
    const c = entityChecks[it.id];
    if (c?.done) { done += 1; return; }
    const d = daysUntil(c?.deadline, todayIso);
    if (d === null) return;
    if (d < 0) overdue += 1;
    else if (d <= 7) soon += 1;
  });
  const stamps = [...Object.values(entityChecks), ...steps].map((x) => x?.updatedAt).filter(Boolean).sort();
  const last = stamps[stamps.length - 1] || null;
  const lastRow = last ? [...Object.values(entityChecks), ...steps].find((x) => x?.updatedAt === last) : null;
  return {
    done,
    total: CRM_CHECK_ITEMS.length,
    pct: Math.round((done / CRM_CHECK_ITEMS.length) * 100),
    overdue,
    soon,
    lastUpdate: last,
    lastUpdateBy: lastRow?.updatedBy || lastRow?.createdBy || '',
  };
};

// Totales de las entidades que se ven (filtro de marca)
export const weeklyTotals = (entities = [], map = {}, todayIso) => entities.reduce((acc, e) => {
  const s = entitySummary(map[e.code], todayIso);
  acc.done += s.done; acc.total += s.total; acc.overdue += s.overdue; acc.soon += s.soon;
  if (s.done === s.total) acc.complete += 1;
  return acc;
}, { done: 0, total: 0, overdue: 0, soon: 0, complete: 0 });

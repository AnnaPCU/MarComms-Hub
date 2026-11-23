// ════════════════════════════════════════════════════════════════════
// crmWeeklyDeals — Deals nuevos por semana en el Weekly check (nov 2026)
// ════════════════════════════════════════════════════════════════════
// Lee lo que guarda la Edge Function hubspot-weekly-deals en
// crm_weekly_deal_counts (migration 0071). La semana (lunes a domingo, hora
// de Argentina) sale de la misma lógica que usa la función
// (supabase/functions/hubspot-weekly-deals/logic.js), así no se desfasan.
//
//   dealSeries(counts, code, weeks, option) → [{ week, ui, other, total, missing, byOption }]
//   entityOptions(counts, code)     → opciones de PCU Entity de la entidad
//   entityDeals(counts, code, now, option) → { mapped, series, current, previous, options }
//   (option = label de una opción de PCU Entity; '' = todas sumadas)
//   syncStatus(sync, now)           → texto y estado de la última corrida
//   monthSeries / entityMonths      → lo mismo por mes desde enero (0078,
//                                     crm_weekly_deal_months): total del año,
//                                     promedio por mes y mejor mes
// ════════════════════════════════════════════════════════════════════

import { lastWeeks, weekStartAr, cooldownLeft, cooldownFor, optionShortLabel, monthsSinceJanuary, monthStartAr } from '../../supabase/functions/hubspot-weekly-deals/logic.js';

export { lastWeeks, weekStartAr, cooldownLeft, cooldownFor, optionShortLabel, monthsSinceJanuary, monthStartAr };
export const DEAL_WEEKS = 8;

// Colores (validados con el skill dataviz: claro y oscuro). El gráfico de la
// ficha hoy usa solo CRM UI; «otros» va como número debajo de cada semana.
export const DEAL_COLORS = {
  ui: { light: '#2a78d6', dark: '#3987e5', label: 'CRM UI' },
  other: { light: '#eb6834', dark: '#d95926', label: 'Other' },
};

const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const weekLabel = (week) => `Week of ${dm(week)}`;

// counts: filas de crm_weekly_deal_counts ({ entityCode, weekStart, dealsUi, dealsOther })
export const dealSeries = (counts = [], code, weeks = lastWeeks(DEAL_WEEKS), option = '') => {
  const byWeek = {};
  counts.forEach((r) => { if (r.entityCode === code) byWeek[r.weekStart] = r; });
  return weeks.map((week) => {
    const r = byWeek[week];
    if (!r) return { week, ui: 0, other: 0, imported: 0, total: 0, missing: true, byOption: {} };
    const unmapped = r.dealsUi === null && r.dealsOther === null;
    const o = option ? (r.byOption || {})[option] || { ui: 0, other: 0 } : null;
    const ui = o ? o.ui : r.dealsUi ?? 0;
    const other = o ? o.other : r.dealsOther ?? 0;
    const imported = o ? o.imported || 0 : r.dealsImport ?? 0; // 0079: importados, aparte
    return { week, ui, other, imported, total: ui + other + imported, missing: false, unmapped, byOption: r.byOption || {} };
  });
};

// Opciones de PCU Entity de una entidad (las que aparecen en sus filas), en
// el orden de HubSpot
export const entityOptions = (counts = [], code) => {
  const seen = [];
  counts.forEach((r) => { if (r.entityCode === code) Object.keys(r.byOption || {}).forEach((k) => { if (!seen.includes(k)) seen.push(k); }); });
  return seen;
};

// Resumen de una entidad. mapped: false = sin PCU Entity en HubSpot;
// null = todavía no hay datos de esa entidad.
export const entityDeals = (counts = [], code, now = new Date(), option = '') => {
  const series = dealSeries(counts, code, lastWeeks(DEAL_WEEKS, now), option);
  const withData = series.filter((s) => !s.missing);
  const mapped = withData.length ? !withData[withData.length - 1].unmapped : null;
  return { mapped, series, current: series[series.length - 1], previous: series[series.length - 2], options: entityOptions(counts, code) };
};

// Estado de la última corrida para mostrar arriba del Weekly check
export const syncStatus = (sync, now = new Date()) => {
  if (!sync || !sync.lastRunAt) return { tone: 'idle', text: 'Deals have not been fetched from HubSpot yet.' };
  if (sync.ok === false) return { tone: 'error', text: sync.error || 'The last update failed.' };
  const wait = cooldownFor({ last_run_at: sync.lastRunAt, ok: sync.ok }, now);
  return { tone: 'ok', text: '', wait };
};

// Deals sin entidad de la semana en curso y la anterior
export const unassignedOf = (sync, now = new Date()) => {
  const [prev, cur] = lastWeeks(2, now);
  const u = sync?.unassigned || {};
  return { current: u[cur] || 0, previous: u[prev] || 0 };
};

// ── Por mes desde enero (0078) ──
// rows: filas de crm_weekly_deal_months ({ entityCode, monthStart, dealsUi, dealsOther, byOption })
export const monthSeries = (rows = [], code, months = monthsSinceJanuary(), option = '') => {
  const byMonth = {};
  rows.forEach((r) => { if (r.entityCode === code) byMonth[r.monthStart] = r; });
  return months.map((month) => {
    const r = byMonth[month];
    if (!r) return { month, ui: 0, other: 0, imported: 0, total: 0, missing: true, byOption: {} };
    const unmapped = r.dealsUi === null && r.dealsOther === null;
    const o = option ? (r.byOption || {})[option] || { ui: 0, other: 0 } : null;
    const ui = o ? o.ui : r.dealsUi ?? 0;
    const other = o ? o.other : r.dealsOther ?? 0;
    const imported = o ? o.imported || 0 : r.dealsImport ?? 0;
    return { month, ui, other, imported, total: ui + other + imported, missing: false, unmapped, byOption: r.byOption || {} };
  });
};

// Resumen del año de una entidad: total CRM UI / otros, promedio de CRM UI
// por mes (solo meses completos, sin el mes en curso) y el mejor mes.
// mapped como entityDeals; byOption = totales del año por opción.
export const entityMonths = (rows = [], code, now = new Date(), option = '') => {
  const series = monthSeries(rows, code, monthsSinceJanuary(now), option);
  const withData = series.filter((s) => !s.missing);
  const mapped = withData.length ? !withData[withData.length - 1].unmapped : null;
  const total = withData.reduce((acc, s) => ({ ui: acc.ui + s.ui, other: acc.other + s.other, imported: acc.imported + (s.imported || 0) }), { ui: 0, other: 0, imported: 0 });
  const closed = withData.filter((s) => s.month !== monthStartAr(now));
  const avg = closed.length ? Math.round((closed.reduce((n, s) => n + s.ui, 0) / closed.length) * 10) / 10 : null;
  const best = withData.reduce((b, s) => (!b || s.ui > b.ui ? s : b), null);
  // Lo mismo con el total (CRM UI + otros + importados): «Since January»
  // suma las importaciones (nov 2026, a pedido)
  const avgAll = closed.length ? Math.round((closed.reduce((n, s) => n + s.total, 0) / closed.length) * 10) / 10 : null;
  const bestAll = withData.reduce((b, s) => (!b || s.total > b.total ? s : b), null);
  const byOption = {};
  withData.forEach((s) => Object.entries(s.byOption || {}).forEach(([k, v]) => {
    const t = (byOption[k] = byOption[k] || { ui: 0, other: 0, imported: 0 });
    t.ui += v.ui || 0; t.other += v.other || 0; t.imported += v.imported || 0;
  }));
  return { mapped, series, total: { ...total, all: total.ui + total.other + total.imported }, avg, best: best && best.ui > 0 ? best : null, avgAll, bestAll: bestAll && bestAll.total > 0 ? bestAll : null, byOption };
};

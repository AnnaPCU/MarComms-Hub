// ════════════════════════════════════════════════════════════════════
// crmWeeklyDeals — Deals nuevos por semana en el Weekly check (nov 2026)
// ════════════════════════════════════════════════════════════════════
// Lee lo que guarda la Edge Function hubspot-weekly-deals en
// crm_weekly_deal_counts (migration 0071). La semana (lunes a domingo, hora
// de Argentina) sale de la misma lógica que usa la función
// (supabase/functions/hubspot-weekly-deals/logic.js), así no se desfasan.
//
//   dealSeries(counts, code, weeks) → [{ week, ui, other, total, missing }]
//   entityDeals(counts, code, now)  → { mapped, series, current, previous }
//   syncStatus(sync, now)           → texto y estado de la última corrida
// ════════════════════════════════════════════════════════════════════

import { lastWeeks, weekStartAr, cooldownLeft, cooldownFor } from '../../supabase/functions/hubspot-weekly-deals/logic.js';

export { lastWeeks, weekStartAr, cooldownLeft, cooldownFor };
export const DEAL_WEEKS = 8;

// Colores de las dos series (validados con el skill dataviz: claro y oscuro)
export const DEAL_COLORS = {
  ui: { light: '#2a78d6', dark: '#3987e5', label: 'CRM UI' },
  other: { light: '#eb6834', dark: '#d95926', label: 'Otros' },
};

const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const weekLabel = (week) => `Semana del ${dm(week)}`;

// counts: filas de crm_weekly_deal_counts ({ entityCode, weekStart, dealsUi, dealsOther })
export const dealSeries = (counts = [], code, weeks = lastWeeks(DEAL_WEEKS)) => {
  const byWeek = {};
  counts.forEach((r) => { if (r.entityCode === code) byWeek[r.weekStart] = r; });
  return weeks.map((week) => {
    const r = byWeek[week];
    if (!r) return { week, ui: 0, other: 0, total: 0, missing: true };
    const ui = r.dealsUi ?? 0;
    const other = r.dealsOther ?? 0;
    return { week, ui, other, total: ui + other, missing: false, unmapped: r.dealsUi === null && r.dealsOther === null };
  });
};

// Resumen de una entidad. mapped: false = sin PCU Entity en HubSpot;
// null = todavía no hay datos de esa entidad.
export const entityDeals = (counts = [], code, now = new Date()) => {
  const series = dealSeries(counts, code, lastWeeks(DEAL_WEEKS, now));
  const withData = series.filter((s) => !s.missing);
  const mapped = withData.length ? !withData[withData.length - 1].unmapped : null;
  return { mapped, series, current: series[series.length - 1], previous: series[series.length - 2] };
};

// Estado de la última corrida para mostrar arriba del Weekly check
export const syncStatus = (sync, now = new Date()) => {
  if (!sync || !sync.lastRunAt) return { tone: 'idle', text: 'Todavía no se trajeron los deals de HubSpot.' };
  if (sync.ok === false) return { tone: 'error', text: sync.error || 'La última actualización falló.' };
  const wait = cooldownFor({ last_run_at: sync.lastRunAt, ok: sync.ok }, now);
  return { tone: 'ok', text: '', wait };
};

// Deals sin entidad de la semana en curso y la anterior
export const unassignedOf = (sync, now = new Date()) => {
  const [prev, cur] = lastWeeks(2, now);
  const u = sync?.unassigned || {};
  return { current: u[cur] || 0, previous: u[prev] || 0 };
};

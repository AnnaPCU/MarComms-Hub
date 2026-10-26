// ════════════════════════════════════════════════════════════════════
// planHistory — Histórico de un plan (resumen de todos los meses)
// ════════════════════════════════════════════════════════════════════
// Opción «Histórico» del link externo (y de la vista externa en el Hub):
// la evolución de cada KPI mes a mes, con el total del período y la
// variación entre el primer y el último mes con datos. Usa los mismos
// valores que «KPIs del mes» (monthKpiGroups: automáticos, corregidos a
// mano y lo que se arrastra, como Plan MarComms). Un mes sin valor (o en
// 0) no cuenta. Mientras más meses estén cargados, más completo se ve.
// ════════════════════════════════════════════════════════════════════

import { PLAN_KPIS, PLAN_KPI_GROUPS } from '@/constants/planKpis';
import { MONTHS_ES } from '@/constants/planTasks';
import { monthKpiGroups, previousMonthKey } from '@/utils/planKpis';

const MONTH_RE = /^\d{4}-\d{2}$/;
const hasValue = (v) => typeof v === 'number' && Number.isFinite(v);

const nextMonthKey = (key) => {
  const y = Number(key.slice(0, 4)); const m = Number(key.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

// "Ago", "Sep"… (con el año corto si el período cruza de año: "Ene 27")
export const shortMonthLabel = (key, withYear = false) => `${MONTHS_ES[Number(key.slice(5, 7)) - 1].slice(0, 3)}${withYear ? ` ${key.slice(2, 4)}` : ''}`;

// Meses del histórico: del primero al último que tengan tareas o algún KPI
// cargado (sin huecos), hasta el mes actual
export const historyMonths = (tasks = [], kpiHistory = {}, todayIso) => {
  const current = todayIso.slice(0, 7);
  const keys = new Set();
  tasks.forEach((t) => { if (MONTH_RE.test(t.monthKey || '') && t.monthKey <= current) keys.add(t.monthKey); });
  Object.entries(kpiHistory || {}).forEach(([m, k]) => {
    if (MONTH_RE.test(m) && m <= current && Object.values(k || {}).some((v) => hasValue(v?.value))) keys.add(m);
  });
  const sorted = [...keys].sort();
  if (!sorted.length) return [];
  const out = [];
  for (let m = sorted[0]; m <= sorted[sorted.length - 1]; m = nextMonthKey(m)) out.push(m);
  return out;
};

// Por grupo, cada KPI con datos: [{ id, label, groups... points: [{ monthKey,
// value, currency, count }], total, countTotal, currency, mixed, first,
// last, change }]. `change`: último vs primer mes con datos (pct: 1 = +100 %),
// solo con 2 meses o más y la misma moneda.
export const kpiTimeline = (tasks = [], kpiHistory = {}, months = []) => {
  const perMonth = months.map((m) => {
    const items = monthKpiGroups(tasks, m, kpiHistory[m], kpiHistory[previousMonthKey(m)], kpiHistory).flatMap((g) => g.items);
    return { monthKey: m, byId: Object.fromEntries(items.map((k) => [k.id, k])) };
  });
  return PLAN_KPI_GROUPS.map((g) => ({
    ...g,
    items: PLAN_KPIS.filter((k) => k.group === g.id).map((k) => {
      const points = perMonth.map(({ monthKey, byId }) => {
        const it = byId[k.id];
        return it && it.visible
          ? { monthKey, value: it.value, currency: it.currency || '', count: hasValue(it.count) ? it.count : null }
          : { monthKey, value: null, currency: '', count: null };
      });
      const withData = points.filter((p) => hasValue(p.value));
      if (!withData.length) return null;
      const currencies = [...new Set(withData.map((p) => p.currency))];
      const mixed = currencies.length > 1;
      const first = withData[0];
      const last = withData[withData.length - 1];
      const counts = withData.filter((p) => hasValue(p.count));
      return {
        ...k,
        points,
        currency: mixed ? '' : currencies[0],
        mixed,
        total: mixed ? null : withData.reduce((n, p) => n + p.value, 0),
        countTotal: counts.length ? counts.reduce((n, p) => n + p.count, 0) : null,
        monthsWithData: withData.length,
        first,
        last,
        change: withData.length >= 2 && !mixed && first.value > 0 ? { pct: (last.value - first.value) / first.value, from: first.monthKey, to: last.monthKey } : null,
      };
    }).filter(Boolean),
  })).filter((g) => g.items.length > 0);
};

// ════════════════════════════════════════════════════════════════════
// planHistory — Histórico de un plan (resumen de todos los meses)
// ════════════════════════════════════════════════════════════════════
// Opción «Histórico» del link externo (y de la vista externa en el Hub):
// la evolución de cada KPI mes a mes, con el total del período. Usa los mismos
// valores que «KPIs del mes» (monthKpiGroups: automáticos, corregidos a
// mano y lo que se arrastra, como Plan MarComms). Un mes sin valor (o en
// 0) no cuenta. Mientras más meses estén cargados, más completo se ve.
//
// «Varios meses» (oct 2026): sumMonthsKpiGroups suma los KPIs de los
// meses elegidos (mismo formato que monthKpiGroups, para KpiGroupsView) y
// multiMonthLabel arma el título.
// ════════════════════════════════════════════════════════════════════

import { PLAN_KPIS, PLAN_KPI_GROUPS } from '@/constants/planKpis';
import { MONTHS_ES } from '@/constants/planTasks';
import { countText, monthKpiGroups, previousMonthKey } from '@/utils/planKpis';
import { monthLabel } from '@/utils/planTasks';

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
// value, currency, count }], total, countTotal, currency, mixed,
// monthsWithData }].
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
      const counts = withData.filter((p) => hasValue(p.count));
      return {
        ...k,
        points,
        currency: mixed ? '' : currencies[0],
        mixed,
        total: mixed ? null : withData.reduce((n, p) => n + p.value, 0),
        countTotal: counts.length ? counts.reduce((n, p) => n + p.count, 0) : null,
        monthsWithData: withData.length,
      };
    }).filter(Boolean),
  })).filter((g) => g.items.length > 0);
};

// Eje Y del gráfico: 4 tramos "redondos" que cubren el máximo
// (22 → 0·6·12·18·24; 17.900 → 0·4.500·…·18.000). `integer`: para
// cantidades, tramos enteros (2 → 0·1·2·3·4).
const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 4.5, 5, 6, 7.5, 8, 10];
export const niceScale = (max, { integer = false, parts = 4 } = {}) => {
  const raw = max > 0 ? max / parts : 1;
  let step;
  if (integer && raw <= 1) step = 1;
  else {
    const pow = 10 ** Math.floor(Math.log10(raw));
    step = STEPS.map((s) => Number((s * pow).toPrecision(6))).find((s) => s >= raw && (!integer || Number.isInteger(s))) ?? 10 * pow;
  }
  return { max: step * parts, ticks: Array.from({ length: parts + 1 }, (_, i) => Number((step * i).toPrecision(12))) };
};

// ── Varios meses ──
// KPIs de varios meses sumados, en el formato de monthKpiGroups. Por KPI:
// suma los meses con valor (> 0), y también la cantidad (MQLs, ventas).
// Con monedas distintas entre meses no se suma (no se muestra). Sin nota
// ni variación (son del mes). `months`: los 'YYYY-MM' elegidos.
export const sumMonthsKpiGroups = (tasks = [], kpiHistory = {}, months = []) => {
  const perMonth = months.filter((m) => MONTH_RE.test(m)).map((m) => monthKpiGroups(tasks, m, kpiHistory[m], kpiHistory[previousMonthKey(m)], kpiHistory).flatMap((g) => g.items));
  return PLAN_KPI_GROUPS.map((g) => ({
    ...g,
    items: PLAN_KPIS.filter((k) => k.group === g.id).map((k) => {
      const parts = perMonth.map((items) => items.find((it) => it.id === k.id)).filter((it) => it && it.visible);
      const currencies = [...new Set(parts.map((it) => it.currency || ''))];
      const mixed = currencies.length > 1;
      const value = parts.length && !mixed ? parts.reduce((n, it) => n + it.value, 0) : null;
      const counts = parts.filter((it) => hasValue(it.count));
      const count = k.count && counts.length ? counts.reduce((n, it) => n + it.count, 0) : null;
      return {
        ...k,
        value,
        currency: mixed ? '' : currencies[0] || '',
        note: '',
        count,
        tag: k.count ? countText(k, count) : '',
        months: parts.length,
        mixed,
        visible: hasValue(value) && value > 0,
        change: null,
      };
    }),
  }));
};

// 'Septiembre 2026 + Octubre 2026'; con más de 3: '4 meses · Julio 2026 – Octubre 2026'
export const multiMonthLabel = (months = []) => {
  const sorted = [...months].filter((m) => MONTH_RE.test(m)).sort();
  if (!sorted.length) return '';
  if (sorted.length <= 3) return sorted.map((m) => monthLabel(m)).join(' + ');
  return `${sorted.length} meses · ${monthLabel(sorted[0])} – ${monthLabel(sorted[sorted.length - 1])}`;
};

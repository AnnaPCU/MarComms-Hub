// ════════════════════════════════════════════════════════════════════
// planKpis — KPIs del mes e iniciativas de un plan (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   KPIs:        autoKpis, monthKpiGroups, cleanKpis, kpiFormValues,
//                parseKpiNumber, formatKpiNumber, isMeetingTask, meetingCount,
//                previousMonthKey, kpiChange, formatKpiChange, carriedKpis,
//                countText
//   Iniciativas: initiativeGroups, initiativeCategories
//
// Automáticos (se pueden corregir a mano desde el editor de KPIs):
//   · Reuniones internas = tareas completadas del mes que son reuniones
//     (el título dice reunión / meeting / call / llamada…), salvo las que
//     dicen "externo/a". Si el título arranca con un número ("7 Internal
//     Meetings") cuenta ese número.
//   · Entregables completados = las tareas completadas del mes que no son
//     reuniones (ni internas ni externas).
// ════════════════════════════════════════════════════════════════════

import { PLAN_KPIS, PLAN_KPI_GROUPS } from '@/constants/planKpis';
import { isTaskDone } from '@/utils/planTasks';

const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
const text = (v) => String(v ?? '').trim();
const hasValue = (v) => typeof v === 'number' && Number.isFinite(v);

const MEETING_RE = /\b(reunion|reuniones|meeting|meetings|call|calls|llamada|llamadas|catch ?up|kick ?off)\b/;
const EXTERNAL_RE = /\bextern/;

// Cualquier reunión (interna o externa): no cuenta como entregable
export const isAnyMeetingTask = (t) => MEETING_RE.test(norm(t?.title));
// Reunión interna: cuenta en Reuniones internas
export const isMeetingTask = (t) => isAnyMeetingTask(t) && !EXTERNAL_RE.test(norm(t?.title));

// "7 Internal Meetings" → 7; cualquier otra reunión → 1
export const meetingCount = (t) => {
  const m = norm(t?.title).match(/^(\d{1,3})\s/);
  return m ? Math.max(1, Number(m[1])) : 1;
};

export const autoKpis = (tasks = [], monthKey) => {
  const done = tasks.filter((t) => t.monthKey === monthKey && isTaskDone(t));
  const meetings = done.filter(isMeetingTask);
  return {
    deliverables: done.filter((t) => !isAnyMeetingTask(t)).length,
    meetings: meetings.reduce((n, t) => n + meetingCount(t), 0),
    meetingTasks: meetings.length,
  };
};

// ── Números ('848.160', '1.250,5', '40000') ──
// null = vacío; NaN = no es un número
export const parseKpiNumber = (input) => {
  const s = String(input ?? '').trim().replace(/\s/g, '');
  if (!s) return null;
  let n;
  if (s.includes(',')) n = Number(s.replace(/\./g, '').replace(',', '.'));
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, ''));
  else n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export const formatKpiNumber = (n) => (hasValue(n) ? n.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '');

// Mes anterior de 'YYYY-MM' ('2026-01' → '2025-12')
export const previousMonthKey = (key) => {
  if (!/^\d{4}-\d{2}$/.test(key || '')) return null;
  const y = Number(key.slice(0, 4)); const m = Number(key.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

// Variación contra el mes anterior (solo performance): solo si los dos
// meses tienen valor mayor a 0 y la misma moneda. pct: 1 = +100 %.
export const kpiChange = (value, prevValue, currency = '', prevCurrency = '') => {
  if (!(hasValue(value) && value > 0 && hasValue(prevValue) && prevValue > 0)) return null;
  if (text(currency) !== text(prevCurrency)) return null;
  return { pct: (value - prevValue) / prevValue, prevValue };
};

// "+100 %", "−50 %", "0 %"
export const formatKpiChange = (pct) => {
  const n = Math.round(pct * 100);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('es-AR')} %`;
};

// KPIs que se arrastran (carry): el último valor cargado en un mes anterior
// a `monthKey`. history: { 'YYYY-MM': kpis }. → { [id]: { value, currency, from } }
export const carriedKpis = (history = {}, monthKey) => Object.fromEntries(PLAN_KPIS.filter((k) => k.carry).map((k) => {
  const from = Object.keys(history || {}).filter((m) => m < monthKey && hasValue(history[m]?.[k.id]?.value)).sort().pop();
  return [k.id, from ? { value: history[from][k.id].value, currency: text(history[from][k.id].currency), from } : null];
}).filter(([, v]) => v));

// Cantidad de MQLs / ventas: `count` (o, en lo cargado antes, el número
// al principio de la etiqueta: "8 MQLs" → 8)
const countOf = (s = {}) => {
  if (hasValue(s.count)) return s.count;
  const m = text(s.tag).match(/^(\d[\d.,]*)/);
  return m ? parseKpiNumber(m[1]) : null;
};
export const countText = (k, n) => (hasValue(n) && k?.count ? `${formatKpiNumber(n)} ${n === 1 ? k.count.one : k.count.many}` : '');

// Grupos para mostrar el mes: [{ id, label, items: [{ id, label, auto,
// money, value, computed, manual, inheritedFrom, currency, note, tag,
// visible, change }] }].
// `visible`: si va en el link externo: solo con un valor mayor a 0 (un KPI
// vacío o en 0 no se muestra). `change`: variación contra el mes anterior
// (`prevStored`, solo performance) o null. `history` (todos los meses del
// plan) solo hace falta para los que se arrastran (Plan MarComms).
export const monthKpiGroups = (tasks = [], monthKey, stored = {}, prevStored = {}, history = {}) => {
  const auto = autoKpis(tasks, monthKey);
  const carried = carriedKpis(history, monthKey);
  return PLAN_KPI_GROUPS.map((g) => ({
    ...g,
    items: PLAN_KPIS.filter((k) => k.group === g.id).map((k) => {
      const s = stored?.[k.id] || {};
      const prev = prevStored?.[k.id] || {};
      const manual = hasValue(s.value);
      const inherited = !manual && k.carry ? carried[k.id] : null;
      const computed = k.auto ? auto[k.id] : null;
      const value = manual ? s.value : inherited ? inherited.value : k.auto ? computed : null;
      const currency = k.money ? (text(manual ? s.currency : inherited?.currency) || (hasValue(value) ? text(k.defaultCurrency) : '')) : '';
      return {
        ...k,
        value,
        computed,
        manual,
        inheritedFrom: inherited ? inherited.from : null,
        currency,
        note: text(s.note),
        count: k.count ? countOf(s) : null,
        tag: k.count ? countText(k, countOf(s)) : '',
        meetingTasks: k.id === 'meetings' ? auto.meetingTasks : undefined,
        visible: hasValue(value) && value > 0,
        change: k.group === 'performance' ? kpiChange(value, prev.value, currency, prev.currency) : null,
      };
    }),
  }));
};

// Formulario del editor ← lo guardado (strings)
export const kpiFormValues = (stored = {}) => Object.fromEntries(PLAN_KPIS.map((k) => {
  const s = stored?.[k.id] || {};
  return [k.id, {
    value: hasValue(s.value) ? formatKpiNumber(s.value) : '',
    currency: text(s.currency) || text(k.defaultCurrency),
    note: text(s.note),
    count: k.count && hasValue(countOf(s)) ? formatKpiNumber(countOf(s)) : '',
  }];
}));

// Formulario → lo que se guarda en plan_kpis.kpis. Sin campos vacíos; un
// KPI sin nada no se guarda. { kpis, errors: { [id]: 'mensaje' } }
export const cleanKpis = (form = {}) => {
  const kpis = {};
  const errors = {};
  PLAN_KPIS.forEach((k) => {
    const f = form[k.id] || {};
    const value = parseKpiNumber(f.value);
    if (Number.isNaN(value)) { errors[k.id] = 'Tiene que ser un número (ej: 848.160 o 1.250,50).'; return; }
    const count = k.count ? parseKpiNumber(f.count) : null;
    if (Number.isNaN(count)) { errors[k.id] = `La cantidad de ${k.count.many} tiene que ser un número (ej: 8).`; return; }
    const entry = {};
    if (value !== null) entry.value = value;
    if (k.money && text(f.currency) && value !== null) entry.currency = text(f.currency);
    if (text(f.note)) entry.note = text(f.note);
    if (count !== null) entry.count = count;
    if (Object.keys(entry).length) kpis[k.id] = entry;
  });
  return { kpis, errors };
};

// ── Iniciativas ──
const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));

// Agrupadas por tipo, en el orden en que aparece cada tipo. Sin tipo → label ''.
export const initiativeGroups = (initiatives = []) => {
  const groups = new Map();
  [...initiatives].sort(byPosition).forEach((i) => {
    const label = text(i.category);
    const key = norm(label);
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key).items.push(i);
  });
  return [...groups.values()];
};

// Tipos ya usados en el plan (para sugerir al cargar una nueva)
export const initiativeCategories = (initiatives = [], extra = []) => {
  const seen = new Map();
  [...extra, ...initiatives.map((i) => i.category)].forEach((c) => {
    const label = text(c);
    if (label && !seen.has(norm(label))) seen.set(norm(label), label);
  });
  return [...seen.values()];
};

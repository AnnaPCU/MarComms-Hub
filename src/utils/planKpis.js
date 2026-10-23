// ════════════════════════════════════════════════════════════════════
// planKpis — KPIs del mes e iniciativas de un plan (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   KPIs:        autoKpis, monthKpiGroups, cleanKpis, kpiFormValues,
//                parseKpiNumber, formatKpiNumber, isMeetingTask, meetingCount,
//                previousMonthKey, kpiChange, formatKpiChange
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

// Grupos para mostrar el mes: [{ id, label, items: [{ id, label, auto,
// money, value, computed, manual, currency, note, tag, visible, change }] }].
// `visible`: si va en el link externo: solo con un valor mayor a 0 (un KPI
// vacío o en 0 no se muestra). `change`: variación contra el mes anterior
// (`prevStored`, solo performance) o null.
export const monthKpiGroups = (tasks = [], monthKey, stored = {}, prevStored = {}) => {
  const auto = autoKpis(tasks, monthKey);
  return PLAN_KPI_GROUPS.map((g) => ({
    ...g,
    items: PLAN_KPIS.filter((k) => k.group === g.id).map((k) => {
      const s = stored?.[k.id] || {};
      const prev = prevStored?.[k.id] || {};
      const manual = hasValue(s.value);
      const computed = k.auto ? auto[k.id] : null;
      const value = manual ? s.value : k.auto ? computed : null;
      const currency = k.money ? text(s.currency) : '';
      return {
        ...k,
        value,
        computed,
        manual,
        currency,
        note: text(s.note),
        tag: text(s.tag),
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
    currency: text(s.currency),
    note: text(s.note),
    tag: text(s.tag),
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
    const entry = {};
    if (value !== null) entry.value = value;
    if (k.money && text(f.currency)) entry.currency = text(f.currency);
    if (text(f.note)) entry.note = text(f.note);
    if (k.money && text(f.tag)) entry.tag = text(f.tag);
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

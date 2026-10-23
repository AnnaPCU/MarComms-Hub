// ════════════════════════════════════════════════════════════════════
// planTasks — Lógica de la sección Planes (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   Meses:     monthLabel, monthOptions, monthFilterOptions, monthHistory
//   Tareas:    taskStats, isTaskOpen, isTaskOverdue, filterTasks,
//              groupTasksByMonth, pendingFromPreviousMonths, splitLinks
//   Planes:    planBrand, planPillarItems (pilares que cubre cada plan —
//              lo que antes era la pestaña "Por plan" del Portal Cliente)
//
// Las tareas se cargan y editan solo desde el Hub (oct 2026: la carga
// inicial del Excel se hizo una vez por SQL y no hay importación).
// ════════════════════════════════════════════════════════════════════

import { MONTHS_ES, DONE_TASK_STATUS, CANCELLED_TASK_STATUS, PLAN_TASK_STATUS_BY_ID } from '@/constants/planTasks';
import { pillarOfCampaign } from '@/constants/campaigns';
import { calcProgress, calcEventProgress, calcCampaignProgress } from '@/utils/progress';

const pad = (n) => String(n).padStart(2, '0');
const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
const text = (v) => (v === null || v === undefined ? '' : String(v).replace(/\r\n?/g, '\n').trim());
const MONTH_KEY_RE = /^\d{4}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Meses ('YYYY-MM') ──
export const monthLabel = (key) => {
  if (!key || !MONTH_KEY_RE.test(key)) return 'Sin mes';
  return `${MONTHS_ES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
};
const keyOf = (y, m) => `${y}-${pad(m + 1)}`;          // m: 0-11

// Opciones del selector de mes: 6 meses atrás → 12 adelante (+ los que ya usan las tareas)
export const monthOptions = (todayIso, extraKeys = []) => {
  const y = Number(todayIso.slice(0, 4)); const m = Number(todayIso.slice(5, 7)) - 1;
  const keys = new Set(extraKeys.filter((k) => k && MONTH_KEY_RE.test(k)));
  for (let d = -6; d <= 12; d += 1) { const t = new Date(y, m + d, 1); keys.add(keyOf(t.getFullYear(), t.getMonth())); }
  return [...keys].sort();
};

// ── Tareas ──
export const isTaskDone = (t) => t.status === DONE_TASK_STATUS;
export const isTaskCancelled = (t) => t.status === CANCELLED_TASK_STATUS;
export const isTaskOpen = (t) => !isTaskDone(t) && !isTaskCancelled(t);
export const isTaskOverdue = (t, todayIso) => isTaskOpen(t) && ISO_RE.test(t.deadline || '') && t.deadline < todayIso;

// Al pasar a Completado una tarea de un mes anterior al actual sin haberle
// cambiado el mes, el editor pregunta si se completó en ese mes o si pasa
// al actual (así cuenta en los KPIs del mes en que se terminó).
//   task: la tarea guardada; next: { status, monthKey } del formulario
export const needsCompletionMonthCheck = (task, next, todayIso) => !!task
  && next.status === DONE_TASK_STATUS && task.status !== DONE_TASK_STATUS
  && MONTH_KEY_RE.test(next.monthKey || '') && next.monthKey === task.monthKey
  && next.monthKey < todayIso.slice(0, 7);

// Mismas reglas que el Excel: % avance = completadas / (completadas + abiertas); las canceladas no cuentan
export const taskStats = (tasks = []) => {
  const byStatus = Object.fromEntries(Object.keys(PLAN_TASK_STATUS_BY_ID).map((k) => [k, 0]));
  tasks.forEach((t) => { if (byStatus[t.status] !== undefined) byStatus[t.status] += 1; });
  const completed = byStatus[DONE_TASK_STATUS];
  const cancelled = byStatus[CANCELLED_TASK_STATUS];
  const open = tasks.length - completed - cancelled;
  return { total: tasks.length, completed, open, cancelled, byStatus, pct: completed + open === 0 ? 0 : completed / (completed + open) };
};

// Selector de mes de la tabla: arranca en el mes actual y ofrece los meses
// que tienen tareas (+ "Sin mes" si hay) y "Todos los meses". `selected`
// (el mes elegido) siempre queda en la lista, aunque se haya quedado sin
// tareas (ej. se movió la última a otro mes).
//   value: 'all' | 'YYYY-MM' | 'none'
export const monthFilterOptions = (tasks = [], todayIso, selected = '') => {
  const keys = new Set([todayIso.slice(0, 7)]);
  if (MONTH_KEY_RE.test(selected)) keys.add(selected);
  let withoutMonth = selected === 'none';
  tasks.forEach((t) => { if (t.monthKey && MONTH_KEY_RE.test(t.monthKey)) keys.add(t.monthKey); else withoutMonth = true; });
  return [
    { value: 'all', label: 'Todos los meses' },
    ...[...keys].sort().map((k) => ({ value: k, label: monthLabel(k) })),
    ...(withoutMonth ? [{ value: 'none', label: 'Sin mes' }] : []),
  ];
};

// Histórico del link externo: el mes actual + los meses que tienen tareas
// (los vacíos no aparecen), en orden, y "Sin mes" al final si hay. Cada
// opción trae cuántas tareas tiene. `fallback`: si el mes actual no tiene
// tareas, el último mes que sí (o el primero que viene; si solo hay tareas
// sin mes, 'none'); null si no hay.
//   { options: [{ value, label, count, current }], fallback }
export const monthHistory = (tasks = [], todayIso) => {
  const current = todayIso.slice(0, 7);
  const counts = new Map([[current, 0]]);
  let withoutMonth = 0;
  tasks.forEach((t) => {
    if (t.monthKey && MONTH_KEY_RE.test(t.monthKey)) counts.set(t.monthKey, (counts.get(t.monthKey) || 0) + 1);
    else withoutMonth += 1;
  });
  const keys = [...counts.keys()].sort();
  const options = keys.map((k) => ({ value: k, label: monthLabel(k), count: counts.get(k), current: k === current }));
  if (withoutMonth) options.push({ value: 'none', label: 'Sin mes', count: withoutMonth, current: false });
  let fallback = null;
  if (!counts.get(current)) {
    const withTasks = keys.filter((k) => counts.get(k) > 0);
    fallback = [...withTasks].reverse().find((k) => k < current) || withTasks.find((k) => k > current) || (withoutMonth ? 'none' : null);
  }
  return { options, fallback };
};

// filtros: month 'all' | 'YYYY-MM' | 'none'; status 'open' | 'all' | id de
// estado; owner ('' = todos); query libre (también busca por responsable).
export const filterTasks = (tasks = [], { month = 'all', status = 'all', owner = '', query = '' } = {}) => {
  const q = norm(query);
  const hasMonth = (t) => !!t.monthKey && MONTH_KEY_RE.test(t.monthKey);
  return tasks
    .filter((t) => (month === 'all' ? true : month === 'none' ? !hasMonth(t) : t.monthKey === month))
    .filter((t) => (status === 'all' ? true : status === 'open' ? isTaskOpen(t) : t.status === status))
    .filter((t) => !owner || t.owner === owner)
    .filter((t) => !q || [t.title, t.objective, t.result, t.detail, t.owner].some((v) => norm(v).includes(q)));
};

export const groupTasksByMonth = (tasks = []) => {
  const groups = new Map();
  tasks.forEach((t) => {
    const k = t.monthKey && MONTH_KEY_RE.test(t.monthKey) ? t.monthKey : '';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([key, list]) => ({
      key: key || null,
      label: monthLabel(key),
      tasks: list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
    }));
};

// Tareas sin completar (ni canceladas) de meses anteriores al actual, por
// mes: [{ key: '2026-09', label: 'Septiembre 2026', count: 2 }]. Para el
// aviso de la tabla cuando ya empezó un mes nuevo.
export const pendingFromPreviousMonths = (tasks = [], todayIso) => {
  const current = todayIso.slice(0, 7);
  const counts = new Map();
  tasks.forEach((t) => {
    if (!isTaskOpen(t) || !t.monthKey || !MONTH_KEY_RE.test(t.monthKey) || t.monthKey >= current) return;
    counts.set(t.monthKey, (counts.get(t.monthKey) || 0) + 1);
  });
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ key, label: monthLabel(key), count }));
};

// "https://a.com\nNDC - Reporte" → [{ type: 'url', value }, { type: 'text', value }]
export const splitLinks = (value) => text(value)
  .split(/\s*\n\s*|\s+(?=https?:\/\/)/)
  .map((s) => s.trim()).filter(Boolean)
  .map((s) => ({ type: /^https?:\/\/\S+$/i.test(s) ? 'url' : 'text', value: s }));

// ── Planes ──
export const planBrand = (name) => {
  const n = norm(name);
  if (n.startsWith('control union') || n.startsWith('cu ')) return 'Control Union';
  if (n.startsWith('peterson') || n.startsWith('ps ')) return 'Peterson Solutions';
  return '';
};

// Pilares cubiertos por un plan (billing = 'plan' y planId del plan)
export const planPillarItems = (planId, { webinars = [], campaigns = [], events = [] } = {}) => {
  const pid = String(planId);
  const covered = (x) => x && x.billing === 'plan' && String(x.planId) === pid;
  const items = [];
  webinars.filter(covered).forEach((w) => {
    const progress = calcProgress(w);
    items.push({ id: w.id, source: 'webinar', pillar: 'webinars', name: w.name, date: w.mainDate || '', country: w.pais || '', progress, completed: progress === 100 || !!w.completedAt });
  });
  events.filter(covered).forEach((e) => {
    const progress = calcEventProgress(e);
    items.push({ id: e.id, source: 'event', pillar: 'eventos', name: e.name, date: e.date || '', country: e.country || '', progress, completed: progress === 100 || !!e.completedAt });
  });
  campaigns.filter((c) => covered(c) && c.variant !== 'webinar').forEach((c) => {
    const progress = Math.min(100, calcCampaignProgress(c));
    items.push({ id: c.id, source: 'campaign', pillar: pillarOfCampaign(c), name: c.name, date: '', country: c.country || '', progress, completed: progress === 100 || !!c.completedAt });
  });
  const order = ['webinars', 'eventos', 'email', 'paid', 'database', 'research'];
  return items.sort((a, b) => order.indexOf(a.pillar) - order.indexOf(b.pillar) || a.name.localeCompare(b.name));
};

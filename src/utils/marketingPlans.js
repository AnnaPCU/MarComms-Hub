// ════════════════════════════════════════════════════════════════════
// marketingPlans — Lectura del Excel de Planes de Marketing + cálculos
// ════════════════════════════════════════════════════════════════════
// Funciones puras (sin React ni Supabase):
//   parsePlansWorkbook({ sheetNames, grids }) → { plans, warnings }
//   planStats(plan), monthlyBreakdown(plan), nextMeetingOf(plan, today)
//   overallStats(plans), ownerLoad(plans), overdueTasks(plan, today)
//   diffImport(current, incoming)
// La lectura se guía por los encabezados del Excel (no por posiciones
// fijas), así sigue funcionando si se agregan columnas o filas.
// ════════════════════════════════════════════════════════════════════

import {
  SUMMARY_SHEET, NON_PLAN_SHEETS, TASK_HEADERS, MONTHLY_HEADERS, OBJECTIVE_HEADERS, META_LABELS,
  DONE_STATUS, CANCELLED_STATUS, TASK_STATUSES, MONTHS_ES,
} from '@/constants/marketingPlans';
import { normalizeCountryNames } from '@/utils/billing';

// ── Helpers de celdas ──
const norm = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const text = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return toIsoDate(v);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  return String(v).trim();
};
const pad = (n) => String(n).padStart(2, '0');
function toIsoDate(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }

// Serial de Excel (días desde 1899-12-30) → 'YYYY-MM-DD'. Texto queda igual.
export const excelDate = (v) => {
  if (v instanceof Date) return toIsoDate(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    return toIsoDate(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000));
  }
  return text(v);
};
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isUrl = (s) => /^https?:\/\//i.test(String(s || '').trim());

const rowsOf = (grid) => grid || [];
const cell = (grid, r, c) => (grid[r] ? grid[r][c] : undefined);
const firstColText = (grid, r) => norm(cell(grid, r, 0));
const findRow = (grid, pred, from = 0) => {
  for (let r = from; r < rowsOf(grid).length; r += 1) if (grid[r] && pred(grid[r], r)) return r;
  return -1;
};
const sectionRow = (grid, n) => findRow(grid, (row) => norm(row[0]).startsWith(`${n})`));

// Encabezados de una fila → { colIndex: campo }
const headerMap = (row, dict, { keepUnknown = false } = {}) => {
  const map = {};
  (row || []).forEach((v, c) => {
    const key = norm(v);
    if (!key) return;
    if (dict[key]) map[c] = dict[key];
    else if (keepUnknown) map[c] = { extra: text(v) };
  });
  return map;
};

// ── Bloque de datos generales (Owner, Marca, País…) ──
const parseMeta = (grid, untilRow) => {
  const meta = {};
  let lastMetaRow = 0;
  for (let r = 0; r < untilRow; r += 1) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c += 1) {
      const field = META_LABELS[norm(row[c])];
      if (!field) continue;
      lastMetaRow = r;
      // valor = primera celda con dato a la derecha, antes de la próxima etiqueta
      for (let k = c + 1; k < row.length; k += 1) {
        if (META_LABELS[norm(row[k])]) break;
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') { meta[field] = row[k]; break; }
      }
    }
  }
  // Notas sueltas entre los datos y la sección 1 (ej. "MANDAR REPORTE…")
  const notes = [];
  for (let r = lastMetaRow + 1; r < untilRow; r += 1) {
    (grid[r] || []).forEach((v) => { const t = text(v); if (t) notes.push(t); });
  }
  return { meta, note: notes.join(' · ') };
};

const parseTable = (grid, headerRow, endRow, dict, opts = {}) => {
  if (headerRow < 0) return { rows: [], headers: {} };
  const headers = headerMap(grid[headerRow], dict, opts);
  const rows = [];
  for (let r = headerRow + 1; r < endRow; r += 1) {
    const row = grid[r];
    if (!row) continue;
    const item = { _row: r + 1 };
    Object.entries(headers).forEach(([c, field]) => {
      const v = row[Number(c)];
      if (v === undefined || v === null || v === '') return;
      if (typeof field === 'object') { (item._extra = item._extra || []).push({ header: field.extra, value: text(v) }); return; }
      item[field] = v;
    });
    rows.push(item);
  }
  return { rows, headers };
};

const parseTasks = (grid, warnings, planName) => {
  const headerRow = findRow(grid, (row) => row.some((v) => TASK_HEADERS[norm(v)] === 'title'));
  if (headerRow < 0) { warnings.push(`«${planName}»: no se encontró la tabla de tareas (columna «Acción / Tarea»).`); return []; }
  const { rows } = parseTable(grid, headerRow, rowsOf(grid).length, TASK_HEADERS, { keepUnknown: true });
  const tasks = [];
  let skipped = 0;
  rows.forEach((r) => {
    const title = text(r.title);
    if (!title) {
      // Fila con datos pero sin "Acción / Tarea": el Excel tampoco la cuenta
      if (Object.keys(r).some((k) => !['_row', 'month'].includes(k))) skipped += 1;
      return;
    }
    const links = [];
    if (r.link) links.push(text(r.link));
    const extra = [];
    (r._extra || []).forEach((x) => (isUrl(x.value) ? links.push(x.value) : extra.push(x)));
    tasks.push({
      row: r._row,
      month: text(r.month),
      date: r.date !== undefined ? excelDate(r.date) : '',
      title,
      owner: text(r.owner),
      status: text(r.status),
      priority: text(r.priority),
      objective: text(r.objective),
      result: text(r.result),
      comment: text(r.comment),
      links,
      extra,
    });
  });
  if (skipped) warnings.push(`«${planName}»: ${skipped} fila${skipped === 1 ? '' : 's'} con datos pero sin «Acción / Tarea» no se importaron (el Excel tampoco las cuenta).`);
  return tasks;
};

export const parsePlanSheet = (name, grid, warnings = []) => {
  const s1 = sectionRow(grid, 1);
  const s2 = sectionRow(grid, 2);
  const s3 = sectionRow(grid, 3);
  const end = rowsOf(grid).length;
  const { meta, note } = parseMeta(grid, s1 >= 0 ? s1 : Math.min(end, 10));

  const objHeader = s1 >= 0 ? findRow(grid, (row) => norm(row[0]) === 'objetivo', s1) : -1;
  const objectives = parseTable(grid, objHeader, s2 >= 0 ? s2 : end, OBJECTIVE_HEADERS).rows
    .filter((o) => text(o.objective))
    .map((o) => ({ objective: text(o.objective), goal: text(o.goal), current: text(o.current), comment: text(o.comment) }));

  const monHeader = s2 >= 0 ? findRow(grid, (row) => norm(row[0]) === 'mes', s2) : -1;
  const monthly = parseTable(grid, monHeader, s3 >= 0 ? s3 : end, MONTHLY_HEADERS).rows
    .filter((m) => text(m.month))
    .map((m) => ({
      month: text(m.month),
      meetingDate: m.meetingDate !== undefined ? excelDate(m.meetingDate) : '',
      focus: text(m.focus), results: text(m.results), decisions: text(m.decisions), link: text(m.link),
    }));

  const tasks = parseTasks(grid, warnings, name);
  const num = (v) => (typeof v === 'number' ? v : (v === undefined || v === '' ? null : Number(v)));

  return {
    name,
    brand: text(meta.brand),
    country: normalizeCountryNames(text(meta.country)),
    owner: text(meta.owner),
    cc: text(meta.cc),
    followUpMeeting: meta.followUpMeeting !== undefined ? excelDate(meta.followUpMeeting) : '',
    nextMeeting: meta.nextMeeting !== undefined ? excelDate(meta.nextMeeting) : '',
    startMonth: text(meta.startMonth),
    period: text(meta.period),
    note,
    objectives,
    monthly,
    tasks,
    sheetStats: { total: num(meta.xlsTotal), completed: num(meta.xlsCompleted), open: num(meta.xlsOpen) },
  };
};

// Planes listados en la columna "Pestaña del plan" del Resumen General
const summaryPlanNames = (grid) => {
  const header = findRow(grid, (row) => norm(row[0]) === 'pestaña del plan');
  if (header < 0) return null;
  const names = [];
  for (let r = header + 1; r < rowsOf(grid).length; r += 1) {
    const a = text(cell(grid, r, 0));
    if (!a) continue;
    if (/^c[óo]mo sumar/i.test(a) || /^para sacar/i.test(a)) break;
    names.push(a);
  }
  return names;
};

export const parsePlansWorkbook = ({ sheetNames, grids }) => {
  const warnings = [];
  const isPlanLike = (n) => !NON_PLAN_SHEETS.includes(n) && rowsOf(grids[n]).some((row) => row && row.some((v) => TASK_HEADERS[norm(v)] === 'title'));
  const listed = grids[SUMMARY_SHEET] ? summaryPlanNames(grids[SUMMARY_SHEET]) : null;
  let names;
  if (listed) {
    names = listed.filter((n) => {
      if (grids[n]) return true;
      warnings.push(`«${n}» figura en el Resumen General pero no hay ninguna pestaña con ese nombre (en el Excel aparece «Revisar nombre»).`);
      return false;
    });
    sheetNames.filter((n) => isPlanLike(n) && !listed.includes(n)).forEach((n) => {
      warnings.push(`La pestaña «${n}» no está en el Resumen General, así que no se importa. Para sumarla, escribí su nombre en la columna «Pestaña del plan».`);
    });
  } else {
    names = sheetNames.filter(isPlanLike);
  }
  const plans = names.map((n, i) => ({ ...parsePlanSheet(n, grids[n], warnings), position: i }));
  plans.forEach((p) => {
    const s = planStats(p);
    const x = p.sheetStats || {};
    if (x.total !== null && x.total !== undefined && x.total !== s.total) {
      warnings.push(`«${p.name}»: el Excel calcula ${x.total} tareas pero hay ${s.total} cargadas. El Hub cuenta todas; revisá los rangos de las fórmulas de esa pestaña.`);
    }
  });
  if (!plans.length) warnings.push('No se encontró ningún plan en el archivo. ¿Es el Excel de Seguimiento de Planes de Marketing?');
  return { plans, warnings };
};

// ── Cálculos (mismas reglas que las fórmulas del Excel) ──
export const isDone = (t) => t.status === DONE_STATUS;
export const isCancelled = (t) => t.status === CANCELLED_STATUS;
export const isOpen = (t) => !isDone(t) && !isCancelled(t);

export const planStats = (plan) => {
  const tasks = plan?.tasks || [];
  const byStatus = Object.fromEntries([...TASK_STATUSES.map((s) => [s.id, 0]), ['', 0]]);
  tasks.forEach((t) => { byStatus[byStatus[t.status] !== undefined ? t.status : ''] += 1; });
  const completed = tasks.filter(isDone).length;
  const open = tasks.filter(isOpen).length;
  return { total: tasks.length, completed, open, cancelled: tasks.filter(isCancelled).length, byStatus, pct: completed + open === 0 ? 0 : completed / (completed + open) };
};

export const overallStats = (plans) => (plans || []).reduce((acc, p) => {
  const s = planStats(p);
  acc.plans += 1; acc.total += s.total; acc.completed += s.completed; acc.open += s.open;
  acc.pct = acc.completed + acc.open === 0 ? 0 : acc.completed / (acc.completed + acc.open);
  return acc;
}, { plans: 0, total: 0, completed: 0, open: 0, pct: 0 });

// Seguimiento mensual con los conteos calculados desde las tareas
export const monthlyBreakdown = (plan) => (plan?.monthly || []).map((m) => {
  const ts = (plan.tasks || []).filter((t) => norm(t.month) === norm(m.month));
  return { ...m, total: ts.length, completed: ts.filter(isDone).length, open: ts.filter(isOpen).length };
});

// Próxima reunión: la menor fecha de reunión >= hoy (como el Excel), o la
// fecha cargada a mano si es futura; si no, "Sin agendar".
export const nextMeetingOf = (plan, today = new Date()) => {
  const t = toIsoDate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const candidates = [...(plan?.monthly || []).map((m) => m.meetingDate), plan?.nextMeeting]
    .filter((d) => isIsoDate(d) && d >= t).sort();
  return candidates[0] || '';
};

export const overdueTasks = (plan, today = new Date()) => {
  const t = toIsoDate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  return (plan?.tasks || []).filter((x) => isOpen(x) && isIsoDate(x.date) && x.date < t);
};

// Carga por responsable, sumando todos los planes
export const ownerLoad = (plans) => {
  const map = new Map();
  (plans || []).forEach((p) => (p.tasks || []).forEach((t) => {
    const who = t.owner || 'Sin responsable';
    if (!map.has(who)) map.set(who, { owner: who, open: 0, inProgress: 0, blocked: 0, completed: 0, plans: new Set() });
    const o = map.get(who);
    if (isDone(t)) o.completed += 1;
    else if (isOpen(t)) o.open += 1;
    if (t.status === 'En curso') o.inProgress += 1;
    if (t.status === 'Bloqueado') o.blocked += 1;
    o.plans.add(p.name);
  }));
  return [...map.values()].map((o) => ({ ...o, plans: [...o.plans] }))
    .sort((a, b) => b.open - a.open || a.owner.localeCompare(b.owner, 'es'));
};

// Orden cronológico de meses (para agrupar tareas)
export const monthIndex = (m) => MONTHS_ES.findIndex((x) => norm(x) === norm(m));

// Diferencias entre lo que hay en el Hub y lo que trae el Excel
export const diffImport = (current, incoming) => {
  const cur = new Map((current || []).map((p) => [p.name, p]));
  const inc = new Map((incoming || []).map((p) => [p.name, p]));
  const added = []; const updated = []; const unchanged = [];
  inc.forEach((p, name) => {
    const before = cur.get(name);
    if (!before) { added.push({ name, tasks: p.tasks.length }); return; }
    const key = (t) => `${t.title}|${t.month}`;
    const prevStatus = new Map((before.tasks || []).map((t) => [key(t), t.status]));
    const statusChanges = p.tasks.filter((t) => prevStatus.has(key(t)) && prevStatus.get(key(t)) !== t.status).length;
    const newTasks = p.tasks.filter((t) => !prevStatus.has(key(t))).length;
    const removedTasks = (before.tasks || []).filter((t) => !p.tasks.some((x) => key(x) === key(t))).length;
    const same = JSON.stringify(strip(before)) === JSON.stringify(strip(p));
    (same ? unchanged : updated).push({ name, tasksBefore: (before.tasks || []).length, tasksAfter: p.tasks.length, statusChanges, newTasks, removedTasks });
  });
  const removed = [...cur.keys()].filter((n) => !inc.has(n));
  return { added, updated, unchanged, removed };
};
const strip = (p) => ({
  brand: p.brand || '', country: p.country || '', owner: p.owner || '', cc: p.cc || '', followUpMeeting: p.followUpMeeting || '',
  nextMeeting: p.nextMeeting || '', startMonth: p.startMonth || '', period: p.period || '', note: p.note || '',
  objectives: p.objectives || [], monthly: p.monthly || [], tasks: p.tasks || [],
});

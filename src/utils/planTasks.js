// ════════════════════════════════════════════════════════════════════
// planTasks — Lógica de la sección Planes (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   Meses:     monthLabel, inferMonthKey, monthOptions, monthFilterOptions
//   Tareas:    taskStats, isTaskOpen, isTaskOverdue, filterTasks,
//              groupTasksByMonth, splitLinks
//   Planes:    planBrand, planPillarItems (pilares que cubre cada plan —
//              lo que antes era la pestaña "Por plan" del Portal Cliente)
//   Excel:     parsePlanTasksWorkbook, suggestPlanForSheet, resolveOwner,
//              buildTaskImport
// ════════════════════════════════════════════════════════════════════

import {
  MONTHS_ES, DEFAULT_TASK_STATUS, DONE_TASK_STATUS, CANCELLED_TASK_STATUS, PLAN_TASK_STATUS_BY_ID,
  EXCEL_TASK_HEADERS, EXCEL_IGNORED_HEADERS, EXCEL_NON_PLAN_SHEETS,
} from '@/constants/planTasks';
import { pillarOfCampaign } from '@/constants/campaigns';
import { calcProgress, calcEventProgress, calcCampaignProgress } from '@/utils/progress';
import { normalizeCountryNames } from '@/utils/billing';

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
const monthsBetween = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));

// "Octubre" (el Excel no tiene año) → el 'YYYY-MM' más cercano a la fecha
// de referencia; ante empate, el futuro. Ej. con referencia en octubre 2026:
// Enero → 2027-01, Agosto → 2026-08. En la importación la referencia sale
// del propio Excel (ver monthAnchors), no del día en que se importa.
export const inferMonthKey = (name, refIso) => {
  const m = MONTHS_ES.findIndex((x) => norm(x) === norm(name));
  if (m < 0) return null;
  const ref = `${refIso.slice(0, 7)}`;
  const y = Number(ref.slice(0, 4));
  return [y - 1, y, y + 1]
    .map((yy) => keyOf(yy, m))
    .sort((a, b) => Math.abs(monthsBetween(ref, a)) - Math.abs(monthsBetween(ref, b)) || monthsBetween(ref, b) - monthsBetween(ref, a))[0];
};

// "Mes de inicio" de un plan → la última vez que ese mes empezó, como mucho
// el mes que viene (un plan se importa cuando ya arrancó o está por arrancar).
// Ej. hoy febrero 2027: Agosto → 2026-08; hoy octubre 2026: Noviembre → 2026-11.
export const inferStartMonthKey = (name, todayIso) => {
  const m = MONTHS_ES.findIndex((x) => norm(x) === norm(name));
  if (m < 0) return null;
  const limit = todayIso.slice(0, 7);
  const y = Number(limit.slice(0, 4));
  return [y + 1, y, y - 1].map((yy) => keyOf(yy, m)).find((k) => monthsBetween(limit, k) <= 1);
};

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
// que tienen tareas (+ "Sin mes" si hay) y "Todos los meses".
//   value: 'all' | 'YYYY-MM' | 'none'
export const monthFilterOptions = (tasks = [], todayIso) => {
  const keys = new Set([todayIso.slice(0, 7)]);
  let withoutMonth = false;
  tasks.forEach((t) => { if (t.monthKey && MONTH_KEY_RE.test(t.monthKey)) keys.add(t.monthKey); else withoutMonth = true; });
  return [
    { value: 'all', label: 'Todos los meses' },
    ...[...keys].sort().map((k) => ({ value: k, label: monthLabel(k) })),
    ...(withoutMonth ? [{ value: 'none', label: 'Sin mes' }] : []),
  ];
};

// filtros: month 'all' | 'YYYY-MM' | 'none'; status 'open' | 'all' | id de
// estado; owner ('' = todos); query libre. searchOwner = false en la vista
// externa: el Responsable no se ve, así que tampoco se puede buscar por él.
export const filterTasks = (tasks = [], { month = 'all', status = 'all', owner = '', query = '', searchOwner = true } = {}) => {
  const q = norm(query);
  const hasMonth = (t) => !!t.monthKey && MONTH_KEY_RE.test(t.monthKey);
  return tasks
    .filter((t) => (month === 'all' ? true : month === 'none' ? !hasMonth(t) : t.monthKey === month))
    .filter((t) => (status === 'all' ? true : status === 'open' ? isTaskOpen(t) : t.status === status))
    .filter((t) => !owner || t.owner === owner)
    .filter((t) => !q || [t.title, t.objective, t.result, t.detail, ...(searchOwner ? [t.owner] : [])].some((v) => norm(v).includes(q)));
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

// ── Importación del Excel "Seguimiento Planes Marketing" ──
const excelDate = (v) => {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = text(v);
  return ISO_RE.test(s) ? s : '';
};

// Referencia para el año de cada fila. El Excel solo dice "Agosto", así
// que se usa, en orden: la «Fecha» de la fila (no se importa, pero dice el
// año), la de la fila anterior, la primera «Fecha» de la pestaña, el «Mes
// de inicio» del plan y, como último recurso, hoy. Así reimportar el mismo
// Excel meses después no corre las tareas de año ni las duplica.
const startAnchorOf = (rows, headerRow, todayIso) => {
  for (const row of rows.slice(0, headerRow)) {
    if (!row) continue;
    const i = row.findIndex((v) => norm(v) === 'mes de inicio');
    if (i < 0) continue;
    for (let c = i + 1; c < row.length; c += 1) {
      const v = text(row[c]);
      if (!v) continue;
      const k = inferStartMonthKey(v, todayIso);
      return k ? `${k}-15` : null;
    }
  }
  return null;
};

const parseSheetTasks = (sheet, grid, linkGrid, todayIso) => {
  const warnings = [];
  const rows = grid || [];
  const linkRows = linkGrid || [];
  const headerRow = rows.findIndex((row) => row && row.some((v) => EXCEL_TASK_HEADERS[norm(v)] === 'title'));
  if (headerRow < 0) return null;
  const header = rows[headerRow];
  const cols = {}; const linkCols = [];
  let linkIdx = -1;
  header.forEach((v, c) => { const f = EXCEL_TASK_HEADERS[norm(v)]; if (f === 'link') linkIdx = c; });
  const width = Math.max(header.length, ...Array.from(rows.slice(headerRow + 1), (r) => (r ? r.length : 0)));
  for (let c = 0; c < width; c += 1) {
    const h = norm(header[c]);
    const f = EXCEL_TASK_HEADERS[h];
    if (f === 'link' || (linkIdx >= 0 && c > linkIdx && !f && !EXCEL_IGNORED_HEADERS.includes(h))) linkCols.push(c);
    else if (f && cols[f] === undefined) cols[f] = c;
  }
  const fechaCol = header.findIndex((v) => norm(v) === 'fecha');
  const fechaOf = (row) => (fechaCol >= 0 && row ? excelDate(row[fechaCol]) : '');
  const firstFecha = fechaCol >= 0 ? rows.slice(headerRow + 1).map(fechaOf).find(Boolean) || '' : '';
  const fallbackAnchor = firstFecha || startAnchorOf(rows, headerRow, todayIso) || todayIso;
  let lastFecha = '';
  // Hipervínculo con texto ("Reporte.html") → "texto\nURL"; si el texto ya es la URL, queda la URL
  const linkValue = (r, c, row) => {
    const shown = text(row[c]);
    const target = linkRows[r] && linkRows[r][c];
    if (!target || target === shown) return shown;
    return shown && !/^https?:\/\//i.test(shown) ? `${shown}\n${target}` : target;
  };
  const tasks = []; let skipped = 0; let emptyStatus = 0; const badMonths = new Set(); const badStatus = new Set();
  rows.forEach((row, r) => {
    if (r <= headerRow || !row) return;
    const get = (f) => (cols[f] === undefined ? undefined : row[cols[f]]);
    const title = text(get('title'));
    if (!title) { if (row.some((v) => text(v))) skipped += 1; return; }
    lastFecha = fechaOf(row) || lastFecha;
    const monthRaw = text(get('month'));
    const monthKey = monthRaw ? inferMonthKey(monthRaw, lastFecha || fallbackAnchor) : null;
    if (monthRaw && !monthKey) badMonths.add(monthRaw);
    let status = text(get('status'));
    if (!status) { status = DEFAULT_TASK_STATUS; emptyStatus += 1; }
    else if (!PLAN_TASK_STATUS_BY_ID[status]) {
      const match = Object.keys(PLAN_TASK_STATUS_BY_ID).find((s) => norm(s) === norm(status));
      if (match) status = match; else { badStatus.add(status); status = DEFAULT_TASK_STATUS; }
    }
    tasks.push({
      monthKey, title, owner: text(get('owner')), status,
      deadline: get('deadline') !== undefined ? excelDate(get('deadline')) : '',
      objective: text(get('objective')), result: text(get('result')), detail: text(get('detail')),
      link: linkCols.map((c) => linkValue(r, c, row)).filter(Boolean).join('\n'),
    });
  });
  if (skipped) warnings.push(`«${sheet}»: ${skipped} fila${skipped === 1 ? '' : 's'} sin «Acción / Tarea» no se importa${skipped === 1 ? '' : 'n'}.`);
  if (emptyStatus) warnings.push(`«${sheet}»: ${emptyStatus} tarea${emptyStatus === 1 ? '' : 's'} sin estado entra${emptyStatus === 1 ? '' : 'n'} como «Pendiente».`);
  if (badMonths.size) warnings.push(`«${sheet}»: mes no reconocido (${[...badMonths].join(', ')}): esas tareas quedan «Sin mes».`);
  if (badStatus.size) warnings.push(`«${sheet}»: estado no reconocido (${[...badStatus].join(', ')}): entran como «Pendiente».`);
  return { sheet, tasks, warnings };
};

export const parsePlanTasksWorkbook = ({ sheetNames, grids, links = {} }, { todayIso }) => {
  const sheets = sheetNames
    .filter((n) => !EXCEL_NON_PLAN_SHEETS.some((x) => norm(x) === norm(n)))
    .map((n) => parseSheetTasks(n, grids[n], links[n], todayIso))
    .filter(Boolean);
  const warnings = sheets.flatMap((s) => s.warnings);
  if (!sheets.length) warnings.push('No se encontró ninguna pestaña con la tabla de tareas («Acción / Tarea»). ¿Es el Excel de Seguimiento de Planes de Marketing?');
  return { sheets, warnings };
};

// "CU USA Organic" → plan "Control Union Estados Unidos Orgánico"
const expandSheetName = (name) => normalizeCountryNames(String(name || '')
  .replace(/^\s*p?cu\b/i, 'Control Union').replace(/^\s*ps\b/i, 'Peterson Solutions'));
const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const BRAND_TOKENS = ['control', 'union', 'peterson', 'solutions'];
const placeTokens = (s) => tokens(s).filter((t) => !BRAND_TOKENS.includes(t));
const tokenMatch = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
// Misma marca y el resto del nombre (país, "Orgánico"…) tiene que coincidir:
// "PS Chile" no se sugiere para "Peterson Solutions Argentina".
export const suggestPlanForSheet = (sheet, plans = []) => {
  const expanded = expandSheetName(sheet);
  const brand = planBrand(expanded);
  const st = placeTokens(expanded);
  if (!brand || !st.length) return '';
  const scored = plans
    .filter((p) => planBrand(p.name) === brand)
    .map((p) => {
      const pt = placeTokens(p.name);
      const common = st.filter((t) => pt.some((x) => tokenMatch(t, x))).length;
      return { id: p.id, score: pt.length ? common / Math.max(st.length, pt.length) : 0 };
    })
    .filter((s) => s.score >= 0.6)
    .sort((a, b) => b.score - a.score);
  if (!scored.length || (scored[1] && scored[1].score === scored[0].score)) return '';
  return scored[0].id;
};

// "Felipe" → "Felipe Señorans" si hay una sola persona del equipo con ese nombre
export const resolveOwner = (raw, teamNames = []) => {
  const r = norm(raw);
  if (!r) return '';
  const exact = teamNames.find((n) => norm(n) === r);
  if (exact) return exact;
  const byFirst = teamNames.filter((n) => norm(n).split(' ')[0] === r);
  return byFirst.length === 1 ? byFirst[0] : text(raw);
};

// Arma lo que se va a escribir. mode 'add' suma solo las tareas que no
// están (mismo título + mes en el plan); 'replace' borra las del plan y
// carga las del Excel (si la pestaña no tiene tareas, el plan no se toca).
// Se compara contra lo que ya hay en el Hub, no dentro del Excel: dos
// filas "Reunion" del mismo mes son dos tareas.
export const buildTaskImport = ({ sheets = [], mapping = {}, existingTasks = [], mode = 'add', teamNames = [], createdBy = '' }) => {
  const key = (t) => `${norm(t.title)}|${t.monthKey || ''}`;
  const perPlan = new Map();
  sheets.forEach((s) => {
    const planId = mapping[s.sheet];
    if (!planId) return;
    if (!perPlan.has(planId)) perPlan.set(planId, { planId, sheets: [], incoming: [] });
    const entry = perPlan.get(planId);
    entry.sheets.push(s.sheet);
    entry.incoming.push(...s.tasks);
  });
  const toInsert = []; const replacePlanIds = []; const summary = [];
  perPlan.forEach((entry) => {
    const existing = existingTasks.filter((t) => String(t.planId) === String(entry.planId));
    const already = new Map();
    if (mode === 'add') existing.forEach((t) => already.set(key(t), (already.get(key(t)) || 0) + 1));
    let position = mode === 'add' ? existing.reduce((m, t) => Math.max(m, (t.position ?? 0) + 1), 0) : 0;
    let duplicates = 0;
    entry.incoming.forEach((t) => {
      const k = key(t);
      if (already.get(k)) { already.set(k, already.get(k) - 1); duplicates += 1; return; }
      toInsert.push({ ...t, owner: resolveOwner(t.owner, teamNames), planId: entry.planId, position: position++, createdBy });
    });
    // Una pestaña sin tareas (ej. un plan recién armado) no vacía el plan del Hub
    const replaces = mode === 'replace' && entry.incoming.length > 0;
    if (replaces) replacePlanIds.push(entry.planId);
    summary.push({ planId: entry.planId, sheets: entry.sheets, incoming: entry.incoming.length, toAdd: entry.incoming.length - duplicates, duplicates, toDelete: replaces ? existing.length : 0 });
  });
  return { toInsert, replacePlanIds, summary };
};

// ════════════════════════════════════════════════════════════════════
// Tests para utils/planTasks — sección Planes
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { workbookToGrids } from './xlsxGrid';
import {
  monthLabel, inferMonthKey, monthOptions, monthFilterOptions, taskStats, isTaskOverdue, filterTasks, groupTasksByMonth, splitLinks,
  planBrand, planPillarItems, parsePlanTasksWorkbook, suggestPlanForSheet, resolveOwner, buildTaskImport,
} from './planTasks';
import { nextTaskStatus } from '@/constants/planTasks';

const TODAY = '2026-10-14';
const PLANS = [
  { id: 'ar', name: 'Control Union Argentina' },
  { id: 'us', name: 'Control Union Estados Unidos Orgánico' },
  { id: 'ps', name: 'Peterson Solutions Argentina' },
  { id: 'ca', name: 'Control Union Canada' },
];
const TEAM = ['Felipe Señorans', 'Victoria Colombo', 'Tomas Misrahi', 'Eugenio Marotta'];

describe('meses', () => {
  it('etiqueta y deducción del año (el Excel no lo tiene)', () => {
    expect(monthLabel('2026-10')).toBe('Octubre 2026');
    expect(monthLabel(null)).toBe('Sin mes');
    expect(inferMonthKey('Agosto', TODAY)).toBe('2026-08');
    expect(inferMonthKey('enero', TODAY)).toBe('2027-01');
    expect(inferMonthKey('Septiembre', TODAY)).toBe('2026-09');
    expect(inferMonthKey('Abril', TODAY)).toBe('2027-04'); // empate ±6: gana el futuro
    expect(inferMonthKey('Q4', TODAY)).toBeNull();
  });
  it('opciones del selector incluyen meses ya usados', () => {
    const opts = monthOptions(TODAY, ['2025-01']);
    expect(opts[0]).toBe('2025-01');
    expect(opts).toContain('2026-04');
    expect(opts).toContain('2027-10');
    expect(opts).not.toContain('2027-11');
  });
});

describe('tareas', () => {
  const tasks = [
    { id: 1, title: 'A', status: 'Completado', monthKey: '2026-09', position: 1, owner: 'Felipe Señorans' },
    { id: 2, title: 'B', status: 'Pendiente', monthKey: '2026-10', position: 0, deadline: '2026-10-01', detail: 'mystery shopping' },
    { id: 3, title: 'C', status: 'Cancelado', monthKey: null },
    { id: 4, title: 'D', status: 'En curso', monthKey: '2026-09', position: 0, deadline: '2026-12-01' },
  ];
  it('avance con las reglas del Excel (canceladas no cuentan)', () => {
    expect(taskStats(tasks)).toMatchObject({ total: 4, completed: 1, open: 2, cancelled: 1, pct: 1 / 3 });
    expect(taskStats([]).pct).toBe(0);
  });
  it('vencidas solo si están abiertas y el deadline ya pasó', () => {
    expect(tasks.filter((t) => isTaskOverdue(t, TODAY)).map((t) => t.id)).toEqual([2]);
  });
  it('filtros y agrupado por mes (sin mes al final)', () => {
    expect(filterTasks(tasks, { status: 'open' }).map((t) => t.id)).toEqual([2, 4]);
    expect(filterTasks(tasks, { owner: 'Felipe Señorans' }).map((t) => t.id)).toEqual([1]);
    expect(filterTasks(tasks, { query: 'MYSTERY' }).map((t) => t.id)).toEqual([2]);
    const g = groupTasksByMonth(tasks);
    expect(g.map((x) => [x.label, x.tasks.map((t) => t.id)])).toEqual([['Septiembre 2026', [4, 1]], ['Octubre 2026', [2]], ['Sin mes', [3]]]);
  });
  it('rotación de estado como en Social Media', () => {
    expect(nextTaskStatus('Pendiente')).toBe('En curso');
    expect(nextTaskStatus('En curso')).toBe('Completado');
    expect(nextTaskStatus('Completado')).toBe('Pendiente');
    expect(nextTaskStatus('Bloqueado')).toBe('En curso');
  });
  it('links: URLs y textos, el link es opcional', () => {
    expect(splitLinks('https://a.com\nNDC - Reporte https://b.com')).toEqual([
      { type: 'url', value: 'https://a.com' }, { type: 'text', value: 'NDC - Reporte' }, { type: 'url', value: 'https://b.com' },
    ]);
    expect(splitLinks('')).toEqual([]);
  });
});

describe('planes y pilares', () => {
  it('marca según el nombre', () => {
    expect(planBrand('Control Union Argentina')).toBe('Control Union');
    expect(planBrand('Peterson Solutions Argentina')).toBe('Peterson Solutions');
  });
  it('pilares cubiertos por el plan (lo que era "Por plan" en el Portal)', () => {
    const items = planPillarItems('ar', {
      webinars: [{ id: 'w1', name: 'Web', billing: 'plan', planId: 'ar', pais: 'Argentina' }, { id: 'w2', name: 'Otro', billing: 'usd', planId: 'ar' }],
      campaigns: [{ id: 'c1', name: 'Mailing', type: 'email', billing: 'plan', planId: 'ar', completedSteps: [] }, { id: 'c2', name: 'Linked', type: 'email', variant: 'webinar', billing: 'plan', planId: 'ar' }],
      events: [{ id: 'e1', name: 'Evento', billing: 'plan', planId: 'us', tasks: {} }],
    });
    expect(items.map((i) => [i.id, i.pillar])).toEqual([['w1', 'webinars'], ['c1', 'email']]);
  });
});

describe('importación del Excel', () => {
  const sheet = (rows) => XLSX.utils.aoa_to_sheet(rows);
  const header = ['Mes', 'Fecha', 'Acción / Tarea', 'Responsable', 'Estado', 'Prioridad', 'Objetivo', 'Resultado', 'Comentario', 'LINK', 'Columna1'];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet([['Pestaña del plan'], ['CU Argentina']]), 'Resumen General');
  XLSX.utils.book_append_sheet(wb, sheet([['CU Argentina'], [], ['3) TAREAS'], header,
    ['Septiembre', 46286, 'Mystery Shopping', 'Felipe', 'Completado', 'Alta', 'Obj', 42, 'Coment', 'https://a.com', 'https://b.com'],
    ['Octubre', null, 'Evento', 'Tomás', '', null, null, null, null, null, 'NDC - texto'],
    [null, null, 'Sin mes', 'Juan Externo', 'en curso'],
    ['Octubre', null, null, 'Felipe', 'Pendiente'],
  ]), 'CU Argentina');
  XLSX.utils.book_append_sheet(wb, sheet([header, [null, null, 'X']]), 'CU USA Organic');
  XLSX.utils.book_append_sheet(wb, sheet([header]), 'Plantilla');
  const parsed = parsePlanTasksWorkbook(workbookToGrids(XLSX, wb), { todayIso: TODAY });

  it('lee las pestañas de planes con las columnas pedidas', () => {
    expect(parsed.sheets.map((s) => s.sheet)).toEqual(['CU Argentina', 'CU USA Organic']);
    const [a, b, c] = parsed.sheets[0].tasks;
    expect(a).toEqual({ monthKey: '2026-09', title: 'Mystery Shopping', owner: 'Felipe', status: 'Completado', deadline: '', objective: 'Obj', result: '42', detail: 'Coment', link: 'https://a.com\nhttps://b.com' });
    expect(b).toMatchObject({ monthKey: '2026-10', status: 'Pendiente', link: 'NDC - texto' });
    expect(c).toMatchObject({ monthKey: null, status: 'En curso' });
    expect(parsed.warnings.some((w) => w.includes('1 fila sin «Acción / Tarea»'))).toBe(true);
    expect(parsed.warnings.some((w) => w.includes('1 tarea sin estado entra como «Pendiente»'))).toBe(true);
  });

  it('sugiere el plan de cada pestaña', () => {
    expect(suggestPlanForSheet('CU Argentina', PLANS)).toBe('ar');
    expect(suggestPlanForSheet('CU USA Organic', PLANS)).toBe('us');
    expect(suggestPlanForSheet('PS Argentina', PLANS)).toBe('ps');
    expect(suggestPlanForSheet('CU Canada', PLANS)).toBe('ca');
    expect(suggestPlanForSheet('PS Chile', PLANS)).toBe('');
  });

  it('responsables: nombre de pila → nombre completo del equipo', () => {
    expect(resolveOwner('Felipe', TEAM)).toBe('Felipe Señorans');
    expect(resolveOwner('Tomás', TEAM)).toBe('Tomas Misrahi');
    expect(resolveOwner('Juan Externo', TEAM)).toBe('Juan Externo');
  });

  it('modo agregar: no duplica; modo reemplazar: borra las del plan', () => {
    const existing = [{ id: 'x', planId: 'ar', title: 'mystery shopping', monthKey: '2026-09', position: 4 }];
    const add = buildTaskImport({ sheets: parsed.sheets, mapping: { 'CU Argentina': 'ar', 'CU USA Organic': '' }, existingTasks: existing, mode: 'add', teamNames: TEAM, createdBy: 'Vicky' });
    expect(add.toInsert.map((t) => [t.title, t.owner, t.position])).toEqual([['Evento', 'Tomas Misrahi', 5], ['Sin mes', 'Juan Externo', 6]]);
    expect(add.summary).toEqual([{ planId: 'ar', sheets: ['CU Argentina'], incoming: 3, toAdd: 2, duplicates: 1, toDelete: 0 }]);
    expect(add.replacePlanIds).toEqual([]);
    const rep = buildTaskImport({ sheets: parsed.sheets, mapping: { 'CU Argentina': 'ar' }, existingTasks: existing, mode: 'replace', teamNames: TEAM });
    expect(rep.toInsert).toHaveLength(3);
    expect(rep.toInsert[0]).toMatchObject({ planId: 'ar', position: 0 });
    expect(rep.replacePlanIds).toEqual(['ar']);
    expect(rep.summary[0]).toMatchObject({ toAdd: 3, toDelete: 1 });
    const empty = buildTaskImport({ sheets: [{ sheet: 'CU Canada', tasks: [] }], mapping: { 'CU Canada': 'ca' }, existingTasks: [{ id: 'y', planId: 'ca', title: 'Algo' }], mode: 'replace' });
    expect(empty.replacePlanIds).toEqual([]);
    expect(empty.summary[0]).toMatchObject({ incoming: 0, toDelete: 0 });
  });

  it('dos filas iguales del Excel son dos tareas (solo se compara contra el Hub)', () => {
    const sheets = [{ sheet: 'CU Argentina', tasks: [
      { title: 'Reunion', monthKey: '2026-09', status: 'Completado' },
      { title: 'Reunion', monthKey: '2026-09', status: 'Completado' },
    ] }];
    const fresh = buildTaskImport({ sheets, mapping: { 'CU Argentina': 'ar' }, existingTasks: [], mode: 'add' });
    expect(fresh.toInsert).toHaveLength(2);
    const again = buildTaskImport({ sheets, mapping: { 'CU Argentina': 'ar' }, existingTasks: fresh.toInsert, mode: 'add' });
    expect(again.toInsert).toHaveLength(0);
    expect(again.summary[0]).toMatchObject({ incoming: 2, toAdd: 0, duplicates: 2 });
  });

  it('el año sale de la «Fecha» del Excel, no del día en que se importa', () => {
    const wb2 = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Marca', 'Control Union', 'Mes de inicio', 'Agosto'],
      ['Mes', 'Fecha', 'Acción / Tarea', 'Estado', 'LINK'],
      ['Agosto', 46239, 'A', 'Completado', 'Reporte.html'],   // 46239 = 2026-08-05
      ['Agosto', null, 'B', 'Completado'],                  // sin fecha: usa la de la fila anterior
      ['Enero', 46400, 'C', 'Pendiente'],                   // 46400 = 2027-01-13
    ]);
    ws.E3.l = { Target: 'https://x.com/a?b=1&amp;c=2' };
    XLSX.utils.book_append_sheet(wb2, ws, 'CU Argentina');
    const r = parsePlanTasksWorkbook(workbookToGrids(XLSX, wb2), { todayIso: '2027-02-10' });
    expect(r.sheets[0].tasks.map((t) => t.monthKey)).toEqual(['2026-08', '2026-08', '2027-01']);
    expect(r.sheets[0].tasks[0].link).toBe('Reporte.html\nhttps://x.com/a?b=1&c=2');
    // Sin columna Fecha: manda el «Mes de inicio» del plan
    const wb3 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb3, XLSX.utils.aoa_to_sheet([
      ['Mes de inicio', 'Agosto'], ['Mes', 'Acción / Tarea', 'Estado'], ['Agosto', 'X', 'Pendiente'], ['Enero', 'Y', 'Pendiente'],
    ]), 'CU Canada');
    const r3 = parsePlanTasksWorkbook(workbookToGrids(XLSX, wb3), { todayIso: '2027-02-10' });
    expect(r3.sheets[0].tasks.map((t) => t.monthKey)).toEqual(['2026-08', '2027-01']);
  });

  it('filtro por mes: arranca en el mes actual y ofrece los meses con tareas', () => {
    const list = [{ id: 1, monthKey: '2026-08' }, { id: 2, monthKey: '2026-10' }, { id: 3, monthKey: null }];
    expect(monthFilterOptions(list, TODAY).map((o) => o.value)).toEqual(['all', '2026-08', '2026-10', 'none']);
    expect(monthFilterOptions([], TODAY).map((o) => o.label)).toEqual(['Todos los meses', 'Octubre 2026']);
    expect(filterTasks(list, { month: '2026-10' }).map((t) => t.id)).toEqual([2]);
    expect(filterTasks(list, { month: 'none' }).map((t) => t.id)).toEqual([3]);
    expect(filterTasks(list, { month: 'all' })).toHaveLength(3);
  });

  it('en la vista externa no se busca por responsable', () => {
    const list = [{ title: 'Reunion', owner: 'Felipe Señorans' }, { title: 'Evento Felipe', owner: '' }];
    expect(filterTasks(list, { query: 'felipe' })).toHaveLength(2);
    expect(filterTasks(list, { query: 'felipe', searchOwner: false }).map((t) => t.title)).toEqual(['Evento Felipe']);
  });

  it('filas vacías en el medio de la tabla no cortan la lectura', () => {
    const grid = [];
    grid[0] = ['Mes', 'Acción / Tarea', 'Estado', 'Link'];
    grid[3] = ['Octubre', 'Tarea suelta', 'En curso', 'https://x.com'];
    const r = parsePlanTasksWorkbook({ sheetNames: ['CU Canada'], grids: { 'CU Canada': grid } }, { todayIso: TODAY });
    expect(r.sheets[0].tasks).toEqual([expect.objectContaining({ title: 'Tarea suelta', status: 'En curso', link: 'https://x.com', monthKey: '2026-10' })]);
  });
});

// ════════════════════════════════════════════════════════════════════
// Tests para utils/marketingPlans — lectura del Excel y cálculos
// ════════════════════════════════════════════════════════════════════
// Arma un Excel sintético con la misma estructura que "Seguimiento Planes
// Marketing" (Resumen General + pestañas de plan) usando SheetJS.
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { workbookToGrids } from './xlsxGrid';
import {
  parsePlansWorkbook, planStats, monthlyBreakdown, nextMeetingOf, overdueTasks, ownerLoad, overallStats, diffImport, excelDate,
} from './marketingPlans';

const serial = (iso) => (Date.UTC(...iso.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))) - Date.UTC(1899, 11, 30)) / 86400000;

const planSheet = ({ title, owner, brand, country, next, start, tasks, xlsTotal, note }) => {
  const rows = [];
  rows[0] = [title];
  rows[1] = ['Plan de 6 meses · revisión mensual'];
  rows[3] = ['Owner', owner, null, 'Reunión de seguimiento', null, null, null, 'Tareas', xlsTotal ?? tasks.length];
  rows[4] = ['CC en mails', null, null, 'Próxima reunión', null, next ?? 'Sin agendar', null, 'Completadas', 0];
  rows[5] = ['Marca', brand, null, 'Mes de inicio', null, start, null, 'Abiertas', 0];
  rows[6] = ['País', country, null, 'Período', null, `${start} → Enero`, null, '% avance', 0];
  if (note) rows[7] = [note];
  rows[8] = ['1) OBJETIVOS DEL PLAN'];
  rows[9] = ['Objetivo', null, null, 'Meta', null, null, 'Resultado actual', 'Comentario'];
  rows[10] = ['MQL', null, null, '50', null, null, '12'];
  rows[15] = ['2) SEGUIMIENTO MENSUAL — se completa en cada reunión'];
  rows[16] = ['Mes', 'Fecha reunión', 'Foco del mes', 'Tareas', 'Completadas', 'Abiertas', 'Resultados del mes', 'Decisiones / próximos pasos'];
  rows[17] = ['Agosto', serial('2026-08-20'), 'Arranque', 9, 9, 9];
  rows[18] = ['Septiembre', serial('2026-10-20'), null, 0, 0, 0];
  rows[24] = ['3) TAREAS — filtrá la columna Estado para ver solo las activas'];
  rows[25] = ['Mes', 'Fecha', 'Acción / Tarea', 'Responsable', 'Estado', 'Prioridad', 'Objetivo', 'Resultado', 'Comentario', 'LINK', 'Columna1'];
  tasks.forEach((t, i) => { rows[26 + i] = t; });
  return XLSX.utils.aoa_to_sheet(rows.map((r) => r || []));
};

const buildWorkbook = () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['SEGUIMIENTO GENERAL — PLANES DE MARKETING'], [], [], [], [], [], ['PLANES'],
    ['Pestaña del plan', 'Marca', 'País'], ['CU USA Organic'], ['PS Argentina'], ['Plan Fantasma'], [],
    ['CÓMO SUMAR UN PLAN NUEVO'],
  ]), 'Resumen General');
  XLSX.utils.book_append_sheet(wb, planSheet({
    title: 'CU USA Organic', owner: 'Alejandro', brand: 'Control Union', country: 'USA', start: 'Agosto', xlsTotal: 4,
    tasks: [
      ['Agosto', serial('2026-08-05'), 'Optimización web', 'Victoria', 'Completado', 'Media', null, 'LP listas', null, 'https://a.com', 'https://b.com'],
      ['Agosto', serial('2026-08-31'), 'Follow up revista', 'Felipe', 'Pendiente', 'Alta'],
      ['Septiembre', serial('2026-09-30'), 'Email IFPA', 'Eugenio', 'En curso'],
      ['Septiembre', null, 'Tarea cancelada', 'Felipe', 'Cancelado'],
      ['Septiembre', null, null, 'Felipe', 'Pendiente'], // sin "Acción / Tarea": no cuenta
    ],
  }), 'CU USA Organic');
  XLSX.utils.book_append_sheet(wb, planSheet({
    title: 'PS Argentina', owner: 'Agustina', brand: 'Peterson Solutions', country: 'Argentina', start: 'Septiembre',
    next: serial('2026-10-13'), note: 'MANDAR REPORTE PRIMERA SEMANA DE CADA MES!', xlsTotal: 1,
    tasks: [['Septiembre', null, 'Webinar EmpCo', 'Victoria', 'Completado', null, null, null, null, null, 'NDC - PAID']],
  }), 'PS Argentina');
  XLSX.utils.book_append_sheet(wb, planSheet({ title: 'CU Chile', owner: '', brand: 'Control Union', country: 'Chile', start: 'Agosto', tasks: [['Agosto', null, 'X']] }), 'CU Chile');
  XLSX.utils.book_append_sheet(wb, planSheet({ title: 'NOMBRE DEL PLAN', owner: '', brand: '', country: '', start: '', tasks: [] }), 'Plantilla');
  return wb;
};

const parsed = () => parsePlansWorkbook(workbookToGrids(XLSX, buildWorkbook()));

describe('lectura del Excel', () => {
  it('importa solo los planes del Resumen General, en su orden', () => {
    const { plans } = parsed();
    expect(plans.map((p) => [p.name, p.position])).toEqual([['CU USA Organic', 0], ['PS Argentina', 1]]);
  });

  it('lee datos generales, nota, objetivos y seguimiento mensual', () => {
    const [usa, ps] = parsed().plans;
    expect(usa).toMatchObject({ brand: 'Control Union', country: 'Estados Unidos', owner: 'Alejandro', startMonth: 'Agosto', nextMeeting: 'Sin agendar' });
    expect(usa.objectives).toEqual([{ objective: 'MQL', goal: '50', current: '12', comment: '' }]);
    expect(usa.monthly[0]).toMatchObject({ month: 'Agosto', meetingDate: '2026-08-20', focus: 'Arranque' });
    expect(ps).toMatchObject({ nextMeeting: '2026-10-13', note: 'MANDAR REPORTE PRIMERA SEMANA DE CADA MES!' });
  });

  it('lee tareas por encabezado, con fechas, links y columnas extra', () => {
    const [usa, ps] = parsed().plans;
    expect(usa.tasks).toHaveLength(4);
    expect(usa.tasks[0]).toMatchObject({ month: 'Agosto', date: '2026-08-05', title: 'Optimización web', owner: 'Victoria', status: 'Completado', priority: 'Media', result: 'LP listas', links: ['https://a.com', 'https://b.com'] });
    expect(ps.tasks[0].extra).toEqual([{ header: 'Columna1', value: 'NDC - PAID' }]);
  });

  it('avisa lo que no cuadra', () => {
    const { warnings } = parsed();
    expect(warnings.some((w) => w.includes('«Plan Fantasma» figura en el Resumen General'))).toBe(true);
    expect(warnings.some((w) => w.includes('«CU Chile» no está en el Resumen General'))).toBe(true);
    expect(warnings.some((w) => w.includes('«CU USA Organic»: 1 fila con datos pero sin «Acción / Tarea»'))).toBe(true);
    expect(warnings.some((w) => w.includes('«CU USA Organic»: el Excel calcula'))).toBe(false); // 4 = 4
    expect(warnings.some((w) => w.includes('«PS Argentina»: el Excel calcula 1 tareas pero hay 1'))).toBe(false);
  });

  it('convierte seriales de Excel a fecha', () => {
    expect(excelDate(serial('2026-10-13'))).toBe('2026-10-13');
    expect(excelDate('Sin agendar')).toBe('Sin agendar');
  });
});

describe('cálculos (mismas reglas que el Excel)', () => {
  it('completadas / abiertas / % avance sin contar canceladas', () => {
    const [usa] = parsed().plans;
    expect(planStats(usa)).toMatchObject({ total: 4, completed: 1, open: 2, cancelled: 1, pct: 1 / 3 });
    expect(overallStats(parsed().plans)).toMatchObject({ plans: 2, total: 5, completed: 2, open: 2, pct: 0.5 });
  });

  it('seguimiento mensual calculado desde las tareas', () => {
    const [usa] = parsed().plans;
    expect(monthlyBreakdown(usa).map((m) => [m.month, m.total, m.completed, m.open])).toEqual([['Agosto', 2, 1, 1], ['Septiembre', 2, 0, 1]]);
  });

  it('próxima reunión, tareas vencidas y carga por responsable', () => {
    const [usa, ps] = parsed().plans;
    const today = new Date('2026-10-07T12:00:00');
    expect(nextMeetingOf(usa, today)).toBe('2026-10-20');
    expect(nextMeetingOf(ps, today)).toBe('2026-10-13');
    expect(overdueTasks(usa, today).map((t) => t.title)).toEqual(['Follow up revista', 'Email IFPA']);
    const load = ownerLoad(parsed().plans);
    expect(load.find((o) => o.owner === 'Felipe')).toMatchObject({ open: 1, completed: 0 });
    expect(load.find((o) => o.owner === 'Victoria')).toMatchObject({ open: 0, completed: 2, plans: ['CU USA Organic', 'PS Argentina'] });
  });

  it('diffImport: nuevos, actualizados, sin cambios y borrados', () => {
    const { plans } = parsed();
    const changed = { ...plans[0], tasks: plans[0].tasks.map((t, i) => (i === 1 ? { ...t, status: 'Completado' } : t)) };
    const d = diffImport([plans[0], { name: 'Viejo', tasks: [] }, plans[1]], [changed, plans[1], { name: 'Nuevo', tasks: [{}] }]);
    expect(d.added).toEqual([{ name: 'Nuevo', tasks: 1 }]);
    expect(d.updated).toEqual([{ name: 'CU USA Organic', tasksBefore: 4, tasksAfter: 4, statusChanges: 1, newTasks: 0, removedTasks: 0 }]);
    expect(d.unchanged.map((x) => x.name)).toEqual(['PS Argentina']);
    expect(d.removed).toEqual(['Viejo']);
  });
});

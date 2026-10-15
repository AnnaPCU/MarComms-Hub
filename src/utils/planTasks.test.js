// ════════════════════════════════════════════════════════════════════
// Tests para utils/planTasks — sección Planes
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  monthLabel, monthOptions, monthFilterOptions, taskStats, isTaskOverdue, filterTasks, groupTasksByMonth, splitLinks,
  pendingFromPreviousMonths, monthHistory,
  planBrand, planPillarItems,
} from './planTasks';

const TODAY = '2026-10-14';

describe('meses', () => {
  it('etiqueta del mes', () => {
    expect(monthLabel('2026-10')).toBe('Octubre 2026');
    expect(monthLabel(null)).toBe('Sin mes');
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
  it('filtro por mes: arranca en el mes actual y ofrece los meses con tareas', () => {
    const list = [{ id: 1, monthKey: '2026-08' }, { id: 2, monthKey: '2026-10' }, { id: 3, monthKey: null }];
    expect(monthFilterOptions(list, TODAY).map((o) => o.value)).toEqual(['all', '2026-08', '2026-10', 'none']);
    expect(monthFilterOptions([], TODAY).map((o) => o.label)).toEqual(['Todos los meses', 'Octubre 2026']);
    expect(filterTasks(list, { month: '2026-10' }).map((t) => t.id)).toEqual([2]);
    expect(filterTasks(list, { month: 'none' }).map((t) => t.id)).toEqual([3]);
    expect(filterTasks(list, { month: 'all' })).toHaveLength(3);
    // El mes elegido sigue en la lista aunque se haya quedado sin tareas
    expect(monthFilterOptions(list, TODAY, '2026-09').map((o) => o.value)).toEqual(['all', '2026-08', '2026-09', '2026-10', 'none']);
    expect(monthFilterOptions([{ id: 1, monthKey: '2026-10' }], TODAY, 'none').map((o) => o.value)).toEqual(['all', '2026-10', 'none']);
  });

  it('histórico del link: mes actual + meses con tareas, y a dónde ir si el actual está vacío', () => {
    const list = [{ monthKey: '2026-08' }, { monthKey: '2026-08' }, { monthKey: '2026-10' }, { monthKey: null }];
    const h = monthHistory(list, TODAY);
    expect(h.options.map((o) => [o.value, o.count, o.current])).toEqual([['2026-08', 2, false], ['2026-10', 1, true], ['none', 1, false]]);
    expect(h.fallback).toBeNull(); // octubre tiene tareas
    // En noviembre (sin tareas): aparece noviembre y se propone ir a octubre; septiembre (vacío) no aparece
    const nov = monthHistory(list, '2026-11-02');
    expect(nov.options.map((o) => o.value)).toEqual(['2026-08', '2026-10', '2026-11', 'none']);
    expect(nov.fallback).toBe('2026-10');
    // Solo hay tareas a futuro: se propone la primera
    expect(monthHistory([{ monthKey: '2026-12' }], TODAY).fallback).toBe('2026-12');
    expect(monthHistory([], TODAY)).toEqual({ options: [{ value: '2026-10', label: 'Octubre 2026', count: 0, current: true }], fallback: null });
  });

  it('aviso de tareas sin completar de meses anteriores', () => {
    const list = [
      { monthKey: '2026-08', status: 'Pendiente' }, { monthKey: '2026-09', status: 'En curso' },
      { monthKey: '2026-09', status: 'Bloqueado' }, { monthKey: '2026-09', status: 'Completado' },
      { monthKey: '2026-09', status: 'Cancelado' }, { monthKey: '2026-10', status: 'Pendiente' },
      { monthKey: null, status: 'Pendiente' },
    ];
    expect(pendingFromPreviousMonths(list, TODAY)).toEqual([
      { key: '2026-08', label: 'Agosto 2026', count: 1 },
      { key: '2026-09', label: 'Septiembre 2026', count: 2 },
    ]);
    expect(pendingFromPreviousMonths(list, '2026-08-01')).toEqual([]);
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

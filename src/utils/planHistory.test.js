// ════════════════════════════════════════════════════════════════════
// Tests para utils/planHistory — histórico de KPIs de un plan
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { historyMonths, kpiTimeline, shortMonthLabel } from './planHistory';

const tasks = [
  { monthKey: '2026-08', title: 'Optimización web', status: 'Completado' },
  { monthKey: '2026-10', title: 'Informe', status: 'Completado' },
  { monthKey: '2026-10', title: '7 Internal Meetings', status: 'Completado' },
  { monthKey: '2026-12', title: 'Futura', status: 'Pendiente' },
];
const kpis = {
  '2026-08': { planFee: { value: 1500, currency: 'USD' } },
  '2026-09': { deals: { value: 15 }, mqls: { value: 8772, currency: 'USD', count: 2 }, deliverables: { value: 8 } },
  '2026-10': { deals: { value: 26 }, mqls: { value: 29115, currency: 'USD', count: 7 }, contacts: { value: 0 } },
};

describe('histórico', () => {
  it('meses: del primero al último con datos, sin huecos y hasta el mes actual', () => {
    expect(historyMonths(tasks, kpis, '2026-10-26')).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(historyMonths([{ monthKey: '2026-07', status: 'Pendiente' }], { '2026-10': { deals: { value: 1 } } }, '2026-10-26')).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
    expect(historyMonths([], {}, '2026-10-26')).toEqual([]);
    expect(shortMonthLabel('2027-01', true)).toBe('Ene 27');
  });
  it('por KPI: puntos por mes, total, cantidad y variación primero → último', () => {
    const groups = kpiTimeline(tasks, kpis, ['2026-08', '2026-09', '2026-10']);
    const by = Object.fromEntries(groups.flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(groups.map((g) => g.id)).toEqual(['ops', 'performance', 'investment']);
    expect(by.deals.points.map((p) => p.value)).toEqual([null, 15, 26]);
    expect(by.deals.total).toBe(41);
    expect(by.deals.change.pct).toBeCloseTo(11 / 15);
    expect(by.mqls).toMatchObject({ total: 37887, countTotal: 9, currency: 'USD', change: { from: '2026-09', to: '2026-10' } });
    expect(by.deliverables.points.map((p) => p.value)).toEqual([1, 8, 1]); // automático en ago/oct, a mano en sep
    expect(by.meetings.points.map((p) => p.value)).toEqual([null, null, 7]);
    expect(by.meetings.change).toBeNull(); // un solo mes con datos
    expect(by.planFee.points.map((p) => p.value)).toEqual([1500, 1500, 1500]); // se arrastra
    expect(by.planFee.change.pct).toBe(0);
    expect(by.contacts).toBeUndefined(); // en 0: no cuenta
  });
  it('monedas distintas: sin total ni variación', () => {
    const g = kpiTimeline([], { '2026-09': { sales: { value: 10, currency: 'USD' } }, '2026-10': { sales: { value: 20, currency: 'EUR' } } }, ['2026-09', '2026-10']);
    expect(g[0].items[0]).toMatchObject({ id: 'sales', mixed: true, total: null, change: null });
  });
});

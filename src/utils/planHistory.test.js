// ════════════════════════════════════════════════════════════════════
// Tests para utils/planHistory — histórico de KPIs de un plan
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { historyMonths, kpiTimeline, multiMonthLabel, niceScale, shortMonthLabel, sumMonthsKpiGroups } from './planHistory';

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
  it('por KPI: puntos por mes, total y cantidad', () => {
    const groups = kpiTimeline(tasks, kpis, ['2026-08', '2026-09', '2026-10']);
    const by = Object.fromEntries(groups.flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(groups.map((g) => g.id)).toEqual(['ops', 'performance', 'investment']);
    expect(by.deals.points.map((p) => p.value)).toEqual([null, 15, 26]);
    expect(by.deals.total).toBe(41);
    expect(by.mqls).toMatchObject({ total: 37887, countTotal: 9, currency: 'USD' });
    expect(by.deliverables.points.map((p) => p.value)).toEqual([1, 8, 1]); // automático en ago/oct, a mano en sep
    expect(by.meetings.points.map((p) => p.value)).toEqual([null, null, 7]);
    expect(by.planFee.points.map((p) => p.value)).toEqual([1500, 1500, 1500]); // se arrastra
    expect(by.contacts).toBeUndefined(); // en 0: no cuenta
  });
  it('monedas distintas: sin total', () => {
    const g = kpiTimeline([], { '2026-09': { sales: { value: 10, currency: 'USD' } }, '2026-10': { sales: { value: 20, currency: 'EUR' } } }, ['2026-09', '2026-10']);
    expect(g[0].items[0]).toMatchObject({ id: 'sales', mixed: true, total: null });
  });
  it('escala del eje Y: tramos redondos', () => {
    expect(niceScale(22, { integer: true })).toEqual({ max: 24, ticks: [0, 6, 12, 18, 24] });
    expect(niceScale(17900).ticks).toEqual([0, 4500, 9000, 13500, 18000]);
    expect(niceScale(29115).max).toBe(30000);
    expect(niceScale(26, { integer: true }).max).toBe(32); // 7,5 no es entero → 8
    expect(niceScale(2, { integer: true }).ticks).toEqual([0, 1, 2, 3, 4]);
    expect(niceScale(0).ticks).toEqual([0, 1, 2, 3, 4]);
    expect(niceScale(1500).max).toBe(1600);
  });
});

describe('varios meses', () => {
  it('suma los KPIs de los meses elegidos (y la cantidad de MQLs)', () => {
    const groups = sumMonthsKpiGroups(tasks, kpis, ['2026-09', '2026-10']);
    const by = Object.fromEntries(groups.flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(by.deals).toMatchObject({ value: 41, visible: true, change: null, note: '' });
    expect(by.mqls).toMatchObject({ value: 37887, currency: 'USD', count: 9, tag: '9 MQLs' });
    expect(by.planFee).toMatchObject({ value: 3000, currency: 'USD' }); // se arrastra: 1.500 + 1.500
    expect(by.deliverables.value).toBe(9); // 8 a mano en sep + 1 automático en oct
    expect(by.meetings.value).toBe(7);
    expect(by.contacts.visible).toBe(false); // en 0
  });
  it('monedas distintas: no se suma', () => {
    const g = sumMonthsKpiGroups([], { '2026-09': { sales: { value: 10, currency: 'USD' } }, '2026-10': { sales: { value: 20, currency: 'EUR' } } }, ['2026-09', '2026-10']);
    expect(g.find((x) => x.id === 'performance').items.find((k) => k.id === 'sales')).toMatchObject({ mixed: true, visible: false });
  });
  it('título', () => {
    expect(multiMonthLabel(['2026-10', '2026-09'])).toBe('Septiembre 2026 + Octubre 2026');
    expect(multiMonthLabel(['2026-07', '2026-08', '2026-09', '2026-10'])).toBe('4 meses · Julio 2026 – Octubre 2026');
    expect(multiMonthLabel([])).toBe('');
  });
});

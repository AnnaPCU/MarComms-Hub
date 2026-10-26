// ════════════════════════════════════════════════════════════════════
// Tests para utils/planKpis — KPIs del mes e iniciativas de un plan
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  autoKpis, monthKpiGroups, cleanKpis, kpiFormValues, parseKpiNumber, formatKpiNumber,
  isMeetingTask, meetingCount, initiativeGroups, initiativeCategories, kpiChange, formatKpiChange, previousMonthKey, carriedKpis,
} from './planKpis';
import { needsCompletionMonthCheck } from './planTasks';

const T = (title, status = 'Completado', monthKey = '2026-10') => ({ title, status, monthKey });
const tasks = [
  T('7 Internal Meetings'),
  T('Reunión con directora GlobalGAP'),
  T('Reunión CERA (externo) para diagramar workshop'),
  T('Optimización web 2.0'),
  T('Benchmarking', 'En curso'),
  T('Reunion', 'Pendiente'),
  T('Informe de mercado USDA', 'Completado', '2026-09'),
];

describe('KPIs automáticos', () => {
  it('reuniones: título de reunión/meeting, sin las externas; un número al inicio cuenta como tantas', () => {
    expect(isMeetingTask(T('Kick off con ventas'))).toBe(true);
    expect(isMeetingTask(T('Reunión CERA (externo)'))).toBe(false);
    expect(isMeetingTask(T('Callcenter'))).toBe(false);
    expect(meetingCount(T('7 Internal Meetings'))).toBe(7);
    expect(meetingCount(T('Reunión 2027'))).toBe(1);
  });
  it('del mes: solo completadas; entregables = completadas que no son reuniones (ni externas)', () => {
    expect(autoKpis(tasks, '2026-10')).toEqual({ deliverables: 1, meetings: 8, meetingTasks: 2 });
    expect(autoKpis(tasks, '2026-09')).toEqual({ deliverables: 1, meetings: 0, meetingTasks: 0 });
  });
});

describe('KPIs del mes', () => {
  it('grupos, corrección a mano y visibilidad (vacío o en 0 no se muestra)', () => {
    const groups = monthKpiGroups(tasks, '2026-10', {
      meetings: { value: 9, note: 'con ventas' },
      contacts: { value: 0 },
      deals: { value: 848160, currency: 'USD', note: '20 % de BBDD', tag: '' },
      contactsX: { value: 1 },
    });
    expect(groups.map((g) => g.label)).toEqual(['Operativos', 'Performance', 'Investment']);
    const by = Object.fromEntries(groups.flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(by.deliverables).toMatchObject({ value: 1, computed: 1, manual: false, visible: true });
    expect(by.meetings).toMatchObject({ value: 9, computed: 8, manual: true, note: 'con ventas', visible: true });
    expect(by.contacts).toMatchObject({ value: 0, visible: false });
    expect(by.deals).toMatchObject({ value: 848160, currency: 'USD', visible: true });
    expect(by.mqls).toMatchObject({ value: null, visible: false });
    const empty = monthKpiGroups([], '2026-11', {}).flatMap((g) => g.items);
    expect(empty.some((k) => k.visible)).toBe(false);
  });
  it('performance compara con el mes anterior solo si los dos tienen valor > 0 y la misma moneda', () => {
    const prev = { deals: { value: 1000, currency: 'USD' }, mqls: { value: 40000, currency: 'USD' }, sales: { value: 0 }, contacts: { value: 10 } };
    const cur = { deals: { value: 500, currency: 'USD' }, mqls: { value: 80000, currency: 'USD' }, sales: { value: 5 }, contacts: { value: 20 } };
    const by = Object.fromEntries(monthKpiGroups([], '2026-10', cur, prev).flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(by.mqls.change).toEqual({ pct: 1, prevValue: 40000 });
    expect(by.deals.change).toEqual({ pct: -0.5, prevValue: 1000 });
    expect(by.sales.change).toBeNull();
    expect(by.contacts.change).toBeNull();
    expect(kpiChange(100, 50, 'USD', 'EUR')).toBeNull();
    expect(kpiChange(0, 50)).toBeNull();
    expect(formatKpiChange(1)).toBe('+100 %');
    expect(formatKpiChange(-0.5)).toBe('−50 %');
    expect(formatKpiChange(0.001)).toBe('0 %');
    expect(previousMonthKey('2026-01')).toBe('2025-12');
    expect(previousMonthKey('2026-10')).toBe('2026-09');
  });
  it('Investment: Plan MarComms se arrastra del último mes cargado; Paid Media va mes a mes en USD', () => {
    const history = {
      '2026-08': { planFee: { value: 1500, currency: 'USD' } },
      '2026-09': { paidAlwaysOn: { value: 300, currency: 'USD' } },
      '2026-11': { planFee: { value: 1800, currency: 'USD' } },
    };
    expect(carriedKpis(history, '2026-10')).toEqual({ planFee: { value: 1500, currency: 'USD', from: '2026-08' } });
    const oct = Object.fromEntries(monthKpiGroups([], '2026-10', history['2026-10'], history['2026-09'], history).flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(oct.planFee).toMatchObject({ value: 1500, currency: 'USD', manual: false, inheritedFrom: '2026-08', visible: true, change: null });
    expect(oct.paidAlwaysOn).toMatchObject({ value: null, visible: false });
    const dec = Object.fromEntries(monthKpiGroups([], '2026-12', {}, {}, history).flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(dec.planFee).toMatchObject({ value: 1800, inheritedFrom: '2026-11' });
    const jul = Object.fromEntries(monthKpiGroups([], '2026-07', {}, {}, history).flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(jul.planFee).toMatchObject({ value: null, visible: false });
    // propio del mes, sin moneda guardada → USD por defecto
    const sep = Object.fromEntries(monthKpiGroups([], '2026-09', { paidOneShot: { value: 2000 } }, {}, history).flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(sep.paidOneShot).toMatchObject({ value: 2000, currency: 'USD', visible: true, kicker: 'Activation' });
    // el formulario propone USD y no guarda la moneda sola
    const form = kpiFormValues({});
    expect(form.planFee.currency).toBe('USD');
    expect(cleanKpis(form).kpis).toEqual({});
    form.paidAlwaysOn.value = '1.200';
    form.paidAlwaysOn.tag = 'no va';
    expect(cleanKpis(form).kpis).toEqual({ paidAlwaysOn: { value: 1200, currency: 'USD' } });
  });
  it('números con formato argentino', () => {
    expect(parseKpiNumber('848.160')).toBe(848160);
    expect(parseKpiNumber('1.250,5')).toBe(1250.5);
    expect(parseKpiNumber('40000')).toBe(40000);
    expect(parseKpiNumber('12.5')).toBe(12.5);
    expect(parseKpiNumber('  ')).toBeNull();
    expect(parseKpiNumber('ocho')).toBeNaN();
    expect(formatKpiNumber(848160)).toBe('848.160');
    expect(formatKpiNumber(1250.5)).toBe('1.250,5');
    expect(formatKpiNumber(null)).toBe('');
  });
  it('formulario ↔ guardado: sin vacíos, moneda y etiqueta solo en performance, errores', () => {
    const form = kpiFormValues({ deals: { value: 848160, currency: 'USD' }, contacts: { value: 800, note: 'Top 5' } });
    expect(form.deals).toEqual({ value: '848.160', currency: 'USD', note: '', tag: '' });
    form.mqls = { value: '40.000', currency: 'USD', note: '', tag: '8 MQLs' };
    form.contacts.currency = 'USD';
    form.meetings = { value: '', currency: '', note: ' ', tag: '' };
    expect(cleanKpis(form)).toEqual({
      kpis: { contacts: { value: 800, note: 'Top 5' }, deals: { value: 848160, currency: 'USD' }, mqls: { value: 40000, currency: 'USD', tag: '8 MQLs' } },
      errors: {},
    });
    expect(cleanKpis({ sales: { value: 'diez' } }).errors.sales).toMatch(/número/);
  });
});

describe('iniciativas', () => {
  const list = [
    { id: 'a', category: 'Generación de demanda', title: 'Webinars', position: 0 },
    { id: 'b', category: 'Posicionamiento', title: 'PR', position: 1 },
    { id: 'c', category: 'generación de demanda ', title: 'Seguimiento BDR', position: 2 },
    { id: 'd', category: '', title: 'Suelta', position: 3 },
  ];
  it('agrupa por tipo (sin importar mayúsculas) en orden de aparición', () => {
    const g = initiativeGroups(list);
    expect(g.map((x) => [x.label, x.items.map((i) => i.id)])).toEqual([
      ['Generación de demanda', ['a', 'c']], ['Posicionamiento', ['b']], ['', ['d']],
    ]);
  });
  it('tipos para sugerir, sin repetidos', () => {
    expect(initiativeCategories(list, ['Generación de demanda'])).toEqual(['Generación de demanda', 'Posicionamiento']);
  });
});

describe('completar una tarea de un mes anterior', () => {
  const task = { status: 'Pendiente', monthKey: '2026-09' };
  it('pregunta solo si pasa a Completado, sigue en un mes anterior y no se le cambió el mes', () => {
    expect(needsCompletionMonthCheck(task, { status: 'Completado', monthKey: '2026-09' }, '2026-10-23')).toBe(true);
    expect(needsCompletionMonthCheck(task, { status: 'Completado', monthKey: '2026-10' }, '2026-10-23')).toBe(false);
    expect(needsCompletionMonthCheck({ ...task, monthKey: '2026-10' }, { status: 'Completado', monthKey: '2026-10' }, '2026-10-23')).toBe(false);
    expect(needsCompletionMonthCheck(task, { status: 'En curso', monthKey: '2026-09' }, '2026-10-23')).toBe(false);
    expect(needsCompletionMonthCheck({ ...task, status: 'Completado' }, { status: 'Completado', monthKey: '2026-09' }, '2026-10-23')).toBe(false);
    expect(needsCompletionMonthCheck(null, { status: 'Completado', monthKey: '2026-09' }, '2026-10-23')).toBe(false);
    expect(needsCompletionMonthCheck({ ...task, monthKey: null }, { status: 'Completado', monthKey: '' }, '2026-10-23')).toBe(false);
  });
});

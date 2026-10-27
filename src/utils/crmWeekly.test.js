// ════════════════════════════════════════════════════════════════════
// Tests para utils/crmWeekly — Weekly check de CRM HubSpot
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { checksByEntity, daysUntil, deadlineTone, entitySummary, formatShortDate, maskDmy, newCheckItemId, parseDmy, weeklyTotals } from './crmWeekly';

const TODAY = '2026-10-27';

describe('deadline', () => {
  it('días hasta la fecha', () => {
    expect(daysUntil('2026-10-27', TODAY)).toBe(0);
    expect(daysUntil('2026-11-03', TODAY)).toBe(7);
    expect(daysUntil('2026-10-25', TODAY)).toBe(-2);
    expect(daysUntil('2027-01-01', '2026-12-31T23:00:00Z')).toBe(1);
    expect(daysUntil('', TODAY)).toBeNull();
    expect(formatShortDate('2026-11-05')).toBe('05/11/2026');
  });
  it('fechas en español: dd/mm/aaaa', () => {
    expect(parseDmy('27/10/2026')).toBe('2026-10-27');
    expect(parseDmy('1/2/27')).toBe('2027-02-01');
    expect(parseDmy('31/02/2026')).toBeNull(); // no existe
    expect(parseDmy('10/27/2026')).toBeNull(); // mes 27
    expect(parseDmy('')).toBeNull();
    expect(maskDmy('27102026')).toBe('27/10/2026');
    expect(maskDmy('2710')).toBe('27/10');
    expect(maskDmy('27/1a0/2026x9')).toBe('27/10/2026');
    expect(maskDmy('5/11/2026')).toBe('5/11/2026'); // barra a mano
    expect(maskDmy('5/')).toBe('5/');
    expect(maskDmy('27/102')).toBe('27/10/2'); // sigue escribiendo después de la barra automática
    expect(maskDmy('27//')).toBe('27/');
    expect(newCheckItemId()).toMatch(/^item-[a-z0-9]+$/);
  });
  it('color: verde lejos, rojo cerca y vencido; sin color si está tildado', () => {
    expect(deadlineTone('', false, TODAY)).toBeNull();
    expect(deadlineTone('2026-12-31', false, TODAY)).toMatchObject({ tone: 'open', hue: 140, label: 'Vence en 65 días' });
    const week = deadlineTone('2026-11-03', false, TODAY);
    const two = deadlineTone('2026-10-29', false, TODAY);
    expect(week.hue).toBeGreaterThan(two.hue); // más cerca → más rojo
    expect(two.label).toBe('Vence en 2 días');
    expect(deadlineTone('2026-10-28', false, TODAY).label).toBe('Vence mañana');
    expect(deadlineTone(TODAY, false, TODAY)).toMatchObject({ hue: 0, label: 'Vence hoy' });
    expect(deadlineTone('2026-10-20', false, TODAY)).toMatchObject({ hue: 0, label: 'Venció hace 7 días' });
    expect(deadlineTone('2026-10-26', false, TODAY).label).toBe('Venció ayer');
    expect(deadlineTone('2026-10-20', true, TODAY)).toMatchObject({ tone: 'done', text: null, bg: null });
  });
});

describe('resumen por entidad', () => {
  const rows = [
    { entityCode: '538', itemId: 'outlook', done: true, deadline: '2026-10-20', updatedAt: '2026-10-26T10:00:00Z', updatedBy: 'Anna' },
    { entityCode: '538', itemId: 'deals', done: false, deadline: '2026-10-20', updatedAt: '2026-10-25T10:00:00Z' },
    { entityCode: '538', itemId: 'meetings', done: false, deadline: '2026-11-01', updatedAt: '2026-10-24T10:00:00Z' },
    { entityCode: '538', itemId: 'documents', done: false, deadline: '2026-12-01' },
    { entityCode: '592', itemId: 'outlook', done: true },
  ];
  const map = checksByEntity(rows);
  it('cumplidos, vencidos y próximos', () => {
    expect(Object.keys(map)).toEqual(['538', '592']);
    expect(entitySummary(map['538'], TODAY)).toEqual({ done: 1, total: 8, pct: 13, overdue: 1, soon: 1 });
    expect(entitySummary(undefined, TODAY)).toMatchObject({ done: 0, overdue: 0, soon: 0 });
  });
  it('con ítems de la base (uno agregado)', () => {
    const items = [{ id: 'outlook' }, { id: 'deals' }, { id: 'item-x' }];
    const m = checksByEntity([...rows, { entityCode: '538', itemId: 'item-x', done: true }]);
    expect(entitySummary(m['538'], TODAY, items)).toMatchObject({ done: 2, total: 3, pct: 67, overdue: 1, soon: 0 });
    expect(weeklyTotals([{ code: '538' }], m, TODAY, items)).toMatchObject({ done: 2, total: 3 });
  });
  it('totales', () => {
    expect(weeklyTotals([{ code: '538' }, { code: '592' }, { code: '583' }], map, TODAY)).toEqual({ done: 2, total: 24, overdue: 1, soon: 1, complete: 0 });
  });
});

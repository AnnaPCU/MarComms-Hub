// ════════════════════════════════════════════════════════════════════
// Tests para utils/crmWeekly — Weekly check de CRM HubSpot
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { checksByEntity, daysUntil, deadlineTone, entitySummary, formatShortDate, weeklyTotals } from './crmWeekly';

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
  it('cumplidos, vencidos, próximos y última actualización', () => {
    expect(Object.keys(map)).toEqual(['538', '592']);
    expect(entitySummary(map['538'], TODAY)).toMatchObject({ done: 1, total: 8, pct: 13, overdue: 1, soon: 1, lastUpdate: '2026-10-26T10:00:00Z', lastUpdateBy: 'Anna' });
    expect(entitySummary(undefined, TODAY)).toMatchObject({ done: 0, overdue: 0, soon: 0, lastUpdate: null });
    // un step más nuevo cuenta como última actualización
    expect(entitySummary(map['538'], TODAY, [{ updatedAt: '2026-10-27T09:00:00Z', createdBy: 'Fede' }])).toMatchObject({ lastUpdateBy: 'Fede' });
  });
  it('totales', () => {
    expect(weeklyTotals([{ code: '538' }, { code: '592' }, { code: '583' }], map, TODAY)).toEqual({ done: 2, total: 24, overdue: 1, soon: 1, complete: 0 });
  });
});

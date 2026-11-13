// ════════════════════════════════════════════════════════════════════
// Tests de los deals por semana del Weekly check: la lógica de la Edge
// Function (logic.js) y la lectura del Hub (crmWeeklyDeals.js)
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { addWeeks, codeFromLabel, cooldownFor, cooldownLeft, redactSecrets, tokenShape, countWeek, lastWeeks, pcuEntityProperty, weekRangeMs, weekRows, weekStartAr } from '../../supabase/functions/hubspot-weekly-deals/logic.js';
import { dealSeries, entityDeals, syncStatus, unassignedOf } from './crmWeeklyDeals';

describe('semana de lunes a domingo en hora de Argentina', () => {
  it('el domingo 22 h de Argentina (lunes 01 h UTC) sigue en la semana anterior', () => {
    expect(weekStartAr(new Date('2026-11-16T01:00:00Z'))).toBe('2026-11-09');
    expect(weekStartAr(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-16'); // lunes 00:00 AR
    expect(weekStartAr(new Date('2026-11-13T15:00:00Z'))).toBe('2026-11-09'); // viernes
  });
  it('rango en UTC y semanas hacia atrás (cruza el año)', () => {
    const { start, end } = weekRangeMs('2026-11-09');
    expect(new Date(start).toISOString()).toBe('2026-11-09T03:00:00.000Z');
    expect(new Date(end).toISOString()).toBe('2026-11-16T03:00:00.000Z');
    expect(addWeeks('2027-01-04', -1)).toBe('2026-12-28');
    expect(lastWeeks(3, new Date('2026-11-13T15:00:00Z'))).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
  });
});

describe('PCU Entity → código de la entidad', () => {
  const props = [
    { name: 'dealname', label: 'Deal name' },
    { name: 'pcu_office', label: 'PCU Entity', options: [
      { value: 'CU Cert. Argentina', label: '538 - Control Union Argentina SA (Certifications)' },
      { value: 'CU Inspections Argentina', label: '538 - Control Union Argentina SA (Inspections)' },
      { value: 'CU Cert. Uruguay', label: '573U - Control Union Uruguay S.A.' },
      { value: 'PS China', label: 'PS China' },
      { value: 'PS Mexico', label: '880 - Peterson Projects & Solution México S.A DE C.V.' },
    ] },
  ];
  it('lee el código del label, no del valor interno', () => {
    expect(codeFromLabel('538 - Control Union Argentina SA (Warrants)')).toBe('538');
    expect(codeFromLabel('573U - Control Union Uruguay S.A.')).toBe('573U');
    expect(codeFromLabel('301- Peterson')).toBe('301');
    expect(codeFromLabel('PS China')).toBeNull();
    const pcu = pcuEntityProperty(props);
    expect(pcu.name).toBe('pcu_office');
    expect(pcu.valueToCode['CU Inspections Argentina']).toBe('538');
    expect([...pcu.codes].sort()).toEqual(['538', '573U', '880']);
    expect(pcuEntityProperty([{ name: 'x', label: 'Otra' }])).toBeNull();
  });
  it('cuenta por entidad: suma opciones del mismo código, separa CRM UI, deja afuera importaciones', () => {
    const pcu = pcuEntityProperty(props);
    const deals = [
      { pcu: 'CU Cert. Argentina', source: 'CRM_UI' },
      { pcu: 'CU Inspections Argentina', source: 'CRM_UI' },
      { pcu: 'CU Inspections Argentina', source: 'AUTOMATION_PLATFORM' },
      { pcu: 'CU Cert. Argentina', source: 'IMPORT' },  // no cuenta
      { pcu: 'PS China', source: 'CRM_UI' },            // sin código → sin entidad
      { pcu: null, source: 'CRM_UI' },                  // sin PCU Entity
      { pcu: 'CU Cert. Uruguay', source: 'FORM' },      // código que no está en el Hub
      { pcu: 'PS Mexico', source: 'CRM_UI' },
    ];
    const counted = countWeek(deals, pcu.valueToCode, ['538', '880', '864']);
    expect(counted.byCode).toEqual({ 538: { ui: 2, other: 1 }, 880: { ui: 1, other: 0 } });
    expect(counted.unassigned).toBe(3);
    const rows = weekRows([{ code: '538' }, { code: '880' }, { code: '864' }, { code: '592' }], new Set(['538', '880', '592']), counted, '2026-11-09', 'T');
    expect(rows.map((r) => [r.entity_code, r.deals_ui, r.deals_other])).toEqual([['538', 2, 1], ['880', 1, 0], ['864', null, null], ['592', 0, 0]]);
  });
  it('freno de 10 minutos para el botón Actualizar', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    expect(cooldownLeft(null, now)).toBe(0);
    expect(cooldownLeft('2026-11-13T11:55:30Z', now)).toBe(6);
    expect(cooldownLeft('2026-11-13T11:49:00Z', now)).toBe(0);
    // si la última corrida falló, se reintenta al minuto
    expect(cooldownFor({ last_run_at: '2026-11-13T11:59:30Z', ok: false }, now)).toBe(1);
    expect(cooldownFor({ last_run_at: '2026-11-13T11:58:50Z', ok: false }, now)).toBe(0);
    expect(cooldownFor({ last_run_at: '2026-11-13T11:59:30Z', ok: true }, now)).toBe(10);
  });
  it('diagnóstico de la clave sin mostrarla', () => {
    const t = tokenShape('  pat-na1-aaaa-bbbb\n');
    expect(t).toEqual({ clean: 'pat-na1-aaaa-bbbb', length: 17, pat: true, hadSpaces: true });
    expect(tokenShape('abc').pat).toBe(false);
    expect(tokenShape(undefined).length).toBe(0);
    const msg = redactSecrets('INVALID_AUTHENTICATION · The token pat-na1-79ab40f9-4fa4 is invalid; 0123456789abcdef0123456789abcdef99');
    expect(msg).not.toMatch(/79ab40f9/);
    expect(msg).not.toMatch(/0123456789abcdef0123/);
    expect(msg).toMatch(/INVALID_AUTHENTICATION/);
  });
});

describe('lectura en el Hub', () => {
  const NOW = new Date('2026-11-13T15:00:00Z'); // semana del 09/11
  const counts = [
    { entityCode: '538', weekStart: '2026-11-09', dealsUi: 3, dealsOther: 2 },
    { entityCode: '538', weekStart: '2026-11-02', dealsUi: 1, dealsOther: 0 },
    { entityCode: '864', weekStart: '2026-11-09', dealsUi: null, dealsOther: null },
  ];
  it('serie de 8 semanas y semana en curso', () => {
    const d = entityDeals(counts, '538', NOW);
    expect(d.series).toHaveLength(8);
    expect(d.current).toMatchObject({ week: '2026-11-09', ui: 3, other: 2, total: 5 });
    expect(d.previous).toMatchObject({ week: '2026-11-02', total: 1 });
    expect(d.mapped).toBe(true);
    expect(dealSeries(counts, '538', ['2026-10-26'])[0].missing).toBe(true);
  });
  it('sin PCU Entity no es 0, y sin datos es null', () => {
    expect(entityDeals(counts, '864', NOW).mapped).toBe(false);
    expect(entityDeals(counts, '999', NOW).mapped).toBeNull();
  });
  it('estado de la corrida y deals sin entidad', () => {
    expect(syncStatus(null).tone).toBe('idle');
    expect(syncStatus({ lastRunAt: 'x', ok: false, error: 'Falta el token' }).text).toBe('Falta el token');
    expect(syncStatus({ lastRunAt: '2026-11-13T14:58:00Z', ok: true }, NOW).wait).toBe(8);
    expect(unassignedOf({ unassigned: { '2026-11-09': 4, '2026-11-02': 1 } }, NOW)).toEqual({ current: 4, previous: 1 });
  });
});

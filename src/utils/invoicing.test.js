// ════════════════════════════════════════════════════════════════════
// Tests para utils/invoicing — Facturación MarComms
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  buildMonthCopy, cellKey, cellNumber, colName, crmExtraValue, crmLicenses, evalCell, formatAmount,
  freeGridSize, monthSummary, nextMonthKey, positionBetween, repeatedFlags, rowTotal, sheetTotals,
} from './invoicing';
import { FIJO_COLUMNS, MKT_COLUMNS } from '@/constants/invoicing';

describe('celdas como en el Excel', () => {
  it('números y fórmulas', () => {
    expect(evalCell('450').value).toBe(450);
    expect(evalCell('=350/4*3').value).toBe(262.5);
    expect(evalCell('=262.5/3').value).toBe(87.5);
    expect(evalCell('=15*90+2*199').value).toBe(1748);
    expect(evalCell('=5440*1.13').value).toBeCloseTo(6147.2);
    expect(evalCell('=(100+50)*2').value).toBe(300);
    expect(evalCell('-20').value).toBe(-20);
    expect(evalCell('120 x 6').value).toBe(720);
    expect(evalCell(70).value).toBe(70);
  });
  it('decimales y miles a la argentina', () => {
    expect(evalCell('262,5').value).toBe(262.5);
    expect(evalCell('1.500').value).toBe(1500);
    expect(evalCell('12.416,5').value).toBe(12416.5);
    expect(evalCell('116.67').value).toBe(116.67);
    expect(evalCell('USD 1.500').value).toBe(1500);
  });
  it('vacío y errores', () => {
    expect(evalCell('')).toEqual({ value: null, error: false });
    expect(evalCell(null)).toEqual({ value: null, error: false });
    expect(evalCell('Activo').error).toBe(true);
    expect(evalCell('=2*(3').error).toBe(true);
    expect(evalCell('=1/0').error).toBe(true);
    expect(cellNumber('?')).toBe(0);
  });
  it('formato', () => {
    expect(formatAmount(13416.5)).toBe('13.416,5');
    expect(formatAmount(116.6666667)).toBe('116,67');
    expect(formatAmount(null)).toBe('');
    expect(formatAmount(0)).toBe('0');
  });
});

describe('totales de las hojas', () => {
  const fijo = [
    { id: 'g', data: { kind: 'grupo', pais: 'Argentina', valor: '450', website: '=350/4*3' } },
    { id: 'a', data: { valor: '=450/3', website: '=262.5/3' } },
    { id: 'b', data: { planMkt: '1500' } },
    { id: 'c', data: { plan: '1500', totalManual: '1500' } }, // total pisado a mano (como en el Excel)
    { id: 'd', data: { plan: '1000' } },
  ];
  it('Fijo: Valor + Website + Plan MKT; los grupos no suman', () => {
    expect(rowTotal('fijo', fijo[0].data)).toBeNull();
    expect(rowTotal('fijo', fijo[1].data)).toBe(237.5);
    expect(rowTotal('fijo', fijo[3].data)).toBe(1500);
    expect(rowTotal('fijo', fijo[4].data)).toBe(0);
    expect(sheetTotals('fijo', fijo, FIJO_COLUMNS)).toEqual({ total: 3237.5 });
  });
  it('Variables y MKT Plan', () => {
    expect(rowTotal('variables', { bbddPrecio: '250', eventosPrecio: '500', contentPrecio: '75' })).toBe(825);
    expect(rowTotal('mkt', { bbdd: 150, email: 150, paid: 150 })).toBe(450);
    expect(sheetTotals('mkt', [{ data: { bbdd: '150', email: '150', paid: '150' } }], MKT_COLUMNS)).toEqual({ bbdd: 150, email: 150, paid: 150, total: 450 });
  });
  it('CRM: licencias y totales de abajo', () => {
    const crm = [{ data: { monto: '290' } }, { data: { monto: '=120*6' } }];
    const lic = crmLicenses(crm);
    expect(lic).toBe(1010);
    const extra = [
      { id: 'x1', data: { concepto: 'CRM GLOBAL', monto: '5440', moneda: 'EUR' } },
      { id: 'x2', data: { concepto: '', monto: '=5440*1.13', moneda: 'USD' } },
      { id: 'x3', data: { kind: 'total', concepto: 'TOTAL CRM', moneda: 'USD', sumOf: ['x2', 'licencias', 'x3', 'nope'] } },
    ];
    expect(crmExtraValue(extra[0], extra, lic)).toBe(5440);
    expect(crmExtraValue(extra[2], extra, lic)).toBe(7157.2);
  });
  it('resumen del mes', () => {
    const rows = [
      { id: '1', sheet: 'fijo', data: { valor: '100' } },
      { id: '2', sheet: 'variables', data: { campanasPrecio: '70', bbddPrecio: '70' } },
      { id: '3', sheet: 'crm', data: { monto: '500' } },
      { id: '4', sheet: 'crm_extra', position: 0, data: { kind: 'total', concepto: 'TOTAL', moneda: 'USD', sumOf: ['licencias'] } },
    ];
    const s = monthSummary(rows);
    expect(s).toMatchObject({ fijo: 100, variables: 140, fijoMasVariables: 240, crmLicenses: 500 });
    expect(s.variablesByCategory).toMatchObject({ campanas: 70, bbdd: 70, eventos: 0 });
    expect(s.crmExtra).toEqual([{ label: 'TOTAL', currency: 'USD', total: true, value: 500 }]);
  });
});

describe('mes nuevo', () => {
  it('copia Fijo, MKT y CRM; Variables sin montos; sin notas', () => {
    let n = 0;
    const rows = [
      { id: 'f', sheet: 'fijo', position: 1, data: { pais: 'Chile', valor: '350' } },
      { id: 'v', sheet: 'variables', position: 2, data: { pais: 'USA', empresa: 'Peterson', bbddDetalle: 'x', bbddPrecio: '250' } },
      { id: 'e1', sheet: 'crm_extra', position: 0, data: { concepto: 'Horas', monto: '10' } },
      { id: 'e2', sheet: 'crm_extra', position: 1, data: { kind: 'total', sumOf: ['licencias', 'e1'] } },
      { id: 'n', sheet: 'notas', data: { variables: 'algo' } },
    ];
    const out = buildMonthCopy(rows, { toMonth: '2026-11', newId: () => `new${(n += 1)}` });
    expect(out.map((r) => r.sheet)).toEqual(['fijo', 'variables', 'crm_extra', 'crm_extra']);
    expect(out.every((r) => r.month === '2026-11')).toBe(true);
    expect(out[0].data).toEqual({ pais: 'Chile', valor: '350' });
    expect(out[1].data).toEqual({ pais: 'USA', empresa: 'Peterson' });
    expect(out[3].data.sumOf).toEqual(['licencias', out[2].id]);
    expect(rows[1].data.bbddPrecio).toBe('250'); // no toca el original
    const withVars = buildMonthCopy(rows, { toMonth: '2026-11', copyVariables: true, newId: () => 'id' });
    expect(withVars[1].data.bbddPrecio).toBe('250');
  });
  it('mes siguiente y posiciones', () => {
    expect(nextMonthKey('2026-10')).toBe('2026-11');
    expect(nextMonthKey('2026-12')).toBe('2027-01');
    expect(positionBetween(1, 2)).toBe(1.5);
    expect(positionBetween(3, undefined)).toBe(4);
    expect(positionBetween(undefined, 0)).toBe(-1);
    expect(positionBetween(undefined, undefined)).toBe(0);
  });
});

describe('celdas combinadas y zona libre', () => {
  it('valores repetidos seguidos', () => {
    const rows = [{ data: { pais: 'Brasil' } }, { data: { pais: 'Brasil' } }, { data: { pais: '' } }, { data: { pais: 'Chile' } }];
    expect(repeatedFlags(rows, 'pais')).toEqual([false, true, false, false]);
  });
  it('A1, B2…', () => {
    expect(colName(0)).toBe('A');
    expect(colName(25)).toBe('Z');
    expect(colName(26)).toBe('AA');
    expect(cellKey(10, 1)).toBe('B11');
    expect(freeGridSize({})).toEqual({ rows: 20, cols: 6 });
    expect(freeGridSize({ A37: 'Combo', H2: 'x', _rows: 25 })).toEqual({ rows: 39, cols: 8 });
  });
});

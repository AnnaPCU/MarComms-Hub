// ════════════════════════════════════════════════════════════════════
// Tests para utils/invoicing — Facturación MarComms
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  brandOfRow, buildMonthCopy, cellKey, cellNumber, chargesByCategory, colName, countryGroupKey, crmExtraValue, crmLicenses, evalCell,
  fijoContext, formatAmount, freeGridSize, groupMembers, isBillable, matchRows, monthSummary, nextMonthKey, positionBetween,
  previousMonthKey, repeatedFlags, rowMatches, rowNaturalKey, rowStatus, rowTotal, sheetTotals, statusStats, usesGroup, variableCharges,
} from './invoicing';
import { FIJO_COLUMNS, MKT_COLUMNS, variablesColumns } from '@/constants/invoicing';

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
  it('sigue a la fila gris: =grupo/3 y =grupo.valor/2', () => {
    const group = { valor: '450', website: '=350/4*3' };
    expect(evalCell('=grupo/3', { group, key: 'valor' }).value).toBe(150);
    expect(evalCell('=grupo/3', { group, key: 'website' }).value).toBe(87.5);
    expect(evalCell('=grupo.valor/2 + 10', { group, key: 'website' }).value).toBe(235);
    expect(evalCell('=GRUPO/3', { group, key: 'valor' }).value).toBe(150);
    expect(evalCell('=grupo/3', { group: null, key: 'valor' }).error).toBe(true); // sin fila gris arriba
    expect(evalCell('=grupo/3').error).toBe(true);
    expect(evalCell('=grupo/3', { group: { valor: '' }, key: 'valor' }).value).toBe(0); // grupo vacío = 0
    expect(usesGroup('=grupo/3')).toBe(true);
    expect(usesGroup('=450/3')).toBe(false);
    expect(usesGroup('grupo')).toBe(false);
  });
  it('formato', () => {
    expect(formatAmount(13416.5)).toBe('13.416,5');
    expect(formatAmount(116.6666667)).toBe('116,67');
    expect(formatAmount(null)).toBe('');
    expect(formatAmount(0)).toBe('0');
  });
});

describe('Fijo: filas grises', () => {
  const rows = [
    { id: 'g1', position: 1, data: { kind: 'grupo', pais: 'Argentina', empresa: 'Control Union', valor: '450', website: '=350/4*3' } },
    { id: 'a', position: 2, data: { pais: 'Argentina', empresa: 'CU Barcos', valor: '=grupo/3', website: '=grupo/3' } },
    { id: 'b', position: 3, data: { pais: 'Argentina', empresa: 'CU Warrants', valor: '=grupo/3', website: '=grupo/3' } },
    { id: 'c', position: 4, data: { pais: 'Argentina', empresa: 'CU Norte', valor: '450', website: '=350/4' } },
    { id: 'g2', position: 5, data: { kind: 'grupo', pais: 'Brasil', empresa: 'Control Union', valor: '450', website: '350' } },
    { id: 'd', position: 6, data: { pais: 'Brasil', empresa: 'CU Barcos', valor: '=grupo/3', website: '=grupo/3' } },
  ];
  const ctx = fijoContext(rows);
  it('cada fila sabe cuál es su fila gris', () => {
    expect(ctx.g1).toMatchObject({ group: null, self: true });
    expect(ctx.a.groupId).toBe('g1');
    expect(ctx.d.groupId).toBe('g2');
    expect(ctx.d.group.website).toBe('350');
    expect(rowTotal('fijo', rows[1].data, ctx.a)).toBe(237.5);
    expect(rowTotal('fijo', rows[5].data, ctx.d)).toBeCloseTo(266.6666667, 6);
    expect(rowTotal('fijo', rows[0].data, ctx.g1)).toBeNull();
    expect(sheetTotals('fijo', rows, FIJO_COLUMNS, ctx).total).toBe(1279.17);
  });
  it('si cambia la fila gris, las de abajo siguen', () => {
    const ctx2 = fijoContext(rows.map((r) => (r.id === 'g1' ? { ...r, data: { ...r.data, valor: '600' } } : r)));
    expect(rowTotal('fijo', rows[1].data, ctx2.a)).toBe(287.5);
  });
  it('miembros de cada grupo', () => {
    expect(groupMembers(rows).map((g) => [g.group.id, g.members.map((m) => m.id)])).toEqual([['g1', ['a', 'b', 'c']], ['g2', ['d']]]);
  });
});

describe('Variables: cargos', () => {
  it('lee las claves viejas del Excel (un cargo por categoría)', () => {
    const data = { pais: 'USA', empresa: 'Peterson', bbddDetalle: 'bbdd Webinar', bbddCc: 'campañas', bbddPrecio: '250', eventosDetalle: 'Webinar', eventosCc: 'events', eventosPrecio: '500', contentPrecio: '75' };
    const ch = variableCharges(data);
    expect(ch.map((c) => [c.cat, c.detalle, c.precio, c.legacy])).toEqual([['bbdd', 'bbdd Webinar', '250', true], ['eventos', 'Webinar', '500', true], ['content', '', '75', true]]);
    expect(rowTotal('variables', data)).toBe(825);
    expect(Object.keys(chargesByCategory(data))).toEqual(['bbdd', 'eventos', 'content']);
  });
  it('lee los cargos nuevos (varios por categoría) y los ordena', () => {
    const data = { pais: 'España', 'cargo:b': { cat: 'campanas', detalle: 'Paid media', cc: 'campañas', precio: '175', pos: 1 }, 'cargo:a': { cat: 'campanas', detalle: 'ISO 27001', precio: '=220*2', pos: 0 }, campanasPrecio: '999' };
    const ch = variableCharges(data);
    expect(ch.map((c) => c.id)).toEqual(['a', 'b']); // la clave vieja se ignora si ya hay cargos
    expect(rowTotal('variables', data)).toBe(615);
    expect(sheetTotals('variables', [{ id: 'x', data }], variablesColumns())).toMatchObject({ campanasPrecio: 615, bbddPrecio: 0, total: 615 });
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
  it('MKT Plan', () => {
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
      { id: '1', sheet: 'fijo', position: 1, data: { valor: '100', estado: 'facturado' } },
      { id: '2', sheet: 'variables', position: 1, data: { 'cargo:a': { cat: 'campanas', precio: '70' }, 'cargo:b': { cat: 'bbdd', precio: '70' } } },
      { id: '3', sheet: 'crm', position: 1, data: { monto: '500' } },
      { id: '4', sheet: 'crm_extra', position: 0, data: { kind: 'total', concepto: 'TOTAL', moneda: 'USD', sumOf: ['licencias'] } },
    ];
    const s = monthSummary(rows);
    expect(s).toMatchObject({ fijo: 100, variables: 140, fijoMasVariables: 240, crmLicenses: 500 });
    expect(s.variablesByCategory).toMatchObject({ campanas: 70, bbdd: 70, eventos: 0 });
    expect(s.crmExtra).toEqual([{ label: 'TOTAL', currency: 'USD', total: true, value: 500 }]);
    expect(s.status.fijo).toMatchObject({ total: 1, amount: 100 });
    expect(s.status.fijo.byStatus.facturado).toEqual({ count: 1, amount: 100 });
  });
});

describe('estado de cada cobro', () => {
  const rows = [
    { id: 'g', data: { kind: 'grupo', valor: '450' } },
    { id: 'a', data: { valor: '150', estado: 'facturado' } },
    { id: 'b', data: { valor: '150', estado: 'cobrado' } },
    { id: 'c', data: { valor: '0' } },
    { id: 'd', data: { valor: '100', estado: 'cualquiera' } },
  ];
  it('pendiente / facturado / cobrado; sin plata no se cuenta', () => {
    expect(rowStatus(rows[1].data)).toBe('facturado');
    expect(rowStatus(rows[4].data)).toBe('pendiente');
    expect(isBillable('fijo', rows[0].data)).toBe(false);
    expect(isBillable('fijo', rows[3].data)).toBe(false);
    expect(isBillable('crm', { monto: '120' })).toBe(true);
    expect(isBillable('crm', { monto: '0' })).toBe(false);
    const st = statusStats('fijo', rows);
    expect(st.total).toBe(3);
    expect(st.amount).toBe(400);
    expect(st.byStatus).toEqual({ pendiente: { count: 1, amount: 100 }, facturado: { count: 1, amount: 150 }, cobrado: { count: 1, amount: 150 } });
  });
});

describe('agrupar, filtrar y emparejar', () => {
  it('país para agrupar y marca', () => {
    expect(countryGroupKey('Argentina (se manda por mail no hace falta cargarlo en smarsheet)')).toBe('Argentina');
    expect(countryGroupKey('')).toBe('Sin país');
    expect(brandOfRow({ pais: 'Argentina', empresa: 'CU Barcos' })).toBe('cu');
    expect(brandOfRow({ pais: 'Argentina', empresa: 'Peterson' })).toBe('peterson');
    expect(brandOfRow({ pais: 'Ptech', empresa: 'Unico' })).toBe('peterson');
    expect(brandOfRow({ pais: 'Estados Unidos', empresa: 'BEL' })).toBe('otras');
    expect(brandOfRow({ entidad: '592 - Peterson Consultancy S.A.' })).toBe('peterson');
    expect(brandOfRow({ oficina: 'CU Argentina - PS Consulting' })).toBe('peterson');
  });
  it('buscar en todas las celdas (sin tildes)', () => {
    const data = { pais: 'España', empresa: 'Certificaciones', 'cargo:a': { detalle: 'Fee de gestión paid media' } };
    expect(rowMatches(data, 'espana')).toBe(true);
    expect(rowMatches(data, 'GESTION')).toBe(true);
    expect(rowMatches(data, 'brasil')).toBe(false);
    expect(rowMatches(data, '')).toBe(true);
  });
  it('empareja con el mes anterior por _from o por clave natural', () => {
    const prev = [
      { id: 'p1', data: { pais: 'Argentina (nota)', empresa: 'CU Barcos', cuenta: 'BACFGBAR', codigo: '538' } },
      { id: 'p2', data: { pais: 'Chile', empresa: 'Peterson' } },
      { id: 'p3', data: { pais: 'Peru', empresa: 'TLR' } },
    ];
    const now = [
      { id: 'n1', data: { pais: 'Argentina', empresa: 'CU Barcos', cuenta: 'BACFGBAR', codigo: '538' } },
      { id: 'n2', data: { pais: 'Chile', empresa: 'Peterson Solutions', _from: 'p2' } },
      { id: 'n3', data: { pais: 'Uruguay', empresa: 'CMA' } },
    ];
    const m = matchRows('variables', prev, now);
    expect(m.get('n1').id).toBe('p1');
    expect(m.get('n2').id).toBe('p2');
    expect(m.has('n3')).toBe(false);
    expect(rowNaturalKey('crm', { entidad: ' 538 - Control Union  Argentina ' })).toBe('538 - control union argentina');
  });
});

describe('mes nuevo', () => {
  it('copia Fijo, MKT y CRM; Variables sin cargos; sin notas ni estado; recuerda de dónde vino', () => {
    let n = 0;
    const rows = [
      { id: 'f', sheet: 'fijo', position: 1, data: { pais: 'Chile', valor: '350', estado: 'cobrado' } },
      { id: 'v', sheet: 'variables', position: 2, data: { pais: 'USA', empresa: 'Peterson', 'cargo:a': { cat: 'bbdd', precio: '250' }, bbddPrecio: '1' } },
      { id: 'e1', sheet: 'crm_extra', position: 0, data: { concepto: 'Horas', monto: '10' } },
      { id: 'e2', sheet: 'crm_extra', position: 1, data: { kind: 'total', sumOf: ['licencias', 'e1'] } },
      { id: 'n', sheet: 'notas', data: { variables: 'algo' } },
    ];
    const out = buildMonthCopy(rows, { toMonth: '2026-11', newId: () => `new${(n += 1)}` });
    expect(out.map((r) => r.sheet)).toEqual(['fijo', 'variables', 'crm_extra', 'crm_extra']);
    expect(out.every((r) => r.month === '2026-11')).toBe(true);
    expect(out[0].data).toEqual({ pais: 'Chile', valor: '350', _from: 'f' });
    expect(out[1].data).toEqual({ pais: 'USA', empresa: 'Peterson', _from: 'v' });
    expect(out[3].data.sumOf).toEqual(['licencias', out[2].id]);
    expect(rows[1].data['cargo:a'].precio).toBe('250'); // no toca el original
    const withVars = buildMonthCopy(rows, { toMonth: '2026-11', copyVariables: true, newId: () => 'id' });
    expect(withVars[1].data['cargo:a'].precio).toBe('250');
  });
  it('mes siguiente, anterior y posiciones', () => {
    expect(nextMonthKey('2026-10')).toBe('2026-11');
    expect(nextMonthKey('2026-12')).toBe('2027-01');
    expect(previousMonthKey('2027-01')).toBe('2026-12');
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

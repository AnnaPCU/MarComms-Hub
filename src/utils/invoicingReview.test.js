// ════════════════════════════════════════════════════════════════════
// Tests para utils/invoicingReview — Para revisar y Qué cambió
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { computeMonthDiffs, monthDiff, monthWarnings, rowLabel } from './invoicingReview';
import { FIJO_COLUMNS } from '@/constants/invoicing';

describe('para revisar', () => {
  const rows = [
    { id: 'g', month: '2026-10', sheet: 'fijo', position: 1, data: { kind: 'grupo', pais: 'Argentina', empresa: 'Control Union', valor: '450', website: '=350/4*3' } },
    { id: 'a', month: '2026-10', sheet: 'fijo', position: 2, data: { pais: 'Argentina', empresa: 'CU Barcos', valor: '=grupo/3', website: '=grupo/3' } },
    { id: 'b', month: '2026-10', sheet: 'fijo', position: 3, data: { pais: 'Argentina', empresa: 'CU Warrants', valor: '=grupo/3', website: '=grupo/3', codigo: '?' } },
    { id: 'c', month: '2026-10', sheet: 'fijo', position: 4, data: { pais: 'Chile', empresa: 'Peterson', cuenta: '?', plan: '1500', totalManual: '1500' } },
    { id: 'd', month: '2026-10', sheet: 'fijo', position: 5, data: { pais: 'Peru', empresa: 'Control Union', valor: 'cuatrocientos' } },
    { id: 'v', month: '2026-10', sheet: 'variables', position: 1, data: { pais: 'España', empresa: 'Certificaciones', 'cargo:a': { cat: 'campanas', detalle: 'Paid', precio: '175' } } },
    { id: 'l1', month: '2026-10', sheet: 'crm', position: 1, data: { entidad: '538', monto: '290' } },
    { id: 'x1', month: '2026-10', sheet: 'crm_extra', position: 1, data: { concepto: 'Horas', monto: '1500', moneda: 'EUR' } },
    { id: 'x2', month: '2026-10', sheet: 'crm_extra', position: 2, data: { kind: 'total', concepto: 'TOTAL CRM Licencias', moneda: 'USD', sumOf: ['licencias', 'x1'] } },
  ];
  const items = monthWarnings(rows);
  const kinds = items.map((it) => it.id.split(':')[0]);
  it('códigos en ?, totales a mano, números que no son números, grupo que no cuadra, monedas mezcladas, cargos sin CC', () => {
    expect(kinds).toEqual(expect.arrayContaining(['interrogante', 'total-manual', 'error', 'grupo', 'moneda', 'sin-cc']));
    expect(items.filter((it) => it.id.startsWith('interrogante'))).toHaveLength(2);
    const manual = items.find((it) => it.id.startsWith('total-manual'));
    expect(manual.level).toBe('warn');
    expect(manual.text).toContain('la suma de la fila daría 0');
    const group = items.filter((it) => it.id.startsWith('grupo'));
    expect(group).toHaveLength(2); // Valor y Website
    expect(group[0].text).toContain('suman 300 de 450');
    expect(items.find((it) => it.id.startsWith('moneda')).text).toContain('«Horas» en EUR');
    expect(items.find((it) => it.id.startsWith('sin-cc')).sheet).toBe('variables');
    expect(items.find((it) => it.id.startsWith('error')).text).toContain('«cuatrocientos»');
  });
  it('ids estables: cambian si cambia el dato', () => {
    const again = monthWarnings(rows.map((r) => (r.id === 'c' ? { ...r, data: { ...r.data, totalManual: '1600' } } : r)));
    expect(again.find((it) => it.id.startsWith('total-manual')).id).not.toBe(items.find((it) => it.id.startsWith('total-manual')).id);
    expect(rowLabel('fijo', rows[1].data)).toBe('Argentina · CU Barcos');
    expect(rowLabel('crm', { entidad: 'x' })).toBe('x');
  });
});

describe('qué cambió', () => {
  const prevRows = [
    { id: 'p1', data: { pais: 'Chile', empresa: 'CU Certificaciones', valor: '350', website: '350' } },
    { id: 'p2', data: { pais: 'Peru', empresa: 'Control Union', valor: '450' } },
    { id: 'p3', data: { pais: 'RD', empresa: 'Control Union', valor: '200' } },
  ];
  const rows = [
    { id: 'n1', data: { pais: 'Chile', empresa: 'CU Certificaciones', valor: '=200*2', website: '350', _from: 'p1' } },
    { id: 'n2', data: { pais: 'Peru', empresa: 'Control Union', valor: '450', estado: 'facturado' } },
    { id: 'n4', data: { pais: 'Uruguay', empresa: 'Control Union', valor: '200' } },
  ];
  it('filas nuevas, que ya no están y celdas que cambiaron (el estado no cuenta)', () => {
    const d = monthDiff({ sheet: 'fijo', columns: FIJO_COLUMNS, rows, prevRows });
    expect(d.added.map((r) => r.id)).toEqual(['n4']);
    expect(d.removed.map((r) => r.id)).toEqual(['p3']);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].cells.map((c) => [c.key, c.before, c.after])).toEqual([['valor', 350, 400], ['total', 700, 750]]);
    expect(d.cells.n1.valor.before).toBe(350);
    expect(d.count).toBe(3);
  });
  it('las cuatro hojas de un mes', () => {
    const all = [
      ...prevRows.map((r) => ({ ...r, month: '2026-09', sheet: 'fijo', position: 1 })),
      ...rows.map((r) => ({ ...r, month: '2026-10', sheet: 'fijo', position: 1 })),
      { id: 'c1', month: '2026-09', sheet: 'crm', position: 1, data: { entidad: '538 - CU Argentina', monto: '290' } },
      { id: 'c2', month: '2026-10', sheet: 'crm', position: 1, data: { entidad: '538 - CU Argentina', monto: '300' } },
      { id: 'v1', month: '2026-09', sheet: 'variables', position: 1, data: { pais: 'España', empresa: 'Certificaciones', campanasPrecio: '175' } },
      { id: 'v2', month: '2026-10', sheet: 'variables', position: 1, data: { pais: 'España', empresa: 'Certificaciones', 'cargo:a': { cat: 'campanas', precio: '175' }, 'cargo:b': { cat: 'campanas', precio: '440' } } },
    ];
    const diffs = computeMonthDiffs(all, '2026-10', '2026-09');
    expect(diffs.fijo.count).toBe(3);
    expect(diffs.crm.changed[0].cells.map((c) => [c.key, c.before, c.after])).toEqual([['monto', 290, 300]]);
    expect(diffs.variables.changed[0].cells.map((c) => c.key)).toEqual(['campanasDetalle', 'campanasPrecio', 'total']);
    expect(diffs.mkt.count).toBe(0);
  });
});

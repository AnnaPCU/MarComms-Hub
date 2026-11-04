// ════════════════════════════════════════════════════════════════════
// Tests para utils/invoicingExport, invoicingPdf e invoicingHistory
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { excelFormula, exportFilename, monthWorkbookSpec } from './invoicingExport';
import { monthPdfContent } from './invoicingPdf';
import { changeKeyLabel, changeTitle, changeValueText, dayLabel, groupChanges } from './invoicingHistory';

const rows = [
  { id: 'g', month: '2026-10', sheet: 'fijo', position: 1, data: { kind: 'grupo', pais: 'Argentina', empresa: 'Control Union', plan: 'Activo', valor: '450', website: '=350/4*3' } },
  { id: 'a', month: '2026-10', sheet: 'fijo', position: 2, data: { pais: 'Argentina', empresa: 'CU Barcos', cuenta: 'BACFGBAR', codigo: '538', valor: '=grupo/3', website: '=grupo/3', estado: 'facturado' } },
  { id: 'b', month: '2026-10', sheet: 'fijo', position: 3, data: { pais: 'Chile', empresa: 'Peterson', valor: '100', website: '59', totalManual: '200' } },
  { id: 'v', month: '2026-10', sheet: 'variables', position: 1, data: { pais: 'España', cuenta: 'GRUNESPAÑA', codigo: '518', empresa: 'Certificaciones', 'cargo:a': { cat: 'campanas', detalle: 'Paid', cc: 'campañas', precio: '175', pos: 0 }, 'cargo:b': { cat: 'campanas', detalle: 'ISO', precio: '=220*2', pos: 1 }, 'cargo:c': { cat: 'content', detalle: 'Presentación', cc: 'content', precio: '50', pos: 2 } } },
  { id: 'm', month: '2026-10', sheet: 'mkt', position: 1, data: { cliente: 'CU Canada', bbdd: '150', email: '150', paid: '150', descripcion: 'Plan' } },
  { id: 'ml', month: '2026-10', sheet: 'mkt_libre', position: 0, data: { A1: 'Nota', B2: '=100*2' } },
  { id: 'c1', month: '2026-10', sheet: 'crm', position: 1, data: { entidad: '538 - CU Argentina', autoriza: 'Juan', monto: '290', estado: 'cobrado' } },
  { id: 'x1', month: '2026-10', sheet: 'crm_extra', position: 1, data: { concepto: 'Horas', monto: '1500', moneda: 'EUR' } },
  { id: 'x2', month: '2026-10', sheet: 'crm_extra', position: 2, data: { kind: 'total', concepto: 'TOTAL', moneda: 'USD', sumOf: ['licencias', 'x1'] } },
  { id: 'n', month: '2026-10', sheet: 'notas', position: 0, data: { variables: 'invoice Delphy' } },
  { id: 'o', month: null, sheet: 'entidades', position: 1, data: { oficina: 'CU Argentina - Barcos', cuenta: 'BACFGBAR', responsables: 'SM' } },
];

describe('Excel', () => {
  it('fórmulas: =grupo/3 apunta a la celda de la fila gris', () => {
    const letterOf = (k) => ({ valor: 'G', website: 'H' })[k];
    expect(excelFormula('=grupo/3', { key: 'valor', groupRow: 3, letterOf })).toBe('G3/3');
    expect(excelFormula('=grupo.website/2', { key: 'valor', groupRow: 3, letterOf })).toBe('H3/2');
    expect(excelFormula('=350/4*3', {})).toBe('350/4*3');
    expect(excelFormula('=262,5/3', {})).toBe('262.5/3');
    expect(excelFormula('=grupo/3', { key: 'valor', groupRow: null, letterOf })).toBeNull();
    expect(excelFormula('450', {})).toBeNull();
    expect(exportFilename('2026-10', 'xlsx')).toBe('Facturacion_MarComms_Octubre_2026.xlsx');
  });
  it('las cinco hojas, con los nombres del original y las fórmulas', () => {
    const spec = monthWorkbookSpec(rows, '2026-10');
    expect(spec.map((s) => s.name)).toEqual(['Fijo y facturas -CARGA ADMIN', 'Variables (todos)', 'MKT Plan (Felo)', 'CRM (Ale)', 'Entidades']);
    const fijo = spec[0];
    expect(fijo.cells.F1).toEqual({ v: 'CC: Fee fijo' });
    expect(fijo.merges).toEqual(['F1:H1']);
    expect(fijo.cells.G3).toEqual({ v: 450 });
    expect(fijo.cells.H3).toEqual({ f: '350/4*3', v: 262.5 });
    expect(fijo.cells.G4).toEqual({ f: 'G3/3', v: 150 });
    expect(fijo.cells.H4).toEqual({ f: 'H3/3', v: 87.5 });
    expect(fijo.cells.L3).toBeUndefined(); // la fila gris no tiene total
    expect(fijo.cells.L4).toEqual({ f: 'G4+H4+J4', v: 237.5 });
    expect(fijo.cells.L5).toEqual({ v: 200 }); // total a mano
    expect(fijo.cells.M4).toEqual({ v: 'Facturado' });
    expect(fijo.cells.L6).toEqual({ f: 'SUM(L3:L5)', v: 437.5 });
    const vars = spec[1];
    expect(vars.cells.E1).toEqual({ v: 'CC: Campañas' });
    expect(vars.cells.E3).toEqual({ v: 'Paid + ISO' });
    expect(vars.cells.G3).toEqual({ v: 615 });
    expect(vars.cells.P3).toEqual({ v: 50 });
    expect(vars.cells.W3).toEqual({ f: 'SUM(G3,J3,M3,P3,S3,V3)', v: 665 });
    const mkt = spec[2];
    expect(mkt.cells.F4).toEqual({ f: 'SUM(B4:D4)', v: 450 });
    expect(mkt.cells.A7).toEqual({ v: 'Nota' });
    expect(mkt.cells.B8).toEqual({ f: '100*2', v: 200 });
    const crm = spec[3];
    expect(crm.cells.C5).toEqual({ v: 290 });
    expect(crm.cells.C6).toEqual({ f: 'SUM(C5:C5)', v: 290 });
    expect(crm.cells.C8).toEqual({ v: 1500 });
    expect(crm.cells.C9).toEqual({ f: 'C6+C8', v: 1790 });
    expect(spec[4].cells.A2).toEqual({ v: 'CU Argentina - Barcos' });
  });
});

describe('PDF', () => {
  it('lo que va en el resumen del mes', () => {
    const c = monthPdfContent(rows, '2026-10');
    expect(c.title).toBe('Facturación MarComms · Octubre 2026');
    expect(c.summary.fijo).toBe(437.5);
    expect(c.fijo[1].cells).toEqual(['Argentina', 'CU Barcos', 'BACFGBAR', '538', '', '150', '87,5', '', '237,5', 'Facturado']);
    expect(c.fijo[0].group).toBe(true);
    expect(c.variables[0].cells[2]).toBe('Campañas: Paid (campañas) · 175\nCampañas: ISO · 440\nContent: Presentación (content) · 50');
    expect(c.crm[0].cells).toEqual(['538 - CU Argentina', 'Juan', '290', 'Cobrado']);
    expect(c.crmExtra[1]).toMatchObject({ total: true, cells: ['TOTAL', '', '1.790', 'USD'] });
    expect(c.notes).toEqual([{ sheet: 'variables', text: 'invoice Delphy' }]);
  });
});

describe('historial', () => {
  it('etiquetas de celdas y valores', () => {
    expect(changeKeyLabel('fijo', 'valor')).toBe('Valor');
    expect(changeKeyLabel('fijo', 'estado')).toBe('Estado');
    expect(changeKeyLabel('variables', 'cargo:abc')).toBe('Cargo');
    expect(changeKeyLabel('variables', 'campanasPrecio')).toBe('Campañas · Precio');
    expect(changeKeyLabel('mkt_libre', 'A11')).toBe('Celda A11');
    expect(changeKeyLabel('notas', 'variables')).toBe('Notas · Variables');
    expect(changeValueText('fijo', 'estado', 'cobrado')).toBe('Cobrado');
    expect(changeValueText('variables', 'cargo:a', { cat: 'campanas', detalle: 'Paid', precio: '175' })).toBe('Campañas · Paid · 175');
    expect(changeValueText('fijo', 'valor', null)).toBe('—');
    expect(changeValueText('crm_extra', 'sumOf', ['licencias', 'x'])).toBe('2 referencias');
  });
  it('agrupa por día y junta las filas creadas de a muchas', () => {
    const at = (s) => `2026-11-04T${s}:00-03:00`;
    const changes = [
      { id: 5, action: 'update', sheet: 'fijo', key: 'valor', by: 'Anna', month: '2026-10', at: at('11:00'), rowLabel: 'Chile · Peterson' },
      { id: 4, action: 'insert', sheet: 'fijo', by: 'Felo', month: '2026-11', at: at('10:31') },
      { id: 3, action: 'insert', sheet: 'crm', by: 'Felo', month: '2026-11', at: at('10:30') },
      { id: 2, action: 'insert', sheet: 'fijo', by: 'Anna', month: '2026-11', at: at('10:30') },
      { id: 1, action: 'delete', sheet: 'fijo', by: 'Anna', month: '2026-10', at: '2026-11-03T18:00:00-03:00', rowLabel: 'Peru · TLR' },
    ];
    const days = groupChanges(changes);
    expect(days.map((d) => [d.day, d.items.length])).toEqual([['2026-11-04', 3], ['2026-11-03', 1]]);
    expect(days[0].items[1]).toMatchObject({ bulk: true, count: 2, by: 'Felo' });
    expect(changeTitle(days[0].items[1])).toBe('2 filas creadas');
    expect(changeTitle(days[0].items[0])).toBe('Valor');
    expect(changeTitle(days[1].items[0])).toBe('Fila eliminada');
    expect(dayLabel('2026-11-04', '2026-11-04')).toBe('Hoy');
    expect(dayLabel('2026-11-03', '2026-11-04')).toBe('Ayer');
    expect(dayLabel('2026-10-28', '2026-11-04')).toBe('28 de octubre 2026');
  });
});

import { describe, expect, it } from 'vitest';
import { categoryExamples, monthBreakdown, sharePct } from './invoicingBreakdown';
import { monthSummary } from './invoicing';

const M = '2026-10';
const fijo = [
  { id: 'g1', sheet: 'fijo', month: M, position: 1, data: { kind: 'grupo', pais: 'Argentina', empresa: 'Control Union', valor: '450', website: '262,5' } },
  { id: 'a1', sheet: 'fijo', month: M, position: 2, data: { pais: 'Argentina', empresa: 'CU Barcos', cuenta: 'BACFGBAR', plan: 'Fijo', valor: '=grupo/3', website: '=grupo/3' } },
  { id: 'a2', sheet: 'fijo', month: M, position: 3, data: { pais: 'Argentina', empresa: 'Peterson', cuenta: 'PSUNGPS', valor: '0', website: '0', planMkt: '1.000' } },
  { id: 'b1', sheet: 'fijo', month: M, position: 4, data: { pais: 'Brasil', empresa: 'Warrants', valor: '100', totalManual: '120' } },
  { id: 'z1', sheet: 'fijo', month: M, position: 5, data: { pais: 'Chile', empresa: 'Vacía' } },
];
const variables = [
  { id: 'v1', sheet: 'variables', month: M, position: 1, data: { pais: 'España (se manda por mail)', empresa: 'Certificaciones', cuenta: 'GRUNESPAÑA', 'cargo:x': { cat: 'campanas', detalle: 'Fee de gestion paid media', cc: 'campañas', precio: '175', pos: 0 }, 'cargo:y': { cat: 'rara', detalle: 'Sin categoría', cc: '', precio: '25', pos: 1 } } },
  { id: 'v2', sheet: 'variables', month: M, position: 2, data: { pais: 'Estados Unidos', empresa: 'Peterson', eventosDetalle: 'Webinar', eventosCc: 'events', eventosPrecio: '500' } },
  { id: 'v3', sheet: 'variables', month: M, position: 3, data: { pais: 'Mexico', empresa: 'Certificaciones', 'cargo:m': { cat: 'content', detalle: ' Presentación ', cc: 'content', precio: '50', pos: 0 }, totalManual: '80' } },
  { id: 'v4', sheet: 'variables', month: M, position: 4, data: { pais: 'Chile', empresa: 'X', 'cargo:n': { cat: 'website', detalle: 'solo detalle, sin precio', cc: 'website', precio: '', pos: 0 } } },
];
const others = [
  { id: 'n1', sheet: 'notas', month: M, position: 1, data: { fijo: 'nota' } },
  { id: 'k1', sheet: 'mkt', month: M, position: 1, data: { cliente: 'Argentina', bbdd: '100' } },
];
const rows = [...fijo, ...variables, ...others];

describe('monthBreakdown', () => {
  const b = monthBreakdown(rows);
  const seg = (id) => b.segments.find((s) => s.id === id);

  it('da los mismos números que monthSummary', () => {
    const s = monthSummary(rows);
    expect(b.fijo).toBe(s.fijo);
    expect(b.variables).toBe(s.variables);
    expect(b.total).toBe(s.fijoMasVariables);
    expect(seg('campanas').total).toBe(s.variablesByCategory.campanas);
    expect(seg('eventos').total).toBe(s.variablesByCategory.eventos);
    expect(seg('content').total).toBe(s.variablesByCategory.content);
  });

  it('Fijo: filas con plata agrupadas por país, =grupo/3 resuelto, las grises y las vacías no están', () => {
    expect(b.fijo).toBe(1357.5);
    expect(seg('fijo').count).toBe(3);
    expect(seg('fijo').groups.map((g) => [g.label, g.total, g.items.length])).toEqual([['Argentina', 1237.5, 2], ['Brasil', 120, 1]]);
    const barcos = seg('fijo').groups[0].items[0];
    expect(barcos).toMatchObject({ empresa: 'CU Barcos', cuenta: 'BACFGBAR', plan: 'Fijo', valor: 150, website: 87.5, planMkt: 0, total: 237.5, manual: false });
    expect(seg('fijo').groups[1].items[0]).toMatchObject({ total: 120, manual: true });
  });

  it('Variables: un ítem por cargo con precio, en su categoría; la desconocida cae en Otros; el formato viejo también se lee', () => {
    expect(seg('campanas').items).toHaveLength(1);
    expect(seg('campanas').items[0]).toMatchObject({ rowId: 'v1', pais: 'España (se manda por mail)', detalle: 'Fee de gestion paid media', cc: 'campañas', precio: 175 });
    expect(seg('otros').items.map((i) => [i.detalle, i.precio])).toEqual([['Sin categoría', 25]]);
    expect(seg('eventos').items[0]).toMatchObject({ detalle: 'Webinar', cc: 'events', precio: 500 });
    expect(seg('content').items[0].detalle).toBe('Presentación');
    expect(seg('website')).toMatchObject({ total: 0, count: 0, items: [] });
    expect(seg('bbdd')).toMatchObject({ total: 0, count: 0 });
  });

  it('totales a mano: variables es el total de la hoja, chargesSum lo que suman los cargos', () => {
    expect(b.variables).toBe(780);
    expect(b.chargesSum).toBe(750);
    expect(b.manualRows).toEqual([{ id: 'v3', pais: 'Mexico', empresa: 'Certificaciones', cuenta: '', total: 80, charges: 50 }]);
    expect(b.total).toBe(2137.5);
  });

  it('share = parte del mes, en el orden de la barra', () => {
    expect(b.segments.map((s) => s.id)).toEqual(['fijo', 'campanas', 'bbdd', 'eventos', 'content', 'website', 'otros']);
    expect(seg('fijo').share).toBeCloseTo(1357.5 / 2137.5, 10);
    expect(seg('website').share).toBe(0);
    expect(sharePct(seg('fijo').share)).toBe('63,5 %');
    expect(sharePct(0)).toBe('0 %');
    expect(sharePct(1)).toBe('100 %');
  });

  it('los subtotales por país se redondean una sola vez (266,67 × 3 + 159 = 959, no 959,01)', () => {
    const brasil = [
      { id: 'bg', sheet: 'fijo', month: M, position: 1, data: { kind: 'grupo', pais: 'Brasil', valor: '450', website: '350' } },
      ...['x', 'y', 'z'].map((k, i) => ({ id: `b${k}`, sheet: 'fijo', month: M, position: 2 + i, data: { pais: 'Brasil', empresa: `CU ${k}`, valor: '=grupo/3', website: '=grupo/3' } })),
      { id: 'bp', sheet: 'fijo', month: M, position: 9, data: { pais: 'Brasil', empresa: 'Peterson', valor: '100', website: '59' } },
    ];
    const r = monthBreakdown(brasil);
    expect(r.segments[0].groups[0].total).toBe(959);
    expect(r.segments[0].groups[0].items.map((i) => i.total)).toEqual([266.67, 266.67, 266.67, 159]);
    expect(r.fijo).toBe(959);
  });

  it('mes vacío', () => {
    expect(monthBreakdown([])).toMatchObject({ total: 0, fijo: 0, variables: 0, chargesSum: 0, manualRows: [] });
    expect(monthBreakdown([]).segments.every((s) => s.share === 0 && s.count === 0)).toBe(true);
  });
});

describe('categoryExamples', () => {
  const sep = { id: 's1', sheet: 'variables', month: '2026-09', position: 9, data: { pais: 'Portugal', empresa: 'Certificaciones', 'cargo:p': { cat: 'campanas', detalle: 'campañas de paid media', cc: 'campañas', precio: '175', pos: 0 } } };
  const noMonth = { id: 'e1', sheet: 'variables', month: null, position: 1, data: { pais: 'Entidades', 'cargo:q': { cat: 'campanas', detalle: 'no debería aparecer', cc: 'campañas', precio: '1', pos: 0 } } };
  const ex = categoryExamples([sep, ...rows, noMonth]);

  it('cargos reales por categoría, más reciente primero, con los CC usados', () => {
    expect(ex.campanas.items.map((i) => [i.month, i.detalle])).toEqual([['2026-10', 'Fee de gestion paid media'], ['2026-09', 'campañas de paid media']]);
    expect(ex.campanas.ccUsed).toEqual({ 'campañas': 2 });
    expect(ex.eventos.items[0]).toMatchObject({ month: '2026-10', pais: 'Estados Unidos', empresa: 'Peterson', detalle: 'Webinar', cc: 'events', precio: 500 });
  });

  it('Otros junta la categoría desconocida y marca los cargos sin CC', () => {
    expect(ex.otros.items.map((i) => i.detalle)).toEqual(['Sin categoría']);
    expect(ex.otros.ccUsed).toEqual({ '(sin CC)': 1 });
  });

  it('un cargo con detalle y sin precio cuenta como ejemplo; sin mes o sin nada, no', () => {
    expect(ex.website.items.map((i) => [i.detalle, i.precio])).toEqual([['solo detalle, sin precio', 0]]);
    expect(ex.bbdd.items).toEqual([]);
    expect(ex.campanas.items.some((i) => i.detalle === 'no debería aparecer')).toBe(false);
  });
});

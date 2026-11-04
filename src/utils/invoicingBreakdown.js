// ════════════════════════════════════════════════════════════════════
// invoicingBreakdown — «Mes a mes»: desglose de un mes por categoría
// (sin React)
// ════════════════════════════════════════════════════════════════════
//   monthBreakdown(rows del mes) → { total, fijo, variables, chargesSum,
//     manualRows, segments }
//     segments: los mismos tramos de la barra del gráfico, en el mismo
//     orden y con los mismos números que monthSummary: Fijo y facturas
//     (filas con plata agrupadas por país; las grises no suman) y las seis
//     categorías de Variables (cada cargo con precio; una categoría
//     desconocida cae en Otros). Cada tramo lleva total, share (parte del
//     mes) y count. chargesSum es lo que suman los cargos; si difiere de
//     variables es porque hay totales escritos a mano (manualRows).
// ════════════════════════════════════════════════════════════════════

import { FIJO_CHART_COLOR, VARIABLE_CATEGORIES } from '@/constants/invoicing';
import { cellNumber, countryGroupKey, evalCell, fijoContext, isGroupRow, round2, rowTotal, sortRows, variableCharges } from './invoicing';

const hasManual = (data = {}) => evalCell(data.totalManual).value !== null;
const place = (data = {}) => ({ pais: data.pais || '', empresa: data.empresa || '', cuenta: data.cuenta || '' });
const chargesOf = (charges = []) => round2(charges.reduce((s, ch) => s + cellNumber(ch.precio), 0));

export const monthBreakdown = (rows = []) => {
  const of = (sheet) => sortRows(rows.filter((r) => r.sheet === sheet));

  // Fijo: cada fila con plata, agrupada por país (las grises no suman)
  const fijoRows = of('fijo');
  const ctxById = fijoContext(fijoRows);
  const groups = [];
  const byKey = new Map();
  let fijo = 0;
  fijoRows.forEach((r) => {
    if (isGroupRow(r.data)) return;
    const ctx = ctxById[r.id];
    const total = rowTotal('fijo', r.data, ctx) ?? 0;
    fijo += total;
    if (!total) return;
    const n = (k) => cellNumber(r.data[k], { ...ctx, key: k });
    const item = { id: r.id, ...place(r.data), plan: r.data.plan || '', valor: n('valor'), website: n('website'), planMkt: n('planMkt'), total: round2(total), manual: hasManual(r.data) };
    const key = countryGroupKey(item.pais);
    let g = byKey.get(key);
    if (!g) { g = { key, label: key, sum: 0, items: [] }; byKey.set(key, g); groups.push(g); }
    g.items.push(item);
    g.sum += total;
  });
  // Se suma sin redondear y se redondea una sola vez (si no, 266,666… × 3 da 959,01 en vez de 959)
  groups.forEach((g) => { g.total = round2(g.sum); delete g.sum; });

  // Variables: cada cargo con precio, en su categoría
  const cats = VARIABLE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, short: c.short, color: c.color, cc: c.cc, sum: 0, items: [] }));
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const manualRows = [];
  let variables = 0;
  of('variables').forEach((r) => {
    const charges = variableCharges(r.data);
    const total = rowTotal('variables', r.data) ?? 0;
    variables += total;
    if (hasManual(r.data)) manualRows.push({ id: r.id, ...place(r.data), total: round2(total), charges: chargesOf(charges) });
    charges.forEach((ch) => {
      const precio = cellNumber(ch.precio);
      if (!precio) return;
      const c = catById[ch.cat] || catById.otros;
      c.items.push({ id: `${r.id}:${ch.id}`, rowId: r.id, ...place(r.data), detalle: String(ch.detalle || '').trim(), cc: String(ch.cc || '').trim(), precio });
      c.sum += precio;
    });
  });
  cats.forEach((c) => { c.total = round2(c.sum); delete c.sum; });

  const total = round2(fijo + variables);
  const segments = [
    { id: 'fijo', label: 'Fijo y facturas', short: 'Fijo', color: FIJO_CHART_COLOR, total: round2(fijo), count: groups.reduce((s, g) => s + g.items.length, 0), groups },
    ...cats.map((c) => ({ ...c, count: c.items.length })),
  ].map((s) => ({ ...s, share: total ? s.total / total : 0 }));
  return { total, fijo: round2(fijo), variables: round2(variables), chargesSum: round2(cats.reduce((s, c) => s + c.total, 0)), manualRows, segments };
};

// Parte del mes como texto: 0,125 → «12,5 %»
export const sharePct = (share) => `${(Math.round((share || 0) * 1000) / 10).toString().replace('.', ',')} %`;

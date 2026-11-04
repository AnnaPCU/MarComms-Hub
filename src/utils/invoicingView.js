// ════════════════════════════════════════════════════════════════════
// invoicingView — Filtrar, agrupar por país y columnas fijas (sin React)
// ════════════════════════════════════════════════════════════════════
//   filterRows(rows, { q, brand })     → las filas que pasan el buscador y
//                                        el filtro de marca
//   groupRows(rows, { by, collapsed }) → [{ key, label, rows, hidden }]
//   bandTotal(sheet, rows, ctxById)    → subtotal de un grupo de filas
//   stickyOffsets(columns, compact)    → { [key]: left } para las columnas
//                                        fijas de la vista compacta
//   cleanCountry(text)                 → el país como en el Hub ("USA" →
//                                        "Estados Unidos", "RD" → "Rep. Dominicana")
// ════════════════════════════════════════════════════════════════════

import { INVOICING_COUNTRY_NAMES } from '@/constants/invoicing';
import { brandOfRow, cellNumber, countryGroupKey, rowMatches, rowTotal } from '@/utils/invoicing';
import { normalizeCountryNames } from '@/utils/billing';

export const NUM_COL_WIDTH = 46;

export const cleanCountry = (text) => {
  const key = normalizeCountryNames(text);
  return INVOICING_COUNTRY_NAMES[key] || key;
};

export const filterRows = (rows = [], { q = '', brand = '' } = {}) => rows.filter((r) => (!brand || brandOfRow(r.data) === brand) && rowMatches(r.data, q));

// Agrupa filas consecutivas por país (groupBy 'pais'). Sin groupBy devuelve
// un solo grupo sin etiqueta. collapsed: Set de claves cerradas.
export const groupRows = (rows = [], { by = null, collapsed = new Set() } = {}) => {
  if (!by) return [{ key: null, label: null, rows, hidden: false }];
  const groups = [];
  rows.forEach((r) => {
    const key = countryGroupKey(r.data?.[by]);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else groups.push({ key, label: key, rows: [r], hidden: collapsed.has(key) });
  });
  return groups;
};

export const bandTotal = (sheet, rows = [], ctxById = {}) => {
  const sum = rows.reduce((s, r) => s + (sheet === 'crm' ? cellNumber(r.data?.monto) : rowTotal(sheet, r.data, ctxById[r.id]) ?? 0), 0);
  return Math.round(sum * 100) / 100;
};

// Columnas fijas a la izquierda (vista compacta): cada una queda pegada a
// la anterior, como si fueran las primeras de la tabla
export const stickyOffsets = (columns = [], compact = false) => {
  const out = {};
  if (!compact) return out;
  let left = NUM_COL_WIDTH;
  columns.forEach((c) => { if (c.sticky) { out[c.key] = left; left += c.width; } });
  return out;
};

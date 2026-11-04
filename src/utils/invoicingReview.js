// ════════════════════════════════════════════════════════════════════
// invoicingReview — «Para revisar» y «Qué cambió» de Facturación
// ════════════════════════════════════════════════════════════════════
//   rowLabel(sheet, data)       → «Argentina · CU Barcos»
//   monthWarnings(rows)         → avisos del mes (ids estables: se pueden
//                                 borrar y vuelven si cambia el dato)
//   monthDiff({...})            → diferencias de una hoja contra el mes
//                                 anterior (filas nuevas, que ya no están
//                                 y celdas que cambiaron)
// ════════════════════════════════════════════════════════════════════

import { CRM_COLUMNS, CRM_LICENSES_REF, FIJO_COLUMNS, MKT_COLUMNS, SHEET_LABELS, variablesColumns } from '@/constants/invoicing';
import {
  cellNumber, crmExtraValue, crmLicenses, evalCell, fijoContext, formatAmount, groupMembers, isGroupRow, matchRows,
  rowTotal, sortRows, usesGroup, variableCharges,
} from '@/utils/invoicing';
import { chargeSummary, variablesViewData } from '@/utils/invoicingCharges';

export const rowLabel = (sheet, data = {}) => {
  if (sheet === 'fijo' || sheet === 'variables') return [data.pais, data.empresa].filter(Boolean).join(' · ') || 'Fila sin nombre';
  if (sheet === 'crm') return data.entidad || 'Entidad sin nombre';
  if (sheet === 'crm_extra') return data.concepto || 'Concepto sin nombre';
  if (sheet === 'mkt') return data.cliente || 'Plan sin nombre';
  if (sheet === 'entidades') return data.oficina || 'Oficina sin nombre';
  return 'Fila';
};

const near = (a, b) => Math.abs(a - b) < 0.005;

// ── Para revisar ──
export const monthWarnings = (rows = []) => {
  const items = [];
  const push = (id, sheet, rowId, level, text) => items.push({ id, sheet, rowId, level, text });
  const of = (s) => sortRows(rows.filter((r) => r.sheet === s));
  const fijo = of('fijo'); const variables = of('variables'); const mkt = of('mkt'); const crm = of('crm'); const extra = of('crm_extra');
  const ctxById = fijoContext(fijo);

  // Códigos y entidades en «?»
  [...fijo, ...variables].forEach((r) => {
    ['codigo', 'cuenta'].forEach((k) => {
      if (String(r.data?.[k] || '').trim() === '?') push(`interrogante:${r.id}:${k}`, r.sheet, r.id, 'info', `${rowLabel(r.sheet, r.data)}: ${k === 'codigo' ? 'el código Smartsheet' : 'la entidad'} está en «?».`);
    });
  });

  // Totales escritos a mano
  [...fijo, ...variables, ...mkt].forEach((r) => {
    const manual = evalCell(r.data?.totalManual);
    if (manual.value === null) return;
    const { totalManual, ...rest } = r.data;
    const computed = rowTotal(r.sheet, rest, ctxById[r.id]) ?? 0;
    const same = near(manual.value, computed);
    push(`total-manual:${r.id}:${r.data.totalManual}`, r.sheet, r.id, same ? 'info' : 'warn', `${rowLabel(r.sheet, r.data)}: el total está escrito a mano (${formatAmount(manual.value)})${same ? ', igual a la suma.' : `; la suma de la fila daría ${formatAmount(computed)}.`}`);
  });

  // Números que no son números
  const numeric = { fijo: FIJO_COLUMNS, mkt: MKT_COLUMNS };
  Object.entries(numeric).forEach(([sheet, cols]) => {
    of(sheet).forEach((r) => cols.filter((c) => c.type === 'number').forEach((c) => {
      const e = evalCell(r.data?.[c.key], ctxById[r.id] ? { ...ctxById[r.id], key: c.key } : undefined);
      if (e.error) push(`error:${r.id}:${c.key}:${r.data[c.key]}`, sheet, r.id, 'warn', `${rowLabel(sheet, r.data)} · ${c.label}: «${r.data[c.key]}» no es un número ni una cuenta, cuenta como 0.`);
    }));
  });
  crm.forEach((r) => {
    if (evalCell(r.data?.monto).error) push(`error:${r.id}:monto:${r.data.monto}`, 'crm', r.id, 'warn', `${rowLabel('crm', r.data)}: «${r.data.monto}» no es un número ni una cuenta, cuenta como 0.`);
  });
  variables.forEach((r) => variableCharges(r.data).forEach((c) => {
    if (evalCell(c.precio).error) push(`error:${r.id}:${c.id}:${c.precio}`, 'variables', r.id, 'warn', `${rowLabel('variables', r.data)} · ${chargeSummary({ ...c, precio: '' })}: «${c.precio}» no es un número ni una cuenta, cuenta como 0.`);
    else if (cellNumber(c.precio) > 0 && !String(c.cc || '').trim()) push(`sin-cc:${r.id}:${c.id}`, 'variables', r.id, 'info', `${rowLabel('variables', r.data)}: el cargo «${chargeSummary(c)}» no tiene CC.`);
  }));

  // Filas grises: lo que suman las filas que las siguen
  groupMembers(fijo).forEach(({ group, members }) => {
    [['valor', 'Valor'], ['website', 'Country Website']].forEach(([key, label]) => {
      const parts = members.filter((m) => usesGroup(m.data?.[key]));
      if (!parts.length) return;
      const sum = parts.reduce((s, m) => s + cellNumber(m.data[key], { group: group.data, key }), 0);
      const gv = cellNumber(group.data?.[key]);
      if (!near(sum, gv)) push(`grupo:${group.id}:${key}:${gv}:${Math.round(sum * 100)}`, 'fijo', group.id, 'info', `${rowLabel('fijo', group.data)} (fila gris) · ${label}: las ${parts.length} filas que la siguen suman ${formatAmount(sum)} de ${formatAmount(gv)}.`);
    });
  });

  // CRM: totales que mezclan monedas
  const licenses = crmLicenses(crm);
  const byId = Object.fromEntries(extra.map((r) => [r.id, r]));
  extra.filter((r) => r.data?.kind === 'total').forEach((r) => {
    const cur = r.data.moneda || 'USD';
    const mixed = (r.data.sumOf || []).map((ref) => (ref === CRM_LICENSES_REF ? { label: 'las licencias', currency: 'USD' } : byId[ref] && { label: `«${byId[ref].data?.concepto || 'sin nombre'}»`, currency: byId[ref].data?.moneda || 'USD' })).filter((x) => x && x.currency !== cur);
    if (mixed.length) push(`moneda:${r.id}:${cur}:${mixed.map((m) => m.label).join(',')}`, 'crm', r.id, 'warn', `«${r.data.concepto || 'Total'}» (${cur}, ${formatAmount(crmExtraValue(r, extra, licenses))}) suma ${mixed.map((m) => `${m.label} en ${m.currency}`).join(' y ')}.`);
  });

  return items;
};

// ── Qué cambió contra el mes anterior ──
const comparable = (sheet, col, data, ctx) => {
  if (col.type === 'total') return rowTotal(sheet, data, ctx);
  if (col.type === 'number') {
    const e = evalCell(data?.[col.key], ctx ? { ...ctx, key: col.key } : undefined);
    return e.error ? String(data?.[col.key] ?? '') : e.value;
  }
  return String(data?.[col.key] ?? '').trim();
};
const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? near(a, b) : (a ?? '') === (b ?? ''));

// columns: las de la grilla; viewOf: cómo se ve cada fila (Variables usa
// variablesViewData). Devuelve { added, removed, changed, cells, count }:
// cells[rowId][key] = { before, after, label } para marcar las celdas.
export const monthDiff = ({ sheet, columns = [], rows = [], prevRows = [], ctxById = {}, prevCtxById = {}, viewOf = (d) => d }) => {
  const match = matchRows(sheet, prevRows, rows);
  const changed = []; const cells = {};
  rows.forEach((r) => {
    const p = match.get(r.id);
    if (!p) return;
    const now = viewOf(r.data || {}); const prev = viewOf(p.data || {});
    const diffs = [];
    columns.filter((c) => c.type !== 'status').forEach((col) => {
      const a = comparable(sheet, col, prev, prevCtxById[p.id]);
      const b = comparable(sheet, col, now, ctxById[r.id]);
      if (!same(a, b)) diffs.push({ key: col.key, label: col.label, before: a, after: b });
    });
    if (diffs.length) { changed.push({ row: r, prev: p, cells: diffs }); cells[r.id] = Object.fromEntries(diffs.map((d) => [d.key, d])); }
  });
  const matchedPrev = new Set([...match.values()].map((p) => p.id));
  const added = rows.filter((r) => !match.has(r.id));
  const removed = prevRows.filter((p) => !matchedPrev.has(p.id));
  return { added, removed, changed, cells, count: added.length + removed.length + changed.length };
};

// Las diferencias de las cuatro hojas de un mes contra el anterior:
// { fijo, variables, mkt, crm } (cada una, monthDiff)
export const computeMonthDiffs = (rows = [], month, prevMonth) => {
  const of = (m, sheet) => sortRows(rows.filter((r) => r.month === m && r.sheet === sheet));
  const fijoNow = of(month, 'fijo'); const fijoPrev = of(prevMonth, 'fijo');
  return {
    fijo: monthDiff({ sheet: 'fijo', columns: FIJO_COLUMNS, rows: fijoNow, prevRows: fijoPrev, ctxById: fijoContext(fijoNow), prevCtxById: fijoContext(fijoPrev) }),
    variables: monthDiff({ sheet: 'variables', columns: variablesColumns(), rows: of(month, 'variables'), prevRows: of(prevMonth, 'variables'), viewOf: variablesViewData }),
    mkt: monthDiff({ sheet: 'mkt', columns: MKT_COLUMNS, rows: of(month, 'mkt'), prevRows: of(prevMonth, 'mkt') }),
    crm: monthDiff({ sheet: 'crm', columns: CRM_COLUMNS, rows: of(month, 'crm'), prevRows: of(prevMonth, 'crm') }),
  };
};

// Texto corto de un valor comparado ("150", "Activo", "—")
export const diffValue = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'number' ? formatAmount(v) : String(v));

export const sheetLabel = (sheet) => SHEET_LABELS[sheet] || sheet;
export { isGroupRow };

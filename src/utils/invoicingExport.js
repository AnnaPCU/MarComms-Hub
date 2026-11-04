// ════════════════════════════════════════════════════════════════════
// invoicingExport — El mes como Excel (.xlsx), con las hojas del original
// ════════════════════════════════════════════════════════════════════
//   excelFormula(raw, { col, groupRow, letterOf })  → fórmula de Excel
//     ("=grupo/3" pasa a "G3/3", con la celda de la fila gris)
//   monthWorkbookSpec(rows, month) → hojas con sus celdas (parte pura,
//     con tests): [{ name, cells: { A1: { v } | { f, v } }, merges, cols }]
//   exportMonthXlsx(rows, month)   → arma el archivo con SheetJS (import
//     dinámico, no pesa en el bundle) y lo descarga
// ════════════════════════════════════════════════════════════════════

import {
  EXPORT_BASENAME, FIJO_COLUMNS, INVOICE_STATUS_BY_ID, MKT_COLUMNS, OFFICES_COLUMNS, VARIABLE_CATEGORIES,
} from '@/constants/invoicing';
import {
  cellNumber, chargesTotal, colName, crmExtraValue, crmLicenses, evalCell, fijoContext, freeGridSize, isFormula, isGroupRow,
  rowStatus, rowTotal, sortRows, tokenize, variableCharges,
} from '@/utils/invoicing';
import { CRM_LICENSES_REF } from '@/constants/invoicing';
import { MONTHS_ES } from '@/constants/planTasks';
import { monthLabel } from '@/utils/planTasks';

const letter = (i) => colName(i);
const round2 = (n) => Math.round(n * 100) / 100;
const addr = (c, r) => `${letter(c)}${r}`;

// Fórmula escrita en el Hub → fórmula de Excel (sin el "="). Devuelve null
// si no es una cuenta válida. groupRow: fila (1-based) de la fila gris;
// letterOf(key): letra de la columna de una clave.
export const excelFormula = (raw, { key, groupRow, letterOf } = {}) => {
  if (!isFormula(raw)) return null;
  const tokens = tokenize(String(raw).trim().slice(1).replace(/^(usd|us\$|u\$s|\$|€|eur)\s*/i, ''));
  if (!tokens || !tokens.length) return null;
  const parts = [];
  for (const t of tokens) {
    if (typeof t === 'number') parts.push(String(t));
    else if (typeof t === 'string') parts.push(t);
    else {
      const col = letterOf?.(t.ref || key);
      if (!groupRow || !col) return null;
      parts.push(`${col}${groupRow}`);
    }
  }
  return parts.join('');
};

// Celda numérica: { v } con el valor, o { f, v } si era una cuenta
const numCell = (raw, ctx, opts) => {
  const e = evalCell(raw, ctx);
  if (raw === undefined || raw === null || raw === '') return null;
  if (e.error) return { v: String(raw) };
  const f = excelFormula(raw, opts);
  return f ? { f, v: e.value } : { v: e.value };
};
const txt = (v) => (v === undefined || v === null || String(v) === '' ? null : { v: String(v) });
const statusText = (data) => ({ v: INVOICE_STATUS_BY_ID[rowStatus(data)]?.label || '' });

class SheetBuilder {
  constructor(name) { this.name = name; this.cells = {}; this.merges = []; this.cols = []; this.maxR = 0; this.maxC = 0; }
  set(c, r, cell) { if (!cell) return; this.cells[addr(c, r)] = cell; this.maxR = Math.max(this.maxR, r); this.maxC = Math.max(this.maxC, c); }
  text(c, r, v) { this.set(c, r, txt(v)); }
  merge(c1, r1, c2, r2) { this.merges.push(`${addr(c1, r1)}:${addr(c2, r2)}`); }
  spec() { return { name: this.name, cells: this.cells, merges: this.merges, cols: this.cols, ref: `A1:${addr(Math.max(this.maxC, 0), Math.max(this.maxR, 1))}` }; }
}

const by = (rows, month, sheet) => sortRows(rows.filter((r) => (r.month || null) === (month || null) && r.sheet === sheet));

// ── Fijo y facturas -CARGA ADMIN ──
const fijoSheet = (rows, month) => {
  const s = new SheetBuilder('Fijo y facturas -CARGA ADMIN');
  const list = by(rows, month, 'fijo');
  const ctxById = fijoContext(list);
  const keys = FIJO_COLUMNS.map((c) => c.key);
  const letterOf = (key) => { const i = keys.indexOf(key); return i >= 0 ? letter(i) : null; };
  s.cols = FIJO_COLUMNS.map((c) => ({ wch: Math.round(c.width / 7) }));
  s.text(5, 1, 'CC: Fee fijo'); s.merge(5, 1, 7, 1);
  FIJO_COLUMNS.forEach((c, i) => s.text(i, 2, c.label));
  const rowNum = new Map();
  list.forEach((r, i) => rowNum.set(r.id, i + 3));
  list.forEach((r) => {
    const rn = rowNum.get(r.id); const d = r.data || {};
    const ctx = ctxById[r.id]; const groupRow = ctx?.groupId ? rowNum.get(ctx.groupId) : null;
    FIJO_COLUMNS.forEach((c, i) => {
      if (c.type === 'number') s.set(i, rn, numCell(d[c.key], { ...(ctx || {}), key: c.key }, { key: c.key, groupRow, letterOf }));
      else if (c.type === 'total') {
        if (isGroupRow(d)) return;
        const t = rowTotal('fijo', d, ctx);
        s.set(i, rn, d.totalManual !== undefined && d.totalManual !== '' ? { v: round2(t) } : { f: `G${rn}+H${rn}+J${rn}`, v: round2(t) });
      } else if (c.type === 'status') { if (!isGroupRow(d)) s.set(i, rn, statusText(d)); } else s.text(i, rn, d[c.key]);
    });
  });
  const last = list.length + 2;
  if (list.length) s.set(keys.indexOf('total'), last + 1, { f: `SUM(L3:L${last})`, v: round2(list.reduce((a, r) => a + (rowTotal('fijo', r.data, ctxById[r.id]) ?? 0), 0)) });
  return s.spec();
};

// ── Variables (todos) ──
const VAR_BASE = ['pais', 'cuenta', 'codigo', 'empresa'];
const variablesSheet = (rows, month) => {
  const s = new SheetBuilder('Variables (todos)');
  const list = by(rows, month, 'variables');
  const headers = ['País', 'Entidad', 'Codigo Smartsheet', 'Empresa/Sector'];
  VARIABLE_CATEGORIES.forEach((c, i) => { const c0 = 4 + i * 3; s.text(c0, 1, c.label); s.merge(c0, 1, c0 + 2, 1); headers.push('Detalle', 'CC', 'Precio'); });
  headers.push('Total', 'Estado');
  headers.forEach((h, i) => s.text(i, 2, h));
  s.cols = headers.map((h) => ({ wch: h === 'Detalle' ? 30 : h === 'País' ? 22 : 14 }));
  const priceCols = VARIABLE_CATEGORIES.map((_, i) => letter(4 + i * 3 + 2));
  const totalC = 4 + VARIABLE_CATEGORIES.length * 3;
  list.forEach((r, i) => {
    const rn = i + 3; const d = r.data || {};
    VAR_BASE.forEach((k, c) => s.text(c, rn, d[k]));
    VARIABLE_CATEGORIES.forEach((cat, ci) => {
      const c0 = 4 + ci * 3;
      const charges = variableCharges(d).filter((ch) => ch.cat === cat.id);
      if (!charges.length) return;
      if (charges.length === 1) {
        s.text(c0, rn, charges[0].detalle); s.text(c0 + 1, rn, charges[0].cc); s.set(c0 + 2, rn, numCell(charges[0].precio));
      } else {
        s.text(c0, rn, charges.map((ch) => ch.detalle || 'sin detalle').join(' + '));
        s.text(c0 + 1, rn, [...new Set(charges.map((ch) => ch.cc).filter(Boolean))].join(', '));
        s.set(c0 + 2, rn, { v: chargesTotal(charges) });
      }
    });
    const t = rowTotal('variables', d);
    s.set(totalC, rn, d.totalManual !== undefined && d.totalManual !== '' ? { v: t } : { f: `SUM(${priceCols.map((l) => `${l}${rn}`).join(',')})`, v: t });
    s.set(totalC + 1, rn, statusText(d));
  });
  const last = list.length + 2;
  if (list.length) {
    priceCols.forEach((l, i) => s.set(4 + i * 3 + 2, last + 1, { f: `SUM(${l}3:${l}${last})`, v: round2(list.reduce((a, r) => a + chargesTotal(variableCharges(r.data).filter((ch) => ch.cat === VARIABLE_CATEGORIES[i].id)), 0)) }));
    s.set(totalC, last + 1, { f: `SUM(${letter(totalC)}3:${letter(totalC)}${last})`, v: round2(list.reduce((a, r) => a + (rowTotal('variables', r.data) ?? 0), 0)) });
  }
  return s.spec();
};

// ── MKT Plan (Felo) ──
const mktSheet = (rows, month) => {
  const s = new SheetBuilder('MKT Plan (Felo)');
  const list = by(rows, month, 'mkt');
  s.text(0, 1, 'Para control interno');
  MKT_COLUMNS.forEach((c, i) => s.text(i, 3, c.label));
  s.cols = MKT_COLUMNS.map((c) => ({ wch: Math.round(c.width / 7) }));
  list.forEach((r, i) => {
    const rn = i + 4; const d = r.data || {};
    MKT_COLUMNS.forEach((c, ci) => {
      if (c.type === 'number') s.set(ci, rn, numCell(d[c.key]));
      else if (c.type === 'total') { const t = rowTotal('mkt', d); s.set(ci, rn, d.totalManual !== undefined && d.totalManual !== '' ? { v: t } : { f: `SUM(B${rn}:D${rn})`, v: t }); } else s.text(ci, rn, d[c.key]);
    });
  });
  const free = by(rows, month, 'mkt_libre')[0]?.data || {};
  const start = Math.max(7, list.length + 6);
  const { rows: fr, cols: fc } = freeGridSize(free, 0, 0);
  for (let r = 0; r < fr; r += 1) for (let c = 0; c < fc; c += 1) {
    const v = free[`${letter(c)}${r + 1}`];
    if (v === undefined || v === '') continue;
    const e = evalCell(v);
    s.set(c, start + r, e.error || !/^[\d.,\s=+\-*/()]+$/.test(String(v)) ? { v: String(v) } : numCell(v));
  }
  return s.spec();
};

// ── CRM (Ale) ──
const crmSheet = (rows, month) => {
  const s = new SheetBuilder('CRM (Ale)');
  const list = by(rows, month, 'crm'); const extra = by(rows, month, 'crm_extra');
  const mName = MONTHS_ES[Number(month.slice(5, 7)) - 1];
  s.text(0, 1, 'Para control interno');
  s.text(0, 3, 'CLIENTE'); s.text(1, 3, mName);
  ['Entidad', 'Autoriza', mName.slice(0, 3), 'Estado'].forEach((h, i) => s.text(i, 4, h));
  s.cols = [{ wch: 48 }, { wch: 34 }, { wch: 14 }, { wch: 12 }];
  list.forEach((r, i) => { const rn = i + 5; const d = r.data || {}; s.text(0, rn, d.entidad); s.text(1, rn, d.autoriza); s.set(2, rn, numCell(d.monto)); if (cellNumber(d.monto) > 0) s.set(3, rn, statusText(d)); });
  const totalRow = list.length + 5;
  const licenses = crmLicenses(list);
  s.text(0, totalRow, 'TOTAL'); s.set(2, totalRow, list.length ? { f: `SUM(C5:C${totalRow - 1})`, v: licenses } : { v: 0 }); s.text(3, totalRow, 'USD');
  const rowOf = new Map();
  extra.forEach((r, i) => rowOf.set(r.id, totalRow + 2 + i));
  extra.forEach((r) => {
    const rn = rowOf.get(r.id); const d = r.data || {};
    s.text(0, rn, d.concepto);
    if (d.kind === 'total') {
      const refs = (d.sumOf || []).map((ref) => (ref === CRM_LICENSES_REF ? `C${totalRow}` : rowOf.has(ref) ? `C${rowOf.get(ref)}` : null)).filter(Boolean);
      s.set(2, rn, refs.length ? { f: refs.join('+'), v: crmExtraValue(r, extra, licenses) } : { v: crmExtraValue(r, extra, licenses) });
    } else s.set(2, rn, numCell(d.monto));
    s.text(3, rn, d.moneda || 'USD');
  });
  return s.spec();
};

// ── Entidades ──
const officesSheet = (rows) => {
  const s = new SheetBuilder('Entidades');
  OFFICES_COLUMNS.forEach((c, i) => s.text(i, 1, c.label));
  s.cols = OFFICES_COLUMNS.map((c) => ({ wch: Math.round(c.width / 7) }));
  by(rows, null, 'entidades').forEach((r, i) => OFFICES_COLUMNS.forEach((c, ci) => s.text(ci, i + 2, r.data?.[c.key])));
  return s.spec();
};

export const monthWorkbookSpec = (rows = [], month) => [fijoSheet(rows, month), variablesSheet(rows, month), mktSheet(rows, month), crmSheet(rows, month), officesSheet(rows)];

export const exportFilename = (month, ext) => `${EXPORT_BASENAME}_${monthLabel(month).replace(' ', '_')}.${ext}`;

export const exportMonthXlsx = async (rows, month) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  monthWorkbookSpec(rows, month).forEach((sheet) => {
    const ws = {};
    Object.entries(sheet.cells).forEach(([a, cell]) => {
      ws[a] = cell.f !== undefined ? { t: 'n', f: cell.f, v: cell.v } : typeof cell.v === 'number' ? { t: 'n', v: cell.v } : { t: 's', v: cell.v };
    });
    ws['!ref'] = sheet.ref;
    if (sheet.merges.length) ws['!merges'] = sheet.merges.map((m) => XLSX.utils.decode_range(m));
    if (sheet.cols.length) ws['!cols'] = sheet.cols;
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  XLSX.writeFile(wb, exportFilename(month, 'xlsx'));
  return true;
};

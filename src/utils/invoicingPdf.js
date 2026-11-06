// ════════════════════════════════════════════════════════════════════
// invoicingPdf — Resumen del mes de Facturación en PDF (jsPDF nativo)
// ════════════════════════════════════════════════════════════════════
// A4 apaisado: encabezado, los cuatro totales y una tabla por hoja (Fijo,
// Variables con sus cargos, MKT Plan, CRM con licencias y conceptos) más
// las notas. monthPdfContent es la parte pura (con tests); buildMonthPdf
// dibuja y downloadMonthPdf descarga.
// ════════════════════════════════════════════════════════════════════

import { INVOICE_STATUS_BY_ID, VARIABLE_CATEGORY_BY_ID } from '@/constants/invoicing';
import {
  cellNumber, crmExtraValue, crmLicenses, fijoContext, formatAmount, isBillable, isGroupRow, monthSummary, rowStatus, rowTotal,
  sortRows, variableCharges,
} from '@/utils/invoicing';
import { exportFilename } from '@/utils/invoicingExport';
import { loadJsPdf } from '@/utils/pdf';
import { pdfText } from '@/utils/planPdf';
import { monthLabel } from '@/utils/planTasks';

const PAGE_W = 297; const PAGE_H = 210; const MX = 12; const CW = PAGE_W - MX * 2; const BOTTOM = PAGE_H - 14;
const GREEN = '#059669'; const NAVY = '#0f172a'; const GREY = '#64748b'; const LINE = '#e2e8f0'; const BAND = '#f1f5f9';

const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const status = (d) => INVOICE_STATUS_BY_ID[rowStatus(d)]?.label || '';
const money = (n) => (n === null || n === undefined ? '' : formatAmount(n));
// Celda numérica: vacía queda vacía (no «0»)
const num = (raw, ctx) => (raw === undefined || raw === null || String(raw).trim() === '' ? '' : money(cellNumber(raw, ctx)));

const by = (rows, month, sheet) => sortRows(rows.filter((r) => (r.month || null) === (month || null) && r.sheet === sheet));

// Lo que va en el PDF, ya como texto (sin jsPDF)
export const monthPdfContent = (rows = [], month) => {
  const summary = monthSummary(rows.filter((r) => r.month === month));
  const fijo = by(rows, month, 'fijo'); const ctx = fijoContext(fijo);
  const variables = by(rows, month, 'variables'); const mkt = by(rows, month, 'mkt'); const crm = by(rows, month, 'crm'); const extra = by(rows, month, 'crm_extra');
  const notes = by(rows, month, 'notas')[0]?.data || {};
  const licenses = crmLicenses(crm);
  return {
    title: `Facturación MarComms · ${monthLabel(month)}`,
    summary,
    fijo: fijo.map((r) => ({ group: isGroupRow(r.data), cells: [r.data.pais, r.data.empresa, r.data.cuenta, r.data.codigo, r.data.plan, num(r.data.valor, { ...ctx[r.id], key: 'valor' }), num(r.data.website, { ...ctx[r.id], key: 'website' }), num(r.data.planMkt), isGroupRow(r.data) ? '' : money(rowTotal('fijo', r.data, ctx[r.id])), isBillable('fijo', r.data, ctx[r.id]) ? status(r.data) : ''].map((x) => x ?? '') })),
    variables: variables.filter((r) => variableCharges(r.data).length).map((r) => ({ cells: [r.data.pais, r.data.empresa, variableCharges(r.data).map((c) => `${VARIABLE_CATEGORY_BY_ID[c.cat]?.short || c.cat}: ${c.detalle || 'sin detalle'}${c.cc ? ` (${c.cc})` : ''} · ${money(cellNumber(c.precio))}`).join('\n'), money(rowTotal('variables', r.data)), isBillable('variables', r.data) ? status(r.data) : ''].map((x) => x ?? '') })),
    mkt: mkt.map((r) => ({ cells: [r.data.cliente, num(r.data.bbdd), num(r.data.email), num(r.data.paid), money(rowTotal('mkt', r.data)), r.data.renovacion, isBillable('mkt', r.data) ? status(r.data) : ''].map((x) => x ?? '') })),
    crm: crm.map((r) => ({ cells: [r.data.entidad, r.data.autoriza, num(r.data.monto), isBillable('crm', r.data) ? status(r.data) : ''].map((x) => x ?? '') })),
    crmExtra: extra.map((r) => ({ total: r.data.kind === 'total', cells: [r.data.concepto || 'Sin nombre', '', money(crmExtraValue(r, extra, licenses)), r.data.moneda || 'USD'].map((x) => x ?? '') })),
    licenses,
    notes: ['fijo', 'variables', 'crm'].filter((k) => notes[k]).map((k) => ({ sheet: k, text: notes[k] })),
  };
};

export const buildMonthPdf = async (rows, month) => {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const data = monthPdfContent(rows, month);
  const fill = (hex) => pdf.setFillColor(...rgb(hex));
  const stroke = (hex) => pdf.setDrawColor(...rgb(hex));
  const color = (hex) => pdf.setTextColor(...rgb(hex));
  const font = (size, style = 'normal') => { pdf.setFont('helvetica', style); pdf.setFontSize(size); };
  let y = 0; let page = 1;

  const footer = () => {
    font(6.5); color(GREY);
    pdf.text(pdfText(`MarComms · Facturación · ${monthLabel(month)}`), MX, PAGE_H - 7);
    pdf.text(`Página ${page}`, MX + CW, PAGE_H - 7, { align: 'right' });
  };
  const newPage = () => { footer(); pdf.addPage(); page += 1; y = 14; };
  const ensure = (h) => { if (y + h > BOTTOM) newPage(); };

  // Encabezado
  fill(GREEN); pdf.rect(0, 0, PAGE_W, 2.5, 'F');
  y = 14;
  font(15, 'bold'); color(NAVY); pdf.text(pdfText(data.title), MX, y);
  font(7); color(GREY); pdf.text(pdfText(`Generado el ${new Date().toLocaleDateString('es-AR')} desde el Hub`), MX + CW, y, { align: 'right' });
  y += 8;
  const kpis = [['Fijo y facturas', data.summary.fijo], ['Variables', data.summary.variables], ['Fijo + Variables', data.summary.fijoMasVariables], ['CRM · Licencias (USD)', data.summary.crmLicenses]];
  const kw = (CW - 9) / 4;
  kpis.forEach(([label, v], i) => {
    const x = MX + i * (kw + 3);
    fill(BAND); pdf.roundedRect(x, y, kw, 16, 2, 2, 'F');
    font(6.5, 'bold'); color(GREY); pdf.text(pdfText(label.toUpperCase()), x + 4, y + 5.5);
    font(12, 'bold'); color(i === 2 ? NAVY : GREEN); pdf.text(pdfText(money(v)), x + 4, y + 12.5);
  });
  y += 22;

  const section = (title) => { ensure(12); font(8, 'bold'); color(GREEN); pdf.text(pdfText(title.toUpperCase()), MX, y); stroke(GREEN); pdf.setLineWidth(0.2); pdf.line(MX + pdf.getTextWidth(pdfText(title.toUpperCase())) + 3, y - 1, MX + CW, y - 1); y += 5; };

  // Tabla con columnas de ancho fijo (en mm), textos con corte de línea
  const table = (cols, rowsT, { numeric = [], totals = null } = {}) => {
    const widths = cols.map((c) => c.w); const total = widths.reduce((a, b) => a + b, 0); const scale = CW / total;
    const xs = []; let x = MX; widths.forEach((w) => { xs.push(x); x += w * scale; });
    const head = () => {
      fill(BAND); pdf.rect(MX, y - 3.5, CW, 5.5, 'F'); font(6.5, 'bold'); color(GREY);
      cols.forEach((c, i) => pdf.text(pdfText(c.label.toUpperCase()), numeric.includes(i) ? xs[i] + widths[i] * scale - 1.5 : xs[i] + 1.5, y, { align: numeric.includes(i) ? 'right' : 'left' }));
      y += 5;
    };
    ensure(14); head();
    rowsT.forEach((r) => {
      font(7, r.group || r.total ? 'bold' : 'normal');
      const lines = r.cells.map((cell, i) => pdf.splitTextToSize(pdfText(cell), widths[i] * scale - 3));
      const h = Math.max(1, ...lines.map((l) => l.length)) * 3.2 + 2.2;
      if (y + h > BOTTOM) { newPage(); head(); font(7, r.group || r.total ? 'bold' : 'normal'); }
      if (r.group) { fill(BAND); pdf.rect(MX, y - 3, CW, h, 'F'); }
      color(NAVY);
      lines.forEach((l, i) => pdf.text(l, numeric.includes(i) ? xs[i] + widths[i] * scale - 1.5 : xs[i] + 1.5, y, { align: numeric.includes(i) ? 'right' : 'left' }));
      stroke(LINE); pdf.setLineWidth(0.1); pdf.line(MX, y + h - 3, MX + CW, y + h - 3);
      y += h;
    });
    if (totals) {
      ensure(7); font(7.5, 'bold'); color(GREEN);
      totals.forEach(([i, v]) => pdf.text(pdfText(v), xs[i] + widths[i] * scale - 1.5, y, { align: 'right' }));
      pdf.text('TOTAL', MX + 1.5, y);
      y += 6;
    }
    y += 4;
  };

  section('Fijo y facturas -CARGA ADMIN');
  table([{ label: 'País', w: 22 }, { label: 'Empresa', w: 26 }, { label: 'Entidad', w: 24 }, { label: 'Código', w: 14 }, { label: 'Plan', w: 20 }, { label: 'Valor', w: 16 }, { label: 'Website', w: 16 }, { label: 'Plan MKT', w: 16 }, { label: 'Total', w: 18 }, { label: 'Estado', w: 18 }],
    data.fijo, { numeric: [5, 6, 7, 8], totals: [[8, money(data.summary.fijo)]] });

  section('Variables (todos)');
  if (data.variables.length) table([{ label: 'País', w: 24 }, { label: 'Empresa', w: 26 }, { label: 'Cargos del mes', w: 110 }, { label: 'Total', w: 18 }, { label: 'Estado', w: 18 }], data.variables, { numeric: [3], totals: [[3, money(data.summary.variables)]] });
  else { font(7); color(GREY); pdf.text('Sin cargos variables este mes.', MX, y); y += 8; }

  section('MKT Plan (Felo)');
  if (data.mkt.length) table([{ label: 'País', w: 30 }, { label: 'BBDD', w: 16 }, { label: 'Email MKT', w: 16 }, { label: 'Paid Media', w: 16 }, { label: 'Valor total', w: 18 }, { label: 'Renovación', w: 24 }, { label: 'Estado', w: 20 }], data.mkt, { numeric: [1, 2, 3, 4], totals: [[4, money(data.summary.mkt)]] });
  else { font(7); color(GREY); pdf.text('Sin planes cargados.', MX, y); y += 8; }

  section('CRM (Ale)');
  table([{ label: 'Entidad', w: 80 }, { label: 'Autoriza', w: 50 }, { label: 'Monto (USD)', w: 20 }, { label: 'Estado', w: 18 }], data.crm, { numeric: [2], totals: [[2, money(data.licenses)]] });
  if (data.crmExtra.length) table([{ label: 'Concepto', w: 80 }, { label: '', w: 50 }, { label: 'Monto', w: 20 }, { label: 'Moneda', w: 18 }], data.crmExtra, { numeric: [2] });

  if (data.notes.length) {
    section('Notas del mes');
    data.notes.forEach((n) => { ensure(10); font(7, 'bold'); color(GREY); pdf.text(pdfText(n.sheet === 'fijo' ? 'Fijo y facturas' : n.sheet === 'crm' ? 'CRM' : 'Variables'), MX, y); font(7); color(NAVY); const ls = pdf.splitTextToSize(pdfText(n.text), CW - 30); pdf.text(ls, MX + 28, y); y += ls.length * 3.4 + 2; });
  }
  footer();
  return pdf;
};

export const downloadMonthPdf = async (rows, month) => {
  const pdf = await buildMonthPdf(rows, month);
  pdf.save(exportFilename(month, 'pdf'));
  return true;
};

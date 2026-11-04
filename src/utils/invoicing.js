// ════════════════════════════════════════════════════════════════════
// invoicing — Facturación MarComms (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   evalCell, cellNumber, isFormula, formatAmount
//   rowTotal (Fijo / Variables / MKT), sheetTotals, crmLicenses,
//   crmExtraValue, crmExtraTotals, monthSummary
//   nextMonthKey, buildMonthCopy, positionBetween, repeatedFlags
//   colName, cellKey, freeGridSize
//
// Celdas numéricas: se guarda lo que se escribió y se calcula como el
// Excel: "450", "262,5", "1.500" (miles), "=350/4*3", "=15*90+2*199".
// Solo cuentas (+ − × ÷ y paréntesis), sin referencias a otras celdas.
// ════════════════════════════════════════════════════════════════════

import { CRM_LICENSES_REF, FIJO_ROW_KINDS, VARIABLE_CATEGORIES } from '@/constants/invoicing';

// ── Números y fórmulas ──
// Número escrito a la argentina o a la inglesa:
//   "1.500" / "12.416,5" → miles con punto; "262,5" / "262.5" → decimales
const parseNumberToken = (tok) => {
  let t = tok;
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) { if ((t.match(/,/g) || []).length > 1) return NaN; t = t.replace(',', '.'); }
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
  return Number(t);
};

const tokenize = (src) => {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if ('+-*/()'.includes(ch)) { out.push(ch); i += 1; continue; }
    if (ch === 'x' || ch === '×') { out.push('*'); i += 1; continue; }
    if (ch === '÷') { out.push('/'); i += 1; continue; }
    const m = /^[\d.,]+/.exec(src.slice(i));
    if (!m) return null;
    const n = parseNumberToken(m[0]);
    if (Number.isNaN(n)) return null;
    out.push(n);
    i += m[0].length;
  }
  return out;
};

// Descenso recursivo: expr = term (± term)* · term = factor (×÷ factor)*
const parseExpr = (tokens) => {
  let pos = 0;
  const peek = () => tokens[pos];
  const factor = () => {
    const t = tokens[pos];
    if (t === '-') { pos += 1; return -factor(); }
    if (t === '+') { pos += 1; return factor(); }
    if (t === '(') {
      pos += 1;
      const v = expr();
      if (tokens[pos] !== ')') throw new Error('paréntesis');
      pos += 1;
      return v;
    }
    if (typeof t === 'number') { pos += 1; return t; }
    throw new Error('número');
  };
  const term = () => {
    let v = factor();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[pos]; pos += 1;
      const r = factor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const expr = () => {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos]; pos += 1;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const v = expr();
  if (pos !== tokens.length) throw new Error('sobra');
  return v;
};

export const isFormula = (raw) => typeof raw === 'string' && raw.trim().startsWith('=');

// Valor de una celda: { value: number | null, error: bool }
// Vacío → value null. Texto que no es número ni cuenta → error.
export const evalCell = (raw) => {
  if (raw === null || raw === undefined) return { value: null, error: false };
  if (typeof raw === 'number') return { value: Number.isFinite(raw) ? raw : null, error: !Number.isFinite(raw) };
  let s = String(raw).trim();
  if (!s) return { value: null, error: false };
  if (s.startsWith('=')) s = s.slice(1);
  s = s.replace(/^(usd|us\$|u\$s|\$|€|eur)\s*/i, '');
  const tokens = tokenize(s);
  if (!tokens || !tokens.length) return { value: null, error: true };
  try {
    const v = parseExpr(tokens);
    return Number.isFinite(v) ? { value: v, error: false } : { value: null, error: true };
  } catch (_e) {
    return { value: null, error: true };
  }
};

// Número para sumar (vacío o con error → 0)
export const cellNumber = (raw) => evalCell(raw).value ?? 0;

const round2 = (n) => Math.round(n * 100) / 100;
// Sin redondear a 2 decimales (como el Excel): solo limpia el ruido de los decimales
const clean = (n) => Math.round(n * 1e9) / 1e9;

// 13416.5 → "13.416,5" · 116.6667 → "116,67" · null → ""
export const formatAmount = (n) => (n === null || n === undefined || Number.isNaN(n)
  ? ''
  : Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 }));

// ── Totales por fila ──
// Total de una fila según la hoja. Si se escribió un total a mano
// (totalManual), manda ese. Las filas de grupo de Fijo no tienen total.
export const rowTotal = (sheet, data = {}) => {
  if (sheet === 'fijo' && data.kind === FIJO_ROW_KINDS.group) return null;
  const manual = evalCell(data.totalManual);
  if (manual.value !== null) return manual.value;
  if (sheet === 'fijo') return clean(cellNumber(data.valor) + cellNumber(data.website) + cellNumber(data.planMkt));
  if (sheet === 'variables') return clean(VARIABLE_CATEGORIES.reduce((s, c) => s + cellNumber(data[`${c.id}Precio`]), 0));
  if (sheet === 'mkt') return clean(cellNumber(data.bbdd) + cellNumber(data.email) + cellNumber(data.paid));
  return null;
};

// Totales de las columnas que suman (sum: true): { [key]: number }
export const sheetTotals = (sheet, rows = [], columns = []) => {
  const out = {};
  columns.filter((c) => c.sum).forEach((c) => {
    out[c.key] = round2(rows.reduce((s, r) => {
      if (c.type === 'total') return s + (rowTotal(sheet, r.data) ?? 0);
      if (sheet === 'fijo' && r.data?.kind === FIJO_ROW_KINDS.group) return s;
      return s + cellNumber(r.data?.[c.key]);
    }, 0));
  });
  return out;
};

// ── CRM ──
export const crmLicenses = (rows = []) => round2(rows.reduce((s, r) => s + cellNumber(r.data?.monto), 0));

// Valor de un concepto de abajo. Los totales suman lo que eligieron
// (licencias y/o otros conceptos que no sean totales).
export const crmExtraValue = (row, extraRows = [], licenses = 0) => {
  const d = row?.data || {};
  if (d.kind !== 'total') return evalCell(d.monto).value;
  const byId = Object.fromEntries(extraRows.map((r) => [r.id, r]));
  return round2((d.sumOf || []).reduce((s, ref) => {
    if (ref === CRM_LICENSES_REF) return s + licenses;
    const other = byId[ref];
    if (!other || other.data?.kind === 'total') return s;
    return s + cellNumber(other.data?.monto);
  }, 0));
};

// ── Resumen de un mes (vista «Mes a mes») ──
export const monthSummary = (rows = []) => {
  const of = (sheet) => rows.filter((r) => r.sheet === sheet);
  const fijo = of('fijo').reduce((s, r) => s + (rowTotal('fijo', r.data) ?? 0), 0);
  const varRows = of('variables');
  const byCat = Object.fromEntries(VARIABLE_CATEGORIES.map((c) => [c.id, round2(varRows.reduce((s, r) => s + cellNumber(r.data?.[`${c.id}Precio`]), 0))]));
  const variables = varRows.reduce((s, r) => s + (rowTotal('variables', r.data) ?? 0), 0);
  const mkt = of('mkt').reduce((s, r) => s + (rowTotal('mkt', r.data) ?? 0), 0);
  const licenses = crmLicenses(of('crm'));
  const extra = sortRows(of('crm_extra'));
  return {
    fijo: round2(fijo),
    variables: round2(variables),
    variablesByCategory: byCat,
    fijoMasVariables: round2(fijo + variables),
    mkt: round2(mkt),
    crmLicenses: licenses,
    crmExtra: extra.map((r) => ({
      label: (r.data?.concepto || '').trim(),
      currency: r.data?.moneda || 'USD',
      total: r.data?.kind === 'total',
      value: crmExtraValue(r, extra, licenses),
    })),
  };
};

// ── Meses ──
export const nextMonthKey = (key) => {
  const y = Number(key.slice(0, 4)); const m = Number(key.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

export const sortRows = (rows = []) => [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.id).localeCompare(String(b.id)));

// Arma las filas de un mes nuevo a partir de otro:
//   Fijo, MKT Plan (tabla y zona libre) y CRM se copian tal cual (los
//   totales del CRM siguen sumando lo mismo); Variables copia las filas
//   (país, entidad, código, empresa) sin detalle, CC ni precio, salvo que
//   copyVariables sea true; las notas arrancan vacías.
// newId: función que da un id nuevo (crypto.randomUUID en la app).
export const buildMonthCopy = (rows = [], { toMonth, copyVariables = false, newId }) => {
  const ids = {};
  rows.forEach((r) => { ids[r.id] = newId(); });
  return rows
    .filter((r) => r.sheet !== 'notas' && r.sheet !== 'entidades')
    .map((r) => {
      let data = { ...(r.data || {}) };
      if (r.sheet === 'variables' && !copyVariables) {
        data = { pais: data.pais, cuenta: data.cuenta, codigo: data.codigo, empresa: data.empresa };
        Object.keys(data).forEach((k) => { if (data[k] === undefined) delete data[k]; });
      }
      if (r.sheet === 'crm_extra' && Array.isArray(data.sumOf)) {
        data.sumOf = data.sumOf.map((ref) => (ref === CRM_LICENSES_REF ? ref : ids[ref])).filter(Boolean);
      }
      return { id: ids[r.id], month: toMonth, sheet: r.sheet, position: r.position ?? 0, data };
    });
};

// Posición para una fila nueva entre dos (orden con decimales)
export const positionBetween = (before, after) => {
  if (before === undefined || before === null) return after === undefined || after === null ? 0 : after - 1;
  if (after === undefined || after === null) return before + 1;
  return (before + after) / 2;
};

// Para las celdas combinadas: true si la fila repite el valor de la anterior
export const repeatedFlags = (rows = [], key) => rows.map((r, i) => {
  if (i === 0) return false;
  const v = String(r.data?.[key] ?? '').trim();
  return !!v && v === String(rows[i - 1].data?.[key] ?? '').trim();
});

// ── Zona libre (como una hoja del Excel: A1, B2…) ──
export const colName = (i) => {
  let n = i + 1; let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
export const cellKey = (r, c) => `${colName(c)}${r + 1}`;
const parseCellKey = (key) => {
  const m = /^([A-Z]+)(\d+)$/.exec(key);
  if (!m) return null;
  const col = m[1].split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  return { r: Number(m[2]) - 1, c: col };
};
// Tamaño: lo usado + 2 filas libres, con un mínimo (y _rows/_cols si se agrandó)
export const freeGridSize = (data = {}, minRows = 20, minCols = 6) => {
  let rows = Math.max(minRows, Number(data._rows) || 0);
  let cols = Math.max(minCols, Number(data._cols) || 0);
  Object.keys(data).forEach((k) => {
    const p = parseCellKey(k);
    if (!p || String(data[k] ?? '') === '') return;
    rows = Math.max(rows, p.r + 3);
    cols = Math.max(cols, p.c + 1);
  });
  return { rows, cols };
};

// ════════════════════════════════════════════════════════════════════
// invoicing — Facturación MarComms (sin React ni Supabase)
// ════════════════════════════════════════════════════════════════════
//   evalCell, cellNumber, isFormula, usesGroup, formatAmount
//   fijoContext, groupMembers (filas que siguen a una fila gris)
//   variableCharges, chargesByCategory (cargos de Variables)
//   rowTotal (Fijo / Variables / MKT), sheetTotals, crmLicenses,
//   crmExtraValue, monthSummary
//   rowStatus, isBillable, statusStats (estado de cada cobro)
//   countryGroupKey, brandOfRow, rowMatches (agrupar, filtrar, buscar)
//   nextMonthKey, buildMonthCopy, positionBetween, repeatedFlags
//   colName, cellKey, freeGridSize
//
// Celdas numéricas: se guarda lo que se escribió y se calcula como el
// Excel: "450", "262,5", "1.500" (miles), "=350/4*3", "=15*90+2*199".
// Solo cuentas (+ − × ÷ y paréntesis) y, en Fijo, la referencia a la
// fila gris de arriba: "=grupo/3" (la misma columna de la fila de grupo)
// o "=grupo.valor/3" (otra columna). Si el grupo cambia, la celda sigue.
// Para fijar un número, se escribe el número.
// ════════════════════════════════════════════════════════════════════

import { CRM_LICENSES_REF, FIJO_ROW_KINDS, INVOICE_STATUS_IDS, PENDING_STATUS, VARIABLE_CATEGORIES } from '@/constants/invoicing';

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

const GROUP_RE = /^grupo(?:\.([a-zA-Z][a-zA-Z0-9]*))?/i;

// Tokens: número | operador | { ref } (referencia a la fila de grupo)
export const tokenize = (src) => {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if ('+-*/()'.includes(ch)) { out.push(ch); i += 1; continue; }
    const g = GROUP_RE.exec(src.slice(i));
    if (g) { out.push({ ref: g[1] || null }); i += g[0].length; continue; }
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
const parseExpr = (tokens, resolve) => {
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
    if (t && typeof t === 'object') { pos += 1; return resolve(t.ref); }
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
// ¿La celda sigue a la fila de grupo? ("=grupo/3")
export const usesGroup = (raw) => isFormula(raw) && /grupo/i.test(raw);

const noResolver = () => { throw new Error('sin grupo'); };

// Valor de una celda: { value: number | null, error: bool }
// Vacío → value null. Texto que no es número ni cuenta → error.
// ctx (solo Fijo): { group: data de la fila gris de arriba | null, key:
// columna de la celda }, para resolver "grupo" / "grupo.<columna>".
export const evalCell = (raw, ctx) => {
  if (raw === null || raw === undefined) return { value: null, error: false };
  if (typeof raw === 'number') return { value: Number.isFinite(raw) ? raw : null, error: !Number.isFinite(raw) };
  let s = String(raw).trim();
  if (!s) return { value: null, error: false };
  if (s.startsWith('=')) s = s.slice(1);
  s = s.replace(/^(usd|us\$|u\$s|\$|€|eur)\s*/i, '');
  const tokens = tokenize(s);
  if (!tokens || !tokens.length) return { value: null, error: true };
  const resolve = ctx ? (ref) => {
    const key = ref || ctx.key;
    if (!ctx.group || !key) throw new Error('sin grupo');
    const g = evalCell(ctx.group[key]); // la fila gris no puede apuntar a otro grupo
    if (g.error) throw new Error('grupo con error');
    return g.value ?? 0;
  } : noResolver;
  try {
    const v = parseExpr(tokens, resolve);
    return Number.isFinite(v) ? { value: v, error: false } : { value: null, error: true };
  } catch (_e) {
    return { value: null, error: true };
  }
};

// Número para sumar (vacío o con error → 0)
export const cellNumber = (raw, ctx) => evalCell(raw, ctx).value ?? 0;

const round2 = (n) => Math.round(n * 100) / 100;
// Sin redondear a 2 decimales (como el Excel): solo limpia el ruido de los decimales
const clean = (n) => Math.round(n * 1e9) / 1e9;

// 13416.5 → "13.416,5" · 116.6667 → "116,67" · null → ""
export const formatAmount = (n) => (n === null || n === undefined || Number.isNaN(n)
  ? ''
  : Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 }));

export const sortRows = (rows = []) => [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.id).localeCompare(String(b.id)));

// ── Fijo: filas de grupo (grises) ──
export const isGroupRow = (data) => data?.kind === FIJO_ROW_KINDS.group;

// Contexto de cada fila de Fijo (filas en orden): la fila gris más cercana
// de arriba, para resolver "=grupo/3". { [id]: { group, groupId } }
export const fijoContext = (rows = []) => {
  const out = {};
  let current = null;
  rows.forEach((r) => {
    if (isGroupRow(r.data)) { current = r; out[r.id] = { group: null, groupId: null, self: true }; return; }
    out[r.id] = { group: current?.data || null, groupId: current?.id || null };
  });
  return out;
};

// Cada fila gris con las filas de abajo que le siguen (hasta la próxima)
export const groupMembers = (rows = []) => {
  const groups = [];
  rows.forEach((r) => {
    if (isGroupRow(r.data)) groups.push({ group: r, members: [] });
    else if (groups.length) groups[groups.length - 1].members.push(r);
  });
  return groups;
};

// ── Variables: cargos ──
// Cada cargo es una clave "cargo:<id>" de data: { cat, detalle, cc, precio,
// pos }. Las filas cargadas desde el Excel tienen en cambio una clave por
// columna ("campanasDetalle", "campanasCc", "campanasPrecio"): se leen
// igual (un cargo por categoría) hasta que se editan, que pasan al nuevo
// formato (ver utils/invoicingCharges).
export const CHARGE_PREFIX = 'cargo:';
export const isChargeKey = (k) => String(k).startsWith(CHARGE_PREFIX);
export const legacyChargeKeys = (cat) => [`${cat}Detalle`, `${cat}Cc`, `${cat}Precio`];
export const ALL_LEGACY_CHARGE_KEYS = VARIABLE_CATEGORIES.flatMap((c) => legacyChargeKeys(c.id));

export const variableCharges = (data = {}) => {
  const keys = Object.keys(data).filter(isChargeKey);
  let list;
  if (keys.length) {
    list = keys.map((k) => {
      const c = data[k] && typeof data[k] === 'object' ? data[k] : {};
      return { id: k.slice(CHARGE_PREFIX.length), key: k, cat: c.cat || 'otros', detalle: c.detalle || '', cc: c.cc || '', precio: c.precio ?? '', pos: Number(c.pos) || 0, legacy: false };
    });
  } else {
    list = VARIABLE_CATEGORIES.flatMap((c, i) => {
      const [kd, kc, kp] = legacyChargeKeys(c.id);
      const has = [kd, kc, kp].some((k) => data[k] !== undefined && data[k] !== null && String(data[k]) !== '');
      return has ? [{ id: `legacy:${c.id}`, key: null, cat: c.id, detalle: data[kd] || '', cc: data[kc] || '', precio: data[kp] ?? '', pos: i, legacy: true }] : [];
    });
  }
  return list.sort((a, b) => a.pos - b.pos || a.id.localeCompare(b.id));
};

// { [cat]: cargos[] } (solo las categorías con cargos)
export const chargesByCategory = (data = {}) => {
  const out = {};
  variableCharges(data).forEach((c) => { (out[c.cat] = out[c.cat] || []).push(c); });
  return out;
};

export const chargesTotal = (charges = []) => clean(charges.reduce((s, c) => s + cellNumber(c.precio), 0));

// ── Totales por fila ──
// Total de una fila según la hoja. Si se escribió un total a mano
// (totalManual), manda ese. Las filas de grupo de Fijo no tienen total.
export const rowTotal = (sheet, data = {}, ctx) => {
  if (sheet === 'fijo' && isGroupRow(data)) return null;
  const manual = evalCell(data.totalManual);
  if (manual.value !== null) return manual.value;
  const n = (k) => cellNumber(data[k], ctx ? { ...ctx, key: k } : undefined);
  if (sheet === 'fijo') return clean(n('valor') + n('website') + n('planMkt'));
  if (sheet === 'variables') return chargesTotal(variableCharges(data));
  if (sheet === 'mkt') return clean(n('bbdd') + n('email') + n('paid'));
  return null;
};

// Totales de las columnas que suman (sum: true): { [key]: number }
// ctxById: contexto de cada fila (Fijo, de fijoContext)
export const sheetTotals = (sheet, rows = [], columns = [], ctxById = {}) => {
  const out = {};
  columns.filter((c) => c.sum).forEach((c) => {
    out[c.key] = round2(rows.reduce((s, r) => {
      const ctx = ctxById[r.id];
      if (c.type === 'total') return s + (rowTotal(sheet, r.data, ctx) ?? 0);
      if (sheet === 'fijo' && isGroupRow(r.data)) return s;
      if (sheet === 'variables' && /Precio$/.test(c.key)) {
        const cat = c.key.slice(0, -'Precio'.length);
        return s + chargesTotal(variableCharges(r.data).filter((ch) => ch.cat === cat));
      }
      return s + cellNumber(r.data?.[c.key], ctx ? { ...ctx, key: c.key } : undefined);
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

// ── Estado de cada cobro (pendiente / facturado / cobrado) ──
export const rowStatus = (data) => (INVOICE_STATUS_IDS.includes(data?.estado) ? data.estado : PENDING_STATUS);

// Una fila se factura si tiene plata: Fijo y Variables por su total,
// CRM por el monto. Las filas grises no.
export const isBillable = (sheet, data = {}, ctx) => {
  if (sheet === 'crm') return cellNumber(data.monto) > 0;
  if (sheet !== 'fijo' && sheet !== 'variables') return false;
  if (isGroupRow(data)) return false;
  return (rowTotal(sheet, data, ctx) ?? 0) > 0;
};

const rowAmount = (sheet, data, ctx) => (sheet === 'crm' ? cellNumber(data.monto) : rowTotal(sheet, data, ctx) ?? 0);

// Cuántas filas facturables hay en cada estado y cuánta plata suman:
// { total, amount, byStatus: { [id]: { count, amount } } }
export const statusStats = (sheet, rows = [], ctxById = {}) => {
  const byStatus = Object.fromEntries(INVOICE_STATUS_IDS.map((id) => [id, { count: 0, amount: 0 }]));
  let total = 0; let amount = 0;
  rows.forEach((r) => {
    const ctx = ctxById[r.id];
    if (!isBillable(sheet, r.data, ctx)) return;
    const a = rowAmount(sheet, r.data, ctx);
    const st = rowStatus(r.data);
    byStatus[st].count += 1; byStatus[st].amount += a;
    total += 1; amount += a;
  });
  INVOICE_STATUS_IDS.forEach((id) => { byStatus[id].amount = round2(byStatus[id].amount); });
  return { total, amount: round2(amount), byStatus };
};

// ── Resumen de un mes (vista «Mes a mes») ──
export const monthSummary = (rows = []) => {
  const of = (sheet) => sortRows(rows.filter((r) => r.sheet === sheet));
  const fijoRows = of('fijo');
  const ctxById = fijoContext(fijoRows);
  const fijo = fijoRows.reduce((s, r) => s + (rowTotal('fijo', r.data, ctxById[r.id]) ?? 0), 0);
  const varRows = of('variables');
  const byCat = Object.fromEntries(VARIABLE_CATEGORIES.map((c) => [c.id, round2(varRows.reduce((s, r) => s + chargesTotal(variableCharges(r.data).filter((ch) => ch.cat === c.id)), 0))]));
  const variables = varRows.reduce((s, r) => s + (rowTotal('variables', r.data) ?? 0), 0);
  const mkt = of('mkt').reduce((s, r) => s + (rowTotal('mkt', r.data) ?? 0), 0);
  const licenses = crmLicenses(of('crm'));
  const extra = of('crm_extra');
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
    status: {
      fijo: statusStats('fijo', fijoRows, ctxById),
      variables: statusStats('variables', varRows),
      crm: statusStats('crm', of('crm')),
    },
  };
};

// ── Agrupar, filtrar y buscar ──
// País para agrupar: lo que hay antes del paréntesis ("Argentina (se manda
// por mail…)" → "Argentina")
export const countryGroupKey = (pais) => String(pais || '').split('(')[0].trim() || 'Sin país';

// Marca de una fila según empresa / país / entidad: 'cu' | 'peterson' | 'otras'
export const brandOfRow = (data = {}) => {
  const empresa = String(data.empresa || '').trim().toLowerCase();
  if (/^bel\b|^bele\b/.test(empresa)) return 'otras';
  const s = `${data.pais || ''} ${data.empresa || ''} ${data.entidad || ''} ${data.cliente || ''} ${data.oficina || ''}`.toLowerCase();
  if (/peterson|\bps\b|ptech/.test(s)) return 'peterson';
  return 'cu';
};

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ¿La fila contiene el texto buscado en alguna celda?
export const rowMatches = (data = {}, q) => {
  const term = fold(q).trim();
  if (!term) return true;
  return Object.entries(data).some(([k, v]) => {
    if (k.startsWith('_')) return false;
    if (v && typeof v === 'object') return Object.values(v).some((x) => fold(x).includes(term));
    return fold(v).includes(term);
  });
};

// Clave natural de una fila (para emparejarla con la del mes anterior)
export const rowNaturalKey = (sheet, data = {}) => {
  const keys = {
    fijo: ['pais', 'empresa', 'cuenta', 'codigo'],
    variables: ['pais', 'cuenta', 'codigo', 'empresa'],
    crm: ['entidad'],
    mkt: ['cliente'],
    crm_extra: ['concepto'],
  }[sheet] || [];
  const parts = keys.map((k) => fold(data[k]).replace(/\s+/g, ' ').trim());
  if (sheet === 'fijo' || sheet === 'variables') parts[0] = fold(countryGroupKey(data.pais));
  return parts.join('|');
};

// Empareja las filas de un mes con las del anterior: por `_from` (la fila
// de la que se copió) o por su clave natural. Map id → fila anterior.
export const matchRows = (sheet, prevRows = [], rows = []) => {
  const out = new Map();
  const prevById = new Map(prevRows.map((r) => [r.id, r]));
  const free = new Map();
  prevRows.forEach((r) => { const k = rowNaturalKey(sheet, r.data); if (!free.has(k)) free.set(k, []); free.get(k).push(r); });
  const used = new Set();
  rows.forEach((r) => {
    const from = r.data?._from && prevById.get(r.data._from);
    if (from && !used.has(from.id)) { out.set(r.id, from); used.add(from.id); }
  });
  rows.forEach((r) => {
    if (out.has(r.id)) return;
    const k = rowNaturalKey(sheet, r.data);
    const cand = (free.get(k) || []).find((p) => !used.has(p.id));
    if (cand) { out.set(r.id, cand); used.add(cand.id); }
  });
  return out;
};

// ── Meses ──
export const nextMonthKey = (key) => {
  const y = Number(key.slice(0, 4)); const m = Number(key.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
export const previousMonthKey = (key) => {
  const y = Number(key.slice(0, 4)); const m = Number(key.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

// Arma las filas de un mes nuevo a partir de otro:
//   Fijo, MKT Plan (tabla y zona libre) y CRM se copian tal cual (los
//   totales del CRM siguen sumando lo mismo); Variables copia las filas
//   (país, entidad, código, empresa) sin cargos, salvo que copyVariables
//   sea true; las notas arrancan vacías. El estado de cobro vuelve a
//   pendiente y cada fila recuerda de cuál se copió (_from).
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
      delete data.estado;
      if (r.sheet !== 'mkt_libre') data._from = r.id;
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

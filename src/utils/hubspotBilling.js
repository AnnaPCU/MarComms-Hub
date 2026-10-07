// ════════════════════════════════════════════════════════════════════
// hubspotBilling — Lectura del Excel de facturación HubSpot + cálculos
// ════════════════════════════════════════════════════════════════════
// Funciones puras (sin React ni Supabase):
//   parseBillingWorkbook({ sheetNames, grids }) → { entities, meta, warnings }
//   parseLicenses(detalle) · parseUsers(texto)
//   monthTotals(entities) · latestBilledMonth(entities) · monthOf(entity, mes)
//   expectedPrice(mes, tarifas) · priceCheck(mes, tarifas)
//   totalCheck(entities, meta, mes) · diffImport(actual, nuevo)
// El Excel es una matriz: cada columna es una entidad y cada mes tiene dos
// filas ("<Mes> - Precio" y "<Mes> - Detalle"). Se lee por etiquetas, no
// por posiciones fijas.
// ════════════════════════════════════════════════════════════════════

import { BILLING_SHEET, SUMMARY_SHEET, DEFAULT_UNIT_PRICES, ROW_LABELS, MONTHS_ES } from '@/constants/hubspotBilling';

const norm = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');
const text = (v) => (v === null || v === undefined ? '' : String(v).trim());
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$\s.]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const monthIdx = (m) => MONTHS_ES.findIndex((x) => norm(x) === norm(m));

// "2 Licencias Sales Pro\n3 Licencias Core + Trainings" → { salesPro: 2, core: 3, extras: ['Trainings'] }
export const parseLicenses = (detail) => {
  const raw = text(detail);
  let salesPro = 0; let core = 0;
  const rest = raw.replace(/(\d+)\s*licencias?\s*(sales\s*pro|core)/gi, (_, n, type) => {
    if (/sales/i.test(type)) salesPro += Number(n); else core += Number(n);
    return '|';
  });
  const extras = rest.split(/[|\n+,]/).map((s) => s.trim()).filter((s) => s && s !== '0');
  return { salesPro, core, extras };
};

// "°Martin Continanza\n-Tomas Palacios" → [{ name, license: 'salesPro' | 'core' | '' }]
export const parseUsers = (value) => text(value).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
  if (l.startsWith('°') || l.startsWith('º')) return { name: l.slice(1).trim(), license: 'salesPro' };
  if (l.startsWith('-') || l.startsWith('–') || l.startsWith('•')) return { name: l.slice(1).trim(), license: 'core' };
  return { name: l, license: '' };
});

// Nombres parecidos entre la hoja principal y Summary ("CU Cert Arg" ↔ "CU Cert Argentina", "PCU Chile" ↔ "CU Chile")
const compact = (s) => norm(s).replace(/[^a-z0-9]/g, '').replace(/^pcu/, 'cu');
const sameEntity = (a, b) => { const x = compact(a); const y = compact(b); return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x)); };

const parseSummary = (grid) => {
  const unitPrices = { ...DEFAULT_UNIT_PRICES };
  const entityPrices = [];
  (grid || []).forEach((row) => {
    if (!row) return;
    const label = text(row[0]); const value = num(row[1]);
    if (!label || value === null) return;
    if (/licencia\s*sales\s*pro/i.test(label)) unitPrices.salesPro = value;
    else if (/licencia\s*core/i.test(label)) unitPrices.core = value;
    else entityPrices.push({ label, price: value });
  });
  return { unitPrices, entityPrices };
};

export const parseBillingWorkbook = ({ sheetNames, grids }) => {
  const warnings = [];
  const name = sheetNames.find((n) => norm(n) === norm(BILLING_SHEET))
    || sheetNames.find((n) => (grids[n] || []).some((row) => row && row.some((v) => norm(v) === 'detalle')));
  if (!name) return { entities: [], meta: null, warnings: ['No se encontró la hoja de facturación (con la columna «Detalle»). ¿Es el Excel de Facturación HubSpot?'] };
  const grid = grids[name];

  // Fila de encabezados: la que tiene "Detalle"; las entidades están a su derecha
  const headerRow = grid.findIndex((row) => row && row.some((v) => norm(v) === 'detalle'));
  const labelCol = grid[headerRow].findIndex((v) => norm(v) === 'detalle');
  const totalCol = grid[headerRow].findIndex((v) => norm(v) === 'total');
  const cols = [];
  for (let c = labelCol + 1; c < grid[headerRow].length; c += 1) if (text(grid[headerRow][c])) cols.push(c);

  const entities = cols.map((c, i) => ({ key: text(grid[headerRow][c]), position: i, legalEntity: '', manager: '', users: [], months: MONTHS_ES.map((m, idx) => ({ month: m, index: idx, price: null, detail: '' })) }));
  const excelTotals = {};

  for (let r = headerRow + 1; r < grid.length; r += 1) {
    const row = grid[r];
    if (!row) continue;
    const label = norm(row[labelCol]);
    if (!label) continue;
    const field = ROW_LABELS[label];
    const m = label.match(/^([a-z]+)\s*-\s*(precio|detalle)$/);
    cols.forEach((c, i) => {
      const v = row[c];
      if (field === 'users') entities[i].users = parseUsers(v);
      else if (field) entities[i][field] = text(v);
      else if (m) {
        const idx = monthIdx(m[1]);
        if (idx < 0) return;
        if (m[2] === 'precio') entities[i].months[idx].price = num(v);
        else entities[i].months[idx].detail = text(v);
      }
    });
    if (m && m[2] === 'precio' && totalCol >= 0 && monthIdx(m[1]) >= 0) excelTotals[MONTHS_ES[monthIdx(m[1])]] = num(row[totalCol]);
  }

  const summaryName = sheetNames.find((n) => norm(n) === norm(SUMMARY_SHEET));
  const { unitPrices, entityPrices } = parseSummary(summaryName ? grids[summaryName] : null);
  const summaryPrices = entityPrices.map((p) => ({ ...p, entityKey: (entities.find((e) => sameEntity(e.key, p.label)) || {}).key || null }));
  summaryPrices.filter((p) => !p.entityKey).forEach((p) => warnings.push(`En la hoja Summary, «${p.label}» no coincide con ninguna entidad de la hoja principal.`));
  if (!summaryName) warnings.push(`No hay hoja «Summary»: se usan las tarifas por defecto (Sales Pro $${DEFAULT_UNIT_PRICES.salesPro}, Core $${DEFAULT_UNIT_PRICES.core}).`);

  const meta = { sheetName: name, unitPrices, excelTotals, summaryPrices };
  // Avisos: TOTAL del Excel que no suma todas las entidades
  MONTHS_ES.forEach((m) => {
    const check = totalCheck(entities, meta, m);
    if (check && check.diff !== 0) {
      warnings.push(`${m}: el TOTAL del Excel dice $${fmt(check.excel)} pero las entidades suman $${fmt(check.computed)}${check.missing.length ? ` (no incluye ${check.missing.join(', ')})` : ''}. El Hub usa la suma real.`);
    }
  });
  if (!entities.length) warnings.push('La hoja no tiene entidades (columnas a la derecha de «Detalle»).');
  return { entities, meta, warnings };
};

const fmt = (n) => Number(n || 0).toLocaleString('es-AR');

// ── Cálculos ──
export const monthOf = (entity, month) => (entity?.months || []).find((m) => m.month === month) || null;
const priceOf = (entity, month) => (monthOf(entity, month)?.price) || 0;

export const monthTotals = (entities) => MONTHS_ES.map((m, index) => {
  const prices = (entities || []).map((e) => priceOf(e, m));
  return { month: m, index, total: prices.reduce((a, b) => a + b, 0), billed: prices.filter((p) => p > 0).length };
});

export const latestBilledMonth = (entities) => {
  const t = monthTotals(entities).filter((x) => x.total > 0);
  return t.length ? t[t.length - 1].month : MONTHS_ES[0];
};
export const previousMonth = (month) => { const i = monthIdx(month); return i > 0 ? MONTHS_ES[i - 1] : null; };

export const licensesOf = (monthEntry) => parseLicenses(monthEntry?.detail);
export const expectedPrice = (monthEntry, unitPrices = DEFAULT_UNIT_PRICES) => {
  const l = licensesOf(monthEntry);
  return l.salesPro * unitPrices.salesPro + l.core * unitPrices.core;
};

// ¿El precio cobrado coincide con licencias × tarifa? Si hay otros conceptos
// (Implementación, Trainings…) la diferencia se explica por ellos.
export const priceCheck = (monthEntry, unitPrices = DEFAULT_UNIT_PRICES) => {
  if (!monthEntry || !monthEntry.price) return null;
  const l = licensesOf(monthEntry);
  const expected = expectedPrice(monthEntry, unitPrices);
  const diff = monthEntry.price - expected;
  return { expected, diff, extras: l.extras, explained: diff === 0 || l.extras.length > 0, hasLicenses: l.salesPro + l.core > 0 };
};

export const totalCheck = (entities, meta, month) => {
  const excel = meta?.excelTotals ? meta.excelTotals[month] : null;
  if (excel === null || excel === undefined) return null;
  const prices = (entities || []).map((e) => ({ key: e.key, price: priceOf(e, month) }));
  const computed = prices.reduce((a, b) => a + b.price, 0);
  // Qué entidades quedaron afuera: el TOTAL suele sumar solo las primeras columnas
  let missing = [];
  if (computed !== excel) {
    let acc = 0;
    for (let k = 0; k < prices.length; k += 1) {
      acc += prices[k].price;
      if (acc === excel) { missing = prices.slice(k + 1).filter((p) => p.price > 0).map((p) => p.key); break; }
    }
  }
  return { excel, computed, diff: computed - excel, missing };
};

export const userLicenseCheck = (entity, monthEntry) => {
  const l = licensesOf(monthEntry);
  const sp = (entity?.users || []).filter((u) => u.license === 'salesPro').length;
  const core = (entity?.users || []).filter((u) => u.license === 'core').length;
  return { usersSalesPro: sp, usersCore: core, licSalesPro: l.salesPro, licCore: l.core, ok: sp === l.salesPro && core === l.core };
};

// Diferencias entre lo que hay en el Hub y lo que trae el Excel
export const diffImport = (current, incoming) => {
  const cur = new Map((current || []).map((e) => [e.key, e]));
  const added = []; const updated = []; const unchanged = [];
  (incoming || []).forEach((e) => {
    const before = cur.get(e.key);
    if (!before) { added.push({ key: e.key }); return; }
    const changedMonths = e.months.filter((m) => {
      const b = monthOf(before, m.month) || {};
      return (b.price ?? null) !== (m.price ?? null) || (b.detail || '') !== (m.detail || '');
    }).map((m) => m.month);
    const otherChanged = before.legalEntity !== e.legalEntity || before.manager !== e.manager || JSON.stringify(before.users) !== JSON.stringify(e.users);
    (changedMonths.length || otherChanged ? updated : unchanged).push({ key: e.key, changedMonths, otherChanged });
  });
  const keys = new Set((incoming || []).map((e) => e.key));
  const removed = [...cur.keys()].filter((k) => !keys.has(k));
  return { added, updated, unchanged, removed };
};

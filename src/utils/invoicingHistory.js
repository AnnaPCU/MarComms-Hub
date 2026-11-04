// ════════════════════════════════════════════════════════════════════
// invoicingHistory — Historial de cambios de Facturación (sin React)
// ════════════════════════════════════════════════════════════════════
//   changeKeyLabel(sheet, key)        → «Valor», «Cargo», «Estado»…
//   changeValueText(sheet, key, v)    → el valor como texto corto
//   groupChanges(changes)             → [{ day, label, items }], donde las
//     filas creadas de a muchas por la misma persona (Mes nuevo) quedan
//     juntas en un solo ítem
// ════════════════════════════════════════════════════════════════════

import {
  CRM_COLUMNS, FIJO_COLUMNS, INVOICE_STATUS_BY_ID, MKT_COLUMNS, OFFICES_COLUMNS, SHEET_LABELS, VARIABLES_BASE_COLUMNS, VARIABLE_CATEGORY_BY_ID,
} from '@/constants/invoicing';
import { formatAmount, isChargeKey } from '@/utils/invoicing';
import { monthLabel } from '@/utils/planTasks';

const COLS = { fijo: FIJO_COLUMNS, variables: VARIABLES_BASE_COLUMNS, crm: CRM_COLUMNS, mkt: MKT_COLUMNS, entidades: OFFICES_COLUMNS };
const EXTRA = { totalManual: 'Total escrito a mano', estado: 'Estado', kind: 'Tipo de fila', concepto: 'Concepto', monto: 'Monto', moneda: 'Moneda', sumOf: 'Qué suma', revisado: 'Avisos borrados' };

export const changeKeyLabel = (sheet, key) => {
  if (!key) return '';
  if (isChargeKey(key)) return 'Cargo';
  const legacy = /^([a-z]+)(Detalle|Cc|Precio)$/.exec(key);
  if (sheet === 'variables' && legacy && VARIABLE_CATEGORY_BY_ID[legacy[1]]) return `${VARIABLE_CATEGORY_BY_ID[legacy[1]].short} · ${legacy[2] === 'Cc' ? 'CC' : legacy[2]}`;
  const col = (COLS[sheet] || []).find((c) => c.key === key);
  if (col) return col.label;
  if (sheet === 'notas') return `Notas · ${SHEET_LABELS[key] || key}`;
  if (sheet === 'mkt_libre') return `Celda ${key}`;
  return EXTRA[key] || key;
};

export const changeValueText = (sheet, key, v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (key === 'estado') return INVOICE_STATUS_BY_ID[v]?.label || String(v);
  if (Array.isArray(v)) return v.length ? `${v.length} ${v.length === 1 ? 'referencia' : 'referencias'}` : '—';
  if (typeof v === 'object') {
    if (isChargeKey(key || '')) return [VARIABLE_CATEGORY_BY_ID[v.cat]?.short || v.cat, v.detalle, v.cc, v.precio !== undefined ? String(v.precio) : ''].filter(Boolean).join(' · ') || '—';
    return JSON.stringify(v);
  }
  if (typeof v === 'number') return formatAmount(v);
  return String(v);
};

const sameMinute = (a, b, secs = 120) => Math.abs(new Date(a) - new Date(b)) <= secs * 1000;

export const dayOf = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dayLabel = (day, todayIso) => {
  const today = todayIso.slice(0, 10);
  if (day === today) return 'Hoy';
  const y = new Date(`${today}T12:00:00`); y.setDate(y.getDate() - 1);
  if (day === dayOf(y.toISOString().slice(0, 10) + 'T12:00:00')) return 'Ayer';
  const d = new Date(`${day}T12:00:00`);
  return `${d.getDate()} de ${monthLabel(day.slice(0, 7)).toLowerCase()}`;
};

export const timeOf = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

// Agrupa por día (los más nuevos primero) y junta las filas creadas o
// borradas de a muchas por la misma persona en pocos minutos
export const groupChanges = (changes = []) => {
  const items = [];
  changes.forEach((c) => {
    const last = items[items.length - 1];
    if (last && last.bulk && last.action === c.action && c.action !== 'update' && last.by === c.by && last.month === c.month && sameMinute(last.at, c.at)) {
      last.count += 1; last.sheets.add(c.sheet); last.at = c.at; return;
    }
    if (c.action !== 'update') items.push({ ...c, bulk: true, count: 1, sheets: new Set([c.sheet]) });
    else items.push({ ...c, bulk: false });
  });
  const days = [];
  items.forEach((it) => {
    const day = dayOf(it.at);
    const last = days[days.length - 1];
    if (last && last.day === day) last.items.push(it);
    else days.push({ day, items: [it] });
  });
  return days;
};

export const changeTitle = (it) => {
  if (it.action === 'update') return `${changeKeyLabel(it.sheet, it.key)}`;
  if (it.bulk && it.count > 1) return `${it.count} filas ${it.action === 'insert' ? 'creadas' : 'eliminadas'}`;
  return it.action === 'insert' ? 'Fila creada' : 'Fila eliminada';
};

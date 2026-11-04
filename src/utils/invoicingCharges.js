// ════════════════════════════════════════════════════════════════════
// invoicingCharges — Cargos de «Variables (todos)» (sin React)
// ════════════════════════════════════════════════════════════════════
// Cada entidad puede tener varios cargos por mes, más de uno por
// categoría (CC: Campañas, BBDD, Eventos, Content, Website, Otros). Cada
// cargo vive en una clave "cargo:<id>" de data: { cat, detalle, cc,
// precio, pos }. Las filas cargadas desde el Excel tienen una clave por
// columna ("campanasDetalle"…) y se convierten al editarlas.
//
//   newChargeId, chargeWrite, chargeRemove   → { patch, remove } para
//     api.patchCell (convierten las claves viejas la primera vez)
//   variablesViewData(data)  → la fila como la ve la grilla tipo Excel
//     (una celda por columna; con 2+ cargos en una categoría, la celda
//     muestra el resumen y no se edita: _multi[cat] = cantidad)
//   viewCellPatch(data, key, raw) → edición de una celda de esa grilla
//     pasada a cargos
// ════════════════════════════════════════════════════════════════════

import { VARIABLE_CATEGORIES, VARIABLE_CATEGORY_BY_ID } from '@/constants/invoicing';
import {
  ALL_LEGACY_CHARGE_KEYS, CHARGE_PREFIX, cellNumber, chargesTotal, formatAmount, isChargeKey, variableCharges,
} from '@/utils/invoicing';

export const newChargeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const chargeData = (c) => {
  const out = { cat: c.cat || 'otros', pos: Number(c.pos) || 0 };
  if (String(c.detalle ?? '').trim()) out.detalle = String(c.detalle).trim();
  if (String(c.cc ?? '').trim()) out.cc = String(c.cc).trim();
  if (String(c.precio ?? '').trim()) out.precio = String(c.precio).trim();
  return out;
};

const isEmptyCharge = (c) => !String(c.detalle ?? '').trim() && !String(c.cc ?? '').trim() && !String(c.precio ?? '').trim();

// Si la fila todavía tiene las claves del Excel, las pasa a cargos (con
// ids nuevos) en el mismo patch. Devuelve { patch, remove, ids } donde ids
// mapea el id viejo ("legacy:<cat>") al nuevo.
const convertLegacy = (data = {}) => {
  const hasNew = Object.keys(data).some(isChargeKey);
  if (hasNew) return { patch: {}, remove: [], ids: {} };
  const patch = {}; const ids = {};
  variableCharges(data).forEach((c) => {
    const id = newChargeId();
    ids[c.id] = id;
    patch[`${CHARGE_PREFIX}${id}`] = chargeData(c);
  });
  const remove = ALL_LEGACY_CHARGE_KEYS.filter((k) => data[k] !== undefined);
  return { patch, remove, ids };
};

// Guarda un cargo (nuevo o editado): charge = { id?, cat, detalle, cc, precio, pos? }
export const chargeWrite = (data = {}, charge) => {
  const conv = convertLegacy(data);
  const id = conv.ids[charge.id] || (charge.id && !String(charge.id).startsWith('legacy:') ? charge.id : newChargeId());
  const existing = variableCharges(data).find((c) => c.id === charge.id);
  const pos = charge.pos ?? existing?.pos ?? variableCharges(data).reduce((m, c) => Math.max(m, c.pos + 1), 0);
  const merged = { ...(existing || {}), ...charge, pos };
  const key = `${CHARGE_PREFIX}${id}`;
  if (isEmptyCharge(merged)) {
    const { [key]: _drop, ...rest } = conv.patch;
    return { patch: rest, remove: [...conv.remove, ...(data[key] !== undefined ? [key] : [])], id };
  }
  return { patch: { ...conv.patch, [key]: chargeData(merged) }, remove: conv.remove, id };
};

export const chargeRemove = (data = {}, chargeId) => {
  const conv = convertLegacy(data);
  const id = conv.ids[chargeId] || chargeId;
  const key = `${CHARGE_PREFIX}${id}`;
  const { [key]: _drop, ...patch } = conv.patch;
  return { patch, remove: [...conv.remove, ...(data[key] !== undefined ? [key] : [])] };
};

// ── Grilla tipo Excel ──
const uniq = (xs) => [...new Set(xs.filter(Boolean))];

export const variablesViewData = (data = {}) => {
  const view = {};
  Object.entries(data).forEach(([k, v]) => { if (!isChargeKey(k) && !ALL_LEGACY_CHARGE_KEYS.includes(k)) view[k] = v; });
  const multi = {};
  VARIABLE_CATEGORIES.forEach((c) => {
    const list = variableCharges(data).filter((ch) => ch.cat === c.id);
    if (!list.length) return;
    if (list.length === 1) {
      const [ch] = list;
      if (ch.detalle) view[`${c.id}Detalle`] = ch.detalle;
      if (ch.cc) view[`${c.id}Cc`] = ch.cc;
      if (String(ch.precio ?? '') !== '') view[`${c.id}Precio`] = ch.precio;
      return;
    }
    multi[c.id] = list.length;
    view[`${c.id}Detalle`] = `${list.length} cargos: ${list.map((ch) => ch.detalle || 'sin detalle').join(' + ')}`;
    view[`${c.id}Cc`] = uniq(list.map((ch) => ch.cc)).join(', ');
    view[`${c.id}Precio`] = String(chargesTotal(list));
  });
  view._multi = multi;
  return view;
};

const FIELD_OF = { Detalle: 'detalle', Cc: 'cc', Precio: 'precio' };

// Una celda de la grilla (key "campanasPrecio") editada → { patch, remove }
// o null si la celda no es de un cargo (o la categoría tiene 2+ cargos)
export const viewCellPatch = (data = {}, key, raw) => {
  const m = /^([a-z]+)(Detalle|Cc|Precio)$/.exec(key);
  if (!m || !VARIABLE_CATEGORY_BY_ID[m[1]]) return null;
  const cat = m[1]; const field = FIELD_OF[m[2]];
  const list = variableCharges(data).filter((ch) => ch.cat === cat);
  if (list.length > 1) return null;
  if (!list.length) {
    if (!String(raw ?? '').trim()) return { patch: {}, remove: [] };
    const base = { cat, cc: field === 'cc' ? '' : VARIABLE_CATEGORY_BY_ID[cat].cc };
    return chargeWrite(data, { ...base, [field]: raw });
  }
  return chargeWrite(data, { id: list[0].id, [field]: raw });
};

// Resumen corto de un cargo (para listas y avisos): "Campañas · Fee de gestión · 175"
export const chargeSummary = (c) => [VARIABLE_CATEGORY_BY_ID[c.cat]?.short || c.cat, c.detalle, formatAmount(cellNumber(c.precio))].filter(Boolean).join(' · ');

// ════════════════════════════════════════════════════════════════════
// INVOICING SERVICE — Facturación MarComms (migrations 0048 y 0051)
// ════════════════════════════════════════════════════════════════════
//   invoicing_months  — meses armados ('YYYY-MM')
//   invoicing_rows    — filas de cada hoja: { id, month, sheet, position,
//                       data (jsonb con las celdas) }. «Entidades» tiene
//                       month en null.
//   invoicing_changes — historial: lo escribe un trigger (quién, cuándo,
//                       qué celda, antes y después)
//
// Las celdas se cambian con invoicing_patch_row (solo las claves tocadas),
// así dos personas pueden editar la misma fila a la vez. Al borrar una fila
// primero se guarda quién (updated_by) y después se borra, así el
// historial sabe quién fue.
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const MONTHS = 'invoicing_months';
const ROWS = 'invoicing_rows';
const CHANGES = 'invoicing_changes';
const PAGE = 1000; // límite de filas por pedido de Supabase

export const rowFromDb = (r) => ({
  id: r.id,
  month: r.month || null,
  sheet: r.sheet,
  position: Number(r.position) || 0,
  data: r.data || {},
  updatedBy: r.updated_by || r.created_by || '',
  updatedAt: r.updated_at || null,
});

export const listMonths = async () => {
  const { data, error } = await supabase.from(MONTHS).select('month').order('month', { ascending: true });
  if (error) throw error;
  return (data || []).map((m) => m.month);
};

export const listRows = async () => {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(ROWS).select('*')
      .order('position', { ascending: true }).order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out.map(rowFromDb);
};

const toDb = (row, by) => ({
  id: row.id,
  month: row.month || null,
  sheet: row.sheet,
  position: row.position ?? 0,
  data: row.data || {},
  created_by: by || null,
  updated_by: by || null,
});

export const insertRows = async (rows, by) => {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(ROWS).insert(rows.slice(i, i + 500).map((r) => toDb(r, by)));
    if (error) throw error;
  }
  return true;
};

// Mes nuevo: crea el mes y sus filas (ya armadas con buildMonthCopy)
export const createMonth = async (month, rows, by) => {
  const { error } = await supabase.from(MONTHS).insert({ month, created_by: by || null });
  if (error) throw error;
  if (rows.length) await insertRows(rows, by);
  return true;
};

export const patchRow = async (id, patch = {}, remove = [], by) => {
  const { data, error } = await supabase.rpc('invoicing_patch_row', { p_id: id, p_patch: patch, p_remove: remove, p_by: by || null });
  if (error) throw error;
  return data;
};

export const setRowPosition = async (id, position) => {
  const { error } = await supabase.from(ROWS).update({ position }).eq('id', id);
  if (error) throw error;
  return true;
};

// Primero deja quién borra (el trigger del historial lo lee de la fila) y
// después borra
export const deleteRow = async (id, by) => {
  const { error: e1 } = await supabase.from(ROWS).update({ updated_by: by || null }).eq('id', id);
  if (e1) throw e1;
  const { error } = await supabase.from(ROWS).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Historial ──
export const changeFromRow = (c) => ({
  id: c.id,
  rowId: c.row_id,
  month: c.month || null,
  sheet: c.sheet,
  rowLabel: c.row_label || '',
  action: c.action,
  key: c.key || null,
  before: c.old_value ?? null,
  after: c.new_value ?? null,
  by: c.changed_by || '',
  at: c.changed_at,
});

// Los últimos cambios (los más nuevos primero). before: changed_at desde
// donde seguir (para «cargar más»).
export const listChanges = async ({ month, limit = 300, before } = {}) => {
  let q = supabase.from(CHANGES).select('*').order('changed_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
  if (month) q = q.eq('month', month);
  if (before) q = q.lt('changed_at', before);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(changeFromRow);
};

export const subscribeInvoicing = (onChange) => {
  const channel = supabase
    .channel('invoicing-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: MONTHS }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: ROWS }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const subscribeChanges = (onChange) => {
  const channel = supabase
    .channel('invoicing-changes-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: CHANGES }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

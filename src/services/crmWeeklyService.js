// ════════════════════════════════════════════════════════════════════
// CRM WEEKLY SERVICE — Weekly check de CRM HubSpot
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase (migrations 0043 y 0044):
//   crm_check_items   — ítems del checklist (valen para todas las entidades)
//   crm_weekly_checks — checklist: una fila por entidad e ítem
//   crm_next_steps    — próximos steps de cada entidad
//
// Ítem (UI):  { id, label, hint, position, createdBy }
// Check (UI): { id, entityCode, itemId, done, deadline ('YYYY-MM-DD' | ''),
//               doneAt, updatedBy, updatedAt }
// Step (UI):  { id, entityCode, category, title, detail, position,
//               createdBy, createdAt, updatedAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const ITEMS = 'crm_check_items';
const CHECKS = 'crm_weekly_checks';
const STEPS = 'crm_next_steps';

// ── Ítems del checklist ──
export const itemFromRow = (row) => (row ? {
  id:        row.id,
  label:     row.label || '',
  hint:      row.hint || '',
  position:  row.position ?? 0,
  createdBy: row.created_by || '',
} : null);

export const listItems = async () => {
  const { data, error } = await supabase.from(ITEMS).select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(itemFromRow);
};
export const createItem = async ({ id, label, hint, position, createdBy }) => {
  const { data, error } = await supabase.from(ITEMS)
    .insert({ id, label: String(label || '').trim(), hint: String(hint || '').trim() || null, position: position ?? 0, created_by: createdBy || null })
    .select('*').single();
  if (error) throw error;
  return itemFromRow(data);
};
export const updateItem = async (id, patch) => {
  const row = {};
  if (patch.label !== undefined) row.label = String(patch.label || '').trim();
  if (patch.hint !== undefined) row.hint = String(patch.hint || '').trim() || null;
  const { data, error } = await supabase.from(ITEMS).update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return itemFromRow(data);
};
// Borra el ítem y lo que tenía cargado cada entidad (tilde y deadline)
export const deleteItem = async (id) => {
  const { error } = await supabase.from(ITEMS).delete().eq('id', id);
  if (error) throw error;
  const { error: e2 } = await supabase.from(CHECKS).delete().eq('item_id', id);
  if (e2) throw e2;
  return true;
};

// ── Checklist ──
export const checkFromRow = (row) => (row ? {
  id:         row.id,
  entityCode: row.entity_code,
  itemId:     row.item_id,
  done:       !!row.done,
  deadline:   row.deadline || '',
  doneAt:     row.done_at || null,
  updatedBy:  row.updated_by || '',
  updatedAt:  row.updated_at || null,
} : null);

export const listChecks = async () => {
  const { data, error } = await supabase.from(CHECKS).select('*');
  if (error) throw error;
  return (data || []).map(checkFromRow);
};

// Guarda un ítem de una entidad (crea la fila si no existe). patch: { done?, deadline? }
export const saveCheck = async ({ entityCode, itemId, patch, updatedBy }) => {
  const row = { entity_code: entityCode, item_id: itemId, updated_by: updatedBy || null };
  if (patch.done !== undefined) { row.done = !!patch.done; row.done_at = patch.done ? new Date().toISOString() : null; }
  if (patch.deadline !== undefined) row.deadline = patch.deadline || null;
  const { data, error } = await supabase.from(CHECKS).upsert(row, { onConflict: 'entity_code,item_id' }).select('*').single();
  if (error) throw error;
  return checkFromRow(data);
};

// ── Próximos steps ──
export const stepFromRow = (row) => (row ? {
  id:         row.id,
  entityCode: row.entity_code,
  category:   row.category || '',
  title:      row.title || '',
  detail:     row.detail || '',
  position:   row.position ?? 0,
  createdBy:  row.created_by || '',
  createdAt:  row.created_at || null,
  updatedAt:  row.updated_at || null,
} : null);

export const stepToRow = (obj) => {
  const row = {};
  if (obj.entityCode !== undefined) row.entity_code = obj.entityCode;
  if (obj.category   !== undefined) row.category = String(obj.category || '').trim() || null;
  if (obj.title      !== undefined) row.title = String(obj.title || '').trim();
  if (obj.detail     !== undefined) row.detail = String(obj.detail || '').trim() || null;
  if (obj.position   !== undefined) row.position = obj.position ?? 0;
  if (obj.createdBy  !== undefined) row.created_by = obj.createdBy || null;
  return row;
};

export const listSteps = async () => {
  const { data, error } = await supabase.from(STEPS).select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(stepFromRow);
};
export const createStep = async (obj) => {
  const { data, error } = await supabase.from(STEPS).insert(stepToRow(obj)).select('*').single();
  if (error) throw error;
  return stepFromRow(data);
};
export const updateStep = async (id, patch) => {
  const { data, error } = await supabase.from(STEPS).update(stepToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return stepFromRow(data);
};
export const deleteStep = async (id) => {
  const { error } = await supabase.from(STEPS).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime (las tres tablas en un canal) ──
export const subscribeCrmWeekly = (onChange) => {
  const channel = supabase
    .channel('crm-weekly-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: ITEMS }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: CHECKS }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: STEPS }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

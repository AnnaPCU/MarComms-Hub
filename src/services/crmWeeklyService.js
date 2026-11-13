// ════════════════════════════════════════════════════════════════════
// CRM WEEKLY SERVICE — Weekly check de CRM HubSpot
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase (migrations 0043, 0044 y 0070):
//   crm_weekly_entities — entidades (países) del Weekly check (0070)
//   crm_weekly_deal_counts / crm_weekly_deal_sync — deals nuevos por
//     semana, de HubSpot (0071; los escribe la Edge Function
//     hubspot-weekly-deals, el Hub solo lee)
//   crm_check_items   — ítems del checklist (valen para todas las entidades)
//   crm_weekly_checks — checklist: una fila por entidad e ítem
//   crm_next_steps    — próximos steps de cada entidad
//
// Entidad (UI): { code, name, brand, country, priority, tags, position, createdBy }
// Ítem (UI):  { id, label, hint, position, createdBy }
// Check (UI): { id, entityCode, itemId, done, deadline ('YYYY-MM-DD' | ''),
//               doneAt, updatedBy, updatedAt }
// Step (UI):  { id, entityCode, category, title, detail, position,
//               dueDate ('YYYY-MM-DD' | ''), done, doneAt (0070),
//               createdBy, createdAt, updatedAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const ENTITIES = 'crm_weekly_entities';
const DEAL_COUNTS = 'crm_weekly_deal_counts';
const DEAL_SYNC = 'crm_weekly_deal_sync';
const ITEMS = 'crm_check_items';
const CHECKS = 'crm_weekly_checks';
const STEPS = 'crm_next_steps';

// ── Entidades ──
export const entityFromRow = (row) => (row ? {
  code:      row.code,
  name:      row.name || '',
  brand:     row.brand || 'Control Union',
  country:   row.country || '',
  priority:  row.priority || null,
  tags:      Array.isArray(row.tags) ? row.tags : [],
  position:  row.position ?? 0,
  createdBy: row.created_by || '',
} : null);

const entityToRow = (obj) => {
  const row = {};
  if (obj.code      !== undefined) row.code = String(obj.code || '').trim();
  if (obj.name      !== undefined) row.name = String(obj.name || '').trim();
  if (obj.brand     !== undefined) row.brand = obj.brand || 'Control Union';
  if (obj.country   !== undefined) row.country = String(obj.country || '').trim() || null;
  if (obj.priority  !== undefined) row.priority = obj.priority || null;
  if (obj.tags      !== undefined) row.tags = obj.tags || [];
  if (obj.position  !== undefined) row.position = obj.position ?? 0;
  if (obj.createdBy !== undefined) row.created_by = obj.createdBy || null;
  return row;
};

export const listEntities = async () => {
  const { data, error } = await supabase.from(ENTITIES).select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(entityFromRow);
};
export const createEntity = async (obj) => {
  const { data, error } = await supabase.from(ENTITIES).insert(entityToRow(obj)).select('*').single();
  if (error) throw error;
  return entityFromRow(data);
};
// El código no se cambia (lo usan los checks y los steps)
export const updateEntity = async (code, patch) => {
  const { code: _ignored, ...rest } = patch || {};
  const { data, error } = await supabase.from(ENTITIES).update(entityToRow(rest)).eq('code', code).select('*').single();
  if (error) throw error;
  return entityFromRow(data);
};
// Borra la entidad y lo que tenía cargado (checklist y próximos steps)
export const deleteEntity = async (code) => {
  const { error } = await supabase.from(ENTITIES).delete().eq('code', code);
  if (error) throw error;
  const { error: e2 } = await supabase.from(CHECKS).delete().eq('entity_code', code);
  if (e2) throw e2;
  const { error: e3 } = await supabase.from(STEPS).delete().eq('entity_code', code);
  if (e3) throw e3;
  return true;
};

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
  dueDate:    row.due_date || '',
  done:       !!row.done,
  doneAt:     row.done_at || null,
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
  // dueDate y done solo existen desde la 0070: se mandan solo si vienen
  if (obj.dueDate    !== undefined) row.due_date = obj.dueDate || null;
  if (obj.done       !== undefined) { row.done = !!obj.done; row.done_at = obj.done ? new Date().toISOString() : null; }
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

// ── Deals nuevos por semana (0071) ──
export const dealCountFromRow = (row) => ({
  entityCode: row.entity_code,
  weekStart:  row.week_start,
  dealsUi:    row.deals_ui,
  dealsOther: row.deals_other,
  computedAt: row.computed_at,
});
export const listDealCounts = async (sinceWeek) => {
  let q = supabase.from(DEAL_COUNTS).select('*');
  if (sinceWeek) q = q.gte('week_start', sinceWeek);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(dealCountFromRow);
};
export const getDealSync = async () => {
  const { data, error } = await supabase.from(DEAL_SYNC).select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data ? { lastRunAt: data.last_run_at, lastOkAt: data.last_ok_at, ok: data.ok, error: data.error, unassigned: data.unassigned || {}, trigger: data.trigger } : null;
};
// Botón «Actualizar»: llama a la Edge Function (tiene un freno de 10 min)
export const refreshDealCounts = async () => {
  const { data, error } = await supabase.functions.invoke('hubspot-weekly-deals', { body: { trigger: 'manual' } });
  if (error) {
    // La función responde 500 con { ok: false, error } cuando falla HubSpot
    let msg = error.message;
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error; } catch (_e) { /* sin cuerpo */ }
    throw new Error(msg);
  }
  return data;
};

// ── Realtime (las tablas del Weekly check en un canal) ──
export const subscribeCrmWeekly = (onChange) => {
  const channel = supabase
    .channel('crm-weekly-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: ENTITIES }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: DEAL_COUNTS }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: DEAL_SYNC }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: ITEMS }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: CHECKS }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: STEPS }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

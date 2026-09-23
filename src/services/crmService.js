// ════════════════════════════════════════════════════════════════════
// CRM SERVICE — Entidades y entrenamientos del CRM HubSpot
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase: tablas `crm_entities` y `crm_trainings`
// (migration 0018). Mappers DB (snake_case) ↔ UI (camelCase).
//
// Entidad (UI):       { id, key, name, unit, legalEntity, billingMedium, currency,
//                       responsible, approver, progress, checks{}, sortOrder, active, notes }
// Entrenamiento (UI): { id, entityId, type, title, date, trainer, attendees, status,
//                       billedMonth, amount, currency, notes, createdBy, createdAt, updatedAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const ENTITIES = 'crm_entities';
const TRAININGS = 'crm_trainings';

// ── Mappers ──
export const entityFromRow = (row) => (row ? {
  id:            row.id,
  key:           row.key || null,
  name:          row.name || '',
  unit:          row.unit || 'cu',
  legalEntity:   row.legal_entity || '',
  billingMedium: row.billing_medium || '',
  currency:      row.currency || 'USD',
  responsible:   row.responsible || '',
  approver:      row.approver || '',
  progress:      row.progress === null || row.progress === undefined ? null : Number(row.progress),
  checks:        row.checks && typeof row.checks === 'object' ? row.checks : {},
  notes:         row.notes || '',
  sortOrder:     row.sort_order ?? 0,
  active:        row.active !== false,
  createdAt:     row.created_at || null,
  updatedAt:     row.updated_at || null,
} : null);

export const entityToRow = (obj) => {
  const row = {};
  if (obj.key           !== undefined) row.key = obj.key || null;
  if (obj.name          !== undefined) row.name = obj.name;
  if (obj.unit          !== undefined) row.unit = obj.unit || 'cu';
  if (obj.legalEntity   !== undefined) row.legal_entity = obj.legalEntity || null;
  if (obj.billingMedium !== undefined) row.billing_medium = obj.billingMedium || null;
  if (obj.currency      !== undefined) row.currency = obj.currency || 'USD';
  if (obj.responsible   !== undefined) row.responsible = obj.responsible || null;
  if (obj.approver      !== undefined) row.approver = obj.approver || null;
  if (obj.progress      !== undefined) row.progress = obj.progress === null || obj.progress === '' ? null : Number(obj.progress);
  if (obj.checks        !== undefined) row.checks = obj.checks || {};
  if (obj.notes         !== undefined) row.notes = obj.notes || null;
  if (obj.sortOrder     !== undefined) row.sort_order = obj.sortOrder;
  if (obj.active        !== undefined) row.active = !!obj.active;
  return row;
};

export const trainingFromRow = (row) => (row ? {
  id:          row.id,
  entityId:    row.entity_id,
  type:        row.type || 'comercial',
  title:       row.title || '',
  date:        row.date || '',
  trainer:     row.trainer || '',
  attendees:   row.attendees === null || row.attendees === undefined ? null : Number(row.attendees),
  status:      row.status || 'planificado',
  billedMonth: row.billed_month || '',
  amount:      row.amount === null || row.amount === undefined ? null : Number(row.amount),
  currency:    row.currency || 'USD',
  notes:       row.notes || '',
  createdBy:   row.created_by || '',
  createdAt:   row.created_at || null,
  updatedAt:   row.updated_at || null,
} : null);

export const trainingToRow = (obj) => {
  const row = {};
  if (obj.entityId    !== undefined) row.entity_id = obj.entityId;
  if (obj.type        !== undefined) row.type = obj.type || 'comercial';
  if (obj.title       !== undefined) row.title = obj.title || '';
  if (obj.date        !== undefined) row.date = obj.date || null;
  if (obj.trainer     !== undefined) row.trainer = obj.trainer || null;
  if (obj.attendees   !== undefined) row.attendees = obj.attendees === null || obj.attendees === '' ? null : Number(obj.attendees);
  if (obj.status      !== undefined) row.status = obj.status || 'planificado';
  if (obj.billedMonth !== undefined) row.billed_month = obj.billedMonth || null;
  if (obj.amount      !== undefined) row.amount = obj.amount === null || obj.amount === '' ? null : Number(obj.amount);
  if (obj.currency    !== undefined) row.currency = obj.currency || 'USD';
  if (obj.notes       !== undefined) row.notes = obj.notes || null;
  if (obj.createdBy   !== undefined) row.created_by = obj.createdBy || null;
  return row;
};

// ── Entidades ──
export const listEntities = async () => {
  const { data, error } = await supabase.from(ENTITIES).select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(entityFromRow);
};
export const createEntity = async (obj) => {
  const { data, error } = await supabase.from(ENTITIES).insert(entityToRow(obj)).select('*').single();
  if (error) throw error;
  return entityFromRow(data);
};
export const updateEntity = async (id, patch) => {
  const { data, error } = await supabase.from(ENTITIES).update(entityToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return entityFromRow(data);
};
export const deleteEntity = async (id) => {
  const { error } = await supabase.from(ENTITIES).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Entrenamientos ──
export const listTrainings = async () => {
  const { data, error } = await supabase.from(TRAININGS).select('*').order('date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(trainingFromRow);
};
export const createTraining = async (obj) => {
  const { data, error } = await supabase.from(TRAININGS).insert(trainingToRow(obj)).select('*').single();
  if (error) throw error;
  return trainingFromRow(data);
};
export const updateTraining = async (id, patch) => {
  const { data, error } = await supabase.from(TRAININGS).update(trainingToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return trainingFromRow(data);
};
export const deleteTraining = async (id) => {
  const { error } = await supabase.from(TRAININGS).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime (ambas tablas en un canal) ──
export const subscribeCrm = (onChange) => {
  const channel = supabase
    .channel('crm-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: ENTITIES },  (p) => onChange({ table: ENTITIES, ...p }))
    .on('postgres_changes', { event: '*', schema: 'public', table: TRAININGS }, (p) => onChange({ table: TRAININGS, ...p }))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

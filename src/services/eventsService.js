// ════════════════════════════════════════════════════════════════════
// EVENTS SERVICE — Conectado a Supabase (tabla `public.events`)
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'events';

// ── Mappers ──
export const fromRow = (row) => {
  if (!row) return null;
  return {
    id:               row.id,
    name:             row.name || '',
    date:             row.date || '',
    country:          row.country || '',
    businessUnit:     row.business_unit || '',
    client:           row.client || '',
    fee:              row.fee == null ? 0 : Number(row.fee),
    serviceOwner:     row.service_owner || '',
    dealsCreated:     row.deals_created || 0,
    tasks:            row.tasks || {},
    customTasks:      row.custom_tasks || [],
    removedDefaults:  row.removed_defaults || [],
    participants:     row.participants || [],
    completedAt:      row.completed_at || null,
    createdAt:        row.created_at || null,
    updatedAt:        row.updated_at || null,
    quotationValidated: row.quotation_validated === true,
    // Links externos (migration 0012) — solo si la columna ya existe en la DB
    ...(row.planner_link !== undefined ? { plannerLink: row.planner_link || '' } : {}),
    ...(row.hubspot_link !== undefined ? { hubspotLink: row.hubspot_link || '' } : {}),
    // Overlay de piezas del Content Hub (migration 0013)
    ...(row.content !== undefined ? { content: row.content || {} } : {}),
  };
};

export const toRow = (obj) => {
  const row = {};
  if (obj.id !== undefined)               row.id = obj.id;
  if (obj.name !== undefined)             row.name = obj.name;
  if (obj.date !== undefined)             row.date = obj.date || null;
  if (obj.country !== undefined)          row.country = obj.country;
  if (obj.businessUnit !== undefined)     row.business_unit = obj.businessUnit;
  if (obj.client !== undefined)           row.client = obj.client;
  if (obj.fee !== undefined)              row.fee = Number(obj.fee) || 0;
  if (obj.serviceOwner !== undefined)     row.service_owner = obj.serviceOwner;
  if (obj.dealsCreated !== undefined)     row.deals_created = Number(obj.dealsCreated) || 0;
  if (obj.tasks !== undefined)            row.tasks = obj.tasks || {};
  if (obj.customTasks !== undefined)      row.custom_tasks = obj.customTasks || [];
  if (obj.removedDefaults !== undefined)  row.removed_defaults = obj.removedDefaults || [];
  if (obj.participants !== undefined)     row.participants = obj.participants || [];
  if (obj.completedAt !== undefined)      row.completed_at = obj.completedAt;
  if (obj.quotationValidated !== undefined) row.quotation_validated = !!obj.quotationValidated;
  if (obj.plannerLink !== undefined)      row.planner_link = obj.plannerLink || null;
  if (obj.hubspotLink !== undefined)      row.hubspot_link = obj.hubspotLink || null;
  if (obj.content !== undefined)          row.content = obj.content || {};
  return row;
};

// ── CRUD ──
export const listEvents = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
};

export const createEvent = async (data) => {
  const row = toRow(data);
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(inserted);
};

export const updateEvent = async (id, patch) => {
  const row = toRow(patch);
  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
};

export const deleteEvent = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime ──
export const subscribeEvents = (onChange) => {
  const channel = supabase
    .channel('events-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
};

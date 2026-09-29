// ════════════════════════════════════════════════════════════════════
// PROGRAMS SERVICE — Programas (campaña integral que agrupa pilares)
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase: tabla `programs` (migration 0021). Los pilares
// (webinars / campaigns / events) apuntan al programa con `program_id`.
//
// Programa (UI): { id, name, client, country, businessUnit, objective,
//                  startDate, endDate, notes, createdBy, createdAt, updatedAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'programs';

export const programFromRow = (row) => (row ? {
  id:           row.id,
  name:         row.name || '',
  client:       row.client || '',
  country:      row.country || '',
  businessUnit: row.business_unit || '',
  objective:    row.objective || '',
  startDate:    row.start_date || '',
  endDate:      row.end_date || '',
  notes:        row.notes || '',
  createdBy:    row.created_by || '',
  createdAt:    row.created_at || null,
  updatedAt:    row.updated_at || null,
} : null);

export const programToRow = (obj) => {
  const row = {};
  if (obj.name         !== undefined) row.name = obj.name;
  if (obj.client       !== undefined) row.client = obj.client || null;
  if (obj.country      !== undefined) row.country = obj.country || null;
  if (obj.businessUnit !== undefined) row.business_unit = obj.businessUnit || null;
  if (obj.objective    !== undefined) row.objective = obj.objective || null;
  if (obj.startDate    !== undefined) row.start_date = obj.startDate || null;
  if (obj.endDate      !== undefined) row.end_date = obj.endDate || null;
  if (obj.notes        !== undefined) row.notes = obj.notes || null;
  if (obj.createdBy    !== undefined) row.created_by = obj.createdBy || null;
  return row;
};

export const listPrograms = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(programFromRow);
};
export const createProgram = async (obj) => {
  const { data, error } = await supabase.from(TABLE).insert(programToRow(obj)).select('*').single();
  if (error) throw error;
  return programFromRow(data);
};
export const updateProgram = async (id, patch) => {
  const { data, error } = await supabase.from(TABLE).update(programToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return programFromRow(data);
};
export const deleteProgram = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const subscribePrograms = (onChange) => {
  const channel = supabase
    .channel('programs-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

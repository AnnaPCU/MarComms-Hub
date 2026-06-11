// ════════════════════════════════════════════════════════════════════
// SUCCESS CASES SERVICE — Casos de éxito (tabla `public.success_cases`)
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'success_cases';

// ── Mappers ──
export const fromRow = (row) => {
  if (!row) return null;
  return {
    id:           row.id,
    title:        row.title || '',
    client:       row.client || '',
    country:      row.country || '',
    businessUnit: row.business_unit || '',
    serviceType:  row.service_type || '',
    challenge:    row.challenge || '',
    solution:     row.solution || '',
    results:      row.results || '',
    metrics:      row.metrics || '',
    testimonial:  row.testimonial || '',
    author:       row.author || '',
    createdAt:    row.created_at || null,
    updatedAt:    row.updated_at || null,
  };
};

export const toRow = (obj) => {
  const row = {};
  if (obj.title !== undefined)        row.title = obj.title;
  if (obj.client !== undefined)       row.client = obj.client;
  if (obj.country !== undefined)      row.country = obj.country;
  if (obj.businessUnit !== undefined) row.business_unit = obj.businessUnit;
  if (obj.serviceType !== undefined)  row.service_type = obj.serviceType;
  if (obj.challenge !== undefined)    row.challenge = obj.challenge;
  if (obj.solution !== undefined)     row.solution = obj.solution;
  if (obj.results !== undefined)      row.results = obj.results;
  if (obj.metrics !== undefined)      row.metrics = obj.metrics;
  if (obj.testimonial !== undefined)  row.testimonial = obj.testimonial;
  if (obj.author !== undefined)       row.author = obj.author;
  return row;
};

// ── CRUD ──
export const listSuccessCases = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
};

export const createSuccessCase = async (data) => {
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(toRow(data))
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(inserted);
};

export const updateSuccessCase = async (id, patch) => {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
};

export const deleteSuccessCase = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime ──
export const subscribeSuccessCases = (onChange) => {
  const channel = supabase
    .channel('success-cases-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => onChange(p))
    .subscribe();
  return () => supabase.removeChannel(channel);
};

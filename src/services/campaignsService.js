// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS SERVICE — Conectado a Supabase (tabla `public.campaigns`)
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'campaigns';

// ── Mappers ──
export const fromRow = (row) => {
  if (!row) return null;
  return {
    id:                row.id,
    name:              row.name || '',
    type:              row.type || 'email',
    variant:           row.variant || undefined,
    linkedWebinarId:   row.linked_webinar_id || null,
    country:           row.country || '',
    businessUnit:      row.business_unit || '',
    serviceOwner:      row.service_owner || '',
    budget:            row.budget == null ? 0 : Number(row.budget),
    platformInvestment: row.platform_investment == null ? 0 : Number(row.platform_investment),
    numEmails:         row.num_emails || 0,
    dealsCreated:      row.deals_created || 0,
    completedSteps:    row.completed_steps || [],
    deadlines:         row.deadlines || {},
    data:              row.data || {},
    report:            row.report || null,
    comments:          row.comments || [],
    completedAt:       row.completed_at || null,
    createdAt:         row.created_at || null,
    updatedAt:         row.updated_at || null,
    quotationValidated: row.quotation_validated === true,
  };
};

export const toRow = (obj) => {
  const row = {};
  if (obj.id !== undefined)                  row.id = obj.id;
  if (obj.name !== undefined)                row.name = obj.name;
  if (obj.type !== undefined)                row.type = obj.type;
  if (obj.variant !== undefined)             row.variant = obj.variant || null;
  if (obj.linkedWebinarId !== undefined)     row.linked_webinar_id = obj.linkedWebinarId;
  if (obj.country !== undefined)             row.country = obj.country;
  if (obj.businessUnit !== undefined)        row.business_unit = obj.businessUnit;
  if (obj.serviceOwner !== undefined)        row.service_owner = obj.serviceOwner;
  if (obj.budget !== undefined)              row.budget = Number(obj.budget) || 0;
  if (obj.platformInvestment !== undefined)  row.platform_investment = Number(obj.platformInvestment) || 0;
  if (obj.numEmails !== undefined)           row.num_emails = Number(obj.numEmails) || 0;
  if (obj.dealsCreated !== undefined)        row.deals_created = Number(obj.dealsCreated) || 0;
  if (obj.completedSteps !== undefined)      row.completed_steps = obj.completedSteps || [];
  if (obj.deadlines !== undefined)           row.deadlines = obj.deadlines || {};
  if (obj.data !== undefined)                row.data = obj.data || {};
  if (obj.report !== undefined)              row.report = obj.report;
  if (obj.comments !== undefined)            row.comments = obj.comments || [];
  if (obj.completedAt !== undefined)         row.completed_at = obj.completedAt;
  if (obj.quotationValidated !== undefined)  row.quotation_validated = !!obj.quotationValidated;
  return row;
};

// ── CRUD ──
export const listCampaigns = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
};

export const createCampaign = async (data) => {
  const row = toRow(data);
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(inserted);
};

export const updateCampaign = async (id, patch) => {
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

export const deleteCampaign = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime ──
export const subscribeCampaigns = (onChange) => {
  const channel = supabase
    .channel('campaigns-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
};

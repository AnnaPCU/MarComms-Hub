// ════════════════════════════════════════════════════════════════════
// UTM SERVICE — Repositorio de UTMs (tabla `public.utm_links`)
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'utm_links';

export const fromRow = (row) => {
  if (!row) return null;
  return {
    id:           row.id,
    label:        row.label || '',
    url:          row.url || '',
    source:       row.source || '',
    medium:       row.medium || '',
    businessUnit: row.business_unit || '',
    country:      row.country || '',
    service:      row.service || '',
    campaignName: row.campaign_name || '',
    utmCampaign:  row.utm_campaign || '',
    createdBy:    row.created_by || '',
    createdAt:    row.created_at || null,
  };
};

export const toRow = (obj) => {
  const row = {};
  if (obj.label !== undefined)        row.label = obj.label;
  if (obj.url !== undefined)          row.url = obj.url;
  if (obj.source !== undefined)       row.source = obj.source;
  if (obj.medium !== undefined)       row.medium = obj.medium;
  if (obj.businessUnit !== undefined) row.business_unit = obj.businessUnit;
  if (obj.country !== undefined)      row.country = obj.country;
  if (obj.service !== undefined)      row.service = obj.service;
  if (obj.campaignName !== undefined) row.campaign_name = obj.campaignName;
  if (obj.utmCampaign !== undefined)  row.utm_campaign = obj.utmCampaign;
  if (obj.createdBy !== undefined)    row.created_by = obj.createdBy;
  return row;
};

export const listUtmLinks = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
};

export const createUtmLink = async (data) => {
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(toRow(data))
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(inserted);
};

export const deleteUtmLink = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const subscribeUtmLinks = (onChange) => {
  const channel = supabase
    .channel('utm-links-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => onChange(p))
    .subscribe();
  return () => supabase.removeChannel(channel);
};

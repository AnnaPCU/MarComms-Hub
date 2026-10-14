// ════════════════════════════════════════════════════════════════════
// BILLING PLANS SERVICE — Planes que cubren pilares
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase: tabla `billing_plans` (migration 0023). Un pilar
// con billing = 'plan' apunta al plan que lo cubre con `plan_id`.
//
// Plan (UI): { id, name, createdBy, createdAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'billing_plans';

export const planFromRow = (row) => (row ? {
  id:        row.id,
  name:      row.name || '',
  createdBy: row.created_by || '',
  createdAt: row.created_at || null,
} : null);

export const listBillingPlans = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(planFromRow);
};

export const createBillingPlan = async ({ name, createdBy }) => {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ name, created_by: createdBy || null })
    .select('*')
    .single();
  if (error) throw error;
  return planFromRow(data);
};

export const subscribeBillingPlans = (onChange) => {
  const channel = supabase
    .channel('billing-plans-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

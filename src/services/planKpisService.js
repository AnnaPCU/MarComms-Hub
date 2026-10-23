// ════════════════════════════════════════════════════════════════════
// PLAN KPIS SERVICE — KPIs del mes e iniciativas de cada plan
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase (migration 0038):
//   plan_kpis        — una fila por plan y mes ('YYYY-MM'), `kpis` jsonb
//   plan_initiatives — iniciativas de cada plan, agrupadas por tipo
//
// KPI del mes (UI):  { id, planId, monthKey, kpis, updatedBy, updatedAt }
// Iniciativa (UI):   { id, planId, category, title, detail, position,
//                      createdBy, createdAt, updatedAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const KPIS = 'plan_kpis';
const INITIATIVES = 'plan_initiatives';

// ── KPIs del mes ──
export const kpiFromRow = (row) => (row ? {
  id:        row.id,
  planId:    row.plan_id,
  monthKey:  row.month_key,
  kpis:      row.kpis || {},
  updatedBy: row.updated_by || '',
  updatedAt: row.updated_at || null,
} : null);

export const listPlanKpis = async () => {
  const { data, error } = await supabase.from(KPIS).select('*');
  if (error) throw error;
  return (data || []).map(kpiFromRow);
};

// Guarda (o reemplaza) los KPIs de un plan en un mes
export const savePlanKpis = async ({ planId, monthKey, kpis, updatedBy }) => {
  const { data, error } = await supabase
    .from(KPIS)
    .upsert({ plan_id: planId, month_key: monthKey, kpis: kpis || {}, updated_by: updatedBy || null }, { onConflict: 'plan_id,month_key' })
    .select('*')
    .single();
  if (error) throw error;
  return kpiFromRow(data);
};

// ── Iniciativas ──
export const initiativeFromRow = (row) => (row ? {
  id:        row.id,
  planId:    row.plan_id,
  category:  row.category || '',
  title:     row.title || '',
  detail:    row.detail || '',
  position:  row.position ?? 0,
  createdBy: row.created_by || '',
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
} : null);

export const initiativeToRow = (obj) => {
  const row = {};
  if (obj.planId    !== undefined) row.plan_id = obj.planId;
  if (obj.category  !== undefined) row.category = String(obj.category || '').trim() || null;
  if (obj.title     !== undefined) row.title = String(obj.title || '').trim();
  if (obj.detail    !== undefined) row.detail = String(obj.detail || '').trim() || null;
  if (obj.position  !== undefined) row.position = obj.position ?? 0;
  if (obj.createdBy !== undefined) row.created_by = obj.createdBy || null;
  return row;
};

export const listInitiatives = async () => {
  const { data, error } = await supabase.from(INITIATIVES).select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(initiativeFromRow);
};
export const createInitiative = async (obj) => {
  const { data, error } = await supabase.from(INITIATIVES).insert(initiativeToRow(obj)).select('*').single();
  if (error) throw error;
  return initiativeFromRow(data);
};
export const updateInitiative = async (id, patch) => {
  const { data, error } = await supabase.from(INITIATIVES).update(initiativeToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return initiativeFromRow(data);
};
export const deleteInitiative = async (id) => {
  const { error } = await supabase.from(INITIATIVES).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime (las dos tablas en un canal) ──
export const subscribePlanExtras = (onChange) => {
  const channel = supabase
    .channel('plan-extras-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: KPIS }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: INITIATIVES }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

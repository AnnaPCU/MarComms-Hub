// ════════════════════════════════════════════════════════════════════
// PLAN TASKS SERVICE — Tareas de cada plan (sección Planes)
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase: tabla `plan_tasks` (migration 0029), con
// `plan_id` → `billing_plans`. Mappers DB (snake_case) ↔ UI (camelCase).
//
// Tarea (UI): { id, planId, monthKey, title, owner, deadline, status,
//               objective, result, detail, link, position, createdBy,
//               createdAt, updatedAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_TASK_STATUS } from '@/constants/planTasks';

const TABLE = 'plan_tasks';

// ── Mappers ──
export const taskFromRow = (row) => (row ? {
  id:        row.id,
  planId:    row.plan_id,
  monthKey:  row.month_key || null,
  title:     row.title || '',
  owner:     row.owner || '',
  deadline:  row.deadline || '',
  status:    row.status || DEFAULT_TASK_STATUS,
  objective: row.objective || '',
  result:    row.result || '',
  detail:    row.detail || '',
  link:      row.link || '',
  position:  row.position ?? 0,
  createdBy: row.created_by || '',
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
} : null);

export const taskToRow = (obj) => {
  const row = {};
  if (obj.planId    !== undefined) row.plan_id = obj.planId;
  if (obj.monthKey  !== undefined) row.month_key = obj.monthKey || null;
  if (obj.title     !== undefined) row.title = String(obj.title || '').trim();
  if (obj.owner     !== undefined) row.owner = obj.owner || null;
  if (obj.deadline  !== undefined) row.deadline = obj.deadline || null;
  if (obj.status    !== undefined) row.status = obj.status || DEFAULT_TASK_STATUS;
  if (obj.objective !== undefined) row.objective = obj.objective || null;
  if (obj.result    !== undefined) row.result = obj.result || null;
  if (obj.detail    !== undefined) row.detail = obj.detail || null;
  if (obj.link      !== undefined) row.link = obj.link || null;
  if (obj.position  !== undefined) row.position = obj.position ?? 0;
  if (obj.createdBy !== undefined) row.created_by = obj.createdBy || null;
  return row;
};

// ── CRUD ──
export const listTasks = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(taskFromRow);
};
export const createTask = async (obj) => {
  const { data, error } = await supabase.from(TABLE).insert(taskToRow(obj)).select('*').single();
  if (error) throw error;
  return taskFromRow(data);
};
export const updateTask = async (id, patch) => {
  const { data, error } = await supabase.from(TABLE).update(taskToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return taskFromRow(data);
};
export const deleteTask = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime ──
export const subscribePlanTasks = (onChange) => {
  const channel = supabase
    .channel('plan-tasks-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

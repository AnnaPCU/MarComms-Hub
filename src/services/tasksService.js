// ════════════════════════════════════════════════════════════════════
// TASKS SERVICE — Tareas asignadas (tabla `public.tasks`)
// ════════════════════════════════════════════════════════════════════
// Mapping clave:
//   App.done : boolean  ↔  DB.status : 'pending' | 'in_progress' | 'done'
//   App.detail          ↔  DB.details
//   App.assignedTo      ↔  DB.assigned_to
//   App.assignedBy      ↔  DB.assigned_by
//   App.assignedAt      ↔  DB.created_at
//   App.project.id (si type='standalone') ↔ DB.request_id
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'tasks';

// ── Mappers ──
export const fromRow = (row) => {
  if (!row) return null;
  return {
    id:           row.id,
    title:        row.title || '',
    detail:       row.details || '',
    status:       row.status || 'pending',
    done:         row.status === 'done',
    assignedTo:   row.assigned_to || '',
    assignedBy:   row.assigned_by || '',
    assignedAt:   row.created_at || null,
    deadline:     row.deadline || '',
    completedAt:  row.completed_at || null,
    // Si hay request_id, reconstruir un project object para compatibilidad UI
    project:      row.request_id ? { type: 'standalone', id: row.request_id } : null,
  };
};

export const toRow = (obj) => {
  const row = {};
  if (obj.id !== undefined)         row.id = obj.id;
  if (obj.title !== undefined)      row.title = obj.title;
  if (obj.detail !== undefined)     row.details = obj.detail;
  if (obj.assignedTo !== undefined) row.assigned_to = obj.assignedTo;
  if (obj.assignedBy !== undefined) row.assigned_by = obj.assignedBy;
  if (obj.deadline !== undefined)   row.deadline = obj.deadline || null;

  // done: boolean → status: text
  if (obj.done !== undefined) {
    row.status = obj.done ? 'done' : 'in_progress';
    row.completed_at = obj.done ? new Date().toISOString() : null;
  } else if (obj.status !== undefined) {
    row.status = obj.status;
  }

  if (obj.completedAt !== undefined) row.completed_at = obj.completedAt;

  // project → request_id (sólo si es standalone)
  if (obj.project !== undefined) {
    row.request_id = obj.project && obj.project.type === 'standalone' ? obj.project.id : null;
  }
  return row;
};

// ── CRUD ──
export const listAssignedTasks = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
};

export const createAssignedTask = async (data) => {
  const row = toRow(data);
  // Default status pending si no se especifica
  if (!row.status) row.status = 'pending';
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(inserted);
};

export const updateAssignedTask = async (id, patch) => {
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

export const deleteAssignedTask = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime ──
export const subscribeAssignedTasks = (onChange) => {
  const channel = supabase
    .channel('tasks-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
};

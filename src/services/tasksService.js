// ════════════════════════════════════════════════════════════════════
// TASKS SERVICE — Tareas asignadas entre usuarios (mock CRUD)
// ════════════════════════════════════════════════════════════════════

import { MOCK_TASKS } from '@/data/mockTasks';
import { mockDelay, isMockMode, newId, clone } from './dataService';

let _store = clone(MOCK_TASKS);

// ── Reads ──
export const listTasks = async (filters = {}) => {
  await mockDelay();
  if (!isMockMode()) {
    // TODO Supabase: supabase.from('assigned_tasks').select('*')
    return [];
  }
  let result = clone(_store);
  if (filters.assignedTo) result = result.filter((t) => t.assignedTo === filters.assignedTo);
  if (filters.assignedBy) result = result.filter((t) => t.assignedBy === filters.assignedBy);
  if (typeof filters.done === 'boolean') result = result.filter((t) => !!t.done === filters.done);
  return result;
};

export const getTaskById = async (id) => {
  await mockDelay();
  if (!isMockMode()) return null;
  const found = _store.find((t) => String(t.id) === String(id));
  return found ? clone(found) : null;
};

// ── Writes ──
export const createTask = async (data) => {
  await mockDelay();
  const item = {
    id: newId('at'),
    done: false,
    assignedAt: new Date().toISOString(),
    project: null,
    ...data,
  };
  if (!isMockMode()) return item; // TODO Supabase
  _store = [..._store, item];
  return clone(item);
};

export const updateTask = async (id, patch) => {
  await mockDelay();
  if (!isMockMode()) return null;
  let updated = null;
  _store = _store.map((t) => {
    if (String(t.id) !== String(id)) return t;
    updated = { ...t, ...patch };
    return updated;
  });
  return updated ? clone(updated) : null;
};

export const toggleTaskDone = async (id) => {
  await mockDelay();
  if (!isMockMode()) return null;
  let updated = null;
  _store = _store.map((t) => {
    if (String(t.id) !== String(id)) return t;
    updated = { ...t, done: !t.done };
    return updated;
  });
  return updated ? clone(updated) : null;
};

export const deleteTask = async (id) => {
  await mockDelay();
  if (!isMockMode()) return false;
  const before = _store.length;
  _store = _store.filter((t) => String(t.id) !== String(id));
  return _store.length < before;
};

export const __resetTasksStore = () => {
  _store = clone(MOCK_TASKS);
};

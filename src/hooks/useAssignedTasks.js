// ════════════════════════════════════════════════════════════════════
// useAssignedTasks — Hook para tareas asignadas (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// API explícita (no smart-setter) porque App.jsx expone funciones por
// props a los hijos: createAssignedTask, toggleAssignedTaskDone,
// deleteAssignedTask. Se mantiene el mismo contrato.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listAssignedTasks,
  createAssignedTask as svcCreate,
  updateAssignedTask as svcUpdate,
  deleteAssignedTask as svcDelete,
  subscribeAssignedTasks,
} from '@/services/tasksService';

export const useAssignedTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch + realtime refetch ──
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAssignedTasks();
      setTasks(list);
    } catch (e) {
      console.error('[useAssignedTasks] fetch:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: refetch sencillo (la coleccion es chica)
  useEffect(() => {
    const unsubscribe = subscribeAssignedTasks(() => refetch());
    return unsubscribe;
  }, [refetch]);

  // ── Acciones ──
  const create = useCallback(async (payload) => {
    try {
      const inserted = await svcCreate(payload);
      // Optimistic: agregar al state local sin esperar refetch
      setTasks((prev) =>
        prev.find((t) => String(t.id) === String(inserted.id)) ? prev : [inserted, ...prev]
      );
      return inserted;
    } catch (e) {
      console.error('[useAssignedTasks] create:', e);
      throw e;
    }
  }, []);

  const toggleDone = useCallback(async (id, newDone) => {
    try {
      const updated = await svcUpdate(id, { done: newDone });
      setTasks((prev) => prev.map((t) => (String(t.id) === String(id) ? updated : t)));
      return updated;
    } catch (e) {
      console.error('[useAssignedTasks] toggleDone:', e);
      throw e;
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await svcDelete(id);
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
      return true;
    } catch (e) {
      console.error('[useAssignedTasks] delete:', e);
      throw e;
    }
  }, []);

  return { tasks, loading, error, refetch, create, toggleDone, remove };
};

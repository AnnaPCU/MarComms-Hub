// ════════════════════════════════════════════════════════════════════
// usePlanTasks — Tareas de los planes (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Devuelve:
//   tasks, loading, error, refetch
//   createTask(obj) / updateTask(id, patch) / removeTask(id)
//
// updateTask es optimista (el cambio de estado se ve al toque, como en
// la hoja de Social Media) y si falla vuelve a traer lo que hay en la base.
// Los cambios de otras personas llegan por realtime.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listTasks, createTask, updateTask, deleteTask, subscribePlanTasks,
} from '@/services/planTasksService';

export const usePlanTasks = (options = {}) => {
  const { realtime = true } = options;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  const refetch = useCallback(async () => {
    try {
      setTasks(await listTasks());
      setError(null);
    } catch (e) {
      console.error('[usePlanTasks] fetch error:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // Varios cambios seguidos (ej. de otra persona) se agrupan en un refetch
  useEffect(() => {
    if (!realtime) return undefined;
    const unsubscribe = subscribePlanTasks(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(refetch, 300);
    });
    return () => { clearTimeout(timer.current); unsubscribe(); };
  }, [realtime, refetch]);

  const api = useMemo(() => {
    const wrap = (fn) => async (...args) => {
      try {
        const r = await fn(...args);
        await refetch();
        return r;
      } catch (e) {
        console.error('[usePlanTasks] write error:', e);
        setError(e);
        await refetch();
        throw e;
      }
    };
    return {
      createTask: wrap(createTask),
      removeTask: wrap(deleteTask),
      updateTask: async (id, patch) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        return wrap(updateTask)(id, patch);
      },
    };
  }, [refetch]);

  return { tasks, loading, error, refetch, ...api };
};

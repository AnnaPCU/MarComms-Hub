// ════════════════════════════════════════════════════════════════════
// useTasks — Hook para tareas asignadas
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
  listTasks,
  createTask,
  updateTask,
  toggleTaskDone,
  deleteTask,
} from '@/services/tasksService';

export const useTasks = (filters = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filtersKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listTasks(filters);
      setData(rows);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(async (payload) => {
    const item = await createTask(payload);
    await refetch();
    return item;
  }, [refetch]);

  const update = useCallback(async (id, patch) => {
    const item = await updateTask(id, patch);
    await refetch();
    return item;
  }, [refetch]);

  const toggleDone = useCallback(async (id) => {
    const item = await toggleTaskDone(id);
    await refetch();
    return item;
  }, [refetch]);

  const remove = useCallback(async (id) => {
    const ok = await deleteTask(id);
    await refetch();
    return ok;
  }, [refetch]);

  return { data, loading, error, refetch, create, update, toggleDone, remove };
};

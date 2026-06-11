// ════════════════════════════════════════════════════════════════════
// useSuccessCases — Hook para casos de éxito (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
  listSuccessCases,
  createSuccessCase,
  updateSuccessCase,
  deleteSuccessCase,
  subscribeSuccessCases,
} from '@/services/successCasesService';

export const useSuccessCases = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listSuccessCases());
    } catch (e) {
      console.error('[useSuccessCases] fetch:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const unsub = subscribeSuccessCases(() => refetch());
    return unsub;
  }, [refetch]);

  const create = useCallback(async (payload) => {
    const item = await createSuccessCase(payload);
    setData((prev) => [item, ...prev.filter((c) => c.id !== item.id)]);
    return item;
  }, []);

  const update = useCallback(async (id, patch) => {
    const item = await updateSuccessCase(id, patch);
    setData((prev) => prev.map((c) => (c.id === id ? item : c)));
    return item;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteSuccessCase(id);
    setData((prev) => prev.filter((c) => c.id !== id));
    return true;
  }, []);

  return { data, loading, error, refetch, create, update, remove };
};

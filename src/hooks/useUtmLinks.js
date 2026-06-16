// ════════════════════════════════════════════════════════════════════
// useUtmLinks — Hook para el repositorio de UTMs (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
  listUtmLinks,
  createUtmLink,
  deleteUtmLink,
  subscribeUtmLinks,
} from '@/services/utmService';

export const useUtmLinks = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listUtmLinks());
    } catch (e) {
      console.error('[useUtmLinks] fetch:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const unsub = subscribeUtmLinks(() => refetch());
    return unsub;
  }, [refetch]);

  const create = useCallback(async (payload) => {
    const item = await createUtmLink(payload);
    setData((prev) => [item, ...prev.filter((u) => u.id !== item.id)]);
    return item;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteUtmLink(id);
    setData((prev) => prev.filter((u) => u.id !== id));
    return true;
  }, []);

  return { data, loading, error, refetch, create, remove };
};

// ════════════════════════════════════════════════════════════════════
// usePrograms — Programas (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Devuelve: programs, loading, error, refetch,
//           createProgram(obj) / updateProgram(id, patch) / removeProgram(id)
// La creación de los pilares del programa se orquesta en App.jsx
// (createProgramWithPillars), porque toca las colecciones globales.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listPrograms, createProgram, updateProgram, deleteProgram, subscribePrograms } from '@/services/programsService';

export const usePrograms = (options = {}) => {
  const { realtime = true } = options;
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setError(null);
    try { setPrograms(await listPrograms()); }
    catch (e) { console.error('[usePrograms] fetch error:', e); setError(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  useEffect(() => {
    if (!realtime) return undefined;
    return subscribePrograms(() => refetch());
  }, [realtime, refetch]);

  const wrap = (fn) => async (...args) => {
    try { const r = await fn(...args); await refetch(); return r; }
    catch (e) { console.error('[usePrograms] write error:', e); setError(e); throw e; }
  };

  const api = useMemo(() => ({
    createProgram: wrap(createProgram),
    updateProgram: wrap(updateProgram),
    removeProgram: wrap(deleteProgram),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [refetch]);

  return { programs, loading, error, refetch, ...api };
};

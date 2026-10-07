// ════════════════════════════════════════════════════════════════════
// useMarketingPlans — Planes de Marketing (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Devuelve: plans, imports (últimas importaciones), loading, error,
//           refetch, importPlans(plans, { fileName, importedBy })
// Una importación de cualquier persona dispara el realtime y todos los
// navegadores refrescan. Durante la importación se ignoran los eventos
// intermedios y se refresca una sola vez al final.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listMarketingPlans, listPlanImports, importMarketingPlans, subscribeMarketingPlans,
} from '@/services/marketingPlansService';

export const useMarketingPlans = () => {
  const [plans, setPlans] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const importingRef = useRef(false);
  const timerRef = useRef(null);

  const refetch = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([listMarketingPlans(), listPlanImports()]);
      setPlans(p); setImports(i); setError(null);
    } catch (e) {
      console.error('[useMarketingPlans] fetch error:', e); setError(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  useEffect(() => subscribeMarketingPlans(() => {
    if (importingRef.current) return;
    // Una importación genera varios eventos seguidos: refresco una vez
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refetch, 400);
  }), [refetch]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const importPlans = useCallback(async (newPlans, meta) => {
    importingRef.current = true;
    try { return await importMarketingPlans(newPlans, meta); }
    finally { importingRef.current = false; await refetch(); }
  }, [refetch]);

  return { plans, imports, loading, error, refetch, importPlans };
};

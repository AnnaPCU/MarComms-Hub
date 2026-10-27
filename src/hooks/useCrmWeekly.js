// ════════════════════════════════════════════════════════════════════
// useCrmWeekly — Weekly check de CRM HubSpot (Supabase + realtime).
// Mismo esquema que usePlanExtras.
// ════════════════════════════════════════════════════════════════════
// Devuelve:
//   checks, steps, loading, error, missing
//   saveCheck({ entityCode, itemId, patch: { done?, deadline? }, updatedBy })
//     → se ve al instante (optimista) y se guarda; si falla, vuelve atrás
//   createStep(obj) / updateStep(id, patch) / removeStep(id)
//
// Si las tablas todavía no existen en la base (falta la migración 0043),
// `missing` = true y la vista muestra el aviso en vez de fallar.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listChecks, saveCheck, listSteps, createStep, updateStep, deleteStep, subscribeCrmWeekly,
} from '@/services/crmWeeklyService';

const isMissingTable = (e) => e?.code === '42P01' || e?.code === 'PGRST205' || /does not exist|schema cache/i.test(e?.message || '');

export const useCrmWeekly = (options = {}) => {
  const { realtime = true } = options;
  const [checks, setChecks] = useState([]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const timer = useRef(null);

  const refetch = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([listChecks(), listSteps()]);
      setChecks(c); setSteps(s); setError(null); setMissing(false);
    } catch (e) {
      if (isMissingTable(e)) setMissing(true);
      else { console.error('[useCrmWeekly] fetch error:', e); setError(e); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!realtime) return undefined;
    const unsubscribe = subscribeCrmWeekly(() => {
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
        console.error('[useCrmWeekly] write error:', e);
        await refetch();
        throw e;
      }
    };
    const saveOptimistic = async (input) => {
      const { entityCode, itemId, patch } = input;
      setChecks((prev) => {
        const found = prev.some((c) => c.entityCode === entityCode && c.itemId === itemId);
        const apply = (c) => ({ ...c, ...patch, updatedAt: new Date().toISOString(), updatedBy: input.updatedBy || c.updatedBy });
        return found
          ? prev.map((c) => (c.entityCode === entityCode && c.itemId === itemId ? apply(c) : c))
          : [...prev, apply({ id: `tmp-${entityCode}-${itemId}`, entityCode, itemId, done: false, deadline: '' })];
      });
      return saveCheck(input);
    };
    return {
      saveCheck: wrap(saveOptimistic),
      createStep: wrap(createStep),
      updateStep: wrap(updateStep),
      removeStep: wrap(deleteStep),
    };
  }, [refetch]);

  return { checks, steps, loading, error, missing, refetch, ...api };
};

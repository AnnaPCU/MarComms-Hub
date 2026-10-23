// ════════════════════════════════════════════════════════════════════
// usePlanExtras — KPIs del mes e iniciativas de los planes (Supabase +
// realtime). Mismo esquema que usePlanTasks.
// ════════════════════════════════════════════════════════════════════
// Devuelve:
//   kpiRows ([{ planId, monthKey, kpis }]), initiatives, loading, error
//   saveKpis({ planId, monthKey, kpis, updatedBy })
//   createInitiative(obj) / updateInitiative(id, patch) / removeInitiative(id)
//
// Si las tablas todavía no existen en la base (falta la migración 0038),
// `missing` = true y la sección muestra el aviso en vez de fallar.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listPlanKpis, savePlanKpis, listInitiatives, createInitiative, updateInitiative, deleteInitiative, subscribePlanExtras,
} from '@/services/planKpisService';

const isMissingTable = (e) => e?.code === '42P01' || e?.code === 'PGRST205' || /does not exist|schema cache/i.test(e?.message || '');

export const usePlanExtras = (options = {}) => {
  const { realtime = true } = options;
  const [kpiRows, setKpiRows] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const timer = useRef(null);

  const refetch = useCallback(async () => {
    try {
      const [k, i] = await Promise.all([listPlanKpis(), listInitiatives()]);
      setKpiRows(k); setInitiatives(i); setError(null); setMissing(false);
    } catch (e) {
      if (isMissingTable(e)) setMissing(true);
      else { console.error('[usePlanExtras] fetch error:', e); setError(e); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!realtime) return undefined;
    const unsubscribe = subscribePlanExtras(() => {
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
        console.error('[usePlanExtras] write error:', e);
        await refetch();
        throw e;
      }
    };
    return {
      saveKpis: wrap(savePlanKpis),
      createInitiative: wrap(createInitiative),
      updateInitiative: wrap(updateInitiative),
      removeInitiative: wrap(deleteInitiative),
    };
  }, [refetch]);

  return { kpiRows, initiatives, loading, error, missing, refetch, ...api };
};

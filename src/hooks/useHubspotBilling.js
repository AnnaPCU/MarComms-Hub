// ════════════════════════════════════════════════════════════════════
// useHubspotBilling — Facturación HubSpot (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Devuelve: entities, imports, meta (de la última importación), loading,
//           error, refetch, importExcel(entities, meta, { fileName, importedBy })
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { listBillingEntities, listBillingImports, importBilling, subscribeBilling } from '@/services/hubspotBillingService';
import { DEFAULT_UNIT_PRICES } from '@/constants/hubspotBilling';

export const useHubspotBilling = () => {
  const [entities, setEntities] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const importingRef = useRef(false);
  const timerRef = useRef(null);

  const refetch = useCallback(async () => {
    try {
      const [e, i] = await Promise.all([listBillingEntities(), listBillingImports()]);
      setEntities(e); setImports(i); setError(null);
    } catch (err) {
      console.error('[useHubspotBilling] fetch error:', err); setError(err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  useEffect(() => subscribeBilling(() => {
    if (importingRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refetch, 400);
  }), [refetch]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const importExcel = useCallback(async (newEntities, meta, opts) => {
    importingRef.current = true;
    try { return await importBilling(newEntities, meta, opts); }
    finally { importingRef.current = false; await refetch(); }
  }, [refetch]);

  const meta = imports.find((i) => i.meta)?.meta || { unitPrices: DEFAULT_UNIT_PRICES, excelTotals: {}, summaryPrices: [] };
  return { entities, imports, meta, loading, error, refetch, importExcel };
};

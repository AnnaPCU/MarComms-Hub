// ════════════════════════════════════════════════════════════════════
// useBillingPlans — Planes que cubren pilares (Supabase)
// ════════════════════════════════════════════════════════════════════
// App.jsx crea el estado con useBillingPlansState(nombreDelUsuario) y lo
// comparte con <BillingPlansProvider value={...}>. Cualquier componente
// (BudgetInput, Portal Cliente, tarjetas) lo lee con useBillingPlans().
//
// Devuelve: plans (ordenados por nombre), planById (Map id → plan),
//           loading, error, addPlan(nombre) → plan (crea o reutiliza)
// ════════════════════════════════════════════════════════════════════

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listBillingPlans, createBillingPlan, subscribeBillingPlans } from '@/services/billingPlansService';
import { cleanPlanName, findPlanByName } from '@/utils/billing';

const EMPTY = { plans: [], planById: new Map(), loading: false, error: null, addPlan: async () => null };
const BillingPlansContext = createContext(EMPTY);

export const useBillingPlansState = (currentUserName = '') => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try { setPlans(await listBillingPlans()); setError(null); }
    catch (e) { console.error('[useBillingPlans] fetch error:', e); setError(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  // Realtime: si la tabla no está en la publicación (ver migration 0023),
  // el canal no recibe nada y los planes nuevos de otros se ven al recargar.
  useEffect(() => subscribeBillingPlans(() => refetch()), [refetch]);

  // Crea el plan (o devuelve el existente si ya hay uno con ese nombre).
  // Espera a que el plan esté en la base antes de devolverlo, así el pilar
  // que lo referencia no falla por la foreign key.
  const addPlan = useCallback(async (rawName) => {
    const name = cleanPlanName(rawName);
    if (!name) return null;
    const existing = findPlanByName(plans, name);
    if (existing) return existing;
    try {
      const plan = await createBillingPlan({ name, createdBy: currentUserName });
      setPlans((prev) => [...prev, plan].sort((a, b) => a.name.localeCompare(b.name, 'es')));
      return plan;
    } catch (e) {
      // Puede haberlo creado otra persona recién (índice único por nombre)
      const fresh = await listBillingPlans().catch(() => null);
      if (fresh) {
        setPlans(fresh);
        const found = findPlanByName(fresh, name);
        if (found) return found;
      }
      console.error('[useBillingPlans] create error:', e);
      throw e;
    }
  }, [plans, currentUserName]);

  const planById = useMemo(() => new Map(plans.map((p) => [String(p.id), p])), [plans]);

  return useMemo(() => ({ plans, planById, loading, error, addPlan }), [plans, planById, loading, error, addPlan]);
};

export function BillingPlansProvider({ value, children }) {
  return <BillingPlansContext.Provider value={value || EMPTY}>{children}</BillingPlansContext.Provider>;
}

export const useBillingPlans = () => useContext(BillingPlansContext);

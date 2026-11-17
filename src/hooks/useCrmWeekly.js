// ════════════════════════════════════════════════════════════════════
// useCrmWeekly — Weekly check de CRM HubSpot (Supabase + realtime).
// Mismo esquema que usePlanExtras.
// ════════════════════════════════════════════════════════════════════
// Devuelve:
//   entities (de crm_weekly_entities; CRM_ENTITIES si falta la migración
//   0070), weeklyEntities (las del Weekly check = región Américas), tracking (true si la 0070 está: se pueden sumar entidades,
//   importancia, tags y fecha / estado de los steps),
//   dealCounts / dealSync / dealsReady (deals nuevos por semana de HubSpot,
//   migration 0071; dealsReady = false si falta la tabla) +
//   refreshDeals() (botón «Actualizar»: llama a la Edge Function)
//   items (ítems del checklist; CRM_CHECK_ITEMS si falta la migración
//   0044), checks, steps, loading, error, missing
//   saveCheck({ entityCode, itemId, patch: { done?, deadline? }, updatedBy })
//     → se ve al instante (optimista) y se guarda; si falla, vuelve atrás
//   createStep(obj) / updateStep(id, patch) / removeStep(id)
//   createItem(obj) / updateItem(id, patch) / removeItem(id) /
//   excludeItem(id, entityCode) (quitarlo de una sola entidad, 0075)
//   createEntity(obj) / updateEntity(code, patch) / removeEntity(code)
//   (updateEntity se ve al instante: tags, importancia)
//   updateStepOptimistic(id, patch): igual que updateStep, pero se ve al
//   instante (tildar un step desde «Próximas actividades»)
//
// Si las tablas todavía no existen en la base (falta la migración 0043),
// `missing` = true y la vista muestra el aviso en vez de fallar.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CRM_CHECK_ITEMS, CRM_ENTITIES, WEEKLY_REGION } from '@/constants/crmWeekly';
import { DEAL_WEEKS, lastWeeks } from '@/utils/crmWeeklyDeals';
import {
  listEntities, createEntity, updateEntity, deleteEntity,
  listDealCounts, getDealSync, refreshDealCounts,
  listItems, createItem, updateItem, deleteItem, excludeItemFor,
  listChecks, saveCheck, listSteps, createStep, updateStep, deleteStep, subscribeCrmWeekly,
} from '@/services/crmWeeklyService';

const isMissingTable = (e) => e?.code === '42P01' || e?.code === 'PGRST205' || /does not exist|schema cache/i.test(e?.message || '');
const FALLBACK_ENTITIES = CRM_ENTITIES.map((e, i) => ({ ...e, region: e.region || 'Américas', priority: null, tags: [], position: i }));

export const useCrmWeekly = (options = {}) => {
  const { realtime = true } = options;
  const [entities, setEntities] = useState(FALLBACK_ENTITIES);
  const [tracking, setTracking] = useState(false);
  const [dealCounts, setDealCounts] = useState([]);
  const [dealSync, setDealSync] = useState(null);
  const [dealsReady, setDealsReady] = useState(false);
  const [items, setItems] = useState(CRM_CHECK_ITEMS);
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
      // Ítems: si la tabla todavía no existe, quedan los del código
      try { const it = await listItems(); setItems(it.length ? it : CRM_CHECK_ITEMS); }
      catch (e) { if (!isMissingTable(e)) throw e; setItems(CRM_CHECK_ITEMS); }
      // Entidades: si falta la 0070, quedan las del código y sin edición
      try { const en = await listEntities(); setEntities(en.length ? en : FALLBACK_ENTITIES); setTracking(true); }
      catch (e) { if (!isMissingTable(e)) throw e; setEntities(FALLBACK_ENTITIES); setTracking(false); }
      // Deals por semana: si falta la 0071, la sección no se muestra
      try {
        const [dc, ds] = await Promise.all([listDealCounts(lastWeeks(DEAL_WEEKS)[0]), getDealSync()]);
        setDealCounts(dc); setDealSync(ds); setDealsReady(true);
      } catch (e) { if (!isMissingTable(e)) console.error('[useCrmWeekly] deals error:', e); setDealsReady(false); }
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
      createItem: wrap(createItem),
      updateItem: wrap(updateItem),
      removeItem: wrap(deleteItem),
      excludeItem: wrap(excludeItemFor),
      createEntity: wrap(createEntity),
      updateEntity: wrap(async (code, patch) => {
        setEntities((prev) => prev.map((e) => (e.code === code ? { ...e, ...patch, code } : e)));
        return updateEntity(code, patch);
      }),
      removeEntity: wrap(deleteEntity),
      refreshDeals: wrap(refreshDealCounts),
      updateStepOptimistic: wrap(async (id, patch) => {
        setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
        return updateStep(id, patch);
      }),
    };
  }, [refetch]);

  // Las del Weekly check = las de Américas (también para los avisos de
  // deadlines en rojo a Valentino)
  const weeklyEntities = useMemo(() => entities.filter((e) => (e.region || WEEKLY_REGION) === WEEKLY_REGION), [entities]);

  return { entities, weeklyEntities, tracking, dealCounts, dealSync, dealsReady, items, checks, steps, loading, error, missing, refetch, ...api };
};

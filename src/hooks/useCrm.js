// ════════════════════════════════════════════════════════════════════
// useCrm — Entidades y entrenamientos del CRM (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Devuelve:
//   entities, trainings, loading, error, refetch, usingFallback
//   createTraining(obj) / updateTraining(id, patch) / removeTraining(id)
//   createEntity(obj) / updateEntity(id, patch) / removeEntity(id)
//
// Si la tabla de entidades está vacía (migration 0018 sin correr),
// `entities` cae a DEFAULT_CRM_ENTITIES con ids sintéticos para que la
// vista se vea; en ese caso no se puede cargar entrenamientos.
//
// Al pasar un entrenamiento a realizado/cobrado se tilda solo el check
// de adopción correspondiente en la entidad (TRAINING_TYPE_TO_CHECK).
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listEntities, createEntity, updateEntity, deleteEntity,
  listTrainings, createTraining, updateTraining, deleteTraining,
  subscribeCrm,
} from '@/services/crmService';
import { DEFAULT_CRM_ENTITIES, TRAINING_TYPE_TO_CHECK } from '@/constants/crm';

const FALLBACK_ENTITIES = DEFAULT_CRM_ENTITIES.map((e) => ({ ...e, id: `local-${e.key}`, isFallback: true }));

export const useCrm = (options = {}) => {
  const { realtime = true } = options;
  const [entities, setEntities] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      const [e, t] = await Promise.all([listEntities(), listTrainings()]);
      setEntities(e);
      setTrainings(t);
    } catch (err) {
      console.error('[useCrm] fetch error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!realtime) return undefined;
    return subscribeCrm(() => refetch());
  }, [realtime, refetch]);

  const wrap = (fn) => async (...args) => {
    try {
      const r = await fn(...args);
      await refetch();
      return r;
    } catch (err) {
      console.error('[useCrm] write error:', err);
      setError(err);
      throw err;
    }
  };

  // Tildar el check de adopción de la entidad cuando un entrenamiento se hizo
  const syncEntityCheck = useCallback(async (training) => {
    const checkId = TRAINING_TYPE_TO_CHECK[training?.type];
    if (!checkId || !['realizado', 'cobrado', 'bonificado'].includes(training.status)) return;
    const entity = entities.find((e) => e.id === training.entityId);
    if (!entity || entity.isFallback || entity.checks?.[checkId]) return;
    await updateEntity(entity.id, { checks: { ...(entity.checks || {}), [checkId]: true } });
  }, [entities]);

  const api = useMemo(() => ({
    createTraining: wrap(async (obj) => { const t = await createTraining(obj); await syncEntityCheck(t); return t; }),
    updateTraining: wrap(async (id, patch) => { const t = await updateTraining(id, patch); await syncEntityCheck(t); return t; }),
    removeTraining: wrap(deleteTraining),
    createEntity:   wrap(createEntity),
    updateEntity:   wrap(updateEntity),
    removeEntity:   wrap(deleteEntity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [refetch, syncEntityCheck]);

  const usingFallback = !loading && entities.length === 0;
  return {
    entities: usingFallback ? FALLBACK_ENTITIES : entities,
    usingFallback,
    trainings,
    loading,
    error,
    refetch,
    ...api,
  };
};

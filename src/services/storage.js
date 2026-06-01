// ════════════════════════════════════════════════════════════════════
// STORAGE SERVICE — Capa de persistencia (factory mock/supabase)
// ════════════════════════════════════════════════════════════════════
// Hoy: modo mock (in-memory) — los servicios específicos manejan su
// propio store. Este módulo expone solo `isBackendReady()` y los
// stubs de las operaciones que ofrecerá Supabase.
//
// Cuando integremos Supabase:
//   1. Crear cliente: import { createClient } from '@supabase/supabase-js'
//   2. Implementar loadCollection/saveItem/deleteItem/subscribeCollection
//   3. Los servicios ya están preparados (preguntan isMockMode())
//
// Ver BACKEND_PLAN.md sección "Fase 3 — Data layer" para detalles.
// ════════════════════════════════════════════════════════════════════

/**
 * Devuelve true si Supabase está configurado (todas las env vars presentes).
 * Por ahora siempre false porque no integramos backend todavía.
 */
export const isBackendReady = () => {
  return !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
};

/**
 * Diagnóstico: nombre del backend activo.
 */
export const getBackendName = () => (isBackendReady() ? 'supabase' : 'mock');

/**
 * 🚧 Cargar todos los items de una colección.
 * En demo: devuelve null (los servicios usan sus propios stores).
 * Con Supabase: hace SELECT * FROM <collection>.
 */
export const loadCollection = async (_collection) => {
  if (!isBackendReady()) return null;
  // TODO: implementar con Supabase client
  return null;
};

/**
 * 🚧 Guardar/actualizar un item.
 */
export const saveItem = async (_collection, _item) => {
  if (!isBackendReady()) return null;
  // TODO: implementar con Supabase client
  return null;
};

/**
 * 🚧 Borrar un item.
 */
export const deleteItem = async (_collection, _itemId) => {
  if (!isBackendReady()) return null;
  // TODO: implementar con Supabase client
  return null;
};

/**
 * 🚧 Subscribirse a cambios en tiempo real de una colección.
 * Con Supabase: usa realtime channels.
 */
export const subscribeCollection = (_collection, _onChange) => {
  if (!isBackendReady()) return () => {};
  // TODO: implementar con Supabase realtime
  return () => {};
};

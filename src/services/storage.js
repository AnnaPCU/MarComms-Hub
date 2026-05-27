// ════════════════════════════════════════════════════════════════════
// STORAGE SERVICE — Capa de persistencia
// ════════════════════════════════════════════════════════════════════
// 🚧 PLACEHOLDER — En modo demo, toda la data vive en memoria de React.
//
// CUANDO INTEGREMOS SUPABASE:
//   1. Crear cliente: import { createClient } from '@supabase/supabase-js'
//   2. Exportar funciones loadX/saveX/deleteX para cada tabla
//   3. Reemplazar useState global en App.jsx por hooks que llamen acá
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
 * 🚧 Cargar todos los items de una colección.
 * En demo: devuelve null (App.jsx usa la data demo).
 * Con Supabase: hace SELECT * FROM <collection>.
 */
export const loadCollection = async (_collection) => {
  if (!isBackendReady()) return null;
  // TODO: implementar con Supabase client
  return null;
};

/**
 * 🚧 Guardar/actualizar un item.
 * En demo: no hace nada (App.jsx mantiene state local).
 * Con Supabase: hace UPSERT.
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

// ════════════════════════════════════════════════════════════════════
// DATA SERVICE — Factory que elige el backend (mock vs Supabase)
// ════════════════════════════════════════════════════════════════════
// Punto único de detección del modo de persistencia. Los servicios
// específicos (requestsService, tasksService, etc.) preguntan acá si
// están en modo mock o tienen backend real.
//
// Hoy: SIEMPRE mock. Cuando se setee VITE_SUPABASE_URL +
// VITE_SUPABASE_ANON_KEY, isBackendReady() devuelve true y los
// servicios cambian su implementación interna sin romper sus contratos.
// ════════════════════════════════════════════════════════════════════

import { isBackendReady } from './storage';

/**
 * Modo actual: 'mock' o 'supabase'.
 * Cambia automáticamente cuando hay env vars.
 */
export const getDataMode = () => (isBackendReady() ? 'supabase' : 'mock');

export const isMockMode = () => getDataMode() === 'mock';

/**
 * Simula latencia de red para que los mocks se sientan "como" Supabase.
 * Si en test molesta, pasar 0.
 */
export const mockDelay = (ms = 80) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Genera ID estable para entidades nuevas creadas en mock.
 * En Supabase lo hace `gen_random_uuid()`.
 */
export const newId = (prefix = '') => {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}-${stamp}-${rand}` : `${stamp}${rand}`;
};

/**
 * Helper: clona profundo (mocks no comparten refs con consumers).
 */
export const clone = (v) =>
  typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

// ════════════════════════════════════════════════════════════════════
// AUTH SERVICE — Autenticación
// ════════════════════════════════════════════════════════════════════
// MODO DEMO: password compartida.
//   - Configurable vía .env → VITE_SHARED_PASSWORD
//   - Fallback hardcoded para desarrollo local: 'marcomms2026'
//
// CUANDO INTEGREMOS SUPABASE:
//   1. Reemplazar checkPassword con Supabase Auth (Magic Link)
//   2. Cada miembro tiene su propia cuenta con email @controlunion.com
//   3. La sesión persiste vía JWT en localStorage de Supabase
//
// Ver BACKEND_PLAN.md sección "Fase 2 — Auth" para detalles.
// ════════════════════════════════════════════════════════════════════

import { PEOPLE } from '@/constants/team';

// Default solo para desarrollo. En producción usar VITE_SHARED_PASSWORD.
const DEMO_FALLBACK_PASSWORD = 'marcomms2026';

/**
 * Obtiene la password compartida desde env vars.
 */
export const getSharedPassword = () => {
  return import.meta.env.VITE_SHARED_PASSWORD || DEMO_FALLBACK_PASSWORD;
};

/**
 * Indica si la app está corriendo con la password default (no configurada).
 * Útil para mostrar un warning en UI durante desarrollo.
 */
export const isUsingDefaultPassword = () => {
  return !import.meta.env.VITE_SHARED_PASSWORD;
};

/**
 * Valida que la password ingresada coincida con la compartida.
 */
export const checkPassword = (password) => {
  return password === getSharedPassword();
};

/**
 * Valida que el nombre ingresado sea un miembro del equipo.
 */
export const isValidMember = (name) => {
  return PEOPLE.includes(name);
};

/**
 * Login compartido (modo demo).
 * Devuelve { ok, error? } sin lanzar excepciones — más fácil de consumir
 * desde el hook useAuth.
 */
export const sharedLogin = ({ name, password }) => {
  if (!isValidMember(name)) {
    return { ok: false, error: 'Usuario inválido' };
  }
  if (!checkPassword(password)) {
    return { ok: false, error: 'Contraseña incorrecta' };
  }
  return { ok: true };
};

// ────────────────────────────────────────────────────────────────────
// 🚧 PLACEHOLDERS para integración Supabase Auth futura.
// ────────────────────────────────────────────────────────────────────

export const loginWithSupabase = async (_email) => {
  throw new Error('Supabase Auth no integrado todavía. Ver BACKEND_PLAN.md');
};

export const logoutWithSupabase = async () => {
  // TODO: supabase.auth.signOut()
};

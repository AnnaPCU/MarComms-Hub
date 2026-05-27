// ════════════════════════════════════════════════════════════════════
// AUTH SERVICE — Autenticación
// ════════════════════════════════════════════════════════════════════
// MODO DEMO: password compartida hardcoded.
//
// CUANDO INTEGREMOS SUPABASE:
//   1. Reemplazar checkPassword con Supabase Auth (Magic Link)
//   2. Cada miembro tiene su propia cuenta con email @controlunion.com
//   3. La sesión persiste vía JWT en localStorage de Supabase
//
// Ver BACKEND_PLAN.md sección "Fase 2 — Auth" para detalles.
// ════════════════════════════════════════════════════════════════════

import { PEOPLE } from '@/constants/team';

/**
 * Obtiene la password compartida desde env vars.
 * Default: 'marcomms2026' si no está configurada.
 */
const getSharedPassword = () => {
  return import.meta.env.VITE_SHARED_PASSWORD || 'marcomms2026';
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
 * 🚧 PLACEHOLDER para integración Supabase Auth futura.
 */
export const loginWithSupabase = async (_email) => {
  throw new Error('Supabase Auth no integrado todavía. Ver BACKEND_PLAN.md');
};

/**
 * 🚧 PLACEHOLDER para logout con Supabase.
 */
export const logoutWithSupabase = async () => {
  // TODO: supabase.auth.signOut()
};

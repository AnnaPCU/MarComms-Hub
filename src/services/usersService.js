// ════════════════════════════════════════════════════════════════════
// USERS SERVICE — CRUD de usuarios (mock por ahora)
// ════════════════════════════════════════════════════════════════════
// Contrato estable: cuando integremos Supabase, solo cambia la
// implementación interna. Componentes y hooks consumen este módulo.
// ════════════════════════════════════════════════════════════════════

import { MOCK_USERS, getUserByName, getUserById, getUsersByArea } from '@/data/mockUsers';
import { mockDelay, isMockMode } from './dataService';

/**
 * Lista todos los usuarios del equipo.
 */
export const listUsers = async () => {
  await mockDelay();
  if (isMockMode()) return [...MOCK_USERS];
  // TODO Supabase: supabase.from('team_members').select('*')
  return [];
};

/**
 * Busca un usuario por nombre (case-sensitive — los names del equipo
 * son únicos y consistentes en team.js).
 */
export const findUserByName = async (name) => {
  await mockDelay();
  if (isMockMode()) return getUserByName(name);
  // TODO Supabase
  return null;
};

/**
 * Busca un usuario por id.
 */
export const findUserById = async (id) => {
  await mockDelay();
  if (isMockMode()) return getUserById(id);
  // TODO Supabase
  return null;
};

/**
 * Lista usuarios por área ('comunicacion' | 'marketing').
 */
export const listUsersByArea = async (area) => {
  await mockDelay();
  if (isMockMode()) return getUsersByArea(area);
  // TODO Supabase
  return [];
};

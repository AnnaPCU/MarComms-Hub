// ════════════════════════════════════════════════════════════════════
// WEBINARS SERVICE — Webinars (mock CRUD)
// ════════════════════════════════════════════════════════════════════

import { MOCK_WEBINARS } from '@/data/mockWebinars';
import { mockDelay, isMockMode, newId, clone } from './dataService';

let _store = clone(MOCK_WEBINARS);

export const listWebinars = async (filters = {}) => {
  await mockDelay();
  if (!isMockMode()) return [];
  let result = clone(_store);
  if (filters.pais)          result = result.filter((w) => w.pais === filters.pais);
  if (filters.unidadNegocio) result = result.filter((w) => w.unidadNegocio === filters.unidadNegocio);
  if (filters.serviceOwner)  result = result.filter((w) => w.serviceOwner === filters.serviceOwner);
  return result;
};

export const getWebinarById = async (id) => {
  await mockDelay();
  if (!isMockMode()) return null;
  const found = _store.find((w) => String(w.id) === String(id));
  return found ? clone(found) : null;
};

export const createWebinar = async (data) => {
  await mockDelay();
  const item = {
    id: newId('wb'),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  if (!isMockMode()) return item;
  _store = [..._store, item];
  return clone(item);
};

export const updateWebinar = async (id, patch) => {
  await mockDelay();
  if (!isMockMode()) return null;
  let updated = null;
  _store = _store.map((w) => {
    if (String(w.id) !== String(id)) return w;
    updated = { ...w, ...patch, updatedAt: new Date().toISOString() };
    return updated;
  });
  return updated ? clone(updated) : null;
};

export const deleteWebinar = async (id) => {
  await mockDelay();
  if (!isMockMode()) return false;
  const before = _store.length;
  _store = _store.filter((w) => String(w.id) !== String(id));
  return _store.length < before;
};

export const __resetWebinarsStore = () => {
  _store = clone(MOCK_WEBINARS);
};

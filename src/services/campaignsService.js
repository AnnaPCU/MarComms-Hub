// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS SERVICE — Campañas (mock CRUD)
// ════════════════════════════════════════════════════════════════════
// IMPORTANTE: por ahora App.jsx sigue manejando su propio state global
// de campaigns. Este servicio existe para que el futuro refactor pueda
// reemplazar useState por hooks que llamen acá sin tocar la UI.
// ════════════════════════════════════════════════════════════════════

import { MOCK_CAMPAIGNS } from '@/data/mockCampaigns';
import { mockDelay, isMockMode, newId, clone } from './dataService';

let _store = clone(MOCK_CAMPAIGNS);

export const listCampaigns = async (filters = {}) => {
  await mockDelay();
  if (!isMockMode()) return []; // TODO Supabase
  let result = clone(_store);
  if (filters.type)         result = result.filter((c) => c.type === filters.type);
  if (filters.variant)      result = result.filter((c) => c.variant === filters.variant);
  if (filters.country)      result = result.filter((c) => c.country === filters.country);
  if (filters.businessUnit) result = result.filter((c) => c.businessUnit === filters.businessUnit);
  return result;
};

export const getCampaignById = async (id) => {
  await mockDelay();
  if (!isMockMode()) return null;
  const found = _store.find((c) => String(c.id) === String(id));
  return found ? clone(found) : null;
};

export const createCampaign = async (data) => {
  await mockDelay();
  const item = {
    id: newId('cmp'),
    completedSteps: [],
    comments: [],
    ...data,
  };
  if (!isMockMode()) return item;
  _store = [..._store, item];
  return clone(item);
};

export const updateCampaign = async (id, patch) => {
  await mockDelay();
  if (!isMockMode()) return null;
  let updated = null;
  _store = _store.map((c) => {
    if (String(c.id) !== String(id)) return c;
    updated = { ...c, ...patch };
    return updated;
  });
  return updated ? clone(updated) : null;
};

export const deleteCampaign = async (id) => {
  await mockDelay();
  if (!isMockMode()) return false;
  const before = _store.length;
  _store = _store.filter((c) => String(c.id) !== String(id));
  return _store.length < before;
};

export const __resetCampaignsStore = () => {
  _store = clone(MOCK_CAMPAIGNS);
};

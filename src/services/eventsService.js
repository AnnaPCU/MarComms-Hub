// ════════════════════════════════════════════════════════════════════
// EVENTS SERVICE — Eventos (mock CRUD)
// ════════════════════════════════════════════════════════════════════

import { MOCK_EVENTS } from '@/data/mockEvents';
import { mockDelay, isMockMode, newId, clone } from './dataService';

let _store = clone(MOCK_EVENTS);

export const listEvents = async (filters = {}) => {
  await mockDelay();
  if (!isMockMode()) return [];
  let result = clone(_store);
  if (filters.country)      result = result.filter((e) => e.country === filters.country);
  if (filters.businessUnit) result = result.filter((e) => e.businessUnit === filters.businessUnit);
  return result;
};

export const getEventById = async (id) => {
  await mockDelay();
  if (!isMockMode()) return null;
  const found = _store.find((e) => String(e.id) === String(id));
  return found ? clone(found) : null;
};

export const createEvent = async (data) => {
  await mockDelay();
  const item = {
    id: newId('ev'),
    ...data,
  };
  if (!isMockMode()) return item;
  _store = [..._store, item];
  return clone(item);
};

export const updateEvent = async (id, patch) => {
  await mockDelay();
  if (!isMockMode()) return null;
  let updated = null;
  _store = _store.map((e) => {
    if (String(e.id) !== String(id)) return e;
    updated = { ...e, ...patch };
    return updated;
  });
  return updated ? clone(updated) : null;
};

export const deleteEvent = async (id) => {
  await mockDelay();
  if (!isMockMode()) return false;
  const before = _store.length;
  _store = _store.filter((e) => String(e.id) !== String(id));
  return _store.length < before;
};

export const __resetEventsStore = () => {
  _store = clone(MOCK_EVENTS);
};

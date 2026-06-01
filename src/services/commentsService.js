// ════════════════════════════════════════════════════════════════════
// COMMENTS SERVICE — Comentarios sobre entities (mock CRUD)
// ════════════════════════════════════════════════════════════════════
// En modo mock vivimos en un store plano. Cuando migremos a Supabase,
// la tabla `comments` tiene FK polymórfico via (parent_type, parent_id).
// ════════════════════════════════════════════════════════════════════

import { MOCK_COMMENTS } from '@/data/mockComments';
import { mockDelay, isMockMode, newId, clone } from './dataService';

let _store = clone(MOCK_COMMENTS);

export const listComments = async ({ parentType, parentId } = {}) => {
  await mockDelay();
  if (!isMockMode()) return []; // TODO Supabase
  let result = clone(_store);
  if (parentType) result = result.filter((c) => c.parentType === parentType);
  if (parentId !== undefined && parentId !== null) {
    result = result.filter((c) => String(c.parentId) === String(parentId));
  }
  return result;
};

export const createComment = async ({ parentType, parentId, author, text }) => {
  await mockDelay();
  const item = {
    id: newId('cm'),
    parentType,
    parentId,
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  if (!isMockMode()) return item; // TODO Supabase
  _store = [..._store, item];
  return clone(item);
};

export const deleteComment = async (id) => {
  await mockDelay();
  if (!isMockMode()) return false;
  const before = _store.length;
  _store = _store.filter((c) => String(c.id) !== String(id));
  return _store.length < before;
};

export const __resetCommentsStore = () => {
  _store = clone(MOCK_COMMENTS);
};

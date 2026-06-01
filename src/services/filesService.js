// ════════════════════════════════════════════════════════════════════
// FILES SERVICE — Archivos adjuntos (mock; futuro Supabase Storage)
// ════════════════════════════════════════════════════════════════════
// En modo mock guardamos el contenido como dataBase64 inline.
// En Supabase: subir a un bucket y guardar solo el storagePath.
// ════════════════════════════════════════════════════════════════════

import { MOCK_FILES } from '@/data/mockFiles';
import { mockDelay, isMockMode, newId, clone } from './dataService';

let _store = clone(MOCK_FILES);

export const listFiles = async ({ parentType, parentId } = {}) => {
  await mockDelay();
  if (!isMockMode()) return []; // TODO Supabase Storage list
  let result = clone(_store);
  if (parentType) result = result.filter((f) => f.parentType === parentType);
  if (parentId !== undefined && parentId !== null) {
    result = result.filter((f) => String(f.parentId) === String(parentId));
  }
  return result;
};

/**
 * Sube un archivo. En mock guarda base64 inline; en Supabase usaría
 * el bucket y devolvería el storagePath.
 */
export const uploadFile = async ({
  parentType,
  parentId,
  name,
  mimeType,
  size,
  dataBase64,
  uploadedBy,
}) => {
  await mockDelay();
  const item = {
    id: newId('fl'),
    parentType,
    parentId,
    name,
    mimeType,
    size,
    storagePath: null,
    dataBase64,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
  if (!isMockMode()) {
    // TODO Supabase Storage: upload + insert metadata
    return item;
  }
  _store = [..._store, item];
  return clone(item);
};

export const deleteFile = async (id) => {
  await mockDelay();
  if (!isMockMode()) return false;
  const before = _store.length;
  _store = _store.filter((f) => String(f.id) !== String(id));
  return _store.length < before;
};

export const __resetFilesStore = () => {
  _store = clone(MOCK_FILES);
};

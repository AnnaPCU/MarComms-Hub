// ════════════════════════════════════════════════════════════════════
// useRequests — Hook para pedidos / standalone requests
// ════════════════════════════════════════════════════════════════════
// Lee, escribe y se suscribe a la tabla `requests` de Supabase.
// Mantiene un overlay local para `content` (comments / files) mientras
// no haya columna persistida en la DB.
//
// Devuelve:
//   data        — array de requests (shape UI: name, owner, requester, ...)
//   loading     — true mientras carga la primera vez
//   error       — Error o null
//   refetch()
//   create(payload)
//   update(id, patch)
//   remove(id)
//   setStatus(id, newStatus)       — wrapper que maneja completedAt
//   setOwner(id, newOwner)         — wrapper conveniente
//   addComment(id, text, author)   — solo en memoria (TODO persistir)
//   removeComment(id, commentId)   — idem
//   addFile(id, file, category)    — idem
//   removeFile(id, fileId, cat)    — idem
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listRequests,
  createRequest,
  updateRequest,
  deleteRequest,
  subscribeRequests,
} from '@/services/requestsService';

export const useRequests = (filters = {}, options = {}) => {
  const { realtime = true } = options;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overlay local para comments/files (no persistido en DB todavía).
  // Map<requestId, { comments: [], designFiles: [], wordingFiles: [] }>
  const [contentMap, setContentMap] = useState({});

  // Serializar filters para que el effect no se dispare sin cambios reales
  const filtersKey = JSON.stringify(filters);

  // Ref para acceder a contentMap dentro de callbacks sin re-crear
  const contentMapRef = useRef(contentMap);
  contentMapRef.current = contentMap;

  // ── Fetch ──
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listRequests(filters);
      setRows(list);
    } catch (e) {
      console.error('[useRequests] fetch error:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ── Realtime ──
  useEffect(() => {
    if (!realtime) return undefined;
    const unsubscribe = subscribeRequests(() => {
      refetch();
    });
    return unsubscribe;
  }, [realtime, refetch]);

  // ── Mergeo rows + contentMap para devolver shape final ──
  const data = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      content: contentMap[r.id] || r.content || { comments: [], files: [] },
    }));
  }, [rows, contentMap]);

  // ════════════════════════════════════════════════════════════════
  // Writers (persisten en Supabase)
  // ════════════════════════════════════════════════════════════════

  const create = useCallback(async (payload) => {
    try {
      const item = await createRequest(payload);
      await refetch();
      return item;
    } catch (e) {
      console.error('[useRequests] create error:', e);
      setError(e);
      throw e;
    }
  }, [refetch]);

  const update = useCallback(async (id, patch) => {
    try {
      const item = await updateRequest(id, patch);
      await refetch();
      return item;
    } catch (e) {
      console.error('[useRequests] update error:', e);
      setError(e);
      throw e;
    }
  }, [refetch]);

  const remove = useCallback(async (id) => {
    try {
      const ok = await deleteRequest(id);
      // Limpiar overlay local
      setContentMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refetch();
      return ok;
    } catch (e) {
      console.error('[useRequests] delete error:', e);
      setError(e);
      throw e;
    }
  }, [refetch]);

  // ── Wrappers de update con lógica de negocio ──

  const setStatus = useCallback(async (id, newStatus) => {
    const patch = { status: newStatus };
    if (newStatus === 'done') {
      patch.completedAt = new Date().toISOString();
    } else {
      patch.completedAt = null;
    }
    return update(id, patch);
  }, [update]);

  const setOwner = useCallback((id, newOwner) => update(id, { owner: newOwner }), [update]);

  // ════════════════════════════════════════════════════════════════
  // Local overlay (comments + files) — NO persistido todavía
  // ════════════════════════════════════════════════════════════════

  const _patchContent = useCallback((id, patcher) => {
    setContentMap((prev) => {
      const current = prev[id] || { comments: [], designFiles: [], wordingFiles: [] };
      return { ...prev, [id]: patcher(current) };
    });
  }, []);

  /**
   * Mutación genérica del overlay de content para un request.
   * Útil para piezas con keys arbitrarias (e.g. content[pieceKey].marcommsApproval).
   * El updater recibe el content actual y devuelve el nuevo.
   * NO se persiste en DB (overlay local únicamente).
   */
  const updateContent = useCallback((id, updater) => {
    _patchContent(id, (current) => updater(current) || current);
  }, [_patchContent]);

  const addComment = useCallback((id, text, author) => {
    if (!text || !text.trim()) return;
    _patchContent(id, (c) => ({
      ...c,
      comments: [
        ...(c.comments || []),
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          author: author || 'Equipo',
          text: text.trim(),
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  }, [_patchContent]);

  const removeComment = useCallback((id, commentId) => {
    _patchContent(id, (c) => ({
      ...c,
      comments: (c.comments || []).filter((cm) => cm.id !== commentId),
    }));
  }, [_patchContent]);

  const addFile = useCallback((id, file, category = 'design') => {
    const fileKey = category === 'wording' ? 'wordingFiles' : 'designFiles';
    _patchContent(id, (c) => ({
      ...c,
      [fileKey]: [
        ...(c[fileKey] || []),
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: file.name,
          url: file.url || '',
          category,
          addedAt: new Date().toISOString(),
        },
      ],
    }));
  }, [_patchContent]);

  const removeFile = useCallback((id, fileId, category = 'design') => {
    const fileKey = category === 'wording' ? 'wordingFiles' : 'designFiles';
    _patchContent(id, (c) => ({
      ...c,
      [fileKey]: (c[fileKey] || []).filter((f) => f.id !== fileId),
    }));
  }, [_patchContent]);

  return {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    setStatus,
    setOwner,
    addComment,
    removeComment,
    addFile,
    removeFile,
    updateContent,
  };
};

// ════════════════════════════════════════════════════════════════════
// useCollection — Patrón genérico para coleccion sincronizada con Supabase
// ════════════════════════════════════════════════════════════════════
// Devuelve [data, setData] como useState — pero internamente:
//   - Carga inicial: fetch desde Supabase
//   - Cuando un consumer llama setData(updater):
//       1. Computa next y actualiza state local (instantáneo en UI)
//       2. Diff vs prev → fires INSERT / UPDATE / DELETE a Supabase
//   - Realtime: aplica deltas que llegan de otros clientes
//
// Permite que los componentes existentes sigan usando el patrón
// setWebinars(prev => prev.map(...)) sin saber de la persistencia.
//
// Limitación conocida: dos clientes que editan EL MISMO item en simultaneo
// → el último UPDATE gana (no hay conflict resolution). Suficiente para
// el uso interno del equipo (9 personas).
//
// Parametros:
//   service: {
//     list:        () => Promise<Item[]>,
//     create:      (item) => Promise<Item>,
//     update:      (id, patch) => Promise<Item>,
//     remove:      (id) => Promise<boolean>,
//     subscribe:   (onChange) => unsubscribe,
//     fromRow:     (row) => Item,    // para realtime
//   }
//   options: {
//     realtime?:  boolean (default true)
//   }
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';

export const useCollection = (service, options = {}) => {
  const { realtime = true } = options;

  const [data, setDataLocal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // IDs que estamos escribiendo localmente (para distinguir nuestras propias
  // escrituras de cambios externos en el realtime).
  const pendingWritesRef = useRef(new Set());

  // ── Fetch inicial ──
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await service.list();
      setDataLocal(list);
    } catch (e) {
      console.error('[useCollection] fetch error:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Realtime ──
  useEffect(() => {
    if (!realtime || !service.subscribe) return undefined;
    const unsubscribe = service.subscribe((payload) => {
      const { eventType } = payload;
      const newRow = payload.new;
      const oldRow = payload.old;
      const incomingId = (newRow && newRow.id) || (oldRow && oldRow.id);

      // Si es eco de nuestra propia escritura, ignorar para no
      // sobrescribir state local con la versión recién persistida
      // (que es la misma — pero evita re-renders).
      if (pendingWritesRef.current.has(incomingId)) return;

      if (eventType === 'INSERT') {
        const item = service.fromRow(newRow);
        setDataLocal((prev) =>
          prev.find((p) => String(p.id) === String(item.id))
            ? prev
            : [item, ...prev],
        );
      } else if (eventType === 'UPDATE') {
        const item = service.fromRow(newRow);
        setDataLocal((prev) =>
          prev.map((p) => (String(p.id) === String(item.id) ? item : p)),
        );
      } else if (eventType === 'DELETE') {
        setDataLocal((prev) =>
          prev.filter((p) => String(p.id) !== String(oldRow.id)),
        );
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime]);

  // ── Smart setter ──
  // Actualiza state local Y dispara INSERT / UPDATE / DELETE en background.
  const setData = useCallback((updater) => {
    setDataLocal((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Diff
      const prevById = new Map(prev.map((p) => [String(p.id), p]));
      const nextById = new Map(next.map((n) => [String(n.id), n]));

      // Adds
      for (const n of next) {
        if (!prevById.has(String(n.id))) {
          pendingWritesRef.current.add(n.id);
          service.create(n)
            .catch((e) => console.error('[useCollection] create error:', e))
            .finally(() => {
              // Liberar el ID después de un breve tiempo (para que llegue el realtime echo)
              setTimeout(() => pendingWritesRef.current.delete(n.id), 1500);
            });
        }
      }

      // Updates
      for (const n of next) {
        const old = prevById.get(String(n.id));
        if (old && !shallowEqual(old, n)) {
          pendingWritesRef.current.add(n.id);
          service.update(n.id, n)
            .catch((e) => console.error('[useCollection] update error:', e))
            .finally(() => {
              setTimeout(() => pendingWritesRef.current.delete(n.id), 1500);
            });
        }
      }

      // Removes
      for (const p of prev) {
        if (!nextById.has(String(p.id))) {
          pendingWritesRef.current.add(p.id);
          service.remove(p.id)
            .catch((e) => console.error('[useCollection] delete error:', e))
            .finally(() => {
              setTimeout(() => pendingWritesRef.current.delete(p.id), 1500);
            });
        }
      }

      return next;
    });
  }, [service]);

  return [data, setData, { loading, error, refetch }];
};

// ── Helpers ──

// Compara dos objetos por su serialización JSON.
// Suficiente para detectar "hubo cambio" para coleccion de items planos.
function shallowEqual(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_e) {
    return false;
  }
}

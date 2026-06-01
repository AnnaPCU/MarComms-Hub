// ════════════════════════════════════════════════════════════════════
// useFilters — Hook genérico para filtros en listas
// ════════════════════════════════════════════════════════════════════
// Encapsula el patrón "objeto de filtros + setter individual + reset".
// Reemplaza los múltiples useState que hoy tienen los componentes para
// filtrar listas (country, businessUnit, status, owner, etc.).
//
// Uso:
//   const { filters, setFilter, clearFilters, hasFilters } = useFilters({
//     country: null,
//     businessUnit: null,
//     status: null,
//   });
//   <select onChange={(e) => setFilter('country', e.target.value)}>...
//
// Para listas en memoria, podés combinarlo con applyFilters():
//   const visible = applyFilters(allItems, filters);
// ════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from 'react';

export const useFilters = (initial = {}) => {
  const [filters, setFilters] = useState(initial);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFilters = useMemo(
    () => Object.values(filters).some((v) => v !== null && v !== '' && v !== undefined),
    [filters],
  );

  return { filters, setFilters, setFilter, clearFilters, hasFilters };
};

/**
 * Aplica un objeto de filtros simples (key=value) sobre una lista.
 * Ignora claves con valor null/undefined/''.
 * Match: igualdad estricta sobre item[key] o, si key incluye '.',
 * descenso en lodash-style (e.g. 'data.country').
 */
export const applyFilters = (items, filters) => {
  const entries = Object.entries(filters || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );
  if (entries.length === 0) return items;
  return items.filter((item) =>
    entries.every(([key, value]) => {
      const v = key.includes('.')
        ? key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), item)
        : item[key];
      return v === value;
    }),
  );
};

// ════════════════════════════════════════════════════════════════════
// useInvoicingSheet — Lo que comparten las hojas de un mes de Facturación
// ════════════════════════════════════════════════════════════════════
// Dado el mes y la hoja: las filas (todas y las visibles según buscador,
// marca y estado elegido), el contexto de fila gris (Fijo), los totales de
// lo visible, el conteo de estados del mes y los grupos de país plegados.
//
// Uso: const sh = useInvoicingSheet({ rows, month, sheet, columns, filters });
// ════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from 'react';
import { fijoContext, isBillable, rowStatus, sheetTotals, sortRows, statusStats } from '@/utils/invoicing';
import { filterRows } from '@/utils/invoicingView';

export const sheetRows = (rows, month, sheet) => sortRows(rows.filter((r) => (r.month || null) === (month || null) && r.sheet === sheet));

export const useInvoicingSheet = ({ rows, month, sheet, columns = [], filters = { q: '', brand: '' } }) => {
  const all = useMemo(() => sheetRows(rows, month, sheet), [rows, month, sheet]);
  const ctxById = useMemo(() => (sheet === 'fijo' ? fijoContext(all) : {}), [all, sheet]);
  const [statusPick, setStatusPick] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggleGroup = useCallback((key) => setCollapsed((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }), []);

  const visible = useMemo(() => filterRows(all, filters).filter((r) => !statusPick || (isBillable(sheet, r.data, ctxById[r.id]) && rowStatus(r.data) === statusPick)), [all, filters, statusPick, sheet, ctxById]);
  const filtered = visible.length !== all.length;
  const totals = useMemo(() => sheetTotals(sheet, visible, columns, ctxById), [sheet, visible, columns, ctxById]);
  const stats = useMemo(() => statusStats(sheet, all, ctxById), [sheet, all, ctxById]);

  return { all, visible, filtered, ctxById, totals, stats, statusPick, setStatusPick, collapsed, toggleGroup };
};

// ════════════════════════════════════════════════════════════════════
// useInvoicing — Facturación MarComms (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Devuelve:
//   months (['YYYY-MM'], del más viejo al más nuevo), rows, loading,
//   error, missing (falta la migración 0048)
//   patchCell(row, patch, remove?) → se ve al instante y se guarda
//   patchSingleton(month, sheet, patch) → notas / zona libre (crea la
//     fila si no existe)
//   addRow(month, sheet, afterRow?, data?) · moveRow(row, dir, siblings)
//   removeRow(row) · createMonth({ toMonth, fromMonth, copyVariables })
//
// Mientras haya escrituras en curso no se pisa lo local con lo que llega
// por realtime: se vuelve a leer cuando terminan.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createMonth as createMonthDb, deleteRow, insertRows, listMonths, listRows, patchRow,
  setRowPosition, subscribeInvoicing,
} from '@/services/invoicingService';
import { buildMonthCopy, positionBetween, sortRows } from '@/utils/invoicing';

const isMissingTable = (e) => e?.code === '42P01' || e?.code === 'PGRST205' || /does not exist|schema cache/i.test(e?.message || '');
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === 'x' ? r : ((r % 4) + 8)).toString(16);
  }));

const applyPatch = (data, patch, remove = []) => {
  const next = { ...(data || {}), ...(patch || {}) };
  remove.forEach((k) => { delete next[k]; });
  return next;
};

export const useInvoicing = (currentUser) => {
  const [months, setMonths] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const pending = useRef(0);
  const stale = useRef(false);
  const timer = useRef(null);
  const by = currentUser?.name || '';

  const refetch = useCallback(async () => {
    if (pending.current > 0) { stale.current = true; return; }
    try {
      const [m, r] = await Promise.all([listMonths(), listRows()]);
      if (pending.current > 0) { stale.current = true; return; }
      setMonths(m); setRows(r); setError(null); setMissing(false);
    } catch (e) {
      if (isMissingTable(e)) setMissing(true);
      else { console.error('[useInvoicing] fetch error:', e); setError(e); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const unsubscribe = subscribeInvoicing(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(refetch, 300);
    });
    return () => { clearTimeout(timer.current); unsubscribe(); };
  }, [refetch]);

  // Corre una escritura; si falla vuelve a leer y avisa
  const write = useCallback(async (fn) => {
    pending.current += 1;
    try {
      return await fn();
    } catch (e) {
      console.error('[useInvoicing] write error:', e);
      stale.current = true;
      throw e;
    } finally {
      pending.current -= 1;
      if (pending.current === 0 && stale.current) { stale.current = false; refetch(); }
    }
  }, [refetch]);

  const patchCell = useCallback((row, patch, remove = []) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, data: applyPatch(r.data, patch, remove) } : r)));
    return write(() => patchRow(row.id, patch, remove, by));
  }, [write, by]);

  const addRow = useCallback((month, sheet, afterRow = null, data = {}) => {
    const siblings = sortRows(rows.filter((r) => r.sheet === sheet && (r.month || null) === (month || null)));
    let position;
    if (afterRow) {
      const i = siblings.findIndex((r) => r.id === afterRow.id);
      position = positionBetween(afterRow.position, siblings[i + 1]?.position);
    } else {
      position = positionBetween(siblings[siblings.length - 1]?.position, undefined);
    }
    const row = { id: newId(), month: month || null, sheet, position, data };
    setRows((prev) => [...prev, row]);
    return write(() => insertRows([row], by)).then(() => row);
  }, [rows, write, by]);

  const patchSingleton = useCallback((month, sheet, patch, remove = []) => {
    const existing = sortRows(rows.filter((r) => r.month === month && r.sheet === sheet))[0];
    if (existing) return patchCell(existing, patch, remove);
    return addRow(month, sheet, null, applyPatch({}, patch, remove));
  }, [rows, patchCell, addRow]);

  // Sube o baja una fila (cambia de lugar con la vecina)
  const moveRow = useCallback((row, dir) => {
    const siblings = sortRows(rows.filter((r) => r.sheet === row.sheet && r.month === row.month));
    const i = siblings.findIndex((r) => r.id === row.id);
    const other = siblings[i + dir];
    if (!other) return Promise.resolve();
    const a = row.position; const b = other.position === a ? a + dir : other.position;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, position: b } : r.id === other.id ? { ...r, position: a } : r)));
    return write(async () => { await setRowPosition(row.id, b); await setRowPosition(other.id, a); });
  }, [rows, write]);

  const removeRow = useCallback((row) => {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    return write(() => deleteRow(row.id));
  }, [write]);

  const createMonth = useCallback(({ toMonth, fromMonth, copyVariables = false }) => {
    const source = rows.filter((r) => r.month === fromMonth);
    const copy = fromMonth ? buildMonthCopy(source, { toMonth, copyVariables, newId }) : [];
    setMonths((prev) => [...new Set([...prev, toMonth])].sort());
    setRows((prev) => [...prev, ...copy]);
    return write(() => createMonthDb(toMonth, copy, by));
  }, [rows, write, by]);

  return { months, rows, loading, error, missing, refetch, patchCell, patchSingleton, addRow, moveRow, removeRow, createMonth };
};

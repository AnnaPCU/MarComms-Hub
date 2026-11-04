// ════════════════════════════════════════════════════════════════════
// InvoiceGrid — Hoja editable de Facturación (tabla tipo Excel)
// ════════════════════════════════════════════════════════════════════
// Una fila por fila del Excel, una columna por columna (constants/
// invoicing). Se escribe directo en las celdas (GridCell). A la izquierda,
// el número de fila con su menú (insertar abajo, subir, bajar, eliminar y
// las acciones propias de cada hoja). Abajo, la fila de totales.
//
// Props:
//   grid (id para moverse con el teclado), sheet, columns, headerGroups,
//   rows (ya ordenadas), onPatch(row, patch, remove), onAddRow(after?),
//   onMoveRow(row, dir), onDeleteRow(row), rowActions(row) → [acciones],
//   rowClass(row), cellReadOnly(row, col), totals ({ [key]: n }),
//   totalsLabel, listFor ({ [key]: datalistId }), canMove, addLabel
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { formatAmount, repeatedFlags, rowTotal } from '@/utils/invoicing';
import GridCell from './GridCell';
import RowMenu from './RowMenu';

const NUM_W = 46;

export default function InvoiceGrid({
  grid, sheet, columns, headerGroups = [], rows = [], onPatch, onAddRow, onMoveRow, onDeleteRow,
  rowActions, rowClass, cellReadOnly, totals, totalsLabel = 'Total', listFor = {}, canMove = true,
  addLabel = 'Agregar fila', emptyText = 'Todavía no hay filas.',
}) {
  const [menu, setMenu] = useState(null);
  const width = NUM_W + columns.reduce((s, c) => s + c.width, 0);

  // Encabezado combinado: celdas de grupo y huecos
  const groupRow = useMemo(() => {
    if (!headerGroups.length) return null;
    const out = [];
    for (let i = 0; i < columns.length;) {
      const g = headerGroups.find((h) => h.from === columns[i].key);
      if (g) { out.push({ ...g, key: g.from }); i += g.span; } else { out.push({ key: `gap-${i}`, span: 1 }); i += 1; }
    }
    return out;
  }, [columns, headerGroups]);

  const merged = useMemo(() => Object.fromEntries(columns.filter((c) => c.merge).map((c) => [c.key, repeatedFlags(rows, c.key)])), [columns, rows]);

  const commit = (row, col, raw) => {
    const key = col.type === 'total' ? 'totalManual' : col.key;
    if (raw === '') onPatch(row, {}, [key]);
    else onPatch(row, { [key]: raw });
  };

  return (
    <div>
      <div className="overflow-auto max-h-[calc(100vh-300px)] min-h-[200px] rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="table-fixed border-collapse text-xs" style={{ width }}>
          <colgroup>
            <col style={{ width: NUM_W }} />
            {columns.map((c) => <col key={c.key} style={{ width: c.width }} />)}
          </colgroup>
          <thead className="sticky top-0 z-20">
            {groupRow && (
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200" />
                {groupRow.map((g) => (
                  <th key={g.key} colSpan={g.span} className={`border-b border-r border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 text-center ${g.tint || 'bg-slate-50'}`}>
                    {g.label || ''}
                  </th>
                ))}
              </tr>
            )}
            <tr className="bg-slate-100">
              <th className="sticky left-0 z-10 bg-slate-100 border-b border-r border-slate-200 text-[9px] font-black text-slate-400">#</th>
              {columns.map((c) => (
                <th key={c.key} className={`border-b border-r border-slate-200 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 ${c.type === 'number' || c.type === 'total' ? 'text-right' : 'text-left'} ${c.tint || ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-xs font-bold text-slate-400">{emptyText}</td></tr>
            )}
            {rows.map((row, ri) => {
              const extra = rowClass?.(row) || '';
              const actions = [
                { label: 'Insertar fila abajo', onClick: () => onAddRow(row) },
                ...(canMove ? [
                  { label: 'Subir fila', onClick: () => onMoveRow(row, -1), disabled: ri === 0 },
                  { label: 'Bajar fila', onClick: () => onMoveRow(row, 1), disabled: ri === rows.length - 1 },
                ] : []),
                ...(rowActions?.(row) || []),
                { label: 'Eliminar fila', onClick: () => onDeleteRow(row), danger: true },
              ];
              return (
                <tr key={row.id} className={`group ${extra}`}>
                  <td className={`sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-0 ${extra}`}>
                    <div className="relative flex items-center justify-between pl-1.5 pr-0.5">
                      <span className="font-mono text-[10px] text-slate-400">{ri + 1}</span>
                      <button onClick={() => setMenu(menu === row.id ? null : row.id)} className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center opacity-40 group-hover:opacity-100 focus:opacity-100" title="Opciones de la fila" aria-label={`Opciones de la fila ${ri + 1}`}>
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      {menu === row.id && <RowMenu actions={actions} onClose={() => setMenu(null)} />}
                    </div>
                  </td>
                  {columns.map((col, ci) => {
                    const isTotal = col.type === 'total';
                    const total = isTotal ? rowTotal(sheet, row.data) : null;
                    const ro = cellReadOnly?.(row, col) || (isTotal && total === null);
                    return (
                      <td key={col.key} className={`border-b border-r border-slate-200 p-0 align-top ${col.tint || ''} ${isTotal ? 'bg-emerald-50/40' : ''}`}>
                        <GridCell
                          grid={grid}
                          r={ri}
                          c={ci}
                          value={isTotal ? row.data?.totalManual : row.data?.[col.key]}
                          type={col.type || 'text'}
                          computed={total}
                          multiline={!col.type && !col.mono && col.width >= 140}
                          mono={col.mono}
                          list={listFor[col.key]}
                          readOnly={ro}
                          placeholder={ro && isTotal ? '—' : ''}
                          className={merged[col.key]?.[ri] ? 'text-slate-300 focus:text-slate-800' : ''}
                          onCommit={(raw) => commit(row, col, raw)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-emerald-50">
                <td className="sticky left-0 z-10 bg-emerald-50 border-t-2 border-r border-emerald-200" />
                {columns.map((c, i) => (
                  <td key={c.key} className={`border-t-2 border-r border-emerald-200 px-2 py-2 font-black ${c.key in totals ? 'text-right font-mono tabular-nums text-emerald-800' : 'text-[10px] uppercase tracking-widest text-emerald-800'}`}>
                    {c.key in totals ? formatAmount(totals[c.key]) : i === 0 ? totalsLabel : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {onAddRow && (
        <button onClick={() => onAddRow(null)} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-emerald-400 hover:text-emerald-700">
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// GridRow — Una fila de InvoiceGrid
// ════════════════════════════════════════════════════════════════════
// Número de fila con su menú (⋯), una celda por columna (GridCell, o el
// chip de estado), el punto de «cambió contra el mes anterior» y la marca
// de fila nueva. Las columnas fijas (vista compacta) llevan su `left`.
//
// Props: row, ri (índice visible), columns, sheet, grid, ctx (fila
//   gris), compact, sticky ({ key: left }), merged ({ key: bool }),
//   change ({ key: { before, label } }), isNew, prevLabel, billable,
//   actions, menuOpen, onToggleMenu, onCommit(col, raw), onStatus(next),
//   cellReadOnly(col), rowClass
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { diffValue } from '@/utils/invoicingReview';
import { rowStatus, rowTotal } from '@/utils/invoicing';
import GridCell from './GridCell';
import RowMenu from './RowMenu';
import StatusChip from './StatusChip';

export default function GridRow({
  row, ri, columns, sheet, grid, ctx, compact = false, sticky = {}, merged = {}, change, isNew = false, prevLabel = 'el mes anterior',
  billable = true, actions = [], menuOpen = false, onToggleMenu, onCommit, onStatus, cellReadOnly, rowClass = '',
}) {
  const stickyCls = (key, base) => (sticky[key] !== undefined ? `sticky z-[5] ${base || 'bg-white'}` : '');
  const stickyStyle = (key) => (sticky[key] !== undefined ? { left: sticky[key] } : undefined);
  const total = rowTotal(sheet, row.data, ctx);

  return (
    <tr className={`group ${rowClass}`} data-row-id={row.id}>
      <td className={`sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-0 ${rowClass}`}>
        <div className="relative flex items-center justify-between pl-1.5 pr-0.5">
          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
            {ri + 1}
            {isNew && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`Fila nueva (no estaba en ${prevLabel})`} />}
          </span>
          <button onClick={onToggleMenu} className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center opacity-40 group-hover:opacity-100 focus:opacity-100" title="Opciones de la fila" aria-label={`Opciones de la fila ${ri + 1}`}>
            <MoreHorizontal className="w-3.5 h-3.5 text-slate-500" />
          </button>
          {menuOpen && <RowMenu actions={actions} onClose={onToggleMenu} />}
        </div>
      </td>
      {columns.map((col, ci) => {
        const isTotal = col.type === 'total';
        const diff = change?.[col.key];
        const dot = diff && (
          <span className="pointer-events-none absolute right-0.5 top-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" title={`${prevLabel}: ${diffValue(diff.before)}`} aria-label={`Cambió: antes ${diffValue(diff.before)}`} />
        );
        if (col.type === 'status') {
          return (
            <td key={col.key} className={`border-b border-r border-slate-200 px-1.5 ${compact ? 'py-0.5' : 'py-1'} align-top ${stickyCls(col.key, rowClass || 'bg-white')}`} style={stickyStyle(col.key)}>
              {billable ? <StatusChip status={rowStatus(row.data)} onChange={onStatus} /> : <span className="text-slate-300 text-[10px] px-1">—</span>}
            </td>
          );
        }
        const ro = cellReadOnly?.(col) || (isTotal && total === null);
        return (
          <td key={col.key} className={`relative border-b border-r border-slate-200 p-0 align-top ${col.tint || ''} ${isTotal ? 'bg-emerald-50/40' : ''} ${stickyCls(col.key, rowClass || col.tint || 'bg-white')}`} style={stickyStyle(col.key)}>
            <GridCell
              grid={grid}
              r={ri}
              c={ci}
              value={isTotal ? row.data?.totalManual : row.data?.[col.key]}
              type={col.type || 'text'}
              computed={total}
              ctx={col.type === 'number' ? { ...(ctx || {}), key: col.key } : undefined}
              multiline={!col.type && !col.mono && col.width >= 140}
              compact={compact}
              mono={col.mono}
              list={col.list}
              readOnly={ro}
              placeholder={ro && isTotal ? '—' : ''}
              className={merged[col.key] ? 'text-slate-300 focus:text-slate-800' : ''}
              title={ro && !isTotal ? (row.data?._multi?.[col.cat] ? `${row.data._multi[col.cat]} cargos en esta categoría: editalos en la vista de lista` : undefined) : undefined}
              onCommit={(raw) => onCommit(col, raw)}
            />
            {dot}
          </td>
        );
      })}
    </tr>
  );
}

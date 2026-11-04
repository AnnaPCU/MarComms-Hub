// ════════════════════════════════════════════════════════════════════
// InvoiceGrid — Hoja editable de Facturación (tabla tipo Excel)
// ════════════════════════════════════════════════════════════════════
// Una fila por fila del Excel, una columna por columna (constants/
// invoicing). Se escribe directo en las celdas (GridCell). A la izquierda,
// el número de fila con su menú (insertar abajo, subir, bajar, eliminar y
// las acciones propias de cada hoja). Abajo, la fila de totales.
// Con groupBy, las filas se agrupan por país en bandas plegables con su
// subtotal; en la vista compacta las columnas `sticky` quedan fijas a la
// izquierda y los textos largos en una línea.
//
// Props:
//   grid (id para moverse con el teclado), sheet, columns, headerGroups,
//   rows (visibles, ya ordenadas), ctxById (fila gris de cada fila, Fijo),
//   compact, groupBy ('pais'), collapsed (Set), onToggleGroup(key),
//   changes ({ cells, added: Set }) y prevLabel (puntos de «qué cambió»),
//   onPatch(row, patch, remove), onStatus(row, next), onAddRow(after?),
//   onMoveRow(row, dir), onDeleteRow(row), rowActions(row) → [acciones],
//   rowClass(row), cellReadOnly(row, col), isBillable(row), totals
//   ({ [key]: n }), totalsLabel, listFor ({ [key]: datalistId }), canMove,
//   addLabel, emptyText
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { formatAmount, repeatedFlags } from '@/utils/invoicing';
import { NUM_COL_WIDTH, bandTotal, cleanCountry, groupRows, stickyOffsets } from '@/utils/invoicingView';
import GridRow from './GridRow';

export default function InvoiceGrid({
  grid, sheet, columns, headerGroups = [], rows = [], ctxById = {}, compact = false, groupBy = null, collapsed = new Set(), onToggleGroup,
  changes, prevLabel, onPatch, onStatus, onAddRow, onMoveRow, onDeleteRow, rowActions, rowClass, cellReadOnly, isBillable,
  totals, totalsLabel = 'Total', listFor = {}, canMove = true, addLabel = 'Agregar fila', emptyText = 'Todavía no hay filas.',
}) {
  const [menu, setMenu] = useState(null);
  const cols = useMemo(() => columns.map((c) => ({ ...c, list: listFor[c.key] })), [columns, listFor]);
  const width = NUM_COL_WIDTH + columns.reduce((s, c) => s + c.width, 0);
  const sticky = useMemo(() => stickyOffsets(columns, compact), [columns, compact]);

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

  const groups = useMemo(() => groupRows(rows, { by: groupBy, collapsed }), [rows, groupBy, collapsed]);
  const visible = useMemo(() => groups.flatMap((g) => (g.hidden ? [] : g.rows)), [groups]);
  const indexOf = useMemo(() => new Map(visible.map((r, i) => [r.id, i])), [visible]);
  const merged = useMemo(() => Object.fromEntries(columns.filter((c) => c.merge).map((c) => [c.key, repeatedFlags(visible, c.key)])), [columns, visible]);

  const commit = (row, col, text) => {
    const key = col.type === 'total' ? 'totalManual' : col.key;
    const raw = col.country ? cleanCountry(text) : text;
    if (raw === '') onPatch(row, {}, [key]);
    else onPatch(row, { [key]: raw });
  };

  const thSticky = (c, base) => (sticky[c.key] !== undefined ? { className: `sticky z-[6] ${base}`, style: { left: sticky[c.key] } } : { className: '', style: undefined });

  return (
    <div>
      <div className="overflow-auto max-h-[calc(100vh-300px)] min-h-[200px] rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="table-fixed border-collapse text-xs" style={{ width }}>
          <colgroup>
            <col style={{ width: NUM_COL_WIDTH }} />
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
              {columns.map((c) => {
                const s = thSticky(c, 'bg-slate-100');
                return (
                  <th key={c.key} style={s.style} className={`border-b border-r border-slate-200 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 ${c.type === 'number' || c.type === 'total' ? 'text-right' : 'text-left'} ${c.tint || ''} ${s.className}`}>
                    {c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-xs font-bold text-slate-400">{emptyText}</td></tr>
            )}
            {groups.map((g) => (
              <React.Fragment key={g.key ?? 'all'}>
                {g.label && (
                  <tr className="bg-emerald-50/60">
                    <td colSpan={columns.length + 1} className="border-b border-emerald-100 p-0">
                      <button onClick={() => onToggleGroup?.(g.key)} className="sticky left-0 flex items-center gap-2 px-2 py-1.5 text-[11px] font-black text-emerald-900 hover:text-emerald-700" aria-expanded={!g.hidden} title={g.hidden ? 'Mostrar las filas' : 'Ocultar las filas'}>
                        {g.hidden ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span className="uppercase tracking-wider">{g.label}</span>
                        <span className="font-bold text-emerald-700/70">· {g.rows.length} {g.rows.length === 1 ? 'fila' : 'filas'}</span>
                        <span className="font-mono tabular-nums text-emerald-800">· {formatAmount(bandTotal(sheet, g.rows, ctxById))}</span>
                      </button>
                    </td>
                  </tr>
                )}
                {!g.hidden && g.rows.map((row) => {
                  const ri = indexOf.get(row.id);
                  const actions = [
                    { label: 'Insertar fila abajo', onClick: () => onAddRow(row) },
                    ...(canMove ? [
                      { label: 'Subir fila', onClick: () => onMoveRow(row, -1), disabled: ri === 0 },
                      { label: 'Bajar fila', onClick: () => onMoveRow(row, 1), disabled: ri === visible.length - 1 },
                    ] : []),
                    ...(rowActions?.(row) || []),
                    { label: 'Eliminar fila', onClick: () => onDeleteRow(row), danger: true },
                  ];
                  return (
                    <GridRow
                      key={row.id}
                      row={row}
                      ri={ri}
                      columns={cols}
                      sheet={sheet}
                      grid={grid}
                      ctx={ctxById[row.id]}
                      compact={compact}
                      sticky={sticky}
                      merged={Object.fromEntries(Object.entries(merged).map(([k, flags]) => [k, flags[ri]]))}
                      change={changes?.cells?.[row.id]}
                      isNew={!!changes?.added?.has(row.id)}
                      prevLabel={prevLabel}
                      billable={isBillable ? isBillable(row) : true}
                      actions={actions}
                      menuOpen={menu === row.id}
                      onToggleMenu={() => setMenu(menu === row.id ? null : row.id)}
                      onCommit={(col, raw) => commit(row, col, raw)}
                      onStatus={(next) => onStatus?.(row, next)}
                      cellReadOnly={(col) => cellReadOnly?.(row, col)}
                      rowClass={rowClass?.(row) || ''}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-emerald-50">
                <td className="sticky left-0 z-10 bg-emerald-50 border-t-2 border-r border-emerald-200" />
                {columns.map((c, i) => {
                  const s = thSticky(c, 'bg-emerald-50');
                  return (
                    <td key={c.key} style={s.style} className={`border-t-2 border-r border-emerald-200 px-2 py-2 font-black ${c.key in totals ? 'text-right font-mono tabular-nums text-emerald-800' : 'text-[10px] uppercase tracking-widest text-emerald-800'} ${s.className}`}>
                      {c.key in totals ? formatAmount(totals[c.key]) : i === 0 ? totalsLabel : ''}
                    </td>
                  );
                })}
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

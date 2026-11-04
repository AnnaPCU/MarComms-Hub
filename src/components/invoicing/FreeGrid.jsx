// ════════════════════════════════════════════════════════════════════
// FreeGrid — Zona libre de una hoja (como el Excel: A1, B2…)
// ════════════════════════════════════════════════════════════════════
// En «MKT Plan (Felo)», debajo de la tabla de planes, el Excel tenía notas
// y cuentas sueltas (plan de campañas recurrente, Primus, Aqua…). Acá se
// conservan en una grilla libre: cada celda se escribe directo y se guarda
// sola (una clave por celda en data, ej. "A11").
//
// Props: grid, data ({ A1: '…', _rows, _cols }), onPatch(patch, remove),
//   colWidths ([px] por columna; la última se repite), people (equipo:
//   con @ se etiqueta a alguien y le llega un aviso)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';
import { FREE_GRID_MIN_COLS, FREE_GRID_MIN_ROWS } from '@/constants/invoicing';
import { cellKey, colName, freeGridSize } from '@/utils/invoicing';
import GridCell from './GridCell';

export default function FreeGrid({ grid, data = {}, onPatch, colWidths = [380, 120], people = [] }) {
  const { rows, cols } = freeGridSize(data, FREE_GRID_MIN_ROWS, FREE_GRID_MIN_COLS);
  const widthOf = (c) => colWidths[Math.min(c, colWidths.length - 1)];
  const width = 40 + Array.from({ length: cols }, (_, c) => widthOf(c)).reduce((s, w) => s + w, 0);

  const commit = (key, raw) => (raw === '' ? onPatch({}, [key]) : onPatch({ [key]: raw }));

  return (
    <div>
      <div className="overflow-auto max-h-[70vh] rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="table-fixed border-collapse text-xs" style={{ width }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {Array.from({ length: cols }, (_, c) => <col key={c} style={{ width: widthOf(c) }} />)}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100">
              <th className="border-b border-r border-slate-200" />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className="border-b border-r border-slate-200 py-1 text-[10px] font-black text-slate-400">{colName(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td className="border-b border-r border-slate-200 bg-slate-50 text-center font-mono text-[10px] text-slate-400">{r + 1}</td>
                {Array.from({ length: cols }, (_, c) => {
                  const key = cellKey(r, c);
                  return (
                    <td key={key} className="border-b border-r border-slate-200 p-0 align-top">
                      <GridCell grid={grid} r={r} c={c} value={data[key]} multiline people={people} onCommit={(raw) => commit(key, raw)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => onPatch({ _rows: rows + 10 })} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-emerald-400 hover:text-emerald-700">
          <Plus className="w-3.5 h-3.5" /> 10 filas más
        </button>
        <button onClick={() => onPatch({ _cols: cols + 1 })} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-emerald-400 hover:text-emerald-700">
          <Plus className="w-3.5 h-3.5" /> Una columna más
        </button>
      </div>
    </div>
  );
}

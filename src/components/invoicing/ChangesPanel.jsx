// ════════════════════════════════════════════════════════════════════
// ChangesPanel — «Qué cambió» contra el mes anterior
// ════════════════════════════════════════════════════════════════════
// Columna a la derecha de la hoja (abajo en pantallas chicas): los
// totales de los dos meses lado a lado y, por hoja,
// las filas nuevas, las que ya no están y las celdas que cambiaron (antes
// → ahora). Cliquear una fila lleva a su hoja. Mientras está abierto, la
// grilla marca las celdas que cambiaron con un punto ámbar.
//
// Props: monthLabel, prevLabel, now, prev (monthSummary), diffs
//   ({ [sheet]: monthDiff }), onGo(sheet, rowId), onClose
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { SHEET_LABELS } from '@/constants/invoicing';
import { formatAmount } from '@/utils/invoicing';
import { diffValue, rowLabel } from '@/utils/invoicingReview';

const TOTALS = [
  ['fijo', 'Fijo y facturas'], ['variables', 'Variables'], ['fijoMasVariables', 'Fijo + Variables'], ['mkt', 'MKT Plan'], ['crmLicenses', 'CRM · licencias'],
];

export default function ChangesPanel({ monthLabel, prevLabel, now, prev, diffs = {}, onGo, onClose }) {
  const sheets = Object.entries(diffs).filter(([, d]) => d && d.count > 0);
  return (
    <aside className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col lg:sticky lg:top-16 lg:max-h-[calc(100vh-80px)]" role="dialog" aria-label="Qué cambió contra el mes anterior">
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Qué cambió</p>
          <h2 className="text-base font-black text-slate-900">{monthLabel} <span className="text-slate-400 font-bold">vs</span> {prevLabel}</h2>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center" title="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Totales</p>
          <table className="w-full">
            <tbody>
              {TOTALS.map(([k, label]) => {
                const a = prev?.[k] ?? 0; const b = now?.[k] ?? 0; const d = Math.round((b - a) * 100) / 100;
                return (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="py-1.5 font-bold text-slate-600">{label}</td>
                    <td className="py-1.5 text-right font-mono text-slate-400">{formatAmount(a)}</td>
                    <td className="py-1.5 text-right font-mono font-black text-slate-800">{formatAmount(b)}</td>
                    <td className={`py-1.5 text-right font-mono font-black w-20 ${d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-slate-300'}`}>{d ? `${d > 0 ? '+' : ''}${formatAmount(d)}` : '='}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        {sheets.length === 0 && <p className="text-xs font-bold text-slate-400">Las hojas de {monthLabel} son iguales a las de {prevLabel}.</p>}
        {sheets.map(([sheet, d]) => (
          <section key={sheet}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{SHEET_LABELS[sheet] || sheet} <span className="text-slate-300">· {d.count}</span></p>
            <ul className="space-y-1.5">
              {d.added.map((r) => (
                <li key={r.id}><button onClick={() => onGo?.(sheet, r.id)} className="w-full text-left rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 hover:border-emerald-400"><span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Nueva</span> <span className="font-bold text-slate-700">{rowLabel(sheet, r.data)}</span></button></li>
              ))}
              {d.removed.map((r) => (
                <li key={r.id} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5"><span className="text-[9px] font-black uppercase tracking-wider text-red-600">Ya no está</span> <span className="font-bold text-slate-700">{rowLabel(sheet, r.data)}</span></li>
              ))}
              {d.changed.map((c) => (
                <li key={c.row.id}>
                  <button onClick={() => onGo?.(sheet, c.row.id)} className="w-full text-left rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 hover:border-amber-400">
                    <span className="font-bold text-slate-800">{rowLabel(sheet, c.row.data)}</span>
                    <ul className="mt-1 space-y-0.5">
                      {c.cells.map((cell) => (
                        <li key={cell.key} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="font-bold text-slate-500 shrink-0">{cell.label}:</span>
                          <span className="font-mono text-slate-400 truncate" title={diffValue(cell.before)}>{diffValue(cell.before)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                          <span className="font-mono font-black text-slate-800 truncate" title={diffValue(cell.after)}>{diffValue(cell.after)}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}

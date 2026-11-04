// ════════════════════════════════════════════════════════════════════
// MonthSplitModal — «Mes a mes»: cuánto es cada categoría del mes
// ════════════════════════════════════════════════════════════════════
// Se abre al cliquear una barra (o un tramo) del gráfico. Una fila por
// tramo de la barra (Fijo y facturas + las seis categorías de Variables):
// el porcentaje que representa en el total del mes, con su barra, y en
// paralelo el monto. Si se cliqueó un tramo, esa fila queda resaltada.
// Mismos números que la tabla de totales (monthBreakdown). En Otros, el
// «?» abre «¿Qué va en Otros?».
//
// Props: month, rows (del mes), focus (id del tramo cliqueado | null),
//   paused (está abierto «¿Qué va en Otros?» encima: Esc cierra solo ese),
//   onClose(), onOtrosInfo()
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { HelpCircle, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { formatAmount, round2 } from '@/utils/invoicing';
import { monthBreakdown, sharePct } from '@/utils/invoicingBreakdown';
import { monthLabel } from '@/utils/planTasks';

export default function MonthSplitModal({ month, rows = [], focus = null, paused = false, onClose, onOtrosInfo }) {
  const b = useMemo(() => monthBreakdown(rows), [rows]);
  const manualDiff = round2(b.variables - b.chargesSum);
  useEffect(() => {
    if (paused) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, paused]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Categorías de ${monthLabel(month)}`} onClick={onClose}>
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fijo + Variables por categoría</p>
              <h3 className="text-lg font-black text-slate-900">{monthLabel(month)} <span className="font-mono tabular-nums text-emerald-700">· {formatAmount(b.total)}</span></h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center" title="Cerrar" aria-label="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-1.5 text-left">Categoría</th>
                <th className="py-1.5 pl-3 text-left">% del total</th>
                <th className="py-1.5 pl-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {b.segments.map((s) => {
                const empty = !s.total;
                return (
                  <tr key={s.id} data-split={s.id} className={`border-t border-slate-100 ${focus === s.id ? 'bg-emerald-50' : ''}`}>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 font-bold ${empty ? 'text-slate-400' : 'text-slate-700'}`}>
                        <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: s.color, opacity: empty ? 0.35 : 1 }} />
                        {s.id === 'fijo' ? s.label : s.short}
                        {s.id === 'otros' && onOtrosInfo && (
                          <button type="button" onClick={onOtrosInfo} className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100" title="¿Qué va en Otros?" aria-label="¿Qué va en Otros?"><HelpCircle className="w-3 h-3" /></button>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pl-3 w-full">
                      <span className="flex items-center gap-2">
                        <span className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${s.share * 100}%`, background: s.color }} /></span>
                        <span className={`w-14 shrink-0 text-right font-mono tabular-nums font-black ${empty ? 'text-slate-300' : 'text-slate-900'}`}>{sharePct(s.share)}</span>
                      </span>
                    </td>
                    <td className={`py-2 pl-3 text-right font-mono tabular-nums font-black whitespace-nowrap ${empty ? 'text-slate-300' : 'text-slate-900'}`}>{formatAmount(s.total)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-200">
                <td className="py-2 font-black text-slate-900">Total</td>
                <td className="py-2 pl-3 text-right font-mono tabular-nums font-black text-slate-900">100 %</td>
                <td className="py-2 pl-3 text-right font-mono tabular-nums font-black text-emerald-700">{formatAmount(b.total)}</td>
              </tr>
            </tbody>
          </table>
          {manualDiff !== 0 && (
            <p className="text-[11px] text-amber-800">En Variables hay totales escritos a mano: el total del mes los respeta, por eso las categorías suman {formatAmount(Math.abs(manualDiff))} {manualDiff > 0 ? 'menos' : 'más'}.</p>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

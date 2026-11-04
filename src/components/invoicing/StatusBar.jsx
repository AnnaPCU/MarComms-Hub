// ════════════════════════════════════════════════════════════════════
// StatusBar — Cuántos cobros del mes van facturados y cobrados
// ════════════════════════════════════════════════════════════════════
// Barra con un tramo por estado (pendiente / facturado / cobrado) y el
// texto «18 de 31 facturados · 5 cobrados». Debajo, la plata en cada
// estado. Cliquear un estado filtra las filas (onPick).
//
// Props: stats (statusStats), picked (id | ''), onPick(id | '')
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { INVOICE_STATUSES } from '@/constants/invoicing';
import { formatAmount } from '@/utils/invoicing';

export default function StatusBar({ stats, picked = '', onPick }) {
  if (!stats || !stats.total) return null;
  const { total, byStatus } = stats;
  const done = byStatus.facturado.count + byStatus.cobrado.count;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="min-w-0 sm:w-56">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cobros del mes</p>
        <p className="text-sm font-black text-slate-800"><span className="font-mono">{done}</span> de <span className="font-mono">{total}</span> facturados <span className="text-slate-400 font-bold">· {byStatus.cobrado.count} {byStatus.cobrado.count === 1 ? 'cobrado' : 'cobrados'}</span></p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 gap-px" role="img" aria-label={`${done} de ${total} facturados`}>
          {INVOICE_STATUSES.map((s) => {
            const n = byStatus[s.id].count;
            return n ? <div key={s.id} className={`${s.bar} h-full`} style={{ width: `${(n / total) * 100}%` }} title={`${s.label}: ${n}`} /> : null;
          })}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {INVOICE_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick?.(picked === s.id ? '' : s.id)}
              aria-pressed={picked === s.id}
              className={`inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[10px] font-bold transition-colors ${picked === s.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              title={picked === s.id ? 'Ver todas las filas' : `Ver solo las filas en ${s.label.toLowerCase()}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label} <span className="font-mono">{byStatus[s.id].count}</span>
              <span className={`font-mono ${picked === s.id ? 'text-white/70' : 'text-slate-400'}`}>· {formatAmount(byStatus[s.id].amount)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

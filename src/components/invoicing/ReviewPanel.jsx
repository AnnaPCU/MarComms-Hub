// ════════════════════════════════════════════════════════════════════
// ReviewPanel — «Para revisar» del mes de Facturación
// ════════════════════════════════════════════════════════════════════
// Avisos que arma utils/invoicingReview (códigos en «?», totales a mano,
// totales del CRM que mezclan monedas, filas grises que no cuadran…).
// Plegado muestra solo la cantidad; cada aviso lleva a su hoja y se puede
// borrar (vuelve si el dato cambia).
//
// Props: items (sin los borrados), hidden (cuántos se borraron),
//   onDismiss(id), onGo(item), open, onToggle
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { SHEET_LABELS } from '@/constants/invoicing';

export default function ReviewPanel({ items = [], hidden = 0, onDismiss, onGo, open = false, onToggle }) {
  const warn = items.filter((it) => it.level === 'warn').length;
  return (
    <div className={`bg-white rounded-2xl border shadow-sm ${warn ? 'border-amber-200' : 'border-slate-200'}`}>
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        {items.length ? <AlertTriangle className={`w-3.5 h-3.5 ${warn ? 'text-amber-500' : 'text-slate-400'}`} /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Para revisar</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${items.length ? (warn ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600') : 'bg-emerald-50 text-emerald-700'}`}>{items.length ? items.length : 'todo cuadra'}</span>
        {hidden > 0 && <span className="ml-auto text-[10px] font-bold text-slate-400">{hidden} {hidden === 1 ? 'aviso borrado' : 'avisos borrados'}</span>}
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-1.5">
          {items.length === 0 && <li className="text-xs font-bold text-emerald-600">{hidden ? 'No queda nada para revisar.' : 'Todo cuadra.'}</li>}
          {items.map((it) => (
            <li key={it.id} className={`text-[11px] rounded-lg pl-3 pr-1.5 py-2 border flex items-start gap-2 ${it.level === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <button onClick={() => onGo?.(it)} className="shrink-0 rounded-md bg-white/70 border border-black/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-emerald-700" title="Ir a la hoja">{SHEET_LABELS[it.sheet] || it.sheet}</button>
              <span className="flex-1 min-w-0">{it.text}</span>
              {onDismiss && (
                <button onClick={() => onDismiss(it.id)} title="Borrar aviso" aria-label="Borrar aviso" className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-black/10"><X className="w-3.5 h-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

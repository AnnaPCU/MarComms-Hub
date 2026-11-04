// ════════════════════════════════════════════════════════════════════
// NewMonthModal — Armar el mes siguiente de Facturación
// ════════════════════════════════════════════════════════════════════
// Como copiar el Excel del mes anterior: «Fijo y facturas», «MKT Plan» y
// «CRM» quedan iguales (se editan si algo cambió); «Variables» trae las
// mismas filas sin detalle, CC ni precio (salvo que se tilde copiarlos);
// las notas arrancan vacías. «Entidades» no depende del mes.
//
// Props: toMonth, months (existentes), defaultFrom, busy, onCreate({
//   toMonth, fromMonth, copyVariables }), onClose
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { monthLabel } from '@/utils/planTasks';

export default function NewMonthModal({ toMonth, months = [], defaultFrom, busy = false, onCreate, onClose }) {
  const [fromMonth, setFromMonth] = useState(defaultFrom || '');
  const [copyVariables, setCopyVariables] = useState(false);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Mes nuevo de facturación">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Mes nuevo</p>
            <h2 className="text-xl font-black text-slate-900">{monthLabel(toMonth)}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center" title="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <label className="block">
          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Copiar desde</span>
          <select value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
            {[...months].reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            <option value="">No copiar nada (hojas vacías)</option>
          </select>
        </label>

        {fromMonth && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1.5">
            <p><b>Fijo y facturas</b>, <b>MKT Plan</b> y <b>CRM</b>: quedan como en {monthLabel(fromMonth)}. Cambiá lo que se haya movido.</p>
            <p><b>Variables</b>: las mismas filas (país, entidad, código, empresa), {copyVariables ? 'con el detalle, CC y precio de ese mes' : 'sin detalle, CC ni precio'}.</p>
            <p><b>Notas del mes</b>: vacías.</p>
          </div>
        )}

        {fromMonth && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={copyVariables} onChange={(e) => setCopyVariables(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
            Copiar también los montos de Variables
          </label>
        )}

        <button
          onClick={() => onCreate({ toMonth, fromMonth: fromMonth || null, copyVariables })}
          disabled={busy}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <CalendarPlus className="w-4 h-4" /> {busy ? 'Armando el mes…' : `Armar ${monthLabel(toMonth)}`}
        </button>
      </div>
    </div>
  );
}

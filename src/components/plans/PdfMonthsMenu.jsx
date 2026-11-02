// ════════════════════════════════════════════════════════════════════
// PdfMonthsMenu — Elegir varios meses para el PDF del plan
// ════════════════════════════════════════════════════════════════════
// Se abre con «Varios meses», al lado de «Descargar PDF · <mes>», en el
// detalle del plan. Un botón por mes (los que tienen acciones o KPIs, más
// el actual) que se prende y se apaga; arranca con el mes del PDF de un
// mes y siempre queda al menos uno. El PDF suma los KPIs de los meses
// elegidos y muestra sus acciones separadas por mes, como «Varios meses…»
// del link externo.
//
// Props: options ([{ value, label, current }]), initial (['YYYY-MM']),
//   busy, onDownload(months), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, Download, X } from 'lucide-react';

export default function PdfMonthsMenu({ options = [], initial = [], busy = false, onDownload, onClose }) {
  const [months, setMonths] = useState(() => initial.filter((m) => options.some((o) => o.value === m)));
  const toggle = (m) => setMonths((cur) => {
    if (cur.includes(m)) return cur.length === 1 ? cur : cur.filter((x) => x !== m);
    return [...cur, m].sort();
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-full mt-2 z-50 w-[min(92vw,360px)] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3" role="dialog" aria-label="PDF de varios meses">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">PDF de varios meses</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Suma los KPIs y muestra las acciones de los meses elegidos.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-3.5 h-3.5 text-slate-500" /></button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Meses del PDF">
          {options.map((o) => {
            const on = months.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(o.value)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition-colors ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}
              >
                {on && <Check className="w-3 h-3" />}
                {o.label}{o.current ? ' (este mes)' : ''}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onDownload(months)}
          disabled={busy || months.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> {busy ? 'Generando PDF…' : `Descargar PDF · ${months.length} ${months.length === 1 ? 'mes' : 'meses'}`}
        </button>
      </div>
    </>
  );
}

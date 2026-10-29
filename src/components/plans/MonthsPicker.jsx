// ════════════════════════════════════════════════════════════════════
// MonthsPicker — Elegir varios meses en el link externo de un plan
// ════════════════════════════════════════════════════════════════════
// Aparece al elegir «Varios meses…» en el selector de mes: un botón por
// mes (los mismos del selector, del más viejo al más nuevo) que se prende
// y se apaga. Siempre queda al menos uno elegido. Con los meses elegidos,
// la vista suma los KPIs y muestra las acciones de todos.
//
// Props: options ([{ value, label, current }]), value (['YYYY-MM']),
//   onChange(months), c (colores de la marca)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Check } from 'lucide-react';

export default function MonthsPicker({ options = [], value = [], onChange, c }) {
  const toggle = (m) => {
    const on = value.includes(m);
    if (on && value.length === 1) return; // al menos un mes
    onChange(on ? value.filter((x) => x !== m) : [...value, m].sort());
  };
  return (
    <div className="sm:col-span-2">
      <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.label }}>
        Meses elegidos <span className="normal-case tracking-normal font-normal">· se suman los KPIs y se ven las acciones de todos</span>
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Meses elegidos">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(o.value)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${on ? 'border-transparent' : 'bg-white border-slate-200'}`}
              style={on ? { background: c.primary, color: c.onPrimary } : { color: c.dark }}
            >
              {on && <Check className="w-3.5 h-3.5" />}
              {o.label}{o.current ? ' (este mes)' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

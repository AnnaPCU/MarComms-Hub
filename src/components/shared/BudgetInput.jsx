// ════════════════════════════════════════════════════════════════════
// BudgetInput — Presupuesto en USD o "Incluido en el plan mensual"
// ════════════════════════════════════════════════════════════════════
// Algunos servicios no se cobran aparte porque entran en el plan mensual
// del país. Este campo reemplaza al input de monto en webinars, eventos
// y campañas: un selector de modo + el número solo cuando es en USD.
//
// Props:
//   amount         — número o '' (monto en USD)
//   billing        — 'usd' | 'plan'
//   onAmount(v)    — cambio del monto (número o '')
//   onBilling(v)   — cambio del modo
//   label          — texto del label (default "Presupuesto")
//   accent         — 'blue' | 'orange' | 'amber' (color del foco)
//   size           — 'md' (default) | 'sm'
// ════════════════════════════════════════════════════════════════════

import React from 'react';

export const BILLING_MODES = [
  { id: 'usd',  label: 'USD' },
  { id: 'plan', label: 'Incluido en el plan mensual' },
];
export const BILLING_LABEL = { usd: 'USD', plan: 'Incluido en el plan mensual' };

const RING = { blue: 'focus:ring-blue-400', orange: 'focus:ring-orange-400', amber: 'focus:ring-amber-400' };

export default function BudgetInput({ amount, billing = 'usd', onAmount, onBilling, label = 'Presupuesto', accent = 'blue', size = 'md' }) {
  const ring = RING[accent] || RING.blue;
  const isPlan = billing === 'plan';
  const pad = size === 'sm' ? 'p-2.5 rounded-lg text-sm' : 'p-3 rounded-xl text-sm';
  const base = `bg-slate-50 border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 ${ring}`;
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <div className="flex gap-2">
        <select
          value={isPlan ? 'plan' : 'usd'}
          onChange={(e) => onBilling(e.target.value)}
          title="USD: se cobra aparte. Plan: está incluido en el plan mensual y no suma a la inversión."
          className={`${base} ${pad} ${isPlan ? 'flex-1' : 'w-28 shrink-0'} text-xs`}
        >
          {BILLING_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        {!isPlan && (
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
            <input
              type="number"
              min="0"
              value={amount ?? ''}
              onChange={(e) => onAmount(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              className={`w-full pl-7 ${base} ${pad} font-mono`}
            />
          </div>
        )}
      </div>
      {isPlan && <p className="text-[9px] font-medium text-slate-400 ml-1">No suma a la inversión de marketing del Portal Cliente.</p>}
    </div>
  );
}

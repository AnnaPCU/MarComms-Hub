// ════════════════════════════════════════════════════════════════════
// BudgetInput — Presupuesto en USD o "Cubierto por un plan"
// ════════════════════════════════════════════════════════════════════
// Algunos pilares no se cobran aparte porque los cubre un plan (ej.
// "Control Union Argentina"). Este campo reemplaza al input de monto en
// webinars, eventos, campañas y el wizard de Programas: un selector con
// "USD" + los planes + "Agregar plan nuevo…", y el monto solo en USD.
// Los planes salen de useBillingPlans() (tabla billing_plans).
//
// Props:
//   amount               — número o '' (monto en USD)
//   billing              — 'usd' | 'plan'
//   planId               — id del plan que lo cubre (si billing = 'plan')
//   onAmount(v)          — cambio del monto (número o '')
//   onBillingChange(p)   — cambio de modo: p = { billing, planId } (una sola escritura)
//   label                — texto del label (default "Presupuesto")
//   accent               — 'blue' | 'orange' | 'amber' | 'violet' (color del foco)
//   size                 — 'md' (default) | 'sm'
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

import { useBillingPlans } from '@/hooks/useBillingPlans';
import {
  NEW_PLAN_VALUE, UNASSIGNED_PLAN_LABEL, billingSelectValue, parseBillingSelect,
} from '@/utils/billing';

const RING = {
  blue: 'focus:ring-blue-400', orange: 'focus:ring-orange-400',
  amber: 'focus:ring-amber-400', violet: 'focus:ring-violet-400',
};

export default function BudgetInput({
  amount, billing = 'usd', planId = null, onAmount, onBillingChange,
  label = 'Presupuesto', accent = 'blue', size = 'md',
}) {
  const { plans, planById, addPlan } = useBillingPlans();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ring = RING[accent] || RING.blue;
  const isPlan = billing === 'plan';
  const pad = size === 'sm' ? 'p-2.5 rounded-lg text-sm' : 'p-3 rounded-xl text-sm';
  const base = `bg-slate-50 border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 ${ring}`;
  const value = billingSelectValue(billing, planId);
  const planMissing = isPlan && (!planId || !planById.has(String(planId)));

  const handleSelect = (v) => {
    if (v === NEW_PLAN_VALUE) { setAdding(true); setNewName(''); setError(''); return; }
    onBillingChange(parseBillingSelect(v));
  };

  const saveNewPlan = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const plan = await addPlan(newName);
      if (plan) onBillingChange({ billing: 'plan', planId: plan.id });
      setAdding(false);
    } catch {
      setError('No se pudo guardar el plan. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); saveNewPlan(); }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="Nombre del plan (ej. Control Union Chile)"
            className={`${base} ${pad} flex-1 min-w-0 text-xs`}
          />
          <button
            type="button"
            onClick={saveNewPlan}
            disabled={!newName.trim() || saving}
            title="Guardar plan"
            className="px-3 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            title="Cancelar"
            className="px-3 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => handleSelect(e.target.value)}
            title="USD: se cobra aparte. Plan: lo cubre un plan y no suma a la inversión."
            className={`${base} ${pad} ${isPlan ? 'flex-1 min-w-0' : 'w-28 shrink-0'} text-xs`}
          >
            <option value="usd">USD</option>
            <optgroup label="Cubierto por un plan">
              {plans.map((p) => <option key={p.id} value={`plan:${p.id}`}>{p.name}</option>)}
              {planMissing && <option value={value}>{UNASSIGNED_PLAN_LABEL}</option>}
            </optgroup>
            <option value={NEW_PLAN_VALUE}>+ Agregar plan nuevo…</option>
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
      )}
      {error && <p className="text-[9px] font-bold text-red-500 ml-1">{error}</p>}
      {!adding && isPlan && (
        <p className="text-[9px] font-medium text-slate-400 ml-1">
          {planMissing ? 'Elegí qué plan lo cubre.' : 'Lo cubre el plan: no se cobra aparte ni suma a la inversión.'}
        </p>
      )}
    </div>
  );
}

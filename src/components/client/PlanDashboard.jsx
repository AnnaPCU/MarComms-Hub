// ════════════════════════════════════════════════════════════════════
// PlanDashboard — Portal Cliente, pestaña "Por plan"
// ════════════════════════════════════════════════════════════════════
// Agrupa los pilares del alcance (ya filtrados por mes / pilar / unidad)
// según el plan que los cubre. Al final, los que se cobran aparte en USD.
//
// Props:
//   items         — ítems normalizados del Portal (con billing, planId, fee…)
//   serviceTypes  — { [pillarId]: { label, icon, color, dot } }
//   onSelect(it)  — abre el checklist del ítem
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { CheckCircle2, Clock, DollarSign, Layers } from 'lucide-react';

import { useBillingPlans } from '@/hooks/useBillingPlans';
import { groupItemsByPlan } from '@/utils/billing';

function ItemRow({ item, serviceTypes, onSelect, showFee }) {
  const s = serviceTypes[item.pillar] || serviceTypes.email;
  const Icon = s.icon;
  const done = item.status === 'completed';
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
    >
      <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center border shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-xs text-slate-800 uppercase truncate">{item.name}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{s.label} · {item.businessUnit}{item.date ? ` · ${item.date}` : ''}</p>
      </div>
      {showFee && <span className="font-mono text-xs font-black text-slate-700 shrink-0">${item.fee.toLocaleString()}</span>}
      <div className="flex items-center gap-2 shrink-0 w-28 justify-end">
        {done ? (
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Listo</span>
        ) : (
          <>
            <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className={`h-full ${s.dot}`} style={{ width: `${item.progress}%` }} />
            </div>
            <span className="font-mono text-[11px] font-black text-slate-600 w-9 text-right">{item.progress}%</span>
          </>
        )}
      </div>
    </button>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${tone}`} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-3xl font-black text-slate-800 font-mono">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 font-medium mt-1">{hint}</p>}
    </div>
  );
}

export default function PlanDashboard({ items, serviceTypes, onSelect }) {
  const { plans } = useBillingPlans();
  const { groups, usdItems } = groupItemsByPlan(items, plans);
  const withItems = groups.filter((g) => g.items.length > 0);
  const coveredCount = withItems.reduce((n, g) => n + g.items.length, 0);
  const usdTotal = usdItems.reduce((acc, i) => acc + i.fee, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi icon={Layers} tone="text-teal-500" label="Cubiertos por un plan" value={coveredCount} hint="pilares que no se cobran aparte" />
        <Kpi icon={Layers} tone="text-cyan-500" label="Planes con pilares" value={withItems.length} hint={`de ${plans.length} planes cargados`} />
        <Kpi icon={DollarSign} tone="text-emerald-500" label="Cobrados aparte" value={usdItems.length} hint={`$${usdTotal.toLocaleString()} en USD`} />
      </div>

      {withItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border-2 border-dashed border-slate-200 text-center">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-600 uppercase tracking-tight">Ningún pilar de esta vista está cubierto por un plan</p>
          <p className="text-xs text-slate-400 mt-1">Para asignarlo, elegí el plan en el campo de presupuesto del pilar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {withItems.map((g) => {
            const active = g.items.filter((i) => i.status !== 'completed').length;
            const completed = g.items.length - active;
            const deals = g.items.reduce((n, i) => n + i.deals, 0);
            return (
              <section key={g.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <header className="p-5 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-teal-50">
                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Plan</p>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">{g.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-white text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black border border-slate-200 flex items-center gap-1"><Layers className="w-3 h-3" /> {g.items.length} pilares</span>
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-amber-100 flex items-center gap-1"><Clock className="w-3 h-3" /> {active} activos</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-emerald-100 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {completed} completados</span>
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-blue-100">{deals} deals</span>
                  </div>
                </header>
                <div className="p-2">
                  {g.items.map((item) => <ItemRow key={item.id} item={item} serviceTypes={serviceTypes} onSelect={onSelect} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {usdItems.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <header className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sin plan</p>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Cobrados aparte (USD)</h3>
            </div>
            <span className="font-mono text-sm font-black text-emerald-600">${usdTotal.toLocaleString()}</span>
          </header>
          <div className="p-2">
            {usdItems.map((item) => <ItemRow key={item.id} item={item} serviceTypes={serviceTypes} onSelect={onSelect} showFee />)}
          </div>
        </section>
      )}
    </div>
  );
}

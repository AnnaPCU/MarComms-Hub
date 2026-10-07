// ════════════════════════════════════════════════════════════════════
// OwnerLoadPanel — Tareas por responsable, sumando todos los planes
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Users } from 'lucide-react';
import { ownerLoad } from '@/utils/marketingPlans';
import { SectionTitle } from './PlanBits';

export default function OwnerLoadPanel({ plans }) {
  const rows = ownerLoad(plans);
  const max = Math.max(1, ...rows.map((r) => r.open + r.completed));
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <SectionTitle><Users className="w-3.5 h-3.5" /> Carga por responsable</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">Sin tareas cargadas.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.owner}>
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span className={r.owner === 'Sin responsable' ? 'text-slate-400 italic' : 'text-slate-700'}>{r.owner}</span>
                <span className="font-mono text-slate-500">
                  <span className="text-amber-600">{r.open}</span> abiertas · <span className="text-emerald-600">{r.completed}</span> listas
                  {r.blocked > 0 && <span className="text-red-600"> · {r.blocked} bloq.</span>}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-100" title={r.plans.join(', ')}>
                <div className="bg-emerald-500" style={{ width: `${(r.completed / max) * 100}%` }} />
                <div className="bg-amber-400" style={{ width: `${(r.open / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

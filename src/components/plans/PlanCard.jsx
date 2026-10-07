// ════════════════════════════════════════════════════════════════════
// PlanCard — Tarjeta de un plan en la vista general
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, CalendarClock, Clock, User } from 'lucide-react';

import { formatDate } from '@/utils/date';
import { planStats, nextMeetingOf, overdueTasks } from '@/utils/marketingPlans';
import { ProgressBar, StatusStack, pctLabel } from './PlanBits';

export default function PlanCard({ plan, onOpen }) {
  const s = planStats(plan);
  const next = nextMeetingOf(plan);
  const overdue = overdueTasks(plan).length;
  const mismatch = plan.sheetStats && plan.sheetStats.total !== null && plan.sheetStats.total !== s.total;
  return (
    <button
      type="button"
      onClick={() => onOpen(plan)}
      className="text-left bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-300 transition-all group flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {plan.brand && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">{plan.brand}</span>}
            {plan.country && <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">{plan.country}</span>}
          </div>
          <h3 className="font-black text-lg text-slate-900 uppercase leading-tight group-hover:text-blue-600 transition-colors">{plan.name}</h3>
          <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1">
            <User className="w-3 h-3" /> {plan.owner || 'Sin owner'}{plan.period ? ` · ${plan.period}` : ''}
          </p>
        </div>
        <p className="text-3xl font-black font-mono text-blue-600 shrink-0">{pctLabel(s.pct)}</p>
      </div>

      <div className="space-y-2">
        <ProgressBar pct={s.pct} />
        <StatusStack byStatus={s.byStatus} total={s.total} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Tareas', s.total, 'text-slate-800'], ['Completadas', s.completed, 'text-emerald-600'], ['Abiertas', s.open, 'text-amber-600']].map(([l, v, c]) => (
          <div key={l} className="bg-slate-50 rounded-xl py-2">
            <p className={`font-mono font-black text-lg ${c}`}>{v}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{l}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-wider">
        <span className={`px-2 py-1 rounded-lg flex items-center gap-1 ${next ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
          <CalendarClock className="w-3 h-3" /> {next ? `Reunión ${formatDate(next)}` : 'Reunión sin agendar'}
        </span>
        {overdue > 0 && (
          <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {overdue} vencida{overdue === 1 ? '' : 's'}</span>
        )}
        {mismatch && (
          <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 flex items-center gap-1" title={`El Excel calcula ${plan.sheetStats.total} tareas; el Hub cuenta ${s.total}.`}>
            <AlertTriangle className="w-3 h-3" /> Revisar Excel
          </span>
        )}
      </div>
    </button>
  );
}

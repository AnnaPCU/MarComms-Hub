// ════════════════════════════════════════════════════════════════════
// PlanCard — Tarjeta de un plan en la vista general de Planes
// ════════════════════════════════════════════════════════════════════
// Props: plan, tasks (las del plan), pillarsCount, todayIso, onOpen(plan)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, ChevronRight, Layers } from 'lucide-react';
import { SHOW_TASK_DEADLINE } from '@/constants/planTasks';
import { taskStats, isTaskOverdue } from '@/utils/planTasks';
import { ProgressBar, StatusStack, pctLabel } from './PlanBits';

export default function PlanCard({ plan, tasks, pillarsCount, todayIso, onOpen }) {
  const s = taskStats(tasks);
  const overdue = SHOW_TASK_DEADLINE ? tasks.filter((t) => isTaskOverdue(t, todayIso)).length : 0;
  return (
    <button
      type="button"
      onClick={() => onOpen(plan)}
      className="text-left bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-lg transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight leading-tight">{plan.name}</h3>
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-black font-mono text-emerald-700">{pctLabel(s.pct)}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">avance</p>
        </div>
        <div className="text-right text-[10px] font-bold text-slate-500 leading-relaxed">
          <p><span className="font-mono font-black text-slate-800">{s.completed}</span> completadas</p>
          <p><span className="font-mono font-black text-slate-800">{s.open}</span> abiertas</p>
          {s.cancelled > 0 && <p><span className="font-mono font-black text-slate-800">{s.cancelled}</span> {s.cancelled === 1 ? 'cancelada' : 'canceladas'}</p>}
        </div>
      </div>

      <ProgressBar pct={s.pct} />
      <StatusStack byStatus={s.byStatus} total={s.total} />

      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black border border-slate-200">{s.total} {s.total === 1 ? 'tarea' : 'tareas'}</span>
        <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black border border-slate-200 flex items-center gap-1"><Layers className="w-3 h-3" /> {pillarsCount} {pillarsCount === 1 ? 'pilar' : 'pilares'}</span>
        {overdue > 0 && <span className="bg-red-50 text-red-700 px-2 py-1 rounded-lg text-[10px] font-black border border-red-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {overdue} {overdue === 1 ? 'vencida' : 'vencidas'}</span>}
      </div>
    </button>
  );
}

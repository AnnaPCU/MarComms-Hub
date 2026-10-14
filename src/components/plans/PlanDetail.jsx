// ════════════════════════════════════════════════════════════════════
// PlanDetail — Un plan: avance, tareas y pilares que cubre
// ════════════════════════════════════════════════════════════════════
// Las tareas replican la tabla "3) TAREAS" del Excel (PlanTasksBoard).
// Los pilares cubiertos son lo que antes era la pestaña "Por plan" del
// Portal Cliente: webinars / campañas con presupuesto "Lo cubre un plan".
//
// Props:
//   plan, tasks (las del plan), pillarItems (de planPillarItems), mode,
//   todayIso, teamNames, currentUser, createTask / updateTask / removeTask,
//   onOpenPillar(item) (solo vista interna), onBack
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowLeft, ClipboardList, Layers } from 'lucide-react';
import { taskStats, isTaskOverdue, planBrand } from '@/utils/planTasks';
import ProgramPillarsList from '@/components/programs/ProgramPillarsList';
import { Kpi, ProgressBar, SectionTitle, StatusStack, pctLabel } from './PlanBits';
import PlanTasksBoard from './PlanTasksBoard';

export default function PlanDetail({ plan, tasks, pillarItems, mode, todayIso, teamNames, currentUser, createTask, updateTask, removeTask, onOpenPillar, onBack }) {
  const internal = mode === 'internal';
  const s = taskStats(tasks);
  const overdue = internal ? tasks.filter((t) => isTaskOverdue(t, todayIso)).length : 0;
  const brand = planBrand(plan.name);
  const pillarsDone = pillarItems.filter((it) => it.completed).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-700 transition-all shadow-sm" title="Volver a los planes"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0 flex-1">
          {brand && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{brand}</p>}
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">{plan.name}</h2>
        </div>
      </div>

      <div className={`grid grid-cols-2 ${internal ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3`}>
        <Kpi label="Tareas" value={s.total} />
        <Kpi label="Completadas" value={s.completed} accent="text-emerald-600" />
        <Kpi label="Abiertas" value={s.open} accent="text-amber-600" hint={s.cancelled ? `${s.cancelled} canceladas (no cuentan)` : undefined} />
        <Kpi label="% avance" value={pctLabel(s.pct)} accent="text-emerald-700" hint="completadas / (completadas + abiertas)" />
        {internal && <Kpi label="Vencidas" value={overdue} accent={overdue ? 'text-red-600' : 'text-slate-800'} hint="abiertas con deadline pasado" />}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <ProgressBar pct={s.pct} />
        <StatusStack byStatus={s.byStatus} total={s.total} />
      </div>

      <section>
        <SectionTitle><ClipboardList className="w-3.5 h-3.5" /> Tareas</SectionTitle>
        <PlanTasksBoard
          key={plan.id}
          plan={plan}
          tasks={tasks}
          mode={mode}
          todayIso={todayIso}
          teamNames={teamNames}
          currentUser={currentUser}
          createTask={createTask}
          updateTask={updateTask}
          removeTask={removeTask}
        />
      </section>

      <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
        <SectionTitle right={pillarItems.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{pillarsDone} de {pillarItems.length} completados</span>}>
          <Layers className="w-3.5 h-3.5" /> Pilares que cubre el plan
        </SectionTitle>
        <ProgramPillarsList
          items={pillarItems}
          onOpen={internal ? onOpenPillar : undefined}
          emptyText={internal
            ? 'Ningún pilar está cubierto por este plan. Para sumarlo, elegí el plan en el campo de presupuesto del pilar.'
            : 'Este plan todavía no tiene pilares vinculados.'}
        />
      </section>
    </div>
  );
}

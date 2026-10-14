// ════════════════════════════════════════════════════════════════════
// PlanDetail — Un plan: avance, tareas, pilares que cubre y link externo
// ════════════════════════════════════════════════════════════════════
// Dos vistas:
//   - Interna: tabla de tareas editable (PlanTasksBoard) y pilares que
//     cubre el plan (lo que antes era la pestaña "Por plan" del Portal).
//   - Externa: el link que se le pasa al cliente (/?plan=<token>), en un
//     iframe para que se vea exactamente igual. Sin Responsable ni
//     Deadline, solo lectura y con la marca del plan.
//
// Props:
//   plan, tasks (las del plan), pillarItems (de planPillarItems), todayIso,
//   teamNames, currentUser, createTask / updateTask / removeTask,
//   onOpenPillar(item), onRotateToken(planId) (async), onBack
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ClipboardList, Copy, ExternalLink, Eye, Layers, Lock, RefreshCw } from 'lucide-react';
import { SHOW_TASK_DEADLINE } from '@/constants/planTasks';
import { useConfirm } from '@/hooks/useConfirm';
import { taskStats, isTaskOverdue, planBrand } from '@/utils/planTasks';
import ProgramPillarsList from '@/components/programs/ProgramPillarsList';
import { Kpi, ProgressBar, SectionTitle, StatusStack, pctLabel } from './PlanBits';
import PlanTasksBoard from './PlanTasksBoard';

const VIEWS = [
  { id: 'internal', label: 'Vista interna', icon: Lock },
  { id: 'external', label: 'Vista externa', icon: Eye },
];

const publicPlanUrl = (token) => `${window.location.origin}/?plan=${token}`;

function ExternalPreview({ url }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(720);
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === 'plan-preview-height' && e.data.height > 0) setHeight(Math.ceil(e.data.height));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return <iframe ref={ref} src={url} title="Vista externa del plan" className="w-full rounded-3xl border border-slate-200 bg-white" style={{ height }} />;
}

export default function PlanDetail({ plan, tasks, pillarItems, todayIso, teamNames, currentUser, createTask, updateTask, removeTask, onOpenPillar, onRotateToken, onBack }) {
  const confirm = useConfirm();
  const [view, setView] = useState('internal');
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [linkError, setLinkError] = useState('');
  const s = taskStats(tasks);
  const overdue = SHOW_TASK_DEADLINE ? tasks.filter((t) => isTaskOverdue(t, todayIso)).length : 0;
  const brand = planBrand(plan.name);
  const pillarsDone = pillarItems.filter((it) => it.completed).length;
  const url = plan.publicToken ? publicPlanUrl(plan.publicToken) : '';

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_e) {
      setLinkError(`No se pudo copiar solo. Copialo a mano: ${url}`);
    }
  };

  const rotateLink = async () => {
    const ok = await confirm({
      title: '¿Generar un link nuevo?',
      message: 'El link que ya se compartió deja de funcionar. Vas a tener que pasarle el nuevo a quien lo use.',
      confirmText: 'Generar link nuevo', tone: 'warning',
    });
    if (!ok) return;
    setRotating(true); setLinkError('');
    try { await onRotateToken(plan.id); }
    catch (_e) { setLinkError('No se pudo generar el link nuevo. Probá de nuevo.'); }
    finally { setRotating(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-700 transition-all shadow-sm" title="Volver a los planes"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0 flex-1">
          {brand && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{brand}</p>}
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">{plan.name}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm" role="tablist" aria-label="Vista">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const active = view === v.id;
            return (
              <button key={v.id} role="tab" aria-selected={active} onClick={() => setView(v.id)} className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all ${active ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Link externo */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Link externo</span>
        {url ? (
          <>
            <code className="flex-1 min-w-[200px] text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 truncate" title={url}>{url}</code>
            <button onClick={copyLink} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copiado' : 'Copiar link'}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir
            </a>
            <button onClick={rotateLink} disabled={rotating} className="text-slate-400 hover:text-amber-700 px-2 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40" title="El link anterior deja de funcionar">
              <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} /> Generar link nuevo
            </button>
          </>
        ) : (
          <span className="text-[11px] font-bold text-amber-800">El link externo todavía no está activado en la base (falta la migración 0030 en Supabase).</span>
        )}
        {linkError && <span className="w-full text-[11px] font-bold text-red-600">{linkError}</span>}
      </div>

      {view === 'external' ? (
        url ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 px-1">Así lo ve el cliente con el link: sin responsables, sin edición y con la marca del plan. Se actualiza solo.</p>
            <ExternalPreview key={url} url={url} />
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center text-sm text-slate-500">La vista externa se ve acá cuando el link externo esté activado.</div>
        )
      ) : (
        <>
          <div className={`grid grid-cols-2 ${SHOW_TASK_DEADLINE ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3`}>
            <Kpi label="Tareas" value={s.total} />
            <Kpi label="Completadas" value={s.completed} accent="text-emerald-600" />
            <Kpi label="Abiertas" value={s.open} accent="text-amber-600" hint={s.cancelled ? `${s.cancelled} canceladas (no cuentan)` : undefined} />
            <Kpi label="% avance" value={pctLabel(s.pct)} accent="text-emerald-700" hint="del plan: completadas / (completadas + abiertas)" />
            {SHOW_TASK_DEADLINE && <Kpi label="Vencidas" value={overdue} accent={overdue ? 'text-red-600' : 'text-slate-800'} hint="abiertas con deadline pasado" />}
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
              onOpen={onOpenPillar}
              emptyText="Ningún pilar está cubierto por este plan. Para sumarlo, elegí el plan en el campo de presupuesto del pilar."
            />
          </section>
        </>
      )}
    </div>
  );
}

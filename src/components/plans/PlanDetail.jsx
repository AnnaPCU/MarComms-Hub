// ════════════════════════════════════════════════════════════════════
// PlanDetail — Un plan: avance, KPIs, tareas, iniciativas, pilares y link
// ════════════════════════════════════════════════════════════════════
// Dos vistas:
//   - Interna, en el orden del reporte al cliente: avance del plan; tareas
//     (PlanTasksBoard) con los KPIs del mes elegido arriba de la tabla
//     (PlanMonthKpis); iniciativas (PlanInitiatives); pilares que cubre el
//     plan (lo que antes era la pestaña "Por plan" del Portal). KPIs e
//     iniciativas usan los colores de la marca del plan, como el link.
//   - Externa: el link que se le pasa al cliente (/?plan=<token>), en un
//     iframe para que se vea exactamente igual. Sin Responsable ni
//     Deadline, solo lectura y con la marca del plan.
//
// Props:
//   plan, tasks (las del plan), pillarItems (de planPillarItems), todayIso,
//   teamNames, currentUser, dark (modo oscuro del Hub), createTask /
//   updateTask / removeTask, extras ({ kpiRows, initiatives, missing, saveKpis, createInitiative,
//   updateInitiative, removeInitiative } — de usePlanExtras, ya filtrados
//   por plan), onOpenPillar(item), onRotateToken(planId) (async), onBack
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ClipboardList, Copy, ExternalLink, Eye, Layers, Lock, RefreshCw } from 'lucide-react';
import { SHOW_TASK_DEADLINE } from '@/constants/planTasks';
import { brandTheme } from '@/constants/brands';
import { useConfirm } from '@/hooks/useConfirm';
import { taskStats, isTaskOverdue, planBrand } from '@/utils/planTasks';
import { previousMonthKey } from '@/utils/planKpis';
import ProgramPillarsList from '@/components/programs/ProgramPillarsList';
import { ProgressBar, SectionTitle, pctLabel } from './PlanBits';
import PlanTasksBoard from './PlanTasksBoard';
import PlanMonthKpis from './PlanMonthKpis';
import PlanInitiatives from './PlanInitiatives';

const VIEWS = [
  { id: 'internal', label: 'Vista interna', icon: Lock },
  { id: 'external', label: 'Vista externa', icon: Eye },
];

const publicPlanUrl = (token) => `${window.location.origin}/?plan=${token}`;
// «Generar link nuevo» oculto por ahora (pedido oct 2026); poner en true para volver a mostrarlo
const SHOW_ROTATE_LINK = false;

// El link real dentro del Hub; la página le avisa su alto por postMessage
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

export default function PlanDetail({ plan, tasks, pillarItems, todayIso, teamNames, currentUser, dark = false, createTask, updateTask, removeTask, extras, onOpenPillar, onRotateToken, onBack }) {
  const confirm = useConfirm();
  const [view, setView] = useState('internal');
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [linkError, setLinkError] = useState('');
  const s = taskStats(tasks);
  const overdue = SHOW_TASK_DEADLINE ? tasks.filter((t) => isTaskOverdue(t, todayIso)).length : 0;
  const brand = planBrand(plan.name);
  const theme = brandTheme(brand);
  const c = dark ? theme.darkColors : theme.colors;
  const navy = theme.colors.dark;
  const kpisOf = (monthKey) => extras.kpiRows.find((r) => r.monthKey === monthKey)?.kpis || {};
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
            {SHOW_ROTATE_LINK && (
              <button onClick={rotateLink} disabled={rotating} className="text-slate-400 hover:text-amber-700 px-2 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40" title="El link anterior deja de funcionar">
                <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} /> Generar link nuevo
              </button>
            )}
          </>
        ) : (
          <span className="text-[11px] font-bold text-amber-800">El link externo todavía no está activado en la base (falta la migración 0032 en Supabase).</span>
        )}
        {linkError && <span className="w-full text-[11px] font-bold text-red-600">{linkError}</span>}
      </div>

      {view === 'external' ? (
        url ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 px-1">Así lo ve el cliente con el link: abre en el mes actual y se pueden recorrer los meses con acciones. Sin responsables ni edición, con la marca del plan. Se actualiza solo. En tu navegador sigue tu modo claro u oscuro; el cliente lo ve en claro.</p>
            <ExternalPreview key={url} url={url} />
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center text-sm text-slate-500">La vista externa se ve acá cuando el link externo esté activado.</div>
        )
      ) : (
        <>
          {/* Avance del plan (todos los meses), como en el link */}
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avance del plan</p>
                <p className="text-3xl font-black font-mono text-emerald-700 leading-none mt-1">{pctLabel(s.pct)}</p>
              </div>
              <p className="text-[11px] font-bold text-slate-500 pb-0.5">
                <span className="font-mono font-black text-slate-800">{s.completed}</span> completadas · <span className="font-mono font-black text-slate-800">{s.open}</span> abiertas · <span className="font-mono font-black text-slate-800">{s.total}</span> tareas
                {s.cancelled > 0 && ` · ${s.cancelled} ${s.cancelled === 1 ? 'cancelada (no cuenta)' : 'canceladas (no cuentan)'}`}
                {SHOW_TASK_DEADLINE && overdue > 0 && <span className="text-red-600"> · {overdue} vencidas</span>}
              </p>
            </div>
            <ProgressBar pct={s.pct} className="h-2 mt-3" />
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
              aboveTable={(month) => (
                <PlanMonthKpis
                  key={month}
                  plan={plan}
                  monthKey={month}
                  tasks={tasks}
                  stored={kpisOf(month)}
                  prevStored={kpisOf(previousMonthKey(month))}
                  c={c}
                  navy={navy}
                  missing={extras.missing}
                  onSave={(kpis) => extras.saveKpis({ planId: plan.id, monthKey: month, kpis, updatedBy: currentUser?.name || '' })}
                />
              )}
            />
          </section>

          <PlanInitiatives
            plan={plan}
            initiatives={extras.initiatives}
            c={c}
            navy={navy}
            currentUser={currentUser}
            missing={extras.missing}
            createInitiative={extras.createInitiative}
            updateInitiative={extras.updateInitiative}
            removeInitiative={extras.removeInitiative}
          />

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

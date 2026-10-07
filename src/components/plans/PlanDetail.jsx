// ════════════════════════════════════════════════════════════════════
// PlanDetail — Un plan completo: datos, objetivos, seguimiento y tareas
// ════════════════════════════════════════════════════════════════════
// Misma estructura que cada pestaña del Excel, en tres bloques:
//   1) Objetivos del plan  2) Seguimiento mensual  3) Tareas
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, ArrowLeft, ExternalLink, Megaphone } from 'lucide-react';

import { formatDate } from '@/utils/date';
import { planStats, monthlyBreakdown, nextMeetingOf, overdueTasks } from '@/utils/marketingPlans';
import { Kpi, ProgressBar, SectionTitle, pctLabel } from './PlanBits';
import PlanTasks from './PlanTasks';

const fmt = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? formatDate(v) : v);

export default function PlanDetail({ plan, onBack }) {
  const s = planStats(plan);
  const next = nextMeetingOf(plan);
  const overdue = overdueTasks(plan).length;
  const monthly = monthlyBreakdown(plan);
  const mismatch = plan.sheetStats && plan.sheetStats.total !== null && plan.sheetStats.total !== s.total;
  const meta = [
    ['Owner', plan.owner], ['CC en mails', plan.cc], ['Reunión de seguimiento', fmt(plan.followUpMeeting)],
    ['Próxima reunión', next ? formatDate(next) : 'Sin agendar'], ['Mes de inicio', plan.startMonth], ['Período', plan.period],
  ];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Todos los planes
      </button>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              {plan.brand && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">{plan.brand}</span>}
              {plan.country && <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">{plan.country}</span>}
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{plan.name}</h2>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% avance</span>
              <span className="text-2xl font-black font-mono text-blue-600">{pctLabel(s.pct)}</span>
            </div>
            <ProgressBar pct={s.pct} className="h-2.5" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">
          {meta.map(([l, v]) => (
            <div key={l} className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{l}</p>
              <p className={`text-xs font-bold mt-0.5 ${v ? 'text-slate-700' : 'text-slate-300'}`}>{v || '—'}</p>
            </div>
          ))}
        </div>
        {plan.note && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-2">
            <Megaphone className="w-4 h-4 shrink-0" /> {plan.note}
          </div>
        )}
        {mismatch && (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-[11px] font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            En el Excel esta pestaña calcula {plan.sheetStats.total} tareas, pero hay {s.total} cargadas. El Hub cuenta todas: revisá los rangos de las fórmulas de la pestaña.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Tareas" value={s.total} />
        <Kpi label="Completadas" value={s.completed} accent="text-emerald-600" />
        <Kpi label="Abiertas" value={s.open} accent="text-amber-600" hint={s.cancelled ? `${s.cancelled} canceladas no cuentan` : undefined} />
        <Kpi label="Vencidas" value={overdue} accent={overdue ? 'text-red-600' : 'text-slate-300'} hint="abiertas con fecha pasada" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <SectionTitle n="1">Objetivos del plan</SectionTitle>
          {plan.objectives.length === 0 ? (
            <p className="text-xs text-slate-400">Sin objetivos cargados en el Excel.</p>
          ) : (
            <div className="space-y-2">
              {plan.objectives.map((o, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-black text-slate-800">{o.objective}</p>
                  <div className="flex gap-4 mt-1 text-[11px]">
                    <span className="text-slate-500">Meta: <b className="font-mono text-slate-700">{o.goal || '—'}</b></span>
                    <span className="text-slate-500">Actual: <b className="font-mono text-slate-700">{o.current || '—'}</b></span>
                  </div>
                  {o.comment && <p className="text-[11px] text-slate-500 mt-1">{o.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm lg:col-span-2">
          <SectionTitle n="2">Seguimiento mensual</SectionTitle>
          {monthly.length === 0 ? (
            <p className="text-xs text-slate-400">Sin meses cargados (falta el «Mes de inicio» en el Excel).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-100">
                    <th className="py-2 pr-2">Mes</th><th className="py-2 px-2">Reunión</th><th className="py-2 px-2">Foco del mes</th>
                    <th className="py-2 px-2 text-right">Tareas</th><th className="py-2 px-2 w-28">Avance</th><th className="py-2 px-2">Resultados / decisiones</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => {
                    const pct = m.completed + m.open === 0 ? 0 : m.completed / (m.completed + m.open);
                    return (
                      <tr key={m.month} className="border-b border-slate-50 align-top">
                        <td className="py-2.5 pr-2 font-black text-slate-700">{m.month}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-500 whitespace-nowrap">{m.meetingDate ? fmt(m.meetingDate) : '—'}</td>
                        <td className="py-2.5 px-2 text-slate-600">{m.focus || <span className="text-slate-300">—</span>}</td>
                        <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                          <span className="text-emerald-600 font-black">{m.completed}</span><span className="text-slate-400">/{m.total}</span>
                        </td>
                        <td className="py-2.5 px-2">{m.total ? <ProgressBar pct={pct} className="h-1.5" /> : <span className="text-slate-300">—</span>}</td>
                        <td className="py-2.5 px-2 text-slate-600">
                          {[m.results, m.decisions].filter(Boolean).join(' · ') || <span className="text-slate-300">—</span>}
                          {m.link && (/^https?:\/\//i.test(m.link)
                            ? <a href={m.link} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center text-sky-600"><ExternalLink className="w-3 h-3" /></a>
                            : <span className="ml-1 text-slate-400">({m.link})</span>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PlanTasks tasks={plan.tasks} />
    </div>
  );
}

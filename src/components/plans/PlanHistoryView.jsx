// ════════════════════════════════════════════════════════════════════
// PlanHistoryView — «Histórico» del link externo de un plan
// ════════════════════════════════════════════════════════════════════
// Resumen de todos los meses: por cada KPI con datos, el total del
// período, la variación entre el primer y el último mes con datos y una
// barra por mes (la del último mes, más marcada). Los meses sin valor se
// ven con «—». Textos y acciones no se comparan: solo lo que se mide.
// Lógica en src/utils/planHistory.js.
//
// Props: tasks, kpiHistory ({ 'YYYY-MM': kpis }), todayIso, c, navy
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { countText, formatKpiChange, formatKpiNumber } from '@/utils/planKpis';
import { historyMonths, kpiTimeline, shortMonthLabel } from '@/utils/planHistory';
import { isTaskDone, monthLabel } from '@/utils/planTasks';
import { GroupLabel, ReportSectionTitle } from './PlanReportBlocks';

const compact = (n) => (n >= 10000 ? n.toLocaleString('es-AR', { notation: 'compact', maximumFractionDigits: 1 }) : formatKpiNumber(n));

function Change({ change, c }) {
  const n = Math.round(change.pct * 100);
  const Icon = n > 0 ? ArrowUpRight : n < 0 ? ArrowDownRight : ArrowRight;
  const color = n > 0 ? '#16a34a' : n < 0 ? '#dc2626' : c.label;
  return (
    <span className="shrink-0 text-right">
      <span className="inline-flex items-center gap-0.5 text-[12px] font-bold" style={{ color }}><Icon className="w-3.5 h-3.5" />{formatKpiChange(change.pct)}</span>
      <span className="block text-[10px]" style={{ color: c.label }}>{shortMonthLabel(change.from)} → {shortMonthLabel(change.to)}</span>
    </span>
  );
}

function Bars({ k, c, crossYear }) {
  const max = Math.max(...k.points.map((p) => p.value || 0));
  return (
    <div className="mt-3 flex items-end gap-1 h-[96px]" role="img" aria-label={`${k.label} por mes`}>
      {k.points.map((p) => {
        const has = p.value !== null;
        const h = has && max > 0 ? Math.max(4, (p.value / max) * 60) : 0;
        const isLast = p.monthKey === k.last.monthKey;
        return (
          <div key={p.monthKey} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full" title={`${monthLabel(p.monthKey)}: ${has ? `${formatKpiNumber(p.value)}${p.currency ? ` ${p.currency}` : ''}` : 'sin datos'}`}>
            <span className="text-[9px] font-bold mb-0.5 max-w-full truncate" style={{ color: has ? c.dark : c.label }}>{has ? compact(p.value) : '—'}</span>
            <div className="w-full max-w-[24px] rounded-t" style={{ height: h, background: c.primary, opacity: isLast ? 1 : 0.5 }} />
            <span className="text-[9px] mt-1 whitespace-nowrap" style={{ color: c.label }}>{shortMonthLabel(p.monthKey, crossYear)}</span>
          </div>
        );
      })}
    </div>
  );
}

function HistoryCard({ k, c, crossYear }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
      {k.kicker && <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: c.primary }}>{k.kicker}</span>}
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.label }}>{k.label}</span>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl font-bold leading-none" style={{ color: c.dark }}>{k.total !== null ? formatKpiNumber(k.total) : '—'}</span>
            {k.currency && <span className="text-xs font-bold" style={{ color: c.label }}>{k.currency}</span>}
          </span>
          <span className="block text-[10px] mt-1" style={{ color: c.label }}>
            {k.mixed ? 'Monedas distintas: sin total' : `Total · ${k.monthsWithData} ${k.monthsWithData === 1 ? 'mes' : 'meses'}`}
            {k.countTotal !== null ? ` · ${countText(k, k.countTotal)}` : ''}
          </span>
        </div>
        {k.change && <Change change={k.change} c={c} />}
      </div>
      <Bars k={k} c={c} crossYear={crossYear} />
    </div>
  );
}

export default function PlanHistoryView({ tasks = [], kpiHistory = {}, todayIso, c }) {
  const months = historyMonths(tasks, kpiHistory, todayIso);
  const groups = kpiTimeline(tasks, kpiHistory, months);
  const crossYear = months.length > 0 && months[0].slice(0, 4) !== months[months.length - 1].slice(0, 4);
  const doneInPeriod = tasks.filter((t) => months.includes(t.monthKey) && isTaskDone(t)).length;
  const period = months.length ? `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])}` : '';

  return (
    <section className="px-6 sm:px-8 pt-6 pb-2">
      <ReportSectionTitle title={`Histórico del plan${period ? ` · ${period}` : ''}`} aside="Evolución mes a mes" c={c} />
      {!groups.length ? (
        <p className="py-8 text-center text-sm">Todavía no hay indicadores cargados para armar el histórico.</p>
      ) : (
        <>
          <p className="text-[12px] mb-4">
            {months.length} {months.length === 1 ? 'mes' : 'meses'} · {doneInPeriod} {doneInPeriod === 1 ? 'acción completada' : 'acciones completadas'} en el período. El histórico se completa a medida que se cargan los indicadores de cada mes.
          </p>
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.id}>
                <GroupLabel label={g.label} c={c} hollow={g.id === 'performance'} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {g.items.map((k) => <HistoryCard key={k.id} k={k} c={c} crossYear={crossYear} />)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

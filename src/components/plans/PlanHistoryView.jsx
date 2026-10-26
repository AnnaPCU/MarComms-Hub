// ════════════════════════════════════════════════════════════════════
// PlanHistoryView — «Histórico» del link externo de un plan
// ════════════════════════════════════════════════════════════════════
// Mini dashboard de todos los meses del plan (del primero al último con
// tareas o KPIs): una tarjeta por cada KPI con datos, con
//   · el total del período,
//   · el progreso: promedio de las variaciones mes a mes, en una barra de
//     crecimiento (verde, a la derecha) o decrecimiento (roja, a la
//     izquierda),
//   · el gráfico de barras por mes con la variación de cada mes contra el
//     anterior (PlanHistoryChart).
// Textos y acciones no se comparan: solo lo que se mide.
// Lógica en src/utils/planHistory.js.
//
// Props: tasks, kpiHistory ({ 'YYYY-MM': kpis }), todayIso, c
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { countText, formatKpiChange, formatKpiNumber } from '@/utils/planKpis';
import { historyMonths, kpiTimeline } from '@/utils/planHistory';
import { isTaskDone, monthLabel } from '@/utils/planTasks';
import { GroupLabel, ReportSectionTitle } from './PlanReportBlocks';
import PlanHistoryChart, { DOWN, UP } from './PlanHistoryChart';

// Progreso del período: barra centrada en 0 (crece a la derecha, cae a la
// izquierda; llena a partir de ±100 %)
function ProgressBar({ avg, c }) {
  if (!avg) {
    return <p className="mt-3 text-[11px] italic" style={{ color: c.label }}>Para ver el progreso hacen falta dos meses seguidos con datos.</p>;
  }
  const n = Math.round(avg.pct * 100);
  const color = n > 0 ? UP : n < 0 ? DOWN : c.label;
  const width = `${Math.min(1, Math.abs(avg.pct)) * 50}%`;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px]" style={{ color: c.label }}>
          Progreso · promedio mes a mes{avg.n > 1 ? ` (${avg.n} comparaciones)` : ''}
        </span>
        <span className="text-sm font-bold whitespace-nowrap" style={{ color }}>{n > 0 ? '▲' : n < 0 ? '▼' : '='} {formatKpiChange(avg.pct)}</span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-slate-100">
        {n !== 0 && <span className="absolute top-0 h-2 rounded-full" style={{ background: color, width, ...(n > 0 ? { left: '50%' } : { right: '50%' }) }} />}
        <span className="absolute -top-0.5 left-1/2 w-px h-3" style={{ background: c.grey }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] uppercase tracking-widest" style={{ color: c.label }}>
        <span>Decrecimiento</span><span>Crecimiento</span>
      </div>
    </div>
  );
}

function HistoryCard({ k, c, crossYear }) {
  const total = k.total !== null ? `${k.currency ? `${k.currency} ` : ''}${formatKpiNumber(k.total)}` : null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
      <p className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-widest" style={{ color: c.dark }}>
        <span className="w-[3px] h-4 rounded-full shrink-0" style={{ background: c.primary }} />
        {k.kicker ? `${k.kicker} · ` : ''}{k.label} por mes
      </p>
      <p className="mt-1 text-[12px]" style={{ color: c.label }}>
        {total ? <>Total del período: <b style={{ color: c.dark }}>{total}</b></> : 'Monedas distintas: sin total'}
        {k.countTotal !== null ? ` · ${countText(k, k.countTotal)}` : ''}
        {` · ${k.monthsWithData} ${k.monthsWithData === 1 ? 'mes' : 'meses'} con datos`}
      </p>
      <ProgressBar avg={k.avgChange} c={c} />
      <PlanHistoryChart k={k} c={c} crossYear={crossYear} />
    </div>
  );
}

export default function PlanHistoryView({ tasks = [], kpiHistory = {}, todayIso, c }) {
  const months = historyMonths(tasks, kpiHistory, todayIso);
  const groups = kpiTimeline(tasks, kpiHistory, months);
  const crossYear = months.length > 0 && months[0].slice(0, 4) !== months[months.length - 1].slice(0, 4);
  const doneInPeriod = tasks.filter((t) => months.includes(t.monthKey) && isTaskDone(t)).length;
  const period = months.length ? `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])}` : '';
  // Con muchos meses, una tarjeta por fila para que las barras no se aprieten
  const gridCls = months.length > 8 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2';

  return (
    <section className="px-6 sm:px-8 pt-6 pb-2">
      <ReportSectionTitle title={`Histórico del plan${period ? ` · ${period}` : ''}`} aside="Evolución mes a mes" c={c} />
      {!groups.length ? (
        <p className="py-8 text-center text-sm">Todavía no hay indicadores cargados para armar el histórico.</p>
      ) : (
        <>
          <p className="text-[12px] mb-4">
            {months.length} {months.length === 1 ? 'mes' : 'meses'} · {doneInPeriod} {doneInPeriod === 1 ? 'acción completada' : 'acciones completadas'} en el período. Cada mes se compara con el anterior; el progreso es el promedio de esas variaciones. El histórico se completa a medida que se cargan los indicadores de cada mes.
          </p>
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.id}>
                <GroupLabel label={g.label} c={c} hollow={g.id === 'performance'} />
                <div className={`grid ${gridCls} gap-4`}>
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

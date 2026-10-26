// ════════════════════════════════════════════════════════════════════
// PlanHistoryChart — Barras por mes de un KPI (Histórico del link)
// ════════════════════════════════════════════════════════════════════
// Como los gráficos de los reportes: eje Y con tramos redondos y líneas
// guía, barras anchas del color de la marca (casi sin espacio entre un mes
// y otro), el mes abajo y debajo la variación contra el mes anterior
// (▲ verde / ▼ rojo). El valor de cada mes va arriba de su barra.
//
// Props: k (KPI de kpiTimeline), c (colores de la marca), crossYear
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { formatKpiChange, formatKpiNumber } from '@/utils/planKpis';
import { niceScale, shortMonthLabel } from '@/utils/planHistory';
import { monthLabel } from '@/utils/planTasks';

export const UP = '#16a34a';
export const DOWN = '#dc2626';

const PLOT_H = 168;
const AXIS_W = 'w-12';

const short = (n) => (n >= 100000 ? n.toLocaleString('es-AR', { notation: 'compact', maximumFractionDigits: 1 }) : formatKpiNumber(n));
const pctOf = (v, max) => `${Math.min(100, (v / max) * 100)}%`;

// "▲ +50 %" chico, debajo del mes (vacío si no hay con qué comparar)
function MonthChange({ change, c }) {
  if (!change) return <span className="block h-4" />;
  const n = Math.round(change.pct * 100);
  const color = n > 0 ? UP : n < 0 ? DOWN : c.label;
  return (
    <span className="block h-4 text-[10px] font-bold whitespace-nowrap" style={{ color }}>
      {n > 0 ? '▲' : n < 0 ? '▼' : '='} {formatKpiChange(change.pct)}
    </span>
  );
}

export default function PlanHistoryChart({ k, c, crossYear }) {
  const max = Math.max(0, ...k.points.map((p) => p.value || 0));
  const scale = niceScale(max, { integer: !k.money });
  const axis = c.grey;

  return (
    <div className="mt-6">
      <div className="flex">
        {/* Eje Y */}
        <div className={`relative ${AXIS_W} shrink-0`} style={{ height: PLOT_H }}>
          {scale.ticks.map((t) => (
            <span key={t} className="absolute right-0 flex items-center gap-1 translate-y-1/2" style={{ bottom: pctOf(t, scale.max) }}>
              <span className="text-[10px] leading-none" style={{ color: c.label }}>{short(t)}</span>
              <span className="w-1.5 h-px" style={{ background: axis }} />
            </span>
          ))}
        </div>
        {/* Área del gráfico */}
        <div className="relative flex-1 min-w-0" style={{ height: PLOT_H, borderLeft: `1px solid ${axis}`, borderBottom: `1px solid ${axis}` }}>
          {scale.ticks.slice(1).map((t) => (
            <span key={t} className="absolute left-0 right-0 h-px bg-slate-100" style={{ bottom: pctOf(t, scale.max) }} />
          ))}
          <div className="absolute inset-0 flex items-end">
            {k.points.map((p) => {
              const has = p.value !== null;
              const tip = `${monthLabel(p.monthKey)}: ${has ? `${formatKpiNumber(p.value)}${p.currency ? ` ${p.currency}` : ''}` : 'sin datos'}`;
              return (
                <div key={p.monthKey} className="flex-1 min-w-0 h-full flex items-end justify-center" title={tip}>
                  {has ? (
                    <div className="relative w-[80%] rounded-t-[3px]" style={{ height: pctOf(p.value, scale.max), background: c.primary }}>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] font-bold whitespace-nowrap" style={{ color: c.dark }}>{short(p.value)}</span>
                    </div>
                  ) : (
                    <span className="mb-1 text-[10px]" style={{ color: c.label }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Eje X: mes y variación contra el anterior */}
      <div className="flex">
        <div className={`${AXIS_W} shrink-0`} />
        <div className="flex-1 min-w-0 flex">
          {k.points.map((p) => (
            <div key={p.monthKey} className="flex-1 min-w-0 flex flex-col items-center text-center">
              <span className="w-px h-1.5" style={{ background: axis }} />
              <span className="text-[11px] mt-0.5 whitespace-nowrap" style={{ color: c.label }}>{shortMonthLabel(p.monthKey, crossYear)}</span>
              <MonthChange change={p.change} c={c} />
            </div>
          ))}
        </div>
      </div>
      {/* Leyenda */}
      <p className="mt-2 flex items-center justify-center gap-4 flex-wrap text-[11px]" style={{ color: c.primary }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2.5" style={{ background: c.primary }} />{k.label}{k.currency ? ` (${k.currency})` : ''}</span>
        <span className="inline-flex items-center gap-1" style={{ color: c.label }}><span style={{ color: UP }}>▲</span><span style={{ color: DOWN }}>▼</span> vs mes anterior</span>
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MonthChart — «Mes a mes»: barras apiladas por mes
// ════════════════════════════════════════════════════════════════════
// Una barra por mes con Fijo y facturas abajo y, apiladas, las seis
// categorías de Variables (los mismos colores que los chips de la lista
// de cargos; paleta validada para daltonismo). Eje Y con tramos redondos,
// el total arriba de cada barra, leyenda y, al pasar el mouse, cada tramo
// con su valor. Cliquear una barra (o un tramo) abre el porcentaje y el
// monto de cada categoría de ese mes (MonthSplitModal).
//
// Props: months (['YYYY-MM']), summaries ({ [month]: monthSummary }),
//   selected (mes del modal abierto | null), onSelect(month, segmentId
//   | null)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { FIJO_CHART_COLOR, VARIABLE_CATEGORIES } from '@/constants/invoicing';
import { MONTHS_ES } from '@/constants/planTasks';
import { formatAmount } from '@/utils/invoicing';
import { niceScale } from '@/utils/planHistory';
import { monthLabel } from '@/utils/planTasks';

const SERIES = [{ id: 'fijo', label: 'Fijo y facturas', color: FIJO_CHART_COLOR }, ...VARIABLE_CATEGORIES.map((c) => ({ id: c.id, label: c.short, color: c.color }))];
const PLOT_H = 220;
const short = (key) => `${MONTHS_ES[Number(key.slice(5, 7)) - 1].slice(0, 3)} ${key.slice(2, 4)}`;

const valueOf = (s, id) => (id === 'fijo' ? s?.fijo ?? 0 : s?.variablesByCategory?.[id] ?? 0);

export default function MonthChart({ months = [], summaries = {}, selected = null, onSelect }) {
  if (!months.length) return null;
  const totals = months.map((m) => summaries[m]?.fijoMasVariables ?? 0);
  const scale = niceScale(Math.max(0, ...totals), { integer: true });
  const pct = (v) => `${Math.min(100, (v / (scale.max || 1)) * 100)}%`;
  // Si se cliqueó un tramo, va con su id (esa fila queda resaltada en el modal)
  const pick = (m, e) => onSelect?.(m, e.target.closest('[data-segment]')?.dataset.segment || null);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Fijo + Variables por mes <span className="normal-case tracking-normal font-bold text-slate-400">· apilado por categoría · cliqueá una barra para ver el % y el monto de cada categoría</span></p>
      <div className="flex">
        <div className="relative w-14 shrink-0" style={{ height: PLOT_H }}>
          {scale.ticks.map((t) => (
            <span key={t} className="absolute right-0 flex items-center gap-1 translate-y-1/2" style={{ bottom: pct(t) }}>
              <span className="text-[10px] font-mono text-slate-400 leading-none">{formatAmount(t)}</span>
              <span className="w-1.5 h-px bg-slate-300" />
            </span>
          ))}
        </div>
        <div className="relative flex-1 min-w-0 border-l border-b border-slate-300" style={{ height: PLOT_H }}>
          {scale.ticks.slice(1).map((t) => <span key={t} className="absolute left-0 right-0 h-px bg-slate-100" style={{ bottom: pct(t) }} />)}
          <div className="absolute inset-0 flex items-end">
            {months.map((m, i) => {
              const s = summaries[m];
              const isSel = selected === m;
              return (
                <button key={m} type="button" onClick={(e) => pick(m, e)} aria-pressed={isSel} className={`flex-1 min-w-0 h-full flex items-end justify-center group transition-opacity ${selected && !isSel ? 'opacity-50 hover:opacity-90' : ''}`} title={`${monthLabel(m)}: ${formatAmount(totals[i])} · ver las categorías`} aria-label={`${monthLabel(m)}: ${formatAmount(totals[i])}`}>
                  <div className={`relative w-[64%] max-w-[72px] flex flex-col-reverse rounded-[4px] ${isSel ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`} style={{ height: pct(totals[i]) }}>
                    {SERIES.map((sr) => {
                      const v = valueOf(s, sr.id);
                      if (!v || !totals[i]) return null;
                      return <div key={sr.id} data-segment={sr.id} className="w-full rounded-[3px] group-hover:brightness-110 hover:brightness-125" style={{ height: `${(v / totals[i]) * 100}%`, background: sr.color, boxShadow: '0 0 0 2px #fff', marginTop: 2 }} title={`${monthLabel(m)} · ${sr.label}: ${formatAmount(v)} · ver las categorías`} />;
                    })}
                    <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 text-[10px] font-black font-mono whitespace-nowrap ${isSel ? 'text-emerald-700' : 'text-slate-700'}`}>{formatAmount(totals[i])}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="w-14 shrink-0" />
        <div className="flex-1 min-w-0 flex">
          {months.map((m) => <span key={m} className={`flex-1 min-w-0 text-center text-[11px] font-bold mt-1.5 ${selected === m ? 'text-emerald-700' : 'text-slate-500'}`}>{short(m)}</span>)}
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5" aria-label="Referencias">
        {SERIES.map((sr) => (
          <li key={sr.id} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <span className="w-3 h-3 rounded-[3px]" style={{ background: sr.color }} />{sr.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

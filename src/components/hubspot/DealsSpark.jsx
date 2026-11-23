// ════════════════════════════════════════════════════════════════════
// DealsSpark — Deals nuevos de una entidad (ficha del Weekly check)
// ════════════════════════════════════════════════════════════════════
// Nov 2026: solo en la ficha de la entidad (la lista no muestra deals).
//
//   <DealsWeekChart series dark />  — barras de las últimas 8 semanas con
//     los deals CRM UI (cargados a mano), el número arriba de cada barra y
//     la fecha (lunes, dd/mm) abajo, más «+N otros» debajo (integraciones,
//     workflows…: van aparte porque una tanda de 200 por integración
//     aplastaría las barras). La semana en curso con borde y «Esta».
//     Al pasar el mouse (o tocar) una semana, se resalta y aparece un
//     cartel con el detalle: fechas, CRM UI, otros y total.
//   <DealsPanel counts code dark />  — CRM UI de esta semana como número
//     principal (lo que cargó la gente a mano), otros y total al costado,
//     la comparación con la semana anterior y el gráfico. Si la entidad
//     tiene varias opciones en «PCU Entity» (ej. 538 Certifications /
//     Inspections / Warrants, o 381 Inspections / Solutions), arriba hay
//     chips para ver «Todas» sumadas o una sola, y debajo del número el
//     detalle de esta semana por opción (migration 0074, by_option).
//
// Colores validados con el skill dataviz (DEAL_COLORS), claro y oscuro.
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { DEAL_COLORS, entityDeals, optionShortLabel } from '@/utils/crmWeeklyDeals';

const PLOT_H = 120;     // alto del área de barras (px)

const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// Domingo de la semana (lunes + 6 días)
const sunday = (iso) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); };

// Cartel con el detalle de una semana (arriba de la columna; en las de los
// bordes se alinea para no salirse)
function WeekTip({ s, align, options = [] }) {
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <div role="tooltip" className={`hub-popover absolute bottom-full mb-2 ${pos} z-20 w-52 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 pointer-events-none`}>
      <p className="text-[10px] font-black text-slate-700">Week of {dm(s.week)} to {dm(sunday(s.week))}</p>
      {s.missing ? (
        <p className="text-[10px] font-bold text-slate-400 mt-1">No data for this week.</p>
      ) : (
        <div className="mt-1 space-y-0.5 text-[10px] font-bold text-slate-500">
          <p className="flex justify-between"><span>CRM UI (manual)</span><span className="font-mono font-black text-slate-800">{s.ui}</span></p>
          <p className="flex justify-between"><span>Other</span><span className="font-mono font-black text-slate-800">{s.other}</span></p>
          <p className="flex justify-between border-t border-slate-100 pt-0.5"><span>Total</span><span className="font-mono font-black text-slate-800">{s.total}</span></p>
          {options.length > 1 && (
            <div className="border-t border-slate-100 pt-1 mt-1 space-y-0.5">
              {options.map((o) => {
                const v = s.byOption?.[o] || { ui: 0, other: 0 };
                return <p key={o} className="flex justify-between gap-2"><span className="truncate">{optionShortLabel(o)}</span><span className="font-mono text-slate-700 whitespace-nowrap">{v.ui} · +{v.other}</span></p>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DealsWeekChart({ series = [], dark = false, options = [] }) {
  const [hover, setHover] = useState(null); // índice de la semana resaltada
  const max = Math.max(1, ...series.map((s) => s.ui));
  const ui = DEAL_COLORS.ui[dark ? 'dark' : 'light'];
  return (
    <div className="w-full">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }} role="img" aria-label={`CRM UI deals per week: ${series.map((s) => `${dm(s.week)} ${s.ui}`).join(', ')}`}>
        {series.map((s, i) => {
          const last = i === series.length - 1;
          const h = s.ui ? Math.max(3, Math.round((s.ui / max) * PLOT_H)) : 0;
          return (
            <div
              key={s.week}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(hover === i ? null : i)}
              className={`relative flex flex-col items-center min-w-0 rounded-lg py-1 cursor-default transition-colors ${hover === i ? 'bg-slate-100' : ''}`}
            >
              {hover === i && <WeekTip s={s} options={options} align={i < 2 ? 'left' : i > series.length - 3 ? 'right' : 'center'} />}
              <div className={`w-full flex flex-col justify-end items-center ${last ? 'outline outline-1 outline-offset-2 outline-slate-300 rounded-[5px]' : ''}`} style={{ height: PLOT_H + 16, maxWidth: 44 }}>
                <span className={`font-mono text-[11px] font-black leading-none mb-1 ${s.missing ? 'text-slate-300' : 'text-slate-700'}`}>{s.missing ? '–' : s.ui}</span>
                {h > 0 ? <span className="block w-full rounded-t-[4px]" style={{ height: h, background: ui }} /> : <span className="block w-full h-px bg-slate-200" />}
              </div>
              <span className={`mt-1.5 font-mono text-[10px] leading-none ${last ? 'font-black text-slate-700' : 'font-bold text-slate-400'}`}>{dm(s.week)}</span>
              <span className="mt-1 font-mono text-[9px] font-bold text-slate-400 leading-none whitespace-nowrap">{s.missing ? '' : `+${s.other} other`}</span>
              {last && <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">This</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] font-medium text-slate-400">
        Bars: <b className="font-black text-slate-500">CRM UI</b> deals per week (Monday to Sunday). Below, the <b className="font-black text-slate-500">other</b> deals (integrations, workflows…), which are not plotted. Hover (or tap) a week to see the detail.
      </p>
    </div>
  );
}

// En la ficha: CRM UI de esta semana grande, otros y total, contra la
// semana anterior, el detalle por opción de PCU Entity y el gráfico de 8
// semanas (de todas las opciones sumadas o de una sola)
export function DealsPanel({ counts = [], code, dark = false }) {
  const [option, setOption] = useState(''); // '' = todas las opciones sumadas
  const all = entityDeals(counts, code);
  const deals = option ? entityDeals(counts, code, new Date(), option) : all;
  if (deals.mapped === null) {
    return <p className="text-[11px] font-bold text-slate-400">No deal data for this entity yet. It loads with the next update.</p>;
  }
  if (deals.mapped === false) {
    return <p className="text-[11px] font-bold text-slate-500">This entity has no option in HubSpot's «PCU Entity», so its deals cannot be counted. Once it is added in HubSpot, it shows up automatically.</p>;
  }
  const { current, previous, series } = deals;
  const options = all.options || [];
  const many = options.length > 1;
  const diff = current.ui - (previous?.ui || 0);
  const chip = (on) => `px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${on ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300'}`;
  return (
    <div className="space-y-3">
      {many && (
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="PCU Entity option">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">PCU Entity</span>
          <button onClick={() => setOption('')} aria-pressed={!option} className={chip(!option)}>All</button>
          {options.map((o) => <button key={o} onClick={() => setOption(o)} aria-pressed={option === o} title={o} className={chip(option === o)}>{optionShortLabel(o)}</button>)}
        </div>
      )}
      <div className="flex items-start gap-6 flex-wrap lg:flex-nowrap">
        <div className="shrink-0 w-[180px]">
          <p className="font-mono text-4xl font-black text-slate-900 leading-none">{current.ui}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5">CRM UI this week{option ? ` · ${optionShortLabel(option)}` : ''}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Created manually in HubSpot</p>
          <p className="text-[11px] font-bold text-slate-500 mt-2">+ {current.other} other <span className="font-medium text-slate-400">(integrations, workflows…)</span></p>
          <p className="text-[11px] font-bold text-slate-500">= {current.total} in total</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            {diff === 0 ? 'Same as' : diff > 0 ? `+${diff} vs` : `${diff} vs`} last week in CRM UI ({previous?.ui || 0})
          </p>
          {many && !option && (
            <div className="mt-3 pt-2 border-t border-slate-100 space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">This week by option</p>
              {options.map((o) => {
                const v = all.current.byOption?.[o] || { ui: 0, other: 0 };
                return (
                  <button key={o} onClick={() => setOption(o)} title={o} className="w-full flex justify-between gap-2 text-[11px] font-bold text-slate-500 hover:text-sky-700">
                    <span className="truncate">{optionShortLabel(o)}</span>
                    <span className="font-mono whitespace-nowrap"><b className="text-slate-800">{v.ui}</b> · +{v.other}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-[260px]">
          <DealsWeekChart series={series} dark={dark} options={option ? [] : options} />
        </div>
      </div>
    </div>
  );
}

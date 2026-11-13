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
//   <DealsPanel deals dark />  — CRM UI de esta semana como número
//     principal (lo que cargó la gente a mano), otros y total al costado,
//     la comparación con la semana anterior y el gráfico.
//
// Colores validados con el skill dataviz (DEAL_COLORS), claro y oscuro.
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { DEAL_COLORS } from '@/utils/crmWeeklyDeals';

const PLOT_H = 120;     // alto del área de barras (px)

const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// Domingo de la semana (lunes + 6 días)
const sunday = (iso) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); };

// Cartel con el detalle de una semana (arriba de la columna; en las de los
// bordes se alinea para no salirse)
function WeekTip({ s, align }) {
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <div role="tooltip" className={`hub-popover absolute bottom-full mb-2 ${pos} z-20 w-44 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 pointer-events-none`}>
      <p className="text-[10px] font-black text-slate-700">Semana del {dm(s.week)} al {dm(sunday(s.week))}</p>
      {s.missing ? (
        <p className="text-[10px] font-bold text-slate-400 mt-1">Sin datos para esta semana.</p>
      ) : (
        <div className="mt-1 space-y-0.5 text-[10px] font-bold text-slate-500">
          <p className="flex justify-between"><span>CRM UI (a mano)</span><span className="font-mono font-black text-slate-800">{s.ui}</span></p>
          <p className="flex justify-between"><span>Otros</span><span className="font-mono font-black text-slate-800">{s.other}</span></p>
          <p className="flex justify-between border-t border-slate-100 pt-0.5"><span>Total</span><span className="font-mono font-black text-slate-800">{s.total}</span></p>
        </div>
      )}
    </div>
  );
}

export function DealsWeekChart({ series = [], dark = false }) {
  const [hover, setHover] = useState(null); // índice de la semana resaltada
  const max = Math.max(1, ...series.map((s) => s.ui));
  const ui = DEAL_COLORS.ui[dark ? 'dark' : 'light'];
  return (
    <div className="w-full">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }} role="img" aria-label={`Deals CRM UI por semana: ${series.map((s) => `${dm(s.week)} ${s.ui}`).join(', ')}`}>
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
              {hover === i && <WeekTip s={s} align={i < 2 ? 'left' : i > series.length - 3 ? 'right' : 'center'} />}
              <div className={`w-full flex flex-col justify-end items-center ${last ? 'outline outline-1 outline-offset-2 outline-slate-300 rounded-[5px]' : ''}`} style={{ height: PLOT_H + 16, maxWidth: 44 }}>
                <span className={`font-mono text-[11px] font-black leading-none mb-1 ${s.missing ? 'text-slate-300' : 'text-slate-700'}`}>{s.missing ? '–' : s.ui}</span>
                {h > 0 ? <span className="block w-full rounded-t-[4px]" style={{ height: h, background: ui }} /> : <span className="block w-full h-px bg-slate-200" />}
              </div>
              <span className={`mt-1.5 font-mono text-[10px] leading-none ${last ? 'font-black text-slate-700' : 'font-bold text-slate-400'}`}>{dm(s.week)}</span>
              <span className="mt-1 font-mono text-[9px] font-bold text-slate-400 leading-none whitespace-nowrap">{s.missing ? '' : `+${s.other} otros`}</span>
              {last && <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Esta</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] font-medium text-slate-400">
        Barras: deals <b className="font-black text-slate-500">CRM UI</b> de cada semana (lunes a domingo). Debajo, los <b className="font-black text-slate-500">otros</b> (integraciones, workflows…), que no se grafican. Pasá el mouse (o tocá) una semana para ver el detalle.
      </p>
    </div>
  );
}

// En la ficha: CRM UI de esta semana grande, otros y total, contra la
// semana anterior y el gráfico de 8 semanas
export function DealsPanel({ deals, dark = false }) {
  if (!deals || deals.mapped === null) {
    return <p className="text-[11px] font-bold text-slate-400">Todavía no hay datos de deals de esta entidad. Se cargan con la próxima actualización.</p>;
  }
  if (deals.mapped === false) {
    return <p className="text-[11px] font-bold text-slate-500">Esta entidad no tiene opción en «PCU Entity» de HubSpot, así que sus deals no se pueden contar. Cuando la agreguen en HubSpot, aparece sola.</p>;
  }
  const { current, previous, series } = deals;
  const diff = current.ui - (previous?.ui || 0);
  return (
    <div className="flex items-start gap-6 flex-wrap lg:flex-nowrap">
      <div className="shrink-0 w-[170px]">
        <p className="font-mono text-4xl font-black text-slate-900 leading-none">{current.ui}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5 flex items-center gap-1">
          CRM UI esta semana
        </p>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Cargados a mano en HubSpot</p>
        <p className="text-[11px] font-bold text-slate-500 mt-2">+ {current.other} otros <span className="font-medium text-slate-400">(integraciones, workflows…)</span></p>
        <p className="text-[11px] font-bold text-slate-500">= {current.total} en total</p>
        <p className="text-[10px] font-bold text-slate-400 mt-2">
          {diff === 0 ? 'Igual que' : diff > 0 ? `+${diff} vs` : `${diff} vs`} la semana anterior en CRM UI ({previous?.ui || 0})
        </p>
      </div>
      <div className="flex-1 min-w-[260px]">
        <DealsWeekChart series={series} dark={dark} />
      </div>
    </div>
  );
}

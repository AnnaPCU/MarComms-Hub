// ════════════════════════════════════════════════════════════════════
// DealsSpark — Mini tendencia de deals nuevos (8 semanas) + panel
// ════════════════════════════════════════════════════════════════════
// Barras apiladas por semana: CRM UI (azul, abajo) + Otros (naranja,
// arriba), con 2 px de separación entre tramos; la semana en curso con
// un borde. Colores validados con el skill dataviz (DEAL_COLORS). Cada
// barra tiene su tooltip (title) con los dos números.
//
//   <DealsSpark series dark size="sm|md" />  — la barra sola
//   <DealsBadge deals dark />                — para la lista de entidades
//   <DealsPanel deals dark />                — para la ficha de la entidad
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { DEAL_COLORS, weekLabel } from '@/utils/crmWeeklyDeals';

const tip = (s) => (s.missing ? `${weekLabel(s.week)}: sin datos` : `${weekLabel(s.week)}: ${s.total} deals (${s.ui} CRM UI · ${s.other} otros)`);

export function DealsSpark({ series = [], dark = false, size = 'sm' }) {
  const md = size === 'md';
  const h = md ? 64 : 18;
  const barW = md ? 22 : 5;
  const gap = md ? 8 : 2;
  const max = Math.max(1, ...series.map((s) => s.total));
  const ui = DEAL_COLORS.ui[dark ? 'dark' : 'light'];
  const other = DEAL_COLORS.other[dark ? 'dark' : 'light'];
  return (
    <span className="inline-flex items-end shrink-0" style={{ height: h, gap }} role="img" aria-label={`Deals nuevos por semana: ${series.map((s) => s.total).join(', ')}`}>
      {series.map((s, i) => {
        const last = i === series.length - 1;
        const uiH = s.ui ? Math.max(2, Math.round((s.ui / max) * h)) : 0;
        const otherH = s.other ? Math.max(2, Math.round((s.other / max) * h)) : 0;
        return (
          <span key={s.week} title={tip(s)} className={`flex flex-col justify-end h-full ${last && md ? 'outline outline-1 outline-offset-2 outline-slate-300 rounded-sm' : ''}`} style={{ width: barW }}>
            {otherH > 0 && <span className="block rounded-t-[3px]" style={{ height: otherH, background: other, marginBottom: uiH ? 2 : 0 }} />}
            {uiH > 0 && <span className={`block ${otherH ? '' : 'rounded-t-[3px]'}`} style={{ height: uiH, background: ui }} />}
            {!uiH && !otherH && <span className="block h-px bg-slate-200" />}
          </span>
        );
      })}
    </span>
  );
}

// En la lista: deals de esta semana + mini tendencia (o «sin PCU Entity»)
export function DealsBadge({ deals, dark = false }) {
  if (!deals || deals.mapped === null) return null;
  if (deals.mapped === false) return <span className="text-[9px] font-bold text-slate-400 italic">Sin PCU Entity en HubSpot</span>;
  return (
    <span className="inline-flex items-center gap-1.5" title={`Deals nuevos esta semana: ${deals.current.total} (${deals.current.ui} CRM UI · ${deals.current.other} otros)`}>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Deals</span>
      <span className="font-mono text-[11px] font-black text-slate-700">{deals.current.total}</span>
      <DealsSpark series={deals.series} dark={dark} />
    </span>
  );
}

function Legend({ dark }) {
  return (
    <span className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
      {['ui', 'other'].map((k) => (
        <span key={k} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: DEAL_COLORS[k][dark ? 'dark' : 'light'] }} />{DEAL_COLORS[k].label}</span>
      ))}
    </span>
  );
}

// En la ficha: esta semana grande, desglose, contra la anterior y 8 semanas
export function DealsPanel({ deals, dark = false }) {
  if (!deals || deals.mapped === null) {
    return <p className="text-[11px] font-bold text-slate-400">Todavía no hay datos de deals de esta entidad. Se cargan con la próxima actualización.</p>;
  }
  if (deals.mapped === false) {
    return <p className="text-[11px] font-bold text-slate-500">Esta entidad no tiene opción en «PCU Entity» de HubSpot, así que sus deals no se pueden contar. Cuando la agreguen en HubSpot, aparece sola.</p>;
  }
  const { current, previous, series } = deals;
  const diff = current.total - (previous?.total || 0);
  return (
    <div className="flex items-end gap-6 flex-wrap">
      <div>
        <p className="font-mono text-3xl font-black text-slate-900 leading-none">{current.total}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Esta semana</p>
        <p className="text-[11px] font-bold text-slate-500 mt-1">{current.ui} CRM UI · {current.other} otros</p>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> {diff === 0 ? 'Igual que' : diff > 0 ? `+${diff} vs` : `${diff} vs`} la semana anterior ({previous?.total || 0})
        </p>
      </div>
      <div className="space-y-1.5">
        <DealsSpark series={series} dark={dark} size="md" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] font-bold text-slate-400">Últimas 8 semanas · la del borde es la actual</span>
        </div>
        <Legend dark={dark} />
      </div>
    </div>
  );
}

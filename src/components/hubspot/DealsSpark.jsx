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
//   Desde nov 2026 (migration 0078) la ficha tiene dos vistas: «Last 8
//     weeks» (lo de arriba) y «Since January»: las mismas barras CRM UI pero
//     por mes desde enero (DealsBarChart con period 'month'), con el total
//     del año, el promedio por mes (sin el mes en curso) y el mejor mes.
//   Nov 2026 (migration 0079): los deals importados (ej. Commercial Tool)
//     se cuentan aparte y suman al total. En «Since January» el número
//     principal y las barras son el TOTAL (CRM UI + otros + importados), a
//     pedido; en «Last 8 weeks» sigue CRM UI como número principal.
//     El mismo panel muestra contactos y empresas (noun 'contacts' /
//     'companies', sin importaciones ni opciones de PCU Entity).
//
// Colores validados con el skill dataviz (DEAL_COLORS), claro y oscuro.
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { DEAL_COLORS, entityDeals, entityMonths, optionShortLabel } from '@/utils/crmWeeklyDeals';

const PLOT_H = 120;     // alto del área de barras (px)
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const monthShort = (iso) => MONTHS_SHORT[Number(iso.slice(5, 7)) - 1];
const monthLong = (iso) => `${MONTHS_LONG[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
// Domingo de la semana (lunes + 6 días)
const sunday = (iso) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); };
const periodOf = (s) => s.week || s.month;
const NOUNS = { deals: 'deals', contacts: 'contacts', companies: 'companies' };

// Cartel con el detalle de una semana o un mes (arriba de la columna; en
// las de los bordes se alinea para no salirse)
function PeriodTip({ s, period, last, align, options = [], showImports = false }) {
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  const title = period === 'month' ? `${monthLong(s.month)}${last ? ' (so far)' : ''}` : `Week of ${dm(s.week)} to ${dm(sunday(s.week))}`;
  return (
    <div role="tooltip" className={`hub-popover absolute bottom-full mb-2 ${pos} z-20 w-52 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 pointer-events-none`}>
      <p className="text-[10px] font-black text-slate-700">{title}</p>
      {s.missing ? (
        <p className="text-[10px] font-bold text-slate-400 mt-1">No data for this {period}.</p>
      ) : (
        <div className="mt-1 space-y-0.5 text-[10px] font-bold text-slate-500">
          <p className="flex justify-between"><span>CRM UI (manual)</span><span className="font-mono font-black text-slate-800">{s.ui}</span></p>
          <p className="flex justify-between"><span>Other</span><span className="font-mono font-black text-slate-800">{s.other}</span></p>
          {showImports && <p className="flex justify-between"><span>Imported</span><span className="font-mono font-black text-slate-800">{s.imported || 0}</span></p>}
          <p className="flex justify-between border-t border-slate-100 pt-0.5"><span>Total</span><span className="font-mono font-black text-slate-800">{s.total}</span></p>
          {options.length > 1 && (
            <div className="border-t border-slate-100 pt-1 mt-1 space-y-0.5">
              {options.map((o) => {
                const v = s.byOption?.[o] || { ui: 0, other: 0 };
                return <p key={o} className="flex justify-between gap-2"><span className="truncate">{optionShortLabel(o)}</span><span className="font-mono text-slate-700 whitespace-nowrap">{v.ui} · +{v.other}{v.imported ? ` · ⤓${v.imported}` : ''}</span></p>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Barras por semana (period 'week') o por mes (period 'month'): CRM UI
// (metric 'ui') o el total con importados (metric 'total')
export function DealsBarChart({ series = [], period = 'week', dark = false, options = [], metric = 'ui', noun = 'deals', showImports = noun === 'deals' }) {
  const [hover, setHover] = useState(null); // índice de la columna resaltada
  const value = (s) => (metric === 'total' ? s.total : s.ui);
  const max = Math.max(1, ...series.map(value));
  const ui = DEAL_COLORS.ui[dark ? 'dark' : 'light'];
  const label = (s) => (period === 'month' ? monthShort(s.month) : dm(s.week));
  const what = metric === 'total' ? `${NOUNS[noun]} in total` : `CRM UI ${NOUNS[noun]}`;
  return (
    <div className="w-full">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }} role="img" aria-label={`${what} per ${period}: ${series.map((s) => `${label(s)} ${value(s)}`).join(', ')}`}>
        {series.map((s, i) => {
          const last = i === series.length - 1;
          const v = value(s);
          const h = v ? Math.max(3, Math.round((v / max) * PLOT_H)) : 0;
          return (
            <div
              key={periodOf(s)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(hover === i ? null : i)}
              className={`relative flex flex-col items-center min-w-0 rounded-lg py-1 cursor-default transition-colors ${hover === i ? 'bg-slate-100' : ''}`}
            >
              {hover === i && <PeriodTip s={s} period={period} last={last} options={options} showImports={showImports} align={i < 2 ? 'left' : i > series.length - 3 ? 'right' : 'center'} />}
              <div className={`w-full flex flex-col justify-end items-center ${last ? 'outline outline-1 outline-offset-2 outline-slate-300 rounded-[5px]' : ''}`} style={{ height: PLOT_H + 16, maxWidth: 44 }}>
                <span className={`font-mono text-[11px] font-black leading-none mb-1 ${s.missing ? 'text-slate-300' : 'text-slate-700'}`}>{s.missing ? '–' : v}</span>
                {h > 0 ? <span className="block w-full rounded-t-[4px]" style={{ height: h, background: ui }} /> : <span className="block w-full h-px bg-slate-200" />}
              </div>
              <span className={`mt-1.5 font-mono text-[10px] leading-none ${last ? 'font-black text-slate-700' : 'font-bold text-slate-400'}`}>{label(s)}</span>
              <span className="mt-1 font-mono text-[9px] font-bold text-slate-400 leading-none whitespace-nowrap">{s.missing ? '' : metric === 'total' ? `UI ${s.ui}` : `+${s.other + (s.imported || 0)}`}</span>
              {last && <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">This</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] font-medium text-slate-400">
        {metric === 'total' ? (
          <>Bars: all {NOUNS[noun]} created per {period === 'month' ? 'month (Argentina time)' : 'week (Monday to Sunday)'}{showImports ? ', imports included' : ', imports excluded'}. Below, «UI N» = the ones created manually in HubSpot (CRM UI).</>
        ) : (
          <>Bars: <b className="font-black text-slate-500">CRM UI</b> {NOUNS[noun]} per {period === 'month' ? 'month (Argentina time)' : 'week (Monday to Sunday)'}. Below, «+N» = the <b className="font-black text-slate-500">other</b> {NOUNS[noun]} (integrations, workflows{showImports ? ', imports' : ''}…), which are not plotted.{showImports ? '' : ' Imports are excluded.'}</>
        )} Hover (or tap) a {period} to see the detail.
      </p>
    </div>
  );
}

// Compatibilidad: el gráfico semanal
export const DealsWeekChart = (props) => <DealsBarChart {...props} period="week" />;

const chipCls = (on) => `px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${on ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300'}`;
const tabCls = (on) => `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${on ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`;

// Detalle por opción de PCU Entity (de una semana o del año)
function OptionBreakdown({ title, options, values, onPick, total = false }) {
  return (
    <div className="mt-3 pt-2 border-t border-slate-100 space-y-0.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      {options.map((o) => {
        const v = values?.[o] || { ui: 0, other: 0 };
        return (
          <button key={o} onClick={() => onPick(o)} title={o} className="w-full flex justify-between gap-2 text-[11px] font-bold text-slate-500 hover:text-sky-700">
            <span className="truncate">{optionShortLabel(o)}</span>
            {total
              ? <span className="font-mono whitespace-nowrap"><b className="text-slate-800">{v.ui + v.other + (v.imported || 0)}</b> <span className="text-slate-400">(UI {v.ui})</span></span>
              : <span className="font-mono whitespace-nowrap"><b className="text-slate-800">{v.ui}</b> · +{v.other}{v.imported ? ` · ⤓${v.imported}` : ''}</span>}
          </button>
        );
      })}
    </div>
  );
}

// En la ficha: «Last 8 weeks» (CRM UI de esta semana grande, otros y total,
// contra la semana anterior, el detalle por opción y el gráfico semanal) o
// «Since January» (total del año, promedio por mes, mejor mes y el gráfico
// mensual). Las dos siguen a la opción de PCU Entity elegida.
// noun: 'deals' (con opciones de PCU Entity e importados) o 'contacts' /
// 'companies' (counts / months con la forma de deals, objectsAsDeals)
export function DealsPanel({ counts = [], months = [], code, dark = false, noun = 'deals' }) {
  const isDeals = noun === 'deals';
  const N = NOUNS[noun];
  const [option, setOption] = useState(''); // '' = todas las opciones sumadas
  const [view, setView] = useState('weeks');
  const all = entityDeals(counts, code);
  const deals = option ? entityDeals(counts, code, new Date(), option) : all;
  const yearAll = entityMonths(months, code);
  const year = option ? entityMonths(months, code, new Date(), option) : yearAll;
  const hasMonths = yearAll.mapped !== null;
  if (deals.mapped === null && !hasMonths) {
    return <p className="text-[11px] font-bold text-slate-400">No {N} data for this entity yet. It loads with the next update.</p>;
  }
  if (deals.mapped === false || (deals.mapped === null && yearAll.mapped === false)) {
    return isDeals
      ? <p className="text-[11px] font-bold text-slate-500">This entity has no option in HubSpot's «PCU Entity», so its deals cannot be counted. Once it is added in HubSpot, it shows up automatically.</p>
      : <p className="text-[11px] font-bold text-slate-500">No HubSpot user is linked to this entity (not in the Facturación HubSpot user list and no deals as owner), so its {N} cannot be counted.</p>;
  }
  const options = all.options?.length ? all.options : Object.keys(yearAll.byOption || {});
  const many = options.length > 1;
  const showMonths = view === 'months';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1" role="tablist" aria-label="Period">
          <button role="tab" aria-selected={!showMonths} onClick={() => setView('weeks')} className={tabCls(!showMonths)}>Last 8 weeks</button>
          <button role="tab" aria-selected={showMonths} onClick={() => setView('months')} className={tabCls(showMonths)}>Since January</button>
        </div>
        {many && (
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="PCU Entity option">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">PCU Entity</span>
            <button onClick={() => setOption('')} aria-pressed={!option} className={chipCls(!option)}>All</button>
            {options.map((o) => <button key={o} onClick={() => setOption(o)} aria-pressed={option === o} title={o} className={chipCls(option === o)}>{optionShortLabel(o)}</button>)}
          </div>
        )}
      </div>
      {showMonths && !hasMonths ? (
        <p className="text-[11px] font-bold text-slate-400">No monthly data for this entity yet. It loads with the next update (daily at 06:07 Argentina time, or with «Update»).</p>
      ) : showMonths ? (
        <div className="flex items-start gap-6 flex-wrap lg:flex-nowrap">
          <div className="shrink-0 w-[180px]">
            <p className="font-mono text-4xl font-black text-slate-900 leading-none">{year.total.all}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5">{N} since January{option ? ` · ${optionShortLabel(option)}` : ''}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{isDeals ? 'All sources, imports included' : 'All sources, imports excluded'}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-2">{year.total.ui} CRM UI <span className="font-medium text-slate-400">(created manually)</span></p>
            <p className="text-[11px] font-bold text-slate-500">+ {year.total.other} other <span className="font-medium text-slate-400">(integrations, workflows…)</span></p>
            {isDeals && <p className="text-[11px] font-bold text-slate-500">+ {year.total.imported} imported <span className="font-medium text-slate-400">(e.g. Commercial Tool)</span></p>}
            <p className="text-[10px] font-bold text-slate-400 mt-2">Average {year.avgAll ?? '—'} per month{year.avgAll !== null ? ' (full months)' : ''}</p>
            {year.bestAll && <p className="text-[10px] font-bold text-slate-400">Best month: {monthLong(year.bestAll.month)} ({year.bestAll.total})</p>}
            {many && !option && <OptionBreakdown title="Since January by option" options={options} values={yearAll.byOption} onPick={setOption} total />}
          </div>
          <div className="flex-1 min-w-[260px]">
            <DealsBarChart series={year.series} period="month" dark={dark} options={option ? [] : options} metric="total" noun={noun} />
          </div>
        </div>
      ) : deals.mapped === null ? (
        <p className="text-[11px] font-bold text-slate-400">No weekly data for this entity yet. It loads with the next update.</p>
      ) : (
        <div className="flex items-start gap-6 flex-wrap lg:flex-nowrap">
          <div className="shrink-0 w-[180px]">
            <p className="font-mono text-4xl font-black text-slate-900 leading-none">{deals.current.ui}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5">CRM UI {N} this week{option ? ` · ${optionShortLabel(option)}` : ''}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Created manually in HubSpot</p>
            <p className="text-[11px] font-bold text-slate-500 mt-2">+ {deals.current.other} other <span className="font-medium text-slate-400">(integrations, workflows…)</span></p>
            {isDeals && deals.current.imported > 0 && <p className="text-[11px] font-bold text-slate-500">+ {deals.current.imported} imported</p>}
            <p className="text-[11px] font-bold text-slate-500">= {deals.current.total} in total</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              {(() => { const diff = deals.current.ui - (deals.previous?.ui || 0); return diff === 0 ? 'Same as' : diff > 0 ? `+${diff} vs` : `${diff} vs`; })()} last week in CRM UI ({deals.previous?.ui || 0})
            </p>
            {many && !option && <OptionBreakdown title="This week by option" options={options} values={all.current.byOption} onPick={setOption} />}
          </div>
          <div className="flex-1 min-w-[260px]">
            <DealsBarChart series={deals.series} period="week" dark={dark} options={option ? [] : options} noun={noun} />
          </div>
        </div>
      )}
    </div>
  );
}

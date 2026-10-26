// ════════════════════════════════════════════════════════════════════
// PlanExternalView — Vista externa de un plan (lo que ve el cliente)
// ════════════════════════════════════════════════════════════════════
// La usa el link externo (PublicPlanPage, sin login). La "Vista externa"
// del Hub muestra ese mismo link en un iframe, así lo que se ve en el Hub
// es exactamente lo que ve el cliente.
//
//   - Encabezado y pie como el reporte mensual: franja del color de la
//     marca, logo de MarComms + logo de la marca arriba; al pie, MarComms a
//     la izquierda y la tagline de la marca bajo una línea Dark Blue.
//   - Con la identidad de la marca del plan (logo, colores, tagline al
//     pie). Control Union y Peterson Solutions nunca se mezclan.
//   - Sin Responsable ni Deadline, solo lectura.
//   - Abre siempre en el mes actual y funciona como histórico: con las
//     flechas o el selector se recorren los meses que tienen acciones (los
//     vacíos no aparecen). Si el mes actual todavía no tiene, lo avisa y
//     ofrece ir al último mes con acciones.
//   - En el celular las tareas se ven como tarjetas (sin scroll lateral).
//   - Selector de mes: el más reciente arriba y al final «Histórico»
//     (PlanHistoryView: evolución de cada KPI en todos los meses).
//   - Como el reporte mensual: KPIs del mes elegido arriba de las acciones
//     (solo los que tienen valor mayor a 0; performance con la variación
//     contra el mes anterior) e Iniciativas al final. Sin datos, esas
//     secciones no aparecen.
//
// Modo oscuro: si la persona lo activó en el Hub (dark = true) usa los
// colores oscuros de la marca; el cliente, por defecto, lo ve en claro.
//
// Props: plan ({ name, kpis?, initiatives? }), tasks, todayIso, dark
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

import { brandTheme } from '@/constants/brands';
import { CANCELLED_TASK_STATUS, MONTHS_ES } from '@/constants/planTasks';
import { filterTasks, groupTasksByMonth, monthHistory, monthLabel, planBrand, taskStats } from '@/utils/planTasks';
import { initiativeGroups, monthKpiGroups, previousMonthKey } from '@/utils/planKpis';
import { StatusBadge, TaskLinks, pctLabel } from './PlanBits';
import { InitiativesTables, KpiGroupsView, ReportSectionTitle } from './PlanReportBlocks';
import PlanHistoryView from './PlanHistoryView';

// Opción del selector de mes con el histórico de todos los meses
const HISTORY = 'history';

const thCls = 'text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest';
// Logo del equipo que firma el reporte (el mismo del menú del Hub)
const MARCOMMS_LOGO = { color: '/logos/marcomms-color.png', white: '/logos/marcomms-white.png' };
const fill = (tpl, mes) => tpl.replace('{mes}', mes);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function LongText({ value, open }) {
  if (!value) return <span className="text-slate-300">—</span>;
  return <p className={`text-[12px] leading-snug whitespace-pre-line ${open ? '' : 'line-clamp-3'}`}>{value}</p>;
}

// Celular: una tarjeta por tarea, solo con los campos que tienen algo
function TaskCard({ t, open, onToggle, c }) {
  const fields = [['Objetivo', t.objective], ['Resultado', t.result], ['Detalle', t.detail]].filter(([, v]) => v);
  return (
    <li className={`border-b border-slate-100 px-2 py-3 ${t.status === CANCELLED_TASK_STATUS ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[13px] font-bold leading-snug" style={{ color: c.dark }}>{t.title}</p>
        <StatusBadge status={t.status} />
      </div>
      {fields.length > 0 && (
        <dl className="mt-2 space-y-1.5">
          {fields.map(([label, v]) => (
            <div key={label}>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.label }}>{label}</dt>
              <dd><LongText value={v} open={open} /></dd>
            </div>
          ))}
        </dl>
      )}
      {t.link && <div className="mt-2"><TaskLinks value={t.link} color={c.link} /></div>}
      {fields.length > 0 && (
        <button onClick={onToggle} className="mt-1.5 text-[11px] font-bold underline" style={{ color: c.label }}>{open ? 'Ver menos' : 'Ver todo'}</button>
      )}
    </li>
  );
}

export default function PlanExternalView({ plan, tasks, todayIso, dark = false }) {
  const theme = brandTheme(planBrand(plan.name));
  const c = dark ? theme.darkColors : theme.colors;
  // Sigue al mes actual (aunque la página quede abierta y cambie el mes)
  // hasta que la persona elige otro
  const currentMonth = todayIso.slice(0, 7);
  const [pickedMonth, setMonth] = useState(null);
  const month = pickedMonth ?? currentMonth;
  const [expanded, setExpanded] = useState(() => new Set());
  const history = useMemo(() => monthHistory(tasks, todayIso), [tasks, todayIso]);
  // Si el mes elegido se quedó sin tareas (cambio en vivo), se sigue mostrando en la lista
  const isHistory = month === HISTORY;
  // Meses en orden cronológico (las flechas: ← más viejo, → más nuevo)
  const options = isHistory || history.options.some((o) => o.value === month)
    ? history.options
    : [...history.options, { value: month, label: month === 'none' ? 'Sin mes' : monthLabel(month), count: 0, current: false }]
      .sort((a, b) => (a.value === 'none' ? 1 : b.value === 'none' ? -1 : a.value.localeCompare(b.value)));
  const monthOpts = options.filter((o) => o.value !== 'none');
  // En el selector: el más reciente arriba, después «Sin mes» y al final el histórico
  const selectOptions = [...monthOpts].reverse().concat(options.filter((o) => o.value === 'none'), [{ value: HISTORY, label: 'Histórico (todos los meses)' }]);
  const idx = options.findIndex((o) => o.value === month);
  const prev = isHistory ? monthOpts[monthOpts.length - 1] : options[idx - 1];
  const next = isHistory ? undefined : options[idx + 1];
  const selected = isHistory ? { value: HISTORY, label: 'Histórico' } : options[idx];
  const shown = filterTasks(tasks, { month });
  const groups = groupTasksByMonth(shown);
  const s = taskStats(tasks);
  const ms = taskStats(shown);
  const toggleRow = (id) => setExpanded((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const navy = theme.colors.dark;
  // KPIs del mes elegido (solo si es un mes; sin ninguno con valor no se muestran)
  const prevKey = previousMonthKey(month);
  const kpiGroups = prevKey ? monthKpiGroups(tasks, month, plan.kpis?.[month], plan.kpis?.[prevKey], plan.kpis) : [];
  const hasKpis = kpiGroups.some((g) => g.items.some((k) => k.visible));
  const initiatives = initiativeGroups(plan.initiatives || []);

  const emptyText = tasks.length === 0
    ? 'Todavía no hay acciones cargadas en este plan.'
    : fill(theme.emptyMonth, month === 'none' ? 'esta vista' : selected?.label || '');
  const showFallback = shown.length === 0 && selected?.current && history.fallback;
  const empty = (
    <div className="px-4 py-10 text-center text-sm">
      <p>{emptyText}</p>
      {showFallback && (
        <button onClick={() => setMonth(history.fallback)} className="mt-3 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: c.primary, color: c.onPrimary }}>
          {fill(theme.goTo, history.fallback === 'none' ? 'las acciones sin mes' : monthLabel(history.fallback))}
        </button>
      )}
    </div>
  );
  const navBtn = 'w-9 h-9 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" style={{ fontFamily: 'Ubuntu, Calibri, "DM Sans", sans-serif', color: c.text }}>
      {/* Encabezado como el reporte: MarComms | reporte · logo de la marca (la tagline va al pie) */}
      <div className="h-1" style={{ background: c.primary }} />
      <header className="px-6 sm:px-8 pt-5 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <img src={dark ? MARCOMMS_LOGO.white : MARCOMMS_LOGO.color} alt="MarComms" className="h-7 sm:h-9 w-auto block shrink-0" />
            <span className="hidden sm:block w-px h-9 bg-slate-200" />
            <div className="hidden sm:block min-w-0">
              <p className="text-[13px] font-bold leading-tight truncate" style={{ color: c.dark }}>Plan · {plan.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: c.label }}>Reporte de Marketing Digital</p>
            </div>
          </div>
          {theme.logo && (
            // En oscuro, la versión blanca del logo (sin recuadro)
            <img src={dark && theme.logoWhite ? theme.logoWhite : theme.logo} alt={theme.name} className="h-5 sm:h-7 w-auto block shrink-0" />
          )}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.label }}>{theme.title}</p>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1" style={{ color: c.dark }}>{plan.name}</h1>
        <p className="text-sm mt-1">{theme.intro}</p>
      </header>

      {/* Avance del plan (todos los meses) + mes */}
      <section className="px-6 sm:px-8 py-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center" style={{ background: c.soft }}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.label }}>Avance del plan</p>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-4xl font-bold leading-none" style={{ color: c.dark }}>{pctLabel(s.pct)}</span>
            <span className="text-xs pb-1">{s.completed} de {plural(s.completed + s.open, 'acción completada', 'acciones completadas')}{s.cancelled ? ` · ${plural(s.cancelled, 'cancelada', 'canceladas')}` : ''}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white mt-3 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: pctLabel(s.pct), background: c.primary }} />
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:min-w-[260px]">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.label }}>Mes</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => prev && setMonth(prev.value)} disabled={!prev} className={navBtn} style={{ color: c.dark }} title={prev ? prev.label : undefined} aria-label="Mes anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" style={{ color: c.dark }} aria-label="Mes">
              {selectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}{o.current ? ' (este mes)' : ''}</option>)}
            </select>
            <button onClick={() => next && setMonth(next.value)} disabled={!next} className={navBtn} style={{ color: c.dark }} title={next ? next.label : undefined} aria-label="Mes siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* KPIs del mes */}
      {!isHistory && hasKpis && (
        <section className="px-6 sm:px-8 pt-6">
          <ReportSectionTitle title={`KPIs del mes · ${selected?.label || ''}`} aside="Operativos, performance e investment" c={c} />
          <KpiGroupsView groups={kpiGroups} c={c} navy={navy} prevLabel={MONTHS_ES[Number(prevKey.slice(5, 7)) - 1].toLowerCase()} />
        </section>
      )}

      {/* Histórico: evolución de los KPIs de todos los meses */}
      {isHistory && <PlanHistoryView tasks={tasks} kpiHistory={plan.kpis || {}} todayIso={todayIso} c={c} />}

      {/* Tareas del mes */}
      {!isHistory && (
      <section className="px-2 sm:px-4 py-4">
        <div className="flex items-center justify-between gap-3 px-2 sm:px-4 pb-3 flex-wrap">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: c.dark }}>Acciones · {selected?.label || ''}</h2>
          {shown.length > 0 && <span className="text-xs">{ms.completed} de {ms.completed + ms.open} completadas</span>}
        </div>

        {shown.length === 0 ? empty : (<>
        {/* Celular */}
        <div className="sm:hidden">
          <ul>{groups.flatMap((g) => g.tasks).map((t) => <TaskCard key={t.id} t={t} c={c} open={expanded.has(t.id)} onToggle={() => toggleRow(t.id)} />)}</ul>
        </div>

        {/* Escritorio */}
        <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: 860 }}>
              <colgroup>
                <col style={{ width: 28 }} />
                <col style={{ width: 240 }} />
                <col style={{ width: 120 }} />
                <col />
                <col style={{ width: 170 }} />
                <col />
                <col style={{ width: 150 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200" style={{ color: c.label }}>
                  <th className="px-1" />
                  <th className={thCls}>Acción / Tarea</th>
                  <th className={thCls}>Estado</th>
                  <th className={thCls}>Objetivo</th>
                  <th className={thCls}>Resultado</th>
                  <th className={thCls}>Detalle</th>
                  <th className={thCls}>Link</th>
                </tr>
              </thead>
              <tbody>
                {groups.flatMap((g) => g.tasks).map((t) => {
                  const open = expanded.has(t.id);
                  return (
                    <tr key={t.id} className={`border-b border-slate-100 align-top ${t.status === CANCELLED_TASK_STATUS ? 'opacity-60' : ''}`}>
                      <td className="px-1 py-3 text-center">
                        <button onClick={() => toggleRow(t.id)} className="w-5 h-5 rounded hover:bg-slate-100 text-slate-400 inline-flex items-center justify-center" title={open ? 'Achicar' : 'Ver todo el texto'}>
                          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-[13px] font-bold leading-snug" style={{ color: c.dark }}>{t.title}</td>
                      <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-3 py-3"><LongText value={t.objective} open={open} /></td>
                      <td className="px-3 py-3"><LongText value={t.result} open={open} /></td>
                      <td className="px-3 py-3"><LongText value={t.detail} open={open} /></td>
                      <td className="px-3 py-3"><TaskLinks value={t.link} color={c.link} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
        </>)}
      </section>
      )}

      {/* Iniciativas (del plan, no del mes) */}
      {initiatives.length > 0 && (
        <section className="px-6 sm:px-8 pb-6 pt-2">
          <ReportSectionTitle title="Iniciativas" aside="En definición o en marcha" c={c} />
          <InitiativesTables groups={initiatives} c={c} navy={navy} />
        </section>
      )}

      {/* Pie como el reporte: MarComms a la izquierda; línea Dark Blue y tagline de la marca a la derecha */}
      <footer className="px-6 sm:px-8 pt-6 pb-5 border-t border-slate-100" style={{ color: c.label }}>
        <div className="flex flex-col-reverse sm:flex-row sm:items-end justify-between gap-5 sm:gap-6">
          <img src={dark ? MARCOMMS_LOGO.white : MARCOMMS_LOGO.color} alt="MarComms" className="h-6 sm:h-7 w-auto block shrink-0 self-start sm:self-auto" />
          <div className="sm:flex-1 sm:max-w-[60%] text-right">
            <div className="h-1 rounded-full mb-3" style={{ background: dark ? c.primary : navy }} />
            {theme.tagline && <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em]">{theme.tagline}</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PlanExternalView — Vista externa de un plan (lo que ve el cliente)
// ════════════════════════════════════════════════════════════════════
// La usa el link externo (PublicPlanPage, sin login). La "Vista externa"
// del Hub muestra ese mismo link en un iframe, así lo que se ve en el Hub
// es exactamente lo que ve el cliente (y el modo oscuro del Hub no la toca).
//
//   - Con la identidad de la marca del plan (logo, colores, tagline al
//     pie). Control Union y Peterson Solutions nunca se mezclan.
//   - Sin Responsable ni Deadline, solo lectura.
//   - Abre en el mes actual; el selector permite ver otro mes o todos.
//   - En el celular las tareas se ven como tarjetas (sin scroll lateral).
//
// Props: plan ({ name }), tasks, todayIso, updatedAt (opcional, ISO)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { brandTheme } from '@/constants/brands';
import { CANCELLED_TASK_STATUS } from '@/constants/planTasks';
import { filterTasks, groupTasksByMonth, monthFilterOptions, planBrand, taskStats } from '@/utils/planTasks';
import { StatusBadge, TaskLinks, pctLabel } from './PlanBits';

const thCls = 'text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest';

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
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.grey }}>{label}</dt>
              <dd><LongText value={v} open={open} /></dd>
            </div>
          ))}
        </dl>
      )}
      {t.link && <div className="mt-2"><TaskLinks value={t.link} color={c.dark} /></div>}
      {fields.length > 0 && (
        <button onClick={onToggle} className="mt-1.5 text-[11px] font-bold underline" style={{ color: c.grey }}>{open ? 'Ver menos' : 'Ver todo'}</button>
      )}
    </li>
  );
}

export default function PlanExternalView({ plan, tasks, todayIso, updatedAt }) {
  const theme = brandTheme(planBrand(plan.name));
  const c = theme.colors;
  const [month, setMonth] = useState(todayIso.slice(0, 7));
  const [expanded, setExpanded] = useState(() => new Set());
  const options = useMemo(() => monthFilterOptions(tasks, todayIso), [tasks, todayIso]);
  const shown = filterTasks(tasks, { month, searchOwner: false });
  const groups = groupTasksByMonth(shown);
  const s = taskStats(tasks);
  const ms = taskStats(shown);
  const monthName = options.find((o) => o.value === month)?.label || '';
  const toggleRow = (id) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" style={{ fontFamily: 'Ubuntu, Calibri, "DM Sans", sans-serif', color: c.text }}>
      {/* Encabezado: logo solo (la tagline va al pie) */}
      <header className="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-100">
        {theme.logo && <img src={theme.logo} alt={theme.name} className="h-7 sm:h-8 w-auto mb-5" />}
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.grey }}>{theme.title}</p>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1" style={{ color: c.dark }}>{plan.name}</h1>
        <p className="text-sm mt-1">{theme.intro}</p>
      </header>

      {/* Avance del plan (todos los meses) */}
      <section className="px-6 sm:px-8 py-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center" style={{ background: c.soft }}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.grey }}>Avance del plan</p>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-4xl font-bold leading-none" style={{ color: c.dark }}>{pctLabel(s.pct)}</span>
            <span className="text-xs pb-1">{s.completed} de {s.completed + s.open} acciones completadas{s.cancelled ? ` · ${s.cancelled} canceladas` : ''}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white mt-3 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: pctLabel(s.pct), background: c.primary }} />
          </div>
        </div>
        <label className="flex flex-col gap-1 sm:min-w-[200px]">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.grey }}>Mes</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" style={{ color: c.dark }}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </section>

      {/* Tareas */}
      <section className="px-2 sm:px-4 py-4">
        <div className="flex items-center justify-between gap-3 px-2 sm:px-4 pb-3 flex-wrap">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: c.dark }}>
            Acciones · {month === 'all' ? 'todos los meses' : monthName}
          </h2>
          {shown.length > 0 && <span className="text-xs">{ms.completed} de {ms.completed + ms.open} completadas</span>}
        </div>
        {/* Celular */}
        <div className="sm:hidden">
          {groups.length === 0 && (
            <p className="px-2 py-8 text-center text-sm">
              {tasks.length === 0 ? 'Todavía no hay acciones cargadas en este plan.' : `No hay acciones en ${month === 'none' ? 'esta vista' : monthName}. Elegí otro mes para ver el resto.`}
            </p>
          )}
          {groups.map((g) => (
            <div key={g.key || 'sin-mes'}>
              {month === 'all' && <p className="px-2 pt-4 pb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: c.primary }}>{g.label}</p>}
              <ul>{g.tasks.map((t) => <TaskCard key={t.id} t={t} c={c} open={expanded.has(t.id)} onToggle={() => toggleRow(t.id)} />)}</ul>
            </div>
          ))}
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
              <tr className="border-b border-slate-200" style={{ color: c.grey }}>
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
              {groups.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm">
                  {tasks.length === 0 ? 'Todavía no hay acciones cargadas en este plan.' : `No hay acciones en ${month === 'none' ? 'esta vista' : monthName}. Elegí otro mes para ver el resto.`}
                </td></tr>
              )}
              {groups.map((g) => (
                <React.Fragment key={g.key || 'sin-mes'}>
                  {month === 'all' && (
                    <tr><td colSpan={7} className="px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: c.primary }}>{g.label}</td></tr>
                  )}
                  {g.tasks.map((t) => {
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
                        <td className="px-3 py-3"><TaskLinks value={t.link} color={c.dark} /></td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pie: tagline y sitio de la marca */}
      <footer className="px-6 sm:px-8 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: c.grey }}>
        <span className="font-bold">{theme.tagline}</span>
        <span>{updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}{theme.site ? `${updatedAt ? ' · ' : ''}${theme.site}` : ''}</span>
      </footer>
    </div>
  );
}

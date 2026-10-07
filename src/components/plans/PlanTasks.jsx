// ════════════════════════════════════════════════════════════════════
// PlanTasks — Tabla de tareas de un plan, con filtros y detalle
// ════════════════════════════════════════════════════════════════════
// Filtros: estado (o "Abiertas"), responsable, mes y búsqueda libre.
// Cliquear una fila despliega objetivo, resultado, comentario y links.
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';

import { TASK_STATUSES } from '@/constants/marketingPlans';
import { isOpen, monthIndex } from '@/utils/marketingPlans';
import { formatDate, todayIso } from '@/utils/date';
import { StatusBadge, PriorityBadge, SectionTitle } from './PlanBits';

const selectCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-300';

export default function PlanTasks({ tasks }) {
  const [status, setStatus] = useState('open');
  const [owner, setOwner] = useState('');
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const today = todayIso();

  const owners = useMemo(() => [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [tasks]);
  const months = useMemo(() => [...new Set(tasks.map((t) => t.month).filter(Boolean))].sort((a, b) => monthIndex(a) - monthIndex(b)), [tasks]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => (status === 'all' ? true : status === 'open' ? isOpen(t) : t.status === status))
      .filter((t) => !owner || t.owner === owner)
      .filter((t) => !month || t.month === month)
      .filter((t) => !q || [t.title, t.comment, t.result, t.objective, t.owner].some((v) => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.row || 0) - (b.row || 0));
  }, [tasks, status, owner, month, query]);

  const statusTabs = [
    { id: 'open', label: 'Abiertas', n: tasks.filter(isOpen).length },
    { id: 'all', label: 'Todas', n: tasks.length },
    ...TASK_STATUSES.map((s) => ({ id: s.id, label: s.label, n: tasks.filter((t) => t.status === s.id).length })),
  ];

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <SectionTitle n="3">Tareas</SectionTitle>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {statusTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${status === t.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            {t.label} <span className="font-mono opacity-70">{t.n}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarea, comentario o resultado…" className={`${selectCls} w-full pl-8`} />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={selectCls}>
          <option value="">Todos los responsables</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
          <option value="">Todos los meses</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">No hay tareas con estos filtros.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-100">
                <th className="py-2 px-2">Mes</th><th className="py-2 px-2">Fecha</th><th className="py-2 px-2">Acción / Tarea</th>
                <th className="py-2 px-2">Responsable</th><th className="py-2 px-2">Estado</th><th className="py-2 px-2">Prioridad</th><th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => {
                const key = `${t.row}-${i}`;
                const open = expanded === key;
                const overdue = isOpen(t) && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.date < today;
                const hasMore = t.objective || t.result || t.comment || t.links.length || t.extra.length;
                return (
                  <React.Fragment key={key}>
                    <tr onClick={() => hasMore && setExpanded(open ? null : key)} className={`border-b border-slate-50 align-top ${hasMore ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                      <td className="py-2.5 px-2 text-[11px] font-bold text-slate-500 whitespace-nowrap">{t.month || '—'}</td>
                      <td className={`py-2.5 px-2 text-[11px] font-mono whitespace-nowrap ${overdue ? 'text-red-600 font-black' : 'text-slate-500'}`} title={overdue ? 'Vencida' : undefined}>
                        {/^\d{4}-\d{2}-\d{2}$/.test(t.date) ? formatDate(t.date) : (t.date || '—')}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-slate-800 text-xs min-w-[220px]">{t.title}</td>
                      <td className="py-2.5 px-2 text-[11px] font-bold text-slate-600 whitespace-nowrap">{t.owner || <span className="text-slate-300">—</span>}</td>
                      <td className="py-2.5 px-2"><StatusBadge status={t.status} /></td>
                      <td className="py-2.5 px-2"><PriorityBadge priority={t.priority} /></td>
                      <td className="py-2.5 px-2 text-slate-300">{hasMore ? <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} /> : null}</td>
                    </tr>
                    {open && (
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid md:grid-cols-3 gap-3 text-xs">
                            {[['Objetivo', t.objective], ['Resultado', t.result], ['Comentario', t.comment]].filter(([, v]) => v).map(([l, v]) => (
                              <div key={l}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{l}</p>
                                <p className="text-slate-700 whitespace-pre-line">{v}</p>
                              </div>
                            ))}
                            {t.extra.map((x) => (
                              <div key={x.header}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{x.header}</p>
                                <p className="text-slate-700">{x.value}</p>
                              </div>
                            ))}
                          </div>
                          {t.links.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {t.links.map((l, k) => (/^https?:\/\//i.test(l) ? (
                                <a key={k} href={l} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 bg-white border border-sky-200 text-sky-700 px-2.5 py-1 rounded-lg text-[10px] font-black hover:bg-sky-50">
                                  <ExternalLink className="w-3 h-3" /> Link {t.links.length > 1 ? k + 1 : ''}
                                </a>
                              ) : (
                                <span key={k} className="bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">{l}</span>
                              )))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

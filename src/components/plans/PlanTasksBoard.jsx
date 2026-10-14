// ════════════════════════════════════════════════════════════════════
// PlanTasksBoard — Tabla de tareas de un plan (sección "3) TAREAS" del Excel)
// ════════════════════════════════════════════════════════════════════
// Una fila por tarea, agrupadas por mes. Se edita en tiempo real como la
// hoja de Social Media:
//   - Clic en el estado → pasa al siguiente (Pendiente → En curso →
//     Completado). Bloqueado y Cancelado se eligen en el editor.
//   - Clic en la tarea → abre el editor completo.
//   - "+ Agregar tarea" al pie de cada mes → carga directa (Enter guarda,
//     Esc cancela).
//   - La flecha de cada fila muestra los textos largos completos.
//
// Vista interna: todas las columnas. Vista externa: sin Responsable ni
// Deadline y solo lectura.
//
// Props:
//   plan, tasks (las del plan), mode ('internal' | 'external'), todayIso,
//   teamNames, currentUser, createTask / updateTask / removeTask
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react';

import { PLAN_TASK_STATUSES, DEFAULT_TASK_STATUS, nextTaskStatus } from '@/constants/planTasks';
import { filterTasks, groupTasksByMonth, isTaskOverdue, monthOptions, taskStats } from '@/utils/planTasks';
import { formatDate } from '@/utils/date';
import { StatusBadge, TaskLinks } from './PlanBits';
import TaskEditor from './TaskEditor';

const selectCls = 'bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300';
const thCls = 'text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400';

function LongText({ value, open }) {
  if (!value) return <span className="text-slate-300">—</span>;
  return <p className={`text-[11px] text-slate-600 leading-snug whitespace-pre-line ${open ? '' : 'line-clamp-3'}`}>{value}</p>;
}

export default function PlanTasksBoard({ plan, tasks, mode, todayIso, teamNames = [], currentUser, createTask, updateTask, removeTask }) {
  const internal = mode === 'internal';
  const [status, setStatus] = useState('all');
  const [owner, setOwner] = useState('');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [editor, setEditor] = useState(null);  // { task } | { defaults }
  const [quick, setQuick] = useState(null);    // { monthKey, title, saving }
  const [flashError, setFlashError] = useState('');

  const owners = useMemo(() => [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [tasks]);
  const shown = filterTasks(tasks, { status, owner: internal ? owner : '', query });
  const groups = groupTasksByMonth(shown);
  const filtering = status !== 'all' || (internal && owner) || query.trim();
  const nextPosition = tasks.reduce((m, t) => Math.max(m, (t.position ?? 0) + 1), 0);
  const monthKeys = useMemo(() => monthOptions(todayIso, tasks.map((t) => t.monthKey)), [todayIso, tasks]);
  const colCount = internal ? 9 : 7;

  const showError = (msg) => { setFlashError(msg); setTimeout(() => setFlashError(''), 6000); };
  const toggleRow = (id) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const rotateStatus = async (task) => {
    try { await updateTask(task.id, { status: nextTaskStatus(task.status) }); }
    catch (_e) { showError('No se pudo cambiar el estado. Probá de nuevo.'); }
  };

  const saveQuick = async () => {
    if (!quick || !quick.title.trim() || quick.saving) return;
    setQuick({ ...quick, saving: true });
    try {
      await createTask({ planId: plan.id, monthKey: quick.monthKey, title: quick.title.trim(), status: DEFAULT_TASK_STATUS, position: nextPosition, createdBy: currentUser?.name || '' });
      setQuick({ monthKey: quick.monthKey, title: '', saving: false }); // queda abierto para cargar otra
    } catch (_e) {
      setQuick({ ...quick, saving: false });
      showError('No se pudo agregar la tarea. Probá de nuevo.');
    }
  };

  const saveEditor = async (data) => {
    if (editor.task) await updateTask(editor.task.id, data);
    else await createTask({ ...data, planId: plan.id, position: nextPosition, createdBy: currentUser?.name || '' });
    setEditor(null);
  };

  const stats = taskStats(tasks);

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
          <option value="all">Todos los estados</option>
          <option value="open">Abiertas (sin completar)</option>
          {PLAN_TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {internal && (
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className={selectCls}>
            <option value="">Todos los responsables</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en tareas, objetivos, detalle…" className="w-full bg-white border border-slate-200 pl-8 pr-3 py-2 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span className="font-mono text-slate-700">{shown.length}</span> de <span className="font-mono text-slate-700">{stats.total}</span> tareas
        </span>
        {internal && (
          <button onClick={() => setEditor({ defaults: { monthKey: todayIso.slice(0, 7) } })} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nueva tarea
          </button>
        )}
      </div>

      {flashError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-xs font-bold">{flashError}</div>}

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full border-collapse text-xs table-fixed" style={{ minWidth: internal ? 1180 : 960 }}>
          <colgroup>
            <col style={{ width: 28 }} />
            <col style={{ width: 230 }} />
            {internal && <col style={{ width: 130 }} />}
            {internal && <col style={{ width: 100 }} />}
            <col style={{ width: 118 }} />
            <col />
            <col style={{ width: 150 }} />
            <col />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-1" />
              <th className={thCls}>Acción / Tarea</th>
              {internal && <th className={thCls}>Responsable</th>}
              {internal && <th className={thCls}>Deadline</th>}
              <th className={thCls}>Estado</th>
              <th className={thCls}>Objetivo</th>
              <th className={thCls}>Resultado</th>
              <th className={thCls}>Detalle</th>
              <th className={thCls}>Link</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={colCount} className="px-4 py-10 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {filtering ? 'Ninguna tarea coincide con los filtros' : internal ? 'Este plan todavía no tiene tareas: cargá la primera con «Nueva tarea» o importá el Excel.' : 'Este plan todavía no tiene tareas cargadas.'}
              </td></tr>
            )}
            {groups.map((g) => {
              const gs = taskStats(g.tasks);
              const quickHere = quick && (quick.monthKey || null) === g.key;
              return (
                <React.Fragment key={g.key || 'sin-mes'}>
                  <tr className="bg-emerald-50/60 border-y border-emerald-100">
                    <td colSpan={colCount} className="px-3 py-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">{g.label}</span>
                      <span className="ml-2 text-[10px] font-bold text-emerald-700/70">{gs.completed} de {gs.completed + gs.open} completadas{gs.cancelled ? ` · ${gs.cancelled} canceladas` : ''}</span>
                    </td>
                  </tr>
                  {g.tasks.map((t) => {
                    const open = expanded.has(t.id);
                    const overdue = internal && isTaskOverdue(t, todayIso);
                    return (
                      <tr key={t.id} className={`border-b border-slate-100 align-top hover:bg-slate-50/50 ${t.status === 'Cancelado' ? 'opacity-60' : ''}`}>
                        <td className="px-1 py-2.5 text-center">
                          <button onClick={() => toggleRow(t.id)} className="w-5 h-5 rounded hover:bg-slate-100 text-slate-400 inline-flex items-center justify-center" title={open ? 'Achicar' : 'Ver todo el texto'}>
                            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          {internal ? (
                            <button onClick={() => setEditor({ task: t })} className="text-left font-black text-slate-800 text-xs leading-snug hover:text-emerald-700" title="Editar tarea">{t.title}</button>
                          ) : (
                            <p className="font-black text-slate-800 text-xs leading-snug">{t.title}</p>
                          )}
                        </td>
                        {internal && <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600">{t.owner || <span className="text-slate-300">—</span>}</td>}
                        {internal && (
                          <td className="px-3 py-2.5">
                            {t.deadline ? (
                              <span className={`font-mono text-[11px] font-black ${overdue ? 'text-red-600' : 'text-slate-600'}`} title={overdue ? 'Vencida' : undefined}>
                                {overdue && <AlertTriangle className="w-3 h-3 inline -mt-0.5 mr-0.5" />}{formatDate(t.deadline)}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          {internal ? (
                            <button onClick={() => rotateStatus(t)} title="Clic para pasar al siguiente estado" className="hover:brightness-95">
                              <StatusBadge status={t.status} />
                            </button>
                          ) : <StatusBadge status={t.status} />}
                        </td>
                        <td className="px-3 py-2.5"><LongText value={t.objective} open={open} /></td>
                        <td className="px-3 py-2.5"><LongText value={t.result} open={open} /></td>
                        <td className="px-3 py-2.5"><LongText value={t.detail} open={open} /></td>
                        <td className="px-3 py-2.5"><TaskLinks value={t.link} /></td>
                      </tr>
                    );
                  })}
                  {internal && (
                    <tr className="border-b border-slate-100">
                      <td />
                      <td colSpan={colCount - 1} className="px-3 py-1.5">
                        {quickHere ? (
                          <div className="flex items-center gap-1.5 max-w-xl">
                            <input
                              autoFocus
                              value={quick.title}
                              onChange={(e) => setQuick({ ...quick, title: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveQuick(); if (e.key === 'Escape') setQuick(null); }}
                              placeholder={`Nueva tarea en ${g.label}…`}
                              className="flex-1 text-xs font-bold text-slate-800 bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                            <button onClick={saveQuick} disabled={!quick.title.trim() || quick.saving} className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40" title="Guardar (Enter)"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setQuick(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center" title="Cancelar (Esc)"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setQuick({ monthKey: g.key, title: '', saving: false })} className="text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-emerald-700 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Agregar tarea
                          </button>
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

      {internal && (
        <p className="px-1 text-[10px] font-bold text-slate-400">
          Clic en el estado para pasar al siguiente (Pendiente → En curso → Completado). Clic en la tarea para editarla. «Agregar tarea» carga directo en el mes.
        </p>
      )}

      {editor && (
        <TaskEditor
          task={editor.task || null}
          plan={plan}
          defaults={editor.defaults}
          monthKeys={monthKeys}
          teamNames={teamNames}
          onSave={saveEditor}
          onDelete={editor.task ? async () => {
            try { await removeTask(editor.task.id); setEditor(null); }
            catch (_e) { showError('No se pudo eliminar la tarea. Probá de nuevo.'); }
          } : null}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

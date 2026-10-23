// ════════════════════════════════════════════════════════════════════
// TaskEditor — Alta / edición de una tarea de un plan (vista interna)
// ════════════════════════════════════════════════════════════════════
// Columnas del Excel: Mes · Acción / Tarea · Responsable · Estado ·
// Objetivo · Resultado · Detalle · Link (opcional). Solo el título es
// obligatorio. Deadline oculto mientras SHOW_TASK_DEADLINE sea false.
//
// Al editar se guardan solo los campos que cambiaron, así no se pisa lo
// que otra persona cambió mientras el editor estaba abierto.
//
// Si se pasa a Completado una tarea de un mes anterior al actual (sin
// cambiarle el mes), pregunta si se completó en ese mes o si pasa al mes
// actual: así cuenta en los KPIs del mes en que se terminó.
//
// Props:
//   task          — tarea existente o null (nueva)
//   plan          — plan al que pertenece
//   defaults      — valores iniciales para una tarea nueva ({ monthKey })
//   monthKeys     — opciones del selector de mes ('YYYY-MM')
//   todayIso      — hoy ('YYYY-MM-DD'), para la pregunta del mes
//   teamNames     — el equipo: opciones de Responsable
//   onSave(data) — tarea nueva: todos los campos; existente: solo los que
//                  cambiaron (puede venir vacío)
//   onDelete() | null, onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { CalendarClock, Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';
import { PLAN_TASK_STATUSES, DEFAULT_TASK_STATUS, SHOW_TASK_DEADLINE } from '@/constants/planTasks';
import { monthLabel, needsCompletionMonthCheck } from '@/utils/planTasks';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-300';
const areaCls = `${inputCls} resize-y font-medium leading-snug`;
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function TaskEditor({ task, plan, defaults = {}, monthKeys = [], todayIso = '', onSave, onDelete, onClose, teamNames = [] }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({
    title:     task?.title || '',
    monthKey:  task ? task.monthKey || '' : defaults.monthKey || '',
    status:    task?.status || DEFAULT_TASK_STATUS,
    owner:     task?.owner || '',
    deadline:  task?.deadline || '',
    objective: task?.objective || '',
    result:    task?.result || '',
    detail:    task?.detail || '',
    link:      task?.link || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [askMonth, setAskMonth] = useState(false);
  const currentMonth = todayIso.slice(0, 7);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.title.trim().length > 0 && !saving;
  const months = form.monthKey && !monthKeys.includes(form.monthKey) ? [...monthKeys, form.monthKey].sort() : monthKeys;
  // Todo el equipo; si la tarea ya tenía a alguien de afuera (del Excel), también
  const ownerOptions = [...new Set([...teamNames, task?.owner].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

  // monthKey: para guardar con otro mes (respuesta a la pregunta del mes)
  const submit = async ({ monthKey, checked = false } = {}) => {
    if (!canSave) return;
    const next = { status: form.status, monthKey: form.monthKey || null };
    if (!checked && todayIso && needsCompletionMonthCheck(task, next, todayIso)) { setAskMonth(true); return; }
    setAskMonth(false);
    setSaving(true); setError('');
    try {
      const data = { ...form, title: form.title.trim(), owner: form.owner.trim(), link: form.link.trim(), monthKey: (monthKey ?? form.monthKey) || null };
      if (!task) { await onSave(data); return; }
      const changed = Object.fromEntries(Object.entries(data).filter(([k, v]) => (v || '') !== (task[k] || '')));
      await onSave(changed);
    } catch (_e) {
      setError('No se pudo guardar la tarea. Probá de nuevo; si sigue fallando, revisá la consola.');
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: '¿Eliminar tarea?',
      message: `Vas a eliminar "${task?.title || 'esta tarea'}" del plan. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok && onDelete) onDelete();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 truncate">{plan?.name}</p>
              <h2 className="text-base font-black text-slate-900">{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <label className={labelCls}>Acción / Tarea</label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="Ej: Mystery Shopping de ISO 27001"
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Estado</label>
              <div className="grid grid-cols-5 gap-1.5">
                {PLAN_TASK_STATUSES.map((s) => {
                  const active = form.status === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => set('status', s.id)}
                      className={`px-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${active ? `${s.solid} text-white border-transparent shadow-sm` : `${s.chip} hover:brightness-95`}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`grid grid-cols-1 ${SHOW_TASK_DEADLINE ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
              <div className="space-y-1">
                <label className={labelCls}>Mes</label>
                <select value={form.monthKey} onChange={(e) => set('monthKey', e.target.value)} className={inputCls}>
                  <option value="">Sin mes</option>
                  {months.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Responsable</label>
                <select value={form.owner} onChange={(e) => set('owner', e.target.value)} className={inputCls}>
                  <option value="">Sin responsable</option>
                  {ownerOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {SHOW_TASK_DEADLINE && (
                <div className="space-y-1">
                  <label className={labelCls}>Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className={inputCls} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Objetivo</label>
                <textarea rows={3} value={form.objective} onChange={(e) => set('objective', e.target.value)} placeholder="Qué se busca con la tarea…" className={areaCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Resultado</label>
                <textarea rows={3} value={form.result} onChange={(e) => set('result', e.target.value)} placeholder="Qué se logró…" className={areaCls} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Detalle</label>
              <textarea rows={3} value={form.detail} onChange={(e) => set('detail', e.target.value)} placeholder="Avances, aclaraciones, próximos pasos…" className={areaCls} />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Link <span className="normal-case tracking-normal font-bold text-slate-300">(opcional · uno por línea)</span></label>
              <textarea rows={2} value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://… (SharePoint, Drive, reporte…)" className={`${areaCls} font-mono text-xs`} />
            </div>

            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          </div>

          {askMonth ? (
            <div className="px-5 py-4 border-t border-amber-200 bg-amber-50 space-y-3" role="alertdialog" aria-label="¿En qué mes se completó?">
              <p className="text-sm font-black text-amber-900 flex items-start gap-2">
                <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>¿Se completó en {monthLabel(form.monthKey)}?</span>
              </p>
              <p className="text-[11px] font-medium text-amber-900/80 -mt-1.5">
                La tarea está en {monthLabel(form.monthKey)}. Si se terminó en {monthLabel(currentMonth)}, pasala a ese mes para que cuente en sus entregables y en su reporte.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => submit({ monthKey: currentMonth, checked: true })} className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg">
                  Pasarla a {monthLabel(currentMonth)}
                </button>
                <button onClick={() => submit({ checked: true })} className="text-[10px] font-black uppercase tracking-wider bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-3 py-2 rounded-lg">
                  Sí, dejarla en {monthLabel(form.monthKey)}
                </button>
                <button onClick={() => setAskMonth(false)} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">Volver</button>
              </div>
            </div>
          ) : (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            {onDelete && (
              <button onClick={remove} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-2 disabled:opacity-40">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">Cancelar</button>
            <button onClick={() => submit()} disabled={!canSave} className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

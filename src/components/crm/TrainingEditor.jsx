// ════════════════════════════════════════════════════════════════════
// TrainingEditor — Alta / edición de un entrenamiento del CRM
// ════════════════════════════════════════════════════════════════════
// Campos: entidad, tipo, título, fecha, capacitador, asistentes, estado
// (4 chips), mes de cobro, monto, notas.
//
// Props:
//   training        — null para crear
//   entities        — lista de entidades (para el select)
//   defaultEntityId — entidad preseleccionada al crear
//   currentUser     — para created_by
//   onSave(form), onDelete(), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';
import { TEAM_MEMBERS } from '@/constants/team';
import {
  TRAINING_TYPES, TRAINING_STATUSES, DEFAULT_TRAINING_TYPE, DEFAULT_TRAINING_STATUS, CRM_UNIT_BY_ID,
} from '@/constants/crm';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function TrainingEditor({ training, entities, defaultEntityId, currentUser, onSave, onDelete, onClose }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({
    entityId:    training?.entityId || defaultEntityId || (entities[0] && entities[0].id) || '',
    type:        training?.type || DEFAULT_TRAINING_TYPE,
    title:       training?.title || '',
    date:        training?.date || '',
    trainer:     training?.trainer || '',
    attendees:   training?.attendees ?? '',
    status:      training?.status || DEFAULT_TRAINING_STATUS,
    billedMonth: training?.billedMonth || '',
    amount:      training?.amount ?? '',
    notes:       training?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = !!form.entityId && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const typeLabel = TRAINING_TYPES.find((t) => t.id === form.type)?.label || '';
      await onSave({
        ...form,
        title: form.title.trim() || typeLabel,
        attendees: form.attendees === '' ? null : Number(form.attendees),
        amount: form.amount === '' ? null : Number(form.amount),
        createdBy: training ? undefined : (currentUser?.name || ''),
      });
    } catch (_e) {
      alert('No se pudo guardar el entrenamiento. Revisá la consola.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: '¿Eliminar entrenamiento?',
      message: `Vas a eliminar "${training?.title || 'este entrenamiento'}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok && onDelete) onDelete();
  };

  const sortedEntities = [...entities].sort((a, b) => (a.unit + a.name).localeCompare(b.unit + b.name));
  const needsBilling = form.status === 'cobrado';

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-sky-50 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">{training ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}</h2>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">Uso del CRM HubSpot · clientes internos</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center" title="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Entidad</label>
                <select value={form.entityId} onChange={(e) => set('entityId', e.target.value)} className={inputCls}>
                  {sortedEntities.map((en) => <option key={en.id} value={en.id}>{CRM_UNIT_BY_ID[en.unit]?.short || ''} · {en.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Tipo</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>
                  {TRAINING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Título / tema (opcional)</label>
              <input autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder="Ej: Pipeline y deals para el equipo comercial" className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Estado</label>
              <div className="grid grid-cols-4 gap-1.5">
                {TRAINING_STATUSES.map((s) => {
                  const active = form.status === s.id;
                  return (
                    <button key={s.id} onClick={() => set('status', s.id)} className={`px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${active ? s.solid + ' border-transparent shadow-sm' : s.color + ' hover:brightness-95'}`}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Fecha</label>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Capacitador</label>
                <input list="crm-trainers" value={form.trainer} onChange={(e) => set('trainer', e.target.value)} placeholder="Quién lo dio" className={inputCls} />
                <datalist id="crm-trainers">{TEAM_MEMBERS.map((m) => <option key={m.name} value={m.name} />)}</datalist>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Asistentes</label>
                <input type="number" min="0" value={form.attendees} onChange={(e) => set('attendees', e.target.value)} className={`${inputCls} font-mono`} />
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 rounded-2xl border p-3 ${needsBilling ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="space-y-1">
                <label className={labelCls}>Mes en que se cobró</label>
                <input type="month" value={form.billedMonth} onChange={(e) => set('billedMonth', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Monto (USD)</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="Vacío = va en el total del mes" className={`${inputCls} font-mono`} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notas</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Qué se vio, pendientes, quién pidió el refuerzo…" />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
            {training && (
              <button onClick={remove} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className="text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 px-3 py-2 rounded-xl">Cancelar</button>
            <button onClick={submit} disabled={!canSave} className="text-[11px] font-black uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-40 px-4 py-2 rounded-xl shadow-sm">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ════════════════════════════════════════════════════════════════════
// EntityEditor — Alta / edición de una entidad (cliente interno del CRM)
// ════════════════════════════════════════════════════════════════════
// Campos: nombre, unidad, entidad legal, medio de facturación, moneda,
// responsable, autoriza el pago, progreso (%), checklist de adopción, notas.
//
// Props: entity (null para crear), onSave(form), onDelete(), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';
import { CRM_UNITS, BILLING_MEDIA, ADOPTION_CHECKS } from '@/constants/crm';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function EntityEditor({ entity, onSave, onDelete, onClose }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({
    name:          entity?.name || '',
    unit:          entity?.unit || 'cu',
    legalEntity:   entity?.legalEntity || '',
    billingMedium: entity?.billingMedium || '',
    currency:      entity?.currency || 'USD',
    responsible:   entity?.responsible || '',
    approver:      entity?.approver || '',
    progress:      entity?.progress === null || entity?.progress === undefined ? '' : Math.round(entity.progress * 100),
    checks:        { ...(entity?.checks || {}) },
    notes:         entity?.notes || '',
    active:        entity?.active !== false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCheck = (id) => setForm((f) => ({ ...f, checks: { ...f.checks, [id]: !f.checks[id] } }));
  const canSave = form.name.trim().length > 0 && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        progress: form.progress === '' ? null : Math.min(1, Math.max(0, Number(form.progress) / 100)),
      });
    } catch (_e) {
      alert('No se pudo guardar la entidad. Revisá la consola.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: '¿Eliminar entidad?',
      message: `Se elimina "${entity?.name}" y todos sus entrenamientos. Si solo querés sacarla de la vista, desactivala.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok && onDelete) onDelete();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-sky-50 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">{entity ? 'Editar entidad' : 'Nueva entidad'}</h2>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">Cliente interno del CRM: facturación y adopción</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center" title="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Nombre</label>
                <input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: CU Peru" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Unidad</label>
                <select value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls}>
                  {CRM_UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Entidad legal</label>
              <input value={form.legalEntity} onChange={(e) => set('legalEntity', e.target.value)} placeholder="Ej: 536 - Control Union Services Peru S.A.C." className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Se factura por</label>
                <select value={form.billingMedium} onChange={(e) => set('billingMedium', e.target.value)} className={inputCls}>
                  <option value="">Sin definir</option>
                  {BILLING_MEDIA.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Moneda</label>
                <input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} className={`${inputCls} font-mono`} maxLength={3} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Responsable (MarComms)</label>
                <input value={form.responsible} onChange={(e) => set('responsible', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Autoriza el pago</label>
                <input value={form.approver} onChange={(e) => set('approver', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <label className={labelCls}>Adopción del CRM</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">Progreso</span>
                  <input type="number" min="0" max="100" value={form.progress} onChange={(e) => set('progress', e.target.value)} className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none text-right" />
                  <span className="text-[10px] font-bold text-slate-400">%</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ADOPTION_CHECKS.map((c) => {
                  const on = !!form.checks[c.id];
                  return (
                    <button key={c.id} onClick={() => toggleCheck(c.id)} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-bold transition-all ${on ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${on ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}>{on && <Check className="w-3 h-3" />}</span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notas</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </div>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Activa (se muestra en la vista)
            </label>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
            {entity && !entity.isFallback && (
              <button onClick={remove} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className="text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 px-3 py-2 rounded-xl">Cancelar</button>
            <button onClick={submit} disabled={!canSave} className="text-[11px] font-black uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-40 px-4 py-2 rounded-xl shadow-sm">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ════════════════════════════════════════════════════════════════════
// NextStepEditor — Alta / edición de un próximo step de una entidad
// ════════════════════════════════════════════════════════════════════
// Como el editor de iniciativas de los planes: Tipo (agrupa, opcional) ·
// Próximo step · Detalle. Solo el step es obligatorio. Al editar se
// guardan solo los campos que cambiaron.
//
// Props: step (o null), entity, defaults ({ category }), categories,
//   onSave(data) (async), onDelete() | null, onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function NextStepEditor({ step, entity, defaults = {}, categories = [], onSave, onDelete, onClose }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({
    category: step ? step.category || '' : defaults.category || '',
    title: step?.title || '',
    detail: step?.detail || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.title.trim().length > 0 && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true); setError('');
    try {
      const data = { category: form.category.trim(), title: form.title.trim(), detail: form.detail.trim() };
      if (!step) { await onSave(data); return; }
      await onSave(Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== (step[k] || ''))));
    } catch (_e) {
      setError('No se pudo guardar el step. Probá de nuevo; si sigue fallando, revisá la consola.');
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: '¿Eliminar el step?',
      message: `Vas a eliminar "${step?.title || 'este step'}" de ${entity?.name || 'la entidad'}. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok && onDelete) onDelete();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-sky-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700 truncate">{entity ? `${entity.code} · ${entity.name}` : ''}</p>
              <h2 className="text-base font-black text-slate-900">{step ? 'Editar próximo step' : 'Nuevo próximo step'}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <label className={labelCls} htmlFor="step-category">Tipo <span className="normal-case tracking-normal font-bold text-slate-300">(opcional)</span></label>
              <input id="step-category" list="step-categories" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Ej: Implementación" className={inputCls} />
              <datalist id="step-categories">{categories.map((cat) => <option key={cat} value={cat} />)}</datalist>
              <p className="text-[10px] font-bold text-slate-400">Agrupa los steps. Elegí uno de la lista, escribí otro o dejalo vacío.</p>
            </div>
            <div className="space-y-1">
              <label className={labelCls} htmlFor="step-title">Próximo step</label>
              <input id="step-title" autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder="Ej: Conectar Outlook de todo el equipo comercial" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls} htmlFor="step-detail">Detalle</label>
              <textarea id="step-detail" rows={4} value={form.detail} onChange={(e) => set('detail', e.target.value)} placeholder="Ej: Quiénes, para cuándo y qué falta." className={`${inputCls} resize-y font-medium leading-snug`} />
            </div>
            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            {onDelete && (
              <button onClick={remove} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-2 disabled:opacity-40">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">Cancelar</button>
            <button onClick={submit} disabled={!canSave} className="text-[10px] font-black uppercase tracking-wider bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

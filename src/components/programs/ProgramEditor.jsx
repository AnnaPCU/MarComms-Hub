// ════════════════════════════════════════════════════════════════════
// ProgramEditor — Editar los datos de un programa existente
// ════════════════════════════════════════════════════════════════════
// Props: program, onSave(patch), onDelete(), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';
import { MARKETS, unitsForCountry } from '@/constants/markets';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function ProgramEditor({ program, onSave, onDelete, onClose }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({
    name: program.name || '', client: program.client || '', country: program.country || '', businessUnit: program.businessUnit || '',
    objective: program.objective || '', startDate: program.startDate || '', endDate: program.endDate || '', notes: program.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try { await onSave({ ...form, name: form.name.trim() }); }
    catch (_e) { alert('No se pudo guardar el programa. Revisá la consola.'); setSaving(false); }
  };
  const remove = async () => {
    const ok = await confirm({
      title: '¿Eliminar programa?',
      message: `Se elimina "${program.name}". Los pilares (webinar, campañas, evento) NO se borran: quedan como proyectos sueltos.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok) onDelete();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-violet-50 flex items-start justify-between gap-3">
            <h2 className="text-base font-black text-slate-900">Editar programa</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center" title="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
          </div>
          <div className="p-5 space-y-3 overflow-y-auto">
            <div className="space-y-1"><label className={labelCls}>Nombre *</label><input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>País</label>
                <select value={form.country} onChange={(e) => { set('country', e.target.value); set('businessUnit', ''); }} className={inputCls}>
                  <option value="">Seleccionar...</option>
                  {Object.keys(MARKETS).sort().map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Unidad de negocio</label>
                <select value={form.businessUnit} onChange={(e) => set('businessUnit', e.target.value)} className={inputCls}>
                  <option value="">Seleccionar...</option>
                  {(form.country ? unitsForCountry(form.country) : []).concat(form.businessUnit && !(form.country && unitsForCountry(form.country).includes(form.businessUnit)) ? [form.businessUnit] : []).map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1"><label className={labelCls}>Cliente</label><input value={form.client} onChange={(e) => set('client', e.target.value)} className={inputCls} /></div>
              <div className="space-y-1"><label className={labelCls}>Objetivo</label><input value={form.objective} onChange={(e) => set('objective', e.target.value)} className={inputCls} /></div>
              <div className="space-y-1"><label className={labelCls}>Inicio</label><input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></div>
              <div className="space-y-1"><label className={labelCls}>Fin</label><input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></div>
            </div>
            <div className="space-y-1"><label className={labelCls}>Notas</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${inputCls} resize-none`} /></div>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
            <button onClick={remove} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
            <div className="flex-1" />
            <button onClick={onClose} className="text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 px-3 py-2 rounded-xl">Cancelar</button>
            <button onClick={submit} disabled={!form.name.trim() || saving} className="text-[11px] font-black uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 px-4 py-2 rounded-xl shadow-sm">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

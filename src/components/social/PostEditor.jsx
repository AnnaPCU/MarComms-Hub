// ════════════════════════════════════════════════════════════════════
// PostEditor — Alta / edición de un posteo de la hoja de Social Media
// ════════════════════════════════════════════════════════════════════
// Campos: título, estado (4 chips), temática, semana, fecha de publicación, link, notas.
//
// Props:
//   post             — posteo existente o null (nuevo)
//   account          — cuenta a la que pertenece
//   weeks            — semanas del mes que se está mirando
//   defaultWeekStart — semana preseleccionada
//   onSave(data), onDelete() | null, onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';
import { POST_STATUSES, DEFAULT_POST_STATUS } from '@/constants/socialPosts';
import { WORLD_DAY_THEMES } from '@/constants/worldDays';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-pink-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function PostEditor({ post, account, weeks, defaultWeekStart, onSave, onDelete, onClose }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({
    title:     post?.title || '',
    status:    post?.status || DEFAULT_POST_STATUS,
    theme:     post?.theme || '',
    weekStart: post?.weekStart || defaultWeekStart || (weeks[0] && weeks[0].start) || '',
    publishDate: post?.publishDate || '',
    link:      post?.link || '',
    notes:     post?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.title.trim().length > 0 && !!form.weekStart && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim() });
    } catch (_e) {
      alert('No se pudo guardar el posteo. Revisá la consola.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: '¿Eliminar posteo?',
      message: `Vas a eliminar "${post?.title || 'este posteo'}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok && onDelete) onDelete();
  };

  // Si el posteo es de otro mes, sumar su semana a las opciones
  const weekOptions = weeks.some((w) => w.start === form.weekStart) || !form.weekStart
    ? weeks
    : [{ index: 0, start: form.weekStart, label: `semana del ${form.weekStart}` }, ...weeks];

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-pink-50 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">{account?.group} · {account?.name}</p>
              <h2 className="text-base font-black text-slate-900">{post ? 'Editar posteo' : 'Nuevo posteo'}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <label className={labelCls}>Título / tema del posteo</label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="Ej: Certificación ISCC EU para biometano"
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Estado</label>
              <div className="grid grid-cols-4 gap-1.5">
                {POST_STATUSES.map((s) => {
                  const active = form.status === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => set('status', s.id)}
                      className={`px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${active ? s.solid + ' border-transparent shadow-sm' : s.color + ' hover:brightness-95'}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Temática</label>
                <select value={form.theme} onChange={(e) => set('theme', e.target.value)} className={inputCls}>
                  <option value="">Sin temática</option>
                  {WORLD_DAY_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Semana</label>
                <select value={form.weekStart} onChange={(e) => set('weekStart', e.target.value)} className={inputCls}>
                  {weekOptions.map((w) => <option key={w.start} value={w.start}>{w.index ? `Semana ${w.index} · ` : ''}{w.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Fecha de publicación (opcional)</label>
                <input type="date" value={form.publishDate} onChange={(e) => set('publishDate', e.target.value)} className={inputCls} title="Cuando está pactada, el posteo aparece en el calendario" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Link (opcional)</label>
                <input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="Drive, Canva, LinkedIn…" className={inputCls} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notas (opcional)</label>
              <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Referencias, pedidos del cliente, cambios…" className={inputCls + ' resize-none'} />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            {onDelete && (
              <button onClick={remove} className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-2">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">Cancelar</button>
            <button onClick={submit} disabled={!canSave} className="text-[10px] font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

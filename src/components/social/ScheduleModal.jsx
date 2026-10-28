// ════════════════════════════════════════════════════════════════════
// ScheduleModal — Pasar un posteo a «Programado» desde la hoja
// ════════════════════════════════════════════════════════════════════
// Aparece al cambiar el estado con el punto de color del posteo (o al
// cargar uno nuevo con «Programado» desde el + de la celda): pide dónde se
// programó, la fecha y la hora de publicación. Sin los tres no se puede
// confirmar; «Cancelar» deja el posteo como estaba.
//
// Props: title (del posteo), account, initial ({ scheduledOn, publishDate,
//   publishTime }), onConfirm(data) (async), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { scheduleMissing } from '@/utils/socialPosts';
import ScheduleFields from './ScheduleFields';

export default function ScheduleModal({ title, account, initial = {}, onConfirm, onClose }) {
  const [form, setForm] = useState({
    scheduledOn: initial.scheduledOn || '',
    publishDate: initial.publishDate || '',
    publishTime: initial.publishTime || '',
  });
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const missing = scheduleMissing(form);

  const submit = async () => {
    setTried(true);
    if (missing.length || saving) return;
    setSaving(true); setError('');
    try { await onConfirm(form); }
    catch (_e) { setError('No se pudo guardar. Probá de nuevo; si sigue fallando, revisá la consola.'); setSaving(false); }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" role="dialog" aria-label="Programar posteo" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape' && !saving) onClose(); }}>
          <div className="px-5 py-4 border-b border-slate-100 bg-violet-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 truncate">{account ? `${account.group} · ${account.name}` : 'Posteo'}</p>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-violet-600" /> Programar posteo</h2>
              {title && <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">{title}</p>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>
          <div className="p-5 space-y-3">
            <ScheduleFields value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} showErrors={tried} idPrefix="schedule-modal" />
            {tried && missing.length > 0 && <p className="text-[11px] font-bold text-red-600">Falta: {missing.join(', ')}.</p>}
            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <div className="flex-1" />
            <button onClick={onClose} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">Cancelar</button>
            <button onClick={submit} disabled={saving} className="text-[10px] font-black uppercase tracking-wider bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg">
              {saving ? 'Guardando…' : 'Programar'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

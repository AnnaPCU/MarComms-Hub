// ════════════════════════════════════════════════════════════════════
// DeleteItemModal — Eliminar un ítem del checklist (nov 2026)
// ════════════════════════════════════════════════════════════════════
// Dos opciones: quitarlo solo de la entidad abierta (lo demás queda igual)
// o eliminarlo de todas las entidades donde está. Las dos borran lo que
// tenía cargado (tilde y deadline). Si el ítem solo estaba en esta
// entidad, hay una sola opción.
//
// Props: item, entity, total (en cuántas entidades está), onlyHere,
//   onOnlyHere() / onAll() (async), onClose
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';

export default function DeleteItemModal({ item, entity, total, onlyHere, onOnlyHere, onAll, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); onClose(); } catch (_e) { setError('Could not delete. Please try again.'); setBusy(false); }
  };
  const option = 'w-full text-left rounded-2xl border px-4 py-3 transition-colors disabled:opacity-40';
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Delete checklist item">
          <div className="px-5 py-4 border-b border-slate-100 bg-red-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Delete checklist item</p>
              <h2 className="text-base font-black text-slate-900 leading-tight">«{item.label}»</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cancel"><X className="w-4 h-4 text-slate-600" /></button>
          </div>
          <div className="p-5 space-y-2.5">
            {onlyHere ? (
              <button disabled={busy} onClick={() => go(onAll)} className={`${option} border-red-200 hover:bg-red-50`}>
                <p className="text-sm font-black text-red-700 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">This item is only in {entity.code} · {entity.name}.</p>
              </button>
            ) : (
              <>
                <button disabled={busy} onClick={() => go(onOnlyHere)} className={`${option} border-slate-200 hover:border-sky-300 hover:bg-sky-50`}>
                  <p className="text-sm font-black text-slate-800">From this entity only</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">It is removed from {entity.code} · {entity.name} (the other {Math.max(total - 1, 0)} keep it).</p>
                </button>
                <button disabled={busy} onClick={() => go(onAll)} className={`${option} border-red-200 hover:bg-red-50`}>
                  <p className="text-sm font-black text-red-700 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> From all entities ({total})</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">The item is deleted from the checklist in every entity that has it.</p>
                </button>
              </>
            )}
            <p className="text-[10px] font-bold text-slate-400">What was filled in (tick and deadline) is deleted too. This cannot be undone.</p>
            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

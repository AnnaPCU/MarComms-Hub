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
    try { await fn(); onClose(); } catch (_e) { setError('No se pudo eliminar. Probá de nuevo.'); setBusy(false); }
  };
  const option = 'w-full text-left rounded-2xl border px-4 py-3 transition-colors disabled:opacity-40';
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Eliminar ítem del checklist">
          <div className="px-5 py-4 border-b border-slate-100 bg-red-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Eliminar ítem del checklist</p>
              <h2 className="text-base font-black text-slate-900 leading-tight">«{item.label}»</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cancelar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>
          <div className="p-5 space-y-2.5">
            {onlyHere ? (
              <button disabled={busy} onClick={() => go(onAll)} className={`${option} border-red-200 hover:bg-red-50`}>
                <p className="text-sm font-black text-red-700 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Eliminar</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">Este ítem solo está en {entity.code} · {entity.name}.</p>
              </button>
            ) : (
              <>
                <button disabled={busy} onClick={() => go(onOnlyHere)} className={`${option} border-slate-200 hover:border-sky-300 hover:bg-sky-50`}>
                  <p className="text-sm font-black text-slate-800">Solo de esta entidad</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">Se quita de {entity.code} · {entity.name} (las otras {Math.max(total - 1, 0)} lo siguen teniendo).</p>
                </button>
                <button disabled={busy} onClick={() => go(onAll)} className={`${option} border-red-200 hover:bg-red-50`}>
                  <p className="text-sm font-black text-red-700 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> De todas las entidades ({total})</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">Se elimina el ítem del checklist en todas las entidades donde está.</p>
                </button>
              </>
            )}
            <p className="text-[10px] font-bold text-slate-400">También se borra lo cargado (tilde y deadline). No se puede deshacer.</p>
            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ════════════════════════════════════════════════════════════════════
// SheetNotes — Notas del mes de una hoja de Facturación
// ════════════════════════════════════════════════════════════════════
// Lo que en el Excel quedaba suelto debajo de la tabla (ej. «invoice
// Delphy BV presentacion USD150»). Se guarda al salir del cuadro. Con
// «@» se etiqueta a alguien del equipo: le llega un aviso (notificación
// invoicing_mention) que abre este mes y esta hoja.
//
// Props: value, onSave(text), people (nombres del equipo)
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { AtSign, StickyNote } from 'lucide-react';
import { useMentionInput } from '@/hooks/useMentionInput';
import { extractMentions } from '@/utils/mentions';
import MentionPicker from '@/components/shared/MentionPicker';

export default function SheetNotes({ value = '', onSave, people = [] }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (!focused) setText(value); }, [value, focused]);
  const mention = useMentionInput({ people, ref, setText, enabled: people.length > 0 });
  const tagged = extractMentions(text, people);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <label className="block">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Notas del mes
          {people.length > 0 && <span className="normal-case tracking-normal font-bold text-slate-400">· con @ etiquetás a alguien del equipo y le llega un aviso</span>}
        </span>
        <div className="relative">
          <textarea
            ref={ref}
            value={text}
            rows={Math.max(2, text.split('\n').length)}
            onFocus={() => setFocused(true)}
            onChange={(e) => { setText(e.target.value); mention.update(); }}
            onKeyDown={(e) => { mention.onKeyDown(e); }}
            onKeyUp={mention.update}
            onClick={mention.update}
            onBlur={() => { setFocused(false); mention.close(); if (text !== value) onSave(text); }}
            placeholder="Lo que en el Excel quedaba anotado debajo de la tabla."
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-300"
          />
          {mention.open && <MentionPicker matches={mention.matches} active={mention.active} onPick={mention.pick} onHover={mention.setActive} />}
        </div>
      </label>
      {tagged.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span>Se le avisa a</span>
          {tagged.map((n) => <span key={n} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-emerald-800"><AtSign className="w-2.5 h-2.5" />{n}</span>)}
        </p>
      )}
    </div>
  );
}

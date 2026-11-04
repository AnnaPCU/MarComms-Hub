// ════════════════════════════════════════════════════════════════════
// SheetNotes — Notas del mes de una hoja de Facturación
// ════════════════════════════════════════════════════════════════════
// Lo que en el Excel quedaba suelto debajo de la tabla (ej. «invoice
// Delphy BV presentacion USD150»). Se guarda al salir del cuadro.
//
// Props: value, onSave(text)
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';

export default function SheetNotes({ value = '', onSave }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(value); }, [value, focused]);

  return (
    <label className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
        <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Notas del mes
      </span>
      <textarea
        value={text}
        rows={Math.max(2, text.split('\n').length)}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { setFocused(false); if (text !== value) onSave(text); }}
        placeholder="Lo que en el Excel quedaba anotado debajo de la tabla."
        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-300"
      />
    </label>
  );
}

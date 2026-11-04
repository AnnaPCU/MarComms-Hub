// ════════════════════════════════════════════════════════════════════
// MentionPicker — Lista del equipo para etiquetar con @
// ════════════════════════════════════════════════════════════════════
// Va dentro de un contenedor `relative`, debajo del input o textarea.
// Props: matches (nombres), active (índice), onPick(name), onHover(i)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AtSign } from 'lucide-react';

export default function MentionPicker({ matches = [], active = 0, onPick, onHover }) {
  if (!matches.length) return null;
  return (
    <ul role="listbox" aria-label="Etiquetar a alguien del equipo" className="hub-popover absolute left-2 top-full mt-1 z-50 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1">
      <li className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Etiquetar · le llega un aviso</li>
      {matches.map((name, i) => (
        <li key={name} role="option" aria-selected={i === active}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => onHover?.(i)}
            onClick={() => onPick(name)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs font-bold ${i === active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            <AtSign className="w-3 h-3 text-emerald-500 shrink-0" /> {name}
          </button>
        </li>
      ))}
    </ul>
  );
}

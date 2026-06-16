// ════════════════════════════════════════════════════════════════════
// TagInput — Editor de etiquetas (chips) reutilizable
// ════════════════════════════════════════════════════════════════════
// Muestra los tags como chips (con X para quitar) + un input que agrega
// al presionar Enter o al perder foco.
//
// Props:
//   tags       : string[]
//   onChange   : (nextTags: string[]) => void
//   placeholder: string
//   accent     : 'blue' | 'emerald' | 'purple' | 'slate' (default 'blue')
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { X } from 'lucide-react';

const ACCENT = {
  blue:    'bg-blue-50 border-blue-200 text-blue-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  purple:  'bg-purple-50 border-purple-200 text-purple-700',
  slate:   'bg-slate-50 border-slate-200 text-slate-700',
};

export default function TagInput({ tags, onChange, placeholder = '+ etiqueta', accent = 'blue' }) {
  const list = Array.isArray(tags) ? tags : [];
  const [input, setInput] = useState('');
  const chip = ACCENT[accent] || ACCENT.blue;

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (list.some((t) => t.toLowerCase() === v.toLowerCase())) { setInput(''); return; }
    onChange([...list, v]);
    setInput('');
  };
  const remove = (t) => onChange(list.filter((x) => x !== t));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {list.map((t) => (
        <span key={t} className={`inline-flex items-center gap-1 border rounded-full pl-2 pr-1 py-0.5 text-[10px] font-bold ${chip}`}>
          {t}
          <button type="button" onClick={() => remove(t)} className="hover:text-red-600" title="Quitar etiqueta">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder}
        className="min-w-[90px] flex-1 text-[10px] p-1.5 border border-dashed border-slate-300 bg-white rounded font-semibold text-slate-600 outline-none focus:border-blue-400"
      />
    </div>
  );
}

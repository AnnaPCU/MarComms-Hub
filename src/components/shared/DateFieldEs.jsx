// ════════════════════════════════════════════════════════════════════
// DateFieldEs — Fecha siempre en español: dd/mm/aaaa
// ════════════════════════════════════════════════════════════════════
// El <input type="date"> del navegador muestra la fecha en el idioma del
// navegador (en inglés: mm/dd/yyyy). Este campo se escribe y se ve como
// dd/mm/aaaa (las barras se ponen solas) y el botón del calendario abre el
// selector del navegador. Guarda en ISO ('YYYY-MM-DD'): onChange se llama
// al terminar de escribir una fecha válida, al salir del campo o al
// elegirla en el calendario. Una fecha inválida se marca en rojo y, al
// salir, vuelve a la anterior.
//
// Props: id, value ('YYYY-MM-DD' | ''), onChange(iso | ''), style,
//   className (del contenedor), ariaLabel
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatDmy as formatShortDate, maskDmy, parseDmy } from '@/utils/date';

export default function DateFieldEs({ id, value = '', onChange, style, className = '', ariaLabel = 'Fecha' }) {
  const [text, setText] = useState(formatShortDate(value));
  const [invalid, setInvalid] = useState(false);
  const picker = useRef(null);
  useEffect(() => { setText(formatShortDate(value)); setInvalid(false); }, [value]);

  const commit = (raw) => {
    const t = raw.trim();
    if (!t) { setInvalid(false); if (value) onChange(''); return; }
    const iso = parseDmy(t);
    if (!iso) { setInvalid(true); return; }
    setInvalid(false);
    setText(formatShortDate(iso));
    if (iso !== value) onChange(iso);
  };

  const type = (raw) => {
    const masked = maskDmy(raw);
    setText(masked);
    setInvalid(false);
    if (/\/\d{4}$/.test(masked)) commit(masked); // año completo → guarda (o marca si no existe)
  };

  const openPicker = () => {
    const el = picker.current;
    if (!el) return;
    try { el.showPicker(); } catch (_e) { el.focus(); el.click(); }
  };

  return (
    <div className={`relative flex items-center rounded-lg border ${invalid ? 'border-red-400 ring-2 ring-red-100 text-red-600' : style ? '' : 'border-slate-200 bg-white text-slate-500'} ${className}`} style={invalid ? undefined : style}>
      <input
        id={id}
        value={text}
        onChange={(e) => type(e.target.value)}
        onBlur={() => { if (invalid || (text && !parseDmy(text))) { setText(formatShortDate(value)); setInvalid(false); } else commit(text); }}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(text); if (e.key === 'Escape') { setText(formatShortDate(value)); setInvalid(false); } }}
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        aria-label={ariaLabel}
        title={invalid ? 'Fecha inválida: usá dd/mm/aaaa' : ariaLabel}
        className="w-[92px] bg-transparent pl-2 py-1.5 text-[11px] font-bold font-mono outline-none placeholder:text-slate-300"
        style={{ color: 'inherit' }}
      />
      <button type="button" onClick={openPicker} className="px-1.5 py-1.5 opacity-60 hover:opacity-100" title="Elegir en el calendario" aria-label="Elegir en el calendario">
        <CalendarDays className="w-3.5 h-3.5" />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
        className="absolute right-0 bottom-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}

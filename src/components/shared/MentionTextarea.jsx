// ════════════════════════════════════════════════════════════════════
// MentionTextarea — Textarea con autocompletado de @menciones
// ════════════════════════════════════════════════════════════════════
// Al escribir "@" y letras, muestra un dropdown con los nombres del
// equipo que matchean. Al seleccionar, inserta "@Nombre Completo ".
//
// Las menciones se detectan luego con extractMentions(text, people).
//
// Props:
//   value, onChange(string), placeholder, people (string[]),
//   rows, className, ringClass
// ════════════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import { AtSign } from 'lucide-react';

/**
 * Extrae los nombres del equipo mencionados con @ en un texto.
 * Hace match sobre la lista `people` (nombres completos) — soporta
 * que el nombre tenga espacios ("@Victoria Colombo").
 */
export const extractMentions = (text, people = []) => {
  if (!text) return [];
  const found = new Set();
  people.forEach((name) => {
    // Busca "@Nombre Completo" (case-insensitive)
    const re = new RegExp('@' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(text)) found.add(name);
  });
  return [...found];
};

export default function MentionTextarea({
  value,
  onChange,
  placeholder = 'Escribí un comentario… usá @ para etiquetar',
  people = [],
  rows = 2,
  className = '',
  ringClass = 'focus:ring-blue-400',
}) {
  const taRef = useRef(null);
  const [query, setQuery] = useState(null); // null = sin mención activa
  const [anchor, setAnchor] = useState(0);  // posición del "@"
  const [highlight, setHighlight] = useState(0);

  const suggestions = query !== null
    ? people.filter((p) => p.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const detectMention = (text, caret) => {
    // Buscar el último "@" antes del caret sin salto de línea entre medio
    const upto = text.slice(0, caret);
    const at = upto.lastIndexOf('@');
    if (at === -1) { setQuery(null); return; }
    const between = upto.slice(at + 1);
    // Cortar si hay newline; permitir espacios (nombres compuestos) pero
    // no más de ~25 chars de query
    if (between.includes('\n') || between.length > 25) { setQuery(null); return; }
    setAnchor(at);
    setQuery(between);
    setHighlight(0);
  };

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);
    detectMention(text, e.target.selectionStart);
  };

  const pickSuggestion = (name) => {
    const before = value.slice(0, anchor);
    const caret = taRef.current ? taRef.current.selectionStart : value.length;
    const after = value.slice(caret);
    const next = `${before}@${name} ${after}`;
    onChange(next);
    setQuery(null);
    // Reposicionar cursor después del nombre insertado
    setTimeout(() => {
      if (taRef.current) {
        const pos = before.length + name.length + 2; // @ + nombre + espacio
        taRef.current.focus();
        taRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (query === null || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === 'Enter') { e.preventDefault(); pickSuggestion(suggestions[highlight]); }
    else if (e.key === 'Escape') { setQuery(null); }
  };

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        rows={rows}
        className={`w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 resize-none outline-none focus:ring-2 ${ringClass} ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {query !== null && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
          <p className="px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 flex items-center gap-1">
            <AtSign className="w-2.5 h-2.5" /> Etiquetar a…
          </p>
          {suggestions.map((p, i) => (
            <button
              key={p}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pickSuggestion(p); }}
              className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${i === highlight ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

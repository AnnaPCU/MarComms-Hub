// ════════════════════════════════════════════════════════════════════
// GridCell — Una celda editable de Facturación (como en el Excel)
// ════════════════════════════════════════════════════════════════════
// Se escribe directo en la celda; se guarda al salir (Tab, clic afuera) o
// con Enter, que además baja a la celda de abajo. Esc deshace lo escrito.
// Shift+Enter o Alt+Enter: salto de línea (en las de texto).
//
// Números: se guarda lo escrito ("450", "=350/4*3", "=grupo/3") y se
// muestra el valor (262,5). Al entrar a la celda se ve la fórmula. Si no
// es un número ni una cuenta, queda en rojo. Las que siguen a la fila
// gris (=grupo/3) llevan una ƒ celeste.
// type 'total': muestra el valor calculado; si se escribe algo pisa el
// cálculo (queda en ámbar); vacío vuelve a la fórmula.
//
// Props: value (lo guardado), type ('text' | 'number' | 'total'),
//   computed (para 'total'), ctx (fila gris, para "grupo"), multiline,
//   compact (una sola línea, el texto completo al pasar el mouse), mono,
//   list (id de datalist), readOnly, placeholder, onCommit(raw), grid,
//   r, c (para moverse)
// ════════════════════════════════════════════════════════════════════

import React, { useLayoutEffect, useRef, useState } from 'react';
import { evalCell, formatAmount, isFormula, usesGroup } from '@/utils/invoicing';

export const focusCell = (grid, r, c) => {
  const el = document.querySelector(`[data-grid="${grid}"][data-r="${r}"][data-c="${c}"]`);
  if (el) { el.focus(); if (el.select) el.select(); }
};

const BASE = 'block w-full bg-transparent px-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-400 rounded-none';

export default function GridCell({
  value = '', type = 'text', computed = null, ctx, multiline = false, compact = false, mono = false, list, readOnly = false,
  placeholder = '', onCommit, grid, r, c, className = '', title,
}) {
  const raw = value === null || value === undefined ? '' : String(value);
  const [draft, setDraft] = useState(null); // null = no se está editando
  const ref = useRef(null);
  const editing = draft !== null;
  const numeric = type === 'number' || type === 'total';
  const multi = multiline && !compact;

  // Textos largos: la celda crece con el contenido
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !multi) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  });

  const ev = numeric ? evalCell(raw, ctx) : null;
  const manual = type === 'total' && raw !== '';
  const linked = numeric && usesGroup(raw);
  let shown = raw;
  if (!editing && type === 'number') shown = ev.error ? raw : formatAmount(ev.value);
  if (!editing && type === 'total') shown = manual ? (ev.error ? raw : formatAmount(ev.value)) : formatAmount(computed);
  if (editing) shown = draft;

  const commit = () => {
    if (draft === null) return;
    const next = multi ? draft : draft.trim();
    setDraft(null);
    if (next !== raw) onCommit?.(next);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); return; }
    if (e.key === 'Enter' && !(multi && (e.shiftKey || e.altKey))) {
      e.preventDefault();
      commit();
      focusCell(grid, r + (e.shiftKey ? -1 : 1), c);
      return;
    }
    if (!multi && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      commit();
      focusCell(grid, r + (e.key === 'ArrowDown' ? 1 : -1), c);
    }
  };

  const tone = [
    compact ? 'py-1 truncate' : 'py-1.5',
    numeric ? 'text-right font-mono tabular-nums' : '',
    mono ? 'font-mono' : '',
    ev?.error && !editing ? 'text-red-600' : '',
    type === 'total' ? 'font-black' : '',
    manual && !editing ? 'bg-amber-50' : '',
  ].join(' ');
  const tip = title
    || (type === 'total' && manual ? 'Total escrito a mano (no es la suma). Borralo para volver a la fórmula.' : undefined)
    || (linked ? `Sigue a la fila gris: ${raw}${ev.error ? ' (no hay fila gris arriba)' : ` = ${formatAmount(ev.value)}`}. Escribí un número para fijarlo.` : undefined)
    || (isFormula(raw) ? `Fórmula: ${raw}` : undefined)
    || (ev?.error ? 'No es un número ni una cuenta' : undefined)
    || (compact && !numeric && raw.length > 24 ? raw : undefined);

  const props = {
    ref,
    value: shown,
    readOnly,
    title: tip,
    placeholder: editing && type === 'total' ? formatAmount(computed) : placeholder,
    'data-grid': grid,
    'data-r': r,
    'data-c': c,
    onFocus: () => { if (!readOnly) setDraft(raw); },
    onChange: (e) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown,
    className: `${BASE} ${tone} ${readOnly ? 'cursor-default text-slate-400' : ''} ${className}`,
  };

  return (
    <div className="relative">
      {multi
        ? <textarea rows={1} {...props} className={`${props.className} resize-none overflow-hidden leading-snug`} />
        : <input type="text" inputMode={numeric ? 'decimal' : undefined} list={list} {...props} />}
      {isFormula(raw) && !editing && (
        <span className={`pointer-events-none absolute left-0.5 top-0.5 text-[8px] font-black italic ${linked ? 'text-sky-500' : 'text-emerald-500/70'}`} aria-hidden="true">ƒ</span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TaskEditorRow — Fila editable de una tarea de webinar
// ════════════════════════════════════════════════════════════════════
// Renderiza UNA tarea con: checkbox + título + owner picker + fecha (opcional) +
// texto libre (opcional) + dropdown custom (opcional).
//
// Props:
//   title           — label de la tarea
//   data            — objeto con { done, date, owner, text, type }
//   field           — key dentro del webinar (ej "teamsGroup")
//   wId             — id del webinar
//   updateField     — (wId, path, value) => void
//   hasDate         — mostrar input de fecha (default true)
//   hasText         — mostrar input de texto
//   isAutoDate      — formato visual para fecha auto-calculada
//   customDropdown  — array de opciones para dropdown tipo
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { X } from 'lucide-react';
import Ico from './Ico';
import OwnerPicker from './OwnerPicker';

export default function TaskEditorRow({
  title,
  data,
  field,
  wId,
  updateField,
  hasDate,
  hasText,
  isAutoDate,
  customDropdown,
  hasTags,   // editor de etiquetas (chips)
  hasCost,   // input de costo numérico
}) {
  const d = data || {};
  const showDate = hasDate !== false;
  const tags = Array.isArray(d.tags) ? d.tags : [];
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (tags.some((t) => t.toLowerCase() === v.toLowerCase())) { setTagInput(''); return; }
    updateField(wId, `${field}.tags`, [...tags, v]);
    setTagInput('');
  };
  const removeTag = (t) => updateField(wId, `${field}.tags`, tags.filter((x) => x !== t));

  return (
    <div className="flex flex-col gap-2 p-3.5 border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wide flex-1">
          {title}
        </span>
        <input
          type="checkbox"
          checked={!!d.done}
          onChange={(e) => updateField(wId, `${field}.done`, e.target.checked)}
          className="w-5 h-5 accent-blue-500 cursor-pointer rounded shrink-0"
        />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
          <Ico name="UserCircle" size={10} color="#94a3b8" />
          <OwnerPicker
            value={d.owner || ''}
            onChange={(v) => updateField(wId, `${field}.owner`, v)}
            compact={true}
            placeholder="OWNER"
          />
        </div>
        {showDate && (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
            <Ico name="Calendar" size={10} color="#94a3b8" />
            <input
              type="date"
              value={d.date || ''}
              onChange={(e) => updateField(wId, `${field}.date`, e.target.value)}
              className={`text-[10px] py-0.5 font-bold outline-none bg-transparent ${
                isAutoDate ? 'text-blue-700' : 'text-slate-600'
              }`}
            />
          </div>
        )}
        {customDropdown && (
          <select
            value={d.type || ''}
            onChange={(e) => updateField(wId, `${field}.type`, e.target.value)}
            className="text-[10px] py-1 px-1.5 border border-slate-200 rounded font-bold text-slate-600 outline-none bg-slate-50"
          >
            <option value="">TIPO...</option>
            {customDropdown.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {hasText && (
          <input
            type="text"
            placeholder="Asunto / Nota..."
            value={d.text || ''}
            onChange={(e) => updateField(wId, `${field}.text`, e.target.value)}
            className="flex-1 min-w-[120px] text-[10px] p-1.5 border border-slate-200 bg-slate-50 rounded font-semibold text-slate-600 outline-none focus:border-blue-400"
          />
        )}
        {hasCost && (
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            <span className="text-[10px] font-black text-emerald-600">$</span>
            <input
              type="number"
              min="0"
              placeholder="Costo"
              value={d.cost ?? ''}
              onChange={(e) => updateField(wId, `${field}.cost`, e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-20 text-[10px] py-0.5 font-bold outline-none bg-transparent text-emerald-700"
            />
          </div>
        )}
      </div>

      {/* Editor de etiquetas (chips) */}
      {hasTags && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full pl-2 pr-1 py-0.5 text-[10px] font-bold">
              {t}
              <button onClick={() => removeTag(t)} className="hover:text-red-600" title="Quitar etiqueta">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            onBlur={addTag}
            placeholder="+ etiqueta"
            className="min-w-[90px] text-[10px] p-1 border border-dashed border-slate-300 bg-white rounded font-semibold text-slate-600 outline-none focus:border-blue-400"
          />
        </div>
      )}
    </div>
  );
}

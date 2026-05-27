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

import React from 'react';
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
}) {
  const d = data || {};
  const showDate = hasDate !== false;

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
      </div>
    </div>
  );
}

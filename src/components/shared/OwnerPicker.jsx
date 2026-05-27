// ════════════════════════════════════════════════════════════════════
// OwnerPicker — Selector reusable de responsable
// ════════════════════════════════════════════════════════════════════
// Dropdown agrupado por equipo (Comunicación / Marketing / Otro).
// Si elige "Otro...", se habilita un input para nombre libre.
//
// Modos:
//   compact (true)  — chip pequeño con select fino (para tabla/lista)
//   expandido       — caja con select grande (para formulario)
//
// Props:
//   value: string actual (puede ser nombre del equipo o texto libre)
//   onChange: (newValue) => void
//   compact: boolean
//   placeholder: string
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { DESIGNERS, MARCOMMS, PEOPLE } from '@/constants/team';

export default function OwnerPicker({
  value,
  onChange,
  compact = false,
  placeholder = 'Asignar...',
}) {
  // Si el value no está en PEOPLE, asumimos texto libre ("Otro")
  const [showOther, setShowOther] = useState(() => !!value && !PEOPLE.includes(value));
  const [otherText, setOtherText] = useState(() => (showOther ? value || '' : ''));

  const handleSelectChange = (val) => {
    if (val === '__OTHER__') {
      setShowOther(true);
      onChange(otherText || '');
    } else {
      setShowOther(false);
      setOtherText('');
      onChange(val);
    }
  };

  const handleOtherChange = (val) => {
    setOtherText(val);
    onChange(val);
  };

  const currentSelectValue = showOther ? '__OTHER__' : value || '';

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <select
          value={currentSelectValue}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="text-[9px] font-black uppercase tracking-wider bg-transparent text-slate-700 outline-none cursor-pointer max-w-[90px]"
        >
          <option value="">{placeholder}</option>
          <optgroup label="Comunicación">
            {DESIGNERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </optgroup>
          <optgroup label="Marketing">
            {MARCOMMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </optgroup>
          <option value="__OTHER__">Otro...</option>
        </select>
        {showOther && (
          <input
            type="text"
            value={otherText}
            onChange={(e) => handleOtherChange(e.target.value)}
            placeholder="Nombre"
            className="text-[9px] font-black uppercase bg-white border border-slate-200 rounded px-1 py-0.5 outline-none w-16 focus:border-blue-400"
          />
        )}
      </div>
    );
  }

  // Modo expandido
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={currentSelectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="flex-1 min-w-[120px] p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
      >
        <option value="">{placeholder}</option>
        <optgroup label="Comunicación">
          {DESIGNERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </optgroup>
        <optgroup label="Marketing">
          {MARCOMMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </optgroup>
        <option value="__OTHER__">Otro...</option>
      </select>
      {showOther && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => handleOtherChange(e.target.value)}
          placeholder="Nombre"
          className="flex-1 min-w-[100px] p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400"
        />
      )}
    </div>
  );
}

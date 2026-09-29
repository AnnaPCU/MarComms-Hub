// ════════════════════════════════════════════════════════════════════
// ProjectTitleEditor — Título de un proyecto con nombre, país y unidad editables
// ════════════════════════════════════════════════════════════════════
// Se usa en el encabezado del detalle de webinars y eventos (y sirve para
// cualquier pilar). Muestra "PAÍS / UNIDAD" y el nombre; con el lápiz
// pasa a modo edición (input + dos selects) y guarda con Enter o el tilde.
//
// Props:
//   name, country, businessUnit
//   badge        — nodo opcional a la izquierda de "país / unidad" (ej. "Modo Admin")
//   accent       — 'blue' | 'orange' | 'amber' | 'violet' (color del foco y del botón)
//   onSave(patch) — patch con solo los campos que cambiaron:
//                   { name?, country?, businessUnit? }. Se manda UNA sola
//                   vez para que las tres escrituras no se pisen entre sí.
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { MARKETS, unitsForCountry } from '@/constants/markets';

const ACCENT = {
  blue:   { ring: 'focus:ring-blue-300',   btn: 'bg-blue-600 hover:bg-blue-700' },
  orange: { ring: 'focus:ring-orange-300', btn: 'bg-orange-600 hover:bg-orange-700' },
  amber:  { ring: 'focus:ring-amber-300',  btn: 'bg-amber-600 hover:bg-amber-700' },
  violet: { ring: 'focus:ring-violet-300', btn: 'bg-violet-600 hover:bg-violet-700' },
};

export default function ProjectTitleEditor({ name, country, businessUnit, badge, accent = 'blue', onSave }) {
  const a = ACCENT[accent] || ACCENT.blue;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: name || '', country: country || '', businessUnit: businessUnit || '' });

  // Si cambia el proyecto desde afuera (realtime u otro item), refrescar el borrador
  useEffect(() => { if (!editing) setDraft({ name: name || '', country: country || '', businessUnit: businessUnit || '' }); }, [name, country, businessUnit, editing]);

  const units = draft.country ? unitsForCountry(draft.country) : [];
  const unitOptions = draft.businessUnit && !units.includes(draft.businessUnit) ? [draft.businessUnit, ...units] : units;

  const save = () => {
    const nextName = draft.name.trim();
    if (!nextName) return;
    const patch = {};
    if (nextName !== (name || '')) patch.name = nextName;
    if (draft.country !== (country || '')) patch.country = draft.country;
    if (draft.businessUnit !== (businessUnit || '')) patch.businessUnit = draft.businessUnit;
    if (Object.keys(patch).length) onSave(patch);
    setEditing(false);
  };
  const cancel = () => { setDraft({ name: name || '', country: country || '', businessUnit: businessUnit || '' }); setEditing(false); };

  if (!editing) {
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {badge}
          <span className="text-[10px] text-slate-400 font-bold uppercase">{country || 'Sin país'} / {businessUnit || 'Sin unidad'}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl font-black uppercase tracking-tight m-0 text-slate-900 truncate">{name}</h1>
          <button onClick={() => setEditing(true)} title="Editar nombre, país y unidad" className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const inputCls = `bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 ${a.ring}`;
  return (
    <div className="min-w-0 flex-1 space-y-1.5" onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}>
      <div className="flex items-center gap-2">
        {badge}
        <select value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value, businessUnit: '' })} className={`${inputCls} px-2 py-1 uppercase text-[10px]`}>
          <option value="">País…</option>
          {Object.keys(MARKETS).sort().map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={draft.businessUnit} onChange={(e) => setDraft({ ...draft, businessUnit: e.target.value })} disabled={!draft.country} className={`${inputCls} px-2 py-1 uppercase text-[10px] disabled:opacity-50`}>
          <option value="">Unidad…</option>
          {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`${inputCls} flex-1 min-w-0 px-3 py-2 text-base uppercase`} placeholder="Nombre del proyecto" />
        <button onClick={save} disabled={!draft.name.trim()} title="Guardar (Enter)" className={`w-8 h-8 rounded-lg text-white ${a.btn} disabled:opacity-40 flex items-center justify-center shrink-0`}><Check className="w-4 h-4" /></button>
        <button onClick={cancel} title="Cancelar (Esc)" className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

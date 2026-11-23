// ════════════════════════════════════════════════════════════════════
// AddItemForm — Alta de un ítem del checklist con su alcance (nov 2026)
// ════════════════════════════════════════════════════════════════════
// Nombre del ítem + «Agregar en»: la entidad abierta y/o las regiones
// (Américas / EMEA / APAC). Las tres regiones = todas las entidades. Abajo
// dice en cuántas entidades va a quedar. Enter guarda, Esc cancela.
//
// Props: entity (la abierta), countFor({ targetCodes, targetRegions }) →
//   cuántas entidades, onSave({ label, targetCodes, targetRegions }) (async),
//   onCancel
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { CRM_REGIONS } from '@/constants/crmWeekly';
import { itemTargets } from '@/utils/crmWeekly';

const box = (on) => `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-black transition-colors ${on ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300'}`;

export default function AddItemForm({ entity, countFor, onSave, onCancel }) {
  const [label, setLabel] = useState('');
  const [thisEntity, setThisEntity] = useState(true);
  const [regions, setRegions] = useState([]);
  const [saving, setSaving] = useState(false);
  const targets = itemTargets({ entityCode: entity.code, thisEntity, regions });
  const none = !thisEntity && regions.length === 0;
  const n = none ? 0 : countFor(targets);
  const toggleRegion = (r) => setRegions((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const save = async () => {
    if (!label.trim() || none || saving) return;
    setSaving(true);
    try { await onSave({ label: label.trim(), ...targets }); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-2 bg-sky-50/50 border border-sky-100 rounded-2xl p-3">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
          placeholder="New checklist item…"
          className="flex-1 min-w-0 text-sm font-bold text-slate-800 bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-sky-200"
        />
        <button onClick={save} disabled={!label.trim() || none || saving} className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0" title="Add (Enter)"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center shrink-0" title="Cancel (Esc)"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Add to">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">Add to</span>
        <button type="button" role="checkbox" aria-checked={thisEntity} onClick={() => setThisEntity((v) => !v)} className={box(thisEntity)} title={entity.name}>
          {thisEntity && <Check className="w-3 h-3" strokeWidth={3} />}This entity ({entity.code})
        </button>
        {CRM_REGIONS.map((r) => (
          <button key={r} type="button" role="checkbox" aria-checked={regions.includes(r)} onClick={() => toggleRegion(r)} className={box(regions.includes(r))}>
            {regions.includes(r) && <Check className="w-3 h-3" strokeWidth={3} />}All {r}
          </button>
        ))}
      </div>
      <p className={`text-[10px] font-bold ${none ? 'text-red-600' : 'text-slate-400'}`}>
        {none ? 'Tick at least one option.' : `It will be added to ${n} ${n === 1 ? 'entity' : 'entities'}${regions.length === CRM_REGIONS.length ? ' (all of them, including any added later)' : ''}.`}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// WeeklyChecklist — Checklist de implementación de HubSpot de una entidad
// ════════════════════════════════════════════════════════════════════
// Un renglón por ítem (crm_check_items): tilde + nombre + deadline. El
// deadline se escribe y se ve en español (dd/mm/aaaa, DateFieldEs) y
// cambia de color a medida que se acerca (verde → amarillo → naranja →
// rojo, ver deadlineTone); tildado, queda gris. Cada cambio se guarda al
// instante.
// Los ítems valen para todas las entidades: «Agregar ítem» al pie suma uno
// nuevo a todas; el lápiz lo renombra y el tacho lo elimina (con
// confirmación, para todas).
//
// Props: entityCode, items, checks ({ [itemId]: check }), todayIso, dark,
//   onSave(itemId, patch) (async; patch: { done } | { deadline }),
//   onAddItem(label) / onRenameItem(item, label) / onDeleteItem(item) (async)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import DateFieldEs from '@/components/shared/DateFieldEs';
import { deadlineTone, formatShortDate } from '@/utils/crmWeekly';

const smallInput = 'flex-1 min-w-0 text-sm font-bold text-slate-800 bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-sky-200';

// Input chico con guardar / cancelar (Enter / Esc)
function InlineInput({ initial = '', placeholder, onSave, onCancel }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try { await onSave(value.trim()); setValue(''); } finally { setSaving(false); }
  };
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }} placeholder={placeholder} className={smallInput} />
      <button onClick={save} disabled={!value.trim() || saving} className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0" title="Guardar (Enter)"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center shrink-0" title="Cancelar (Esc)"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function WeeklyChecklist({ entityCode, items = [], checks = {}, todayIso, dark = false, onSave, onAddItem, onRenameItem, onDeleteItem }) {
  const [renaming, setRenaming] = useState(null); // id del ítem
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {items.map((it) => {
          const c = checks[it.id] || {};
          const done = !!c.done;
          const tone = deadlineTone(c.deadline, done, todayIso, dark);
          const chip = tone
            ? (tone.tone === 'done' ? `Cumplido${c.doneAt ? ` el ${formatShortDate(c.doneAt.slice(0, 10))}` : ''}` : tone.label)
            : done ? 'Cumplido' : '';
          const toneStyle = tone && tone.tone === 'open' ? { color: tone.text, background: tone.bg, borderColor: tone.border } : undefined;
          return (
            <li key={it.id} className="group py-2.5 flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => onSave(it.id, { done: !done })}
                role="checkbox"
                aria-checked={done}
                aria-label={it.label}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${done ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-300 hover:border-sky-400'}`}
              >
                {done && <Check className="w-4 h-4" strokeWidth={3} />}
              </button>
              {renaming === it.id ? (
                <InlineInput initial={it.label} placeholder="Nombre del ítem" onSave={async (label) => { await onRenameItem(it, label); setRenaming(null); }} onCancel={() => setRenaming(null)} />
              ) : (
                <div className="flex-1 min-w-[160px] flex items-start gap-1.5">
                  <div className="min-w-0">
                    <p className={`text-sm font-bold leading-tight ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>{it.label}</p>
                    {it.hint && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{it.hint}</p>}
                  </div>
                  <span className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setRenaming(it.id)} className="w-6 h-6 rounded-md text-slate-300 hover:text-sky-700 hover:bg-sky-50 flex items-center justify-center" title="Renombrar (para todas las entidades)" aria-label={`Renombrar ${it.label}`}><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => onDeleteItem(it)} className="w-6 h-6 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" title="Eliminar del checklist (para todas las entidades)" aria-label={`Eliminar ${it.label}`}><Trash2 className="w-3 h-3" /></button>
                  </span>
                </div>
              )}
              {chip && (
                <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${toneStyle ? '' : 'text-slate-400'}`} style={toneStyle ? { color: tone.text } : undefined}>{chip}</span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <DateFieldEs id={`deadline-${entityCode}-${it.id}`} value={c.deadline} style={toneStyle} ariaLabel={`Deadline: ${it.label}`} onChange={(v) => onSave(it.id, { deadline: v })} />
                {c.deadline ? (
                  <button onClick={() => onSave(it.id, { deadline: '' })} className="w-6 h-6 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center" title="Sacar la fecha"><X className="w-3 h-3" /></button>
                ) : <span className="w-6" />}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-slate-100 pt-2.5 mt-0.5">
        {adding ? (
          <div className="max-w-xl flex">
            <InlineInput placeholder="Nuevo ítem del checklist (para todas las entidades)…" onSave={onAddItem} onCancel={() => setAdding(false)} />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-sky-700 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Agregar ítem al checklist
          </button>
        )}
      </div>
    </div>
  );
}

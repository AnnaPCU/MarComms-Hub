// ════════════════════════════════════════════════════════════════════
// WeeklyChecklist — Checklist de implementación de HubSpot de una entidad
// ════════════════════════════════════════════════════════════════════
// Un renglón por ítem (CRM_CHECK_ITEMS): tilde + nombre + deadline. El
// deadline cambia de color a medida que se acerca (verde → amarillo →
// naranja → rojo, ver deadlineTone); tildado, queda gris. Cada cambio se
// guarda al instante.
//
// Props: entityCode, checks ({ [itemId]: check }), todayIso, dark,
//   onSave(itemId, patch) (async; patch: { done } | { deadline })
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Check, X } from 'lucide-react';
import { CRM_CHECK_ITEMS } from '@/constants/crmWeekly';
import { deadlineTone, formatShortDate } from '@/utils/crmWeekly';

function DeadlineField({ id, value, tone, onChange }) {
  const style = tone && tone.tone === 'open' ? { color: tone.text, background: tone.bg, borderColor: tone.border } : undefined;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input
        id={id}
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Deadline"
        title="Deadline"
        className={`w-[138px] px-2 py-1.5 rounded-lg border text-[11px] font-bold font-mono outline-none focus:ring-2 focus:ring-sky-200 ${style ? '' : 'bg-white border-slate-200 text-slate-500'}`}
        style={style}
      />
      {value && (
        <button onClick={() => onChange('')} className="w-6 h-6 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center" title="Sacar la fecha">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function WeeklyChecklist({ entityCode, checks = {}, todayIso, dark = false, onSave }) {
  return (
    <ul className="divide-y divide-slate-100">
      {CRM_CHECK_ITEMS.map((it) => {
        const c = checks[it.id] || {};
        const done = !!c.done;
        const tone = deadlineTone(c.deadline, done, todayIso, dark);
        const chip = tone && (tone.tone === 'done'
          ? `Cumplido${c.doneAt ? ` el ${formatShortDate(c.doneAt.slice(0, 10))}` : ''}`
          : tone.label);
        return (
          <li key={it.id} className="py-2.5 flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => onSave(it.id, { done: !done })}
              role="checkbox"
              aria-checked={done}
              aria-label={it.label}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${done ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-300 hover:border-sky-400'}`}
            >
              {done && <Check className="w-4 h-4" strokeWidth={3} />}
            </button>
            <div className="flex-1 min-w-[160px]">
              <p className={`text-sm font-bold leading-tight ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>{it.label}</p>
              {it.hint && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{it.hint}</p>}
            </div>
            {chip ? (
              <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${tone.tone === 'done' ? 'text-slate-400' : ''}`} style={tone.tone === 'open' ? { color: tone.text } : undefined}>{chip}</span>
            ) : done ? (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Cumplido</span>
            ) : null}
            <DeadlineField id={`deadline-${entityCode}-${it.id}`} value={c.deadline} tone={tone} onChange={(v) => onSave(it.id, { deadline: v })} />
          </li>
        );
      })}
    </ul>
  );
}

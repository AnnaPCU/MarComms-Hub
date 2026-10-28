// ════════════════════════════════════════════════════════════════════
// ScheduleFields — Datos de un posteo «Programado» (Social Media)
// ════════════════════════════════════════════════════════════════════
// Dónde se programó (HubSpot / LinkedIn), fecha de publicación (dd/mm/aaaa)
// y hora (24 h, HH:MM). Los tres son obligatorios para dejar el posteo en
// «Programado» (scheduleMissing en src/utils/socialPosts.js). Lo usan el
// editor del posteo y el modal que aparece al cambiar el estado desde la
// hoja (ScheduleModal).
//
// Props: value ({ scheduledOn, publishDate, publishTime }), onChange(patch),
//   showErrors (marca en rojo lo que falta), idPrefix
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import DateFieldEs from '@/components/shared/DateFieldEs';
import { SCHEDULE_PLATFORMS } from '@/constants/socialPosts';
import { maskTime, parseTime } from '@/utils/socialPosts';

const labelCls = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest';

function TimeField({ id, value, onChange, error }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  const commit = (t) => { const v = parseTime(t); setText(v || t); onChange(v || ''); };
  return (
    <input
      id={id}
      value={text}
      onChange={(e) => { const m = maskTime(e.target.value); setText(m); if (parseTime(m) && m.length === 5) onChange(parseTime(m)); }}
      onBlur={() => commit(text)}
      inputMode="numeric"
      placeholder="hh:mm"
      aria-label="Hora de publicación"
      className={`w-[84px] px-2.5 py-1.5 rounded-lg border text-[11px] font-bold font-mono outline-none focus:ring-2 focus:ring-violet-200 ${error ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 bg-white text-slate-700'}`}
    />
  );
}

export default function ScheduleFields({ value = {}, onChange, showErrors = false, idPrefix = 'schedule' }) {
  const err = (missing) => showErrors && missing;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className={labelCls}>¿Dónde se programó?</p>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Dónde se programó">
          {SCHEDULE_PLATFORMS.map((p) => {
            const active = value.scheduledOn === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ scheduledOn: p.id })}
                className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${active ? 'bg-violet-600 text-white border-transparent shadow-sm' : `bg-white text-slate-600 hover:bg-violet-50 ${err(!value.scheduledOn) ? 'border-red-300' : 'border-slate-200'}`}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className={labelCls} htmlFor={`${idPrefix}-date`}>Fecha de publicación</label>
          <DateFieldEs
            id={`${idPrefix}-date`}
            value={value.publishDate || ''}
            onChange={(v) => onChange({ publishDate: v })}
            ariaLabel="Fecha de publicación"
            className={err(!value.publishDate) ? '!border-red-400 ring-2 ring-red-100' : ''}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls} htmlFor={`${idPrefix}-time`}>Hora (24 h)</label>
          <TimeField id={`${idPrefix}-time`} value={value.publishTime || ''} onChange={(v) => onChange({ publishTime: v })} error={err(!parseTime(value.publishTime))} />
        </div>
      </div>
    </div>
  );
}

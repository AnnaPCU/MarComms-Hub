// ════════════════════════════════════════════════════════════════════
// ClientPicker — País que paga + unidad + otros países (todos los pilares)
// ════════════════════════════════════════════════════════════════════
// Reemplaza los selects sueltos de País / Unidad y el campo libre
// "Cliente" de webinars y eventos. Todo se elige de listas (MARKETS +
// unitsForCountry, que incluye PCU) y el cliente se muestra derivado:
// "Control Union España". Ver src/utils/pillarClient.js.
//
// Props:
//   country, businessUnit, extraCountries
//   onChange(patch)  — { country?, businessUnit?, extraCountries? } en UNA
//                      sola escritura (cambiar el país limpia la unidad si
//                      ya no corresponde y lo saca de "otros países")
//   accent           — 'blue' | 'orange' | 'amber' | 'violet' | 'emerald' | 'pink'
//   size             — 'sm' (default, configuración) | 'lg' (modales de alta)
//   showClient       — muestra la línea "Cliente: …" (default true)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { X } from 'lucide-react';

import { COUNTRIES, unitsForCountry } from '@/constants/markets';
import { clientLabel, cleanExtraCountries, normalizeUnit } from '@/utils/pillarClient';

const RING = {
  blue: 'focus:ring-blue-400', orange: 'focus:ring-orange-400', amber: 'focus:ring-amber-400',
  violet: 'focus:ring-violet-400', emerald: 'focus:ring-emerald-400', pink: 'focus:ring-pink-400',
};

export default function ClientPicker({ country = '', businessUnit = '', extraCountries = [], onChange, accent = 'blue', size = 'sm', showClient = true }) {
  const ring = RING[accent] || RING.blue;
  const lg = size === 'lg';
  const field = `w-full bg-slate-50 border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 ${ring} disabled:opacity-50 ${lg ? 'p-3.5 rounded-2xl text-sm' : 'p-2.5 rounded-lg text-xs'}`;
  const labelCls = lg ? 'text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1' : 'text-[9px] font-black text-slate-400 uppercase';
  const extras = cleanExtraCountries(country, extraCountries);
  const unit = normalizeUnit(businessUnit);
  const units = country ? unitsForCountry(country) : [];
  const unitOptions = unit && !units.includes(unit) ? [unit, ...units] : units;
  const available = COUNTRIES.filter((c) => c !== country && !extras.includes(c));
  const client = clientLabel(country, unit);

  const setCountry = (c) => {
    const patch = { country: c };
    if (unit && c && !unitsForCountry(c).includes(unit)) patch.businessUnit = '';
    if (!c) patch.businessUnit = '';
    if (extras.includes(c)) patch.extraCountries = extras.filter((x) => x !== c);
    onChange(patch);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelCls} title="El país que paga la acción: cuenta para inversión, facturación y planes">País que paga</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={field}>
            <option value="">País…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Unidad</label>
          <select value={unit} onChange={(e) => onChange({ businessUnit: e.target.value })} disabled={!country} className={field}>
            <option value="">Unidad…</option>
            {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelCls}>También para (opcional)</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {extras.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
              {c}
              <button type="button" onClick={() => onChange({ extraCountries: extras.filter((x) => x !== c) })} title={`Quitar ${c}`} aria-label={`Quitar ${c}`} className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <select
            value=""
            onChange={(e) => { if (e.target.value) onChange({ extraCountries: [...extras, e.target.value] }); }}
            disabled={!country}
            title={country ? 'Sumar otro país al que también apunta (no paga)' : 'Elegí primero el país que paga'}
            className={`bg-white border border-dashed border-slate-300 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 outline-none focus:ring-2 ${ring} disabled:opacity-50`}
          >
            <option value="">+ País</option>
            {available.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {showClient && (
        <p className="text-[10px] font-bold text-slate-400">
          Cliente: <span className="font-black text-slate-700">{client || 'elegí país y unidad'}</span>
          {extras.length > 0 && <span> · lo paga {country}</span>}
        </p>
      )}
    </div>
  );
}

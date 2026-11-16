// ════════════════════════════════════════════════════════════════════
// EntityFilters — Filtros y orden de las entidades del Weekly check
// ════════════════════════════════════════════════════════════════════
// Marca · semáforo (con cuántas entidades hay de cada color) · importancia
// · tag · orden doble («Ordenar por» + «y después por», con un botón para
// darlos vuelta). Valen para la lista de entidades y para «Próximas
// actividades».
//
// En el Global check (showRegion) suma, primero, el filtro por región
// (Américas / EMEA / APAC, con cuántas entidades hay en cada una).
//
// Props: filters ({ region, brand, light, priority, tag }), onChange(patch),
//   showRegion, regionCounts ({ Américas: n, … }),
//   sort ([primero, segundo]), onSort([primero, segundo]),
//   lightCounts ({ green, yellow, red }), tags (los usados)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowLeftRight, ArrowUpDown, Tag } from 'lucide-react';
import { CRM_BRANDS, CRM_PRIORITIES, CRM_REGIONS, CRM_SORTS, TRAFFIC_LIGHTS } from '@/constants/crmWeekly';

const pill = (on) => `px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${on ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`;
const selectCls = 'bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-black text-slate-600 outline-none focus:ring-2 focus:ring-sky-200';

export default function EntityFilters({ filters, onChange, showRegion = false, regionCounts = null, sort = ['manual', 'manual'], onSort, lightCounts = {}, tags = [] }) {
  const { brand, light, priority, tag, region = '' } = filters;
  const [first, second] = sort;
  // El segundo criterio no puede repetir al primero (ni el semáforo al revés)
  const family = (id) => (id === 'redFirst' || id === 'greenFirst' ? 'light' : id);
  const secondOptions = CRM_SORTS.filter((s) => s.id === 'manual' || family(s.id) !== family(first));
  const setFirst = (id) => onSort([id, id === 'manual' || family(second) === family(id) ? 'manual' : second]);
  return (
    <div className="space-y-2">
      {showRegion && (
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Región">
          {['', ...CRM_REGIONS].map((r) => (
            <button key={r || 'all'} onClick={() => onChange({ region: r })} aria-pressed={region === r} className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${region === r ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {r || 'Todas las regiones'}{r && regionCounts ? <span className="font-mono ml-1.5 opacity-70">{regionCounts[r] || 0}</span> : null}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {['', ...CRM_BRANDS].map((b) => (
          <button key={b || 'all'} onClick={() => onChange({ brand: b })} className={pill(brand === b)}>{b || 'Todas las entidades'}</button>
        ))}
        <span className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
        {Object.values(TRAFFIC_LIGHTS).map((l) => (
          <button
            key={l.id}
            onClick={() => onChange({ light: light === l.id ? '' : l.id })}
            aria-pressed={light === l.id}
            title={`${l.label}: ${l.range} del checklist. Clic para ver solo esas.`}
            className={`px-2.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${light === l.id ? l.chip : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} /> {l.range} <span className="font-mono">{lightCounts[l.id] || 0}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar por
          <select value={first} onChange={(e) => setFirst(e.target.value)} className={selectCls}>
            {CRM_SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        {first !== 'manual' && (
          <>
            <button
              onClick={() => second !== 'manual' && onSort([second, first])}
              disabled={second === 'manual'}
              title="Dar vuelta: el segundo criterio pasa a ser el primero"
              aria-label="Dar vuelta el orden"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-sky-700 hover:border-sky-300 flex items-center justify-center disabled:opacity-30"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
              y después por
              <select value={second} onChange={(e) => onSort([first, e.target.value])} className={selectCls}>
                {secondOptions.map((s) => <option key={s.id} value={s.id}>{s.id === 'manual' ? '—' : s.label}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Importancia
          <select value={priority} onChange={(e) => onChange({ priority: e.target.value })} className={selectCls}>
            <option value="">Todas</option>
            {CRM_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            <option value="none">Sin importancia</option>
          </select>
        </label>
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            {tags.map((t) => (
              <button key={t} onClick={() => onChange({ tag: tag === t ? '' : t })} aria-pressed={tag === t} className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${tag === t ? 'bg-sky-600 border-sky-600 text-white' : 'bg-sky-50 border-sky-200 text-sky-700 hover:border-sky-400'}`}>{t}</button>
            ))}
          </div>
        )}
        {(brand || light || priority || tag || region) && (
          <button onClick={() => onChange({ brand: '', light: '', priority: '', tag: '', region: '' })} className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700 px-2 py-1">Limpiar filtros</button>
        )}
      </div>
    </div>
  );
}

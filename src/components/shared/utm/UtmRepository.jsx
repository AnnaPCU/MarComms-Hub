// ════════════════════════════════════════════════════════════════════
// UtmRepository — UTMs guardados, con filtros por fuente, medio, etc.
// ════════════════════════════════════════════════════════════════════
// Los filtros se arman solos con lo que hay guardado (valor + cantidad),
// así también se puede filtrar por valores viejos del repositorio.
//
// Props:
//   links, error
//   onCopy(link), onLoad(link), onDelete(link), copiedId
//   accent
//   compact — true dentro de un proyecto (tarjetas); false en la vista
//             UTM Generator (tabla a lo ancho)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Database, Search, Trash2, Upload, X } from 'lucide-react';
import { EMPTY_UTM_FILTERS, filterUtmLinks, utmFilterOptions, utmValueLabel } from '@/utils/utm';
import { formatDate } from '@/utils/date';

const FILTERS = [
  { key: 'source',       label: 'Fuente' },
  { key: 'medium',       label: 'Medio' },
  { key: 'organization', label: 'Organización' },
  { key: 'businessUnit', label: 'Unidad' },
  { key: 'country',      label: 'País' },
];

const sel = 'bg-white border border-slate-200 px-2.5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none';

export default function UtmRepository({ links, error, onCopy, onLoad, onDelete, copiedId, accent, compact = false }) {
  const [filters, setFilters] = useState(EMPTY_UTM_FILTERS);
  const [query, setQuery] = useState('');
  const options = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, utmFilterOptions(links, f.key)])), [links]);
  const rows = useMemo(() => filterUtmLinks(links, filters, query), [links, filters, query]);
  const activeCount = Object.values(filters).filter((v) => v !== 'all').length + (query.trim() ? 1 : 0);
  const shownFilters = compact ? FILTERS.slice(0, 2) : FILTERS;

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const clear = () => { setFilters(EMPTY_UTM_FILTERS); setQuery(''); };

  const meta = (l) => [l.organization, l.businessUnit, l.country].filter(Boolean).join(' · ');

  return (
    <div className="space-y-2">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por campaña, URL, país…" className={`w-full pl-8 pr-2.5 py-2 bg-slate-50 border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`} />
        </div>
        {shownFilters.map((f) => (
          <select key={f.key} value={filters[f.key]} onChange={(e) => setFilter(f.key, e.target.value)} className={`${sel} ${filters[f.key] !== 'all' ? 'border-purple-300 text-purple-700' : ''}`} title={`Filtrar por ${f.label.toLowerCase()}`}>
            <option value="all">{f.label}: todos</option>
            {options[f.key].map((o) => <option key={o.value} value={o.value}>{o.label} ({o.count})</option>)}
          </select>
        ))}
        {activeCount > 0 && (
          <button onClick={clear} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 px-2 py-2" title="Sacar filtros"><X className="w-3 h-3" /> Limpiar</button>
        )}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto">{rows.length} de {(links || []).length}</span>
      </div>

      {error ? (
        <p className="text-[10px] font-bold text-red-600 py-2">No se pudo cargar el repositorio. Revisá la consola.</p>
      ) : rows.length === 0 ? (
        <p className="text-[10px] text-slate-400 font-medium italic py-4 text-center">
          {(links || []).length === 0 ? 'Todavía no hay UTMs guardados. Generá uno y guardalo.' : 'Sin resultados con estos filtros.'}
        </p>
      ) : compact ? (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {rows.map((l) => (
            <div key={l.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[11px] font-black text-slate-700 leading-tight">{l.label || l.campaignName || 'UTM'}</p>
                <button onClick={() => onDelete(l)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Eliminar"><Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" /></button>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{[utmValueLabel('source', l.source), utmValueLabel('medium', l.medium), meta(l)].filter(Boolean).join(' · ')}</p>
              <code className="text-[9px] text-slate-500 font-mono break-all block mb-2 leading-tight line-clamp-2">{l.url}</code>
              <div className="flex gap-1.5">
                <button onClick={() => onCopy(l)} className={`flex-1 ${copiedId === l.id ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'} px-2 py-1.5 rounded font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1`}>
                  {copiedId === l.id ? <><CheckCircle2 className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                </button>
                <button onClick={() => onLoad(l)} className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1.5 rounded font-black text-[9px] uppercase tracking-widest transition-all">Cargar</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full border-collapse text-xs" style={{ minWidth: 720 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="text-left px-3 py-2">Campaña</th>
                <th className="text-left px-3 py-2">Fuente</th>
                <th className="text-left px-3 py-2">Medio</th>
                <th className="text-left px-3 py-2">Org · Unidad · País</th>
                <th className="text-left px-3 py-2">URL</th>
                <th className="text-right px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/60 align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-black text-slate-800 leading-tight">{l.label || l.campaignName || 'UTM'}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{[l.createdBy, l.createdAt ? formatDate(l.createdAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">{utmValueLabel('source', l.source) || '—'}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">{utmValueLabel('medium', l.medium) || '—'}</td>
                  <td className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{meta(l) || '—'}</td>
                  <td className="px-3 py-2.5 max-w-[320px]"><code className="text-[9px] text-slate-500 font-mono break-all block leading-tight line-clamp-2" title={l.url}>{l.url}</code></td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onCopy(l)} title="Copiar URL" className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${copiedId === l.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        {copiedId === l.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => onLoad(l)} title="Cargar en el formulario" className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white border-slate-200 text-slate-600 hover:bg-slate-100"><Upload className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(l)} title="Eliminar" className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white border-slate-200 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!compact && <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Database className="w-3 h-3" /> Cargar lleva el UTM al formulario para editarlo o regenerarlo.</p>}
    </div>
  );
}

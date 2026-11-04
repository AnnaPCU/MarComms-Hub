// ════════════════════════════════════════════════════════════════════
// InvoicingToolbar — Buscador, filtro de marca, vista y exportar
// ════════════════════════════════════════════════════════════════════
// Arriba de cada hoja del mes: buscar en todas las celdas, filtrar por
// marca (Control Union / Peterson Solutions / Bel y otras), vista compacta
// (textos en una línea y País / Empresa fijas), lista o tabla (solo en
// Variables), «Qué cambió» contra el mes anterior y Exportar (Excel / PDF).
//
// Props: filters ({ q, brand }), onFilters, compact, onCompact, varView
//   ('lista' | 'tabla' | null), onVarView, changesCount (null = sin mes
//   anterior), showChanges, onToggleChanges, onExport('xlsx' | 'pdf'),
//   exporting
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Download, GitCompareArrows, LayoutList, Rows3, Search, Table2, X } from 'lucide-react';
import { BRAND_FILTERS } from '@/constants/invoicing';

const btn = (on) => `inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${on ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`;

export default function InvoicingToolbar({ filters = { q: '', brand: '' }, onFilters, compact, onCompact, varView, onVarView, changesCount = null, showChanges, onToggleChanges, onExport, exporting = false }) {
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={filters.q} onChange={(e) => onFilters({ ...filters, q: e.target.value })} placeholder="Buscar en la hoja" aria-label="Buscar en la hoja" className="w-56 max-w-full rounded-xl border border-slate-200 bg-white pl-8 pr-7 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-300" />
        {filters.q && <button onClick={() => onFilters({ ...filters, q: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center" title="Borrar la búsqueda" aria-label="Borrar la búsqueda"><X className="w-2.5 h-2.5 text-slate-600" /></button>}
      </label>
      <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden" role="group" aria-label="Marca">
        {BRAND_FILTERS.map((b) => (
          <button key={b.id || 'all'} onClick={() => onFilters({ ...filters, brand: b.id })} aria-pressed={filters.brand === b.id} className={`px-2.5 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${filters.brand === b.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{b.label}</button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2 flex-wrap">
        {varView && (
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden" role="group" aria-label="Vista de Variables">
            <button onClick={() => onVarView('lista')} aria-pressed={varView === 'lista'} className={`inline-flex items-center gap-1 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider ${varView === 'lista' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`} title="Una tarjeta por entidad con sus cargos"><LayoutList className="w-3.5 h-3.5" /> Lista</button>
            <button onClick={() => onVarView('tabla')} aria-pressed={varView === 'tabla'} className={`inline-flex items-center gap-1 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider ${varView === 'tabla' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`} title="La tabla como en el Excel"><Table2 className="w-3.5 h-3.5" /> Tabla</button>
          </div>
        )}
        <button onClick={() => onCompact(!compact)} aria-pressed={compact} className={btn(compact)} title={compact ? 'Volver a la vista completa' : 'Vista compacta: textos en una línea y País / Empresa fijas'}>
          <Rows3 className="w-3.5 h-3.5" /> Compacta
        </button>
        <button onClick={onToggleChanges} disabled={changesCount === null} aria-pressed={showChanges} className={`${btn(showChanges)} disabled:opacity-40`} title={changesCount === null ? 'No hay un mes anterior para comparar' : 'Qué cambió contra el mes anterior'}>
          <GitCompareArrows className="w-3.5 h-3.5" /> Qué cambió{changesCount !== null && <span className={`rounded-full px-1.5 text-[9px] ${showChanges ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}>{changesCount}</span>}
        </button>
        <div className="relative">
          <button onClick={() => setExportOpen(!exportOpen)} disabled={exporting} className={`${btn(false)} disabled:opacity-50`} title="Exportar el mes">
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1" role="menu">
                <button role="menuitem" onClick={() => { setExportOpen(false); onExport('xlsx'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Excel (.xlsx) · como el original</button>
                <button role="menuitem" onClick={() => { setExportOpen(false); onExport('pdf'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">PDF · resumen del mes</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

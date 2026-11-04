// ════════════════════════════════════════════════════════════════════
// ChargesList — «Variables (todos)» como lista de cargos por entidad
// ════════════════════════════════════════════════════════════════════
// Una tarjeta por entidad (país · empresa · entidad · código, editables),
// con sus cargos del mes: categoría (chip de color), detalle, CC y precio.
// «+ Agregar cargo» elige la categoría y crea el cargo (puede haber varios
// por categoría). Agrupadas por país, con subtotal plegable. La tabla tipo
// Excel es la otra vista de la misma hoja.
//
// Props: grid, rows (visibles, ordenadas), collapsed (Set), onToggleGroup,
//   compact, changes, prevLabel, onPatch(row, patch, remove),
//   onStatus(row, next), onAddRow(after), onDeleteRow(row), listFor
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, X } from 'lucide-react';
import { VARIABLE_CATEGORIES, VARIABLE_CATEGORY_BY_ID } from '@/constants/invoicing';
import { formatAmount, isBillable, rowStatus, rowTotal, variableCharges } from '@/utils/invoicing';
import { chargeRemove, chargeWrite } from '@/utils/invoicingCharges';
import { bandTotal, cleanCountry, groupRows } from '@/utils/invoicingView';
import GridCell from './GridCell';
import RowMenu from './RowMenu';
import StatusChip from './StatusChip';

const BASE_FIELDS = [
  { key: 'pais', label: 'País', width: 'w-36', country: true },
  { key: 'empresa', label: 'Empresa/Sector', width: 'w-40' },
  { key: 'cuenta', label: 'Entidad', width: 'w-32', mono: true },
  { key: 'codigo', label: 'Código', width: 'w-20', mono: true },
];

function ChargeRow({ charge, autoFocus, onChange, onRemove }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const cat = VARIABLE_CATEGORY_BY_ID[charge.cat] || VARIABLE_CATEGORY_BY_ID.otros;
  return (
    <li className="grid grid-cols-[112px_minmax(0,1fr)_96px_92px_28px] items-stretch border-t border-slate-100">
      <select value={cat.id} onChange={(e) => onChange({ cat: e.target.value })} aria-label="Categoría" className={`m-1 rounded-lg border px-1.5 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-400 ${cat.chip}`}>
        {VARIABLE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.short}</option>)}
      </select>
      <div className="min-w-0 border-l border-slate-100"><input ref={ref} defaultValue={charge.detalle} placeholder="Detalle del cargo" onBlur={(e) => { if (e.target.value.trim() !== charge.detalle) onChange({ detalle: e.target.value.trim() }); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="block w-full bg-transparent px-2 py-1.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-400" aria-label="Detalle" /></div>
      <div className="border-l border-slate-100"><GridCell value={charge.cc} placeholder="CC" onCommit={(v) => onChange({ cc: v })} /></div>
      <div className="border-l border-slate-100 bg-emerald-50/30"><GridCell value={charge.precio} type="number" placeholder="Precio" onCommit={(v) => onChange({ precio: v })} /></div>
      <button onClick={onRemove} className="m-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-600 flex items-center justify-center" title="Quitar el cargo" aria-label="Quitar el cargo"><X className="w-3.5 h-3.5" /></button>
    </li>
  );
}

function EntityCard({ row, ri, grid, compact, change, isNew, prevLabel, onPatch, onStatus, onAddRow, onDeleteRow, listFor }) {
  const [menu, setMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const charges = variableCharges(row.data);
  const total = rowTotal('variables', row.data);
  const write = (charge) => { const w = chargeWrite(row.data, charge); onPatch(row, w.patch, w.remove); return w.id; };
  const add = (cat) => { const id = write({ cat, cc: VARIABLE_CATEGORY_BY_ID[cat].cc }); setFocusId(id); setAdding(false); };
  const actions = [
    { label: 'Insertar entidad abajo', onClick: () => onAddRow(row) },
    { label: 'Eliminar entidad', onClick: () => onDeleteRow(row), danger: true },
  ];
  return (
    <section data-row-id={row.id} className={`bg-white rounded-2xl border shadow-sm ${change ? 'border-amber-300' : 'border-slate-200'}`} aria-label={`${row.data?.pais || ''} ${row.data?.empresa || ''}`.trim()}>
      <header className="flex items-center gap-1 px-2 py-1 flex-wrap">
        <div className="relative flex items-center gap-1 pr-1">
          <span className="font-mono text-[10px] text-slate-400 w-5 text-right">{ri + 1}</span>
          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`Entidad nueva (no estaba en ${prevLabel})`} />}
          <button onClick={() => setMenu(!menu)} className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400" title="Opciones de la entidad" aria-label={`Opciones de la entidad ${ri + 1}`}><MoreHorizontal className="w-3.5 h-3.5" /></button>
          {menu && <RowMenu actions={actions} onClose={() => setMenu(false)} />}
        </div>
        {BASE_FIELDS.map((f, ci) => (
          <div key={f.key} className={`${f.width} rounded-lg border border-transparent hover:border-slate-200 relative`} title={f.label}>
            <GridCell grid={grid} r={ri} c={ci} value={row.data?.[f.key]} mono={f.mono} compact list={listFor?.[f.key]} placeholder={f.label} onCommit={(v) => { const raw = f.country ? cleanCountry(v) : v; onPatch(row, raw ? { [f.key]: raw } : {}, raw ? [] : [f.key]); }} className={ci === 1 ? 'font-black text-slate-800' : ''} />
            {change?.[f.key] && <span className="pointer-events-none absolute right-0.5 top-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" title={`${prevLabel}: ${change[f.key].before || '—'}`} />}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-1">
          {change?.total && <span className="text-[10px] font-bold text-amber-700" title={`${prevLabel}: ${formatAmount(change.total.before)}`}>antes {formatAmount(change.total.before)}</span>}
          <span className="font-mono text-sm font-black text-emerald-700 tabular-nums">{formatAmount(total)}</span>
          {isBillable('variables', row.data) ? <StatusChip status={rowStatus(row.data)} onChange={(next) => onStatus(row, next)} /> : null}
        </div>
      </header>
      {charges.length > 0 && (
        <ul className={compact ? 'text-[11px]' : ''}>
          {charges.map((c) => (
            <ChargeRow key={c.id} charge={c} autoFocus={focusId === c.id} onChange={(patch) => write({ id: c.id, ...patch })} onRemove={() => { const w = chargeRemove(row.data, c.id); onPatch(row, w.patch, w.remove); }} />
          ))}
        </ul>
      )}
      <footer className="border-t border-slate-100 px-2 py-1 flex items-center gap-1 flex-wrap">
        {adding ? (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Categoría:</span>
            {VARIABLE_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => add(c.id)} className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${c.chip}`}>{c.short}</button>
            ))}
            <button onClick={() => setAdding(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1">Cancelar</button>
          </>
        ) : (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-50">
            <Plus className="w-3 h-3" /> Agregar cargo
          </button>
        )}
        {!charges.length && !adding && <span className="text-[10px] font-bold text-slate-300">Sin cargos este mes</span>}
      </footer>
    </section>
  );
}

export default function ChargesList({ grid, rows = [], collapsed = new Set(), onToggleGroup, compact = false, changes, prevLabel = 'el mes anterior', onPatch, onStatus, onAddRow, onDeleteRow, listFor }) {
  const groups = groupRows(rows, { by: 'pais', collapsed });
  const visible = groups.flatMap((g) => (g.hidden ? [] : g.rows));
  const indexOf = new Map(visible.map((r, i) => [r.id, i]));
  if (!rows.length) return <p className="bg-white rounded-2xl border border-slate-200 px-4 py-10 text-center text-xs font-bold text-slate-400">No hay entidades que mostrar.</p>;
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key} className="space-y-1.5">
          <button onClick={() => onToggleGroup?.(g.key)} aria-expanded={!g.hidden} className="flex items-center gap-2 px-1 text-[11px] font-black text-emerald-900 hover:text-emerald-700">
            {g.hidden ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="uppercase tracking-wider">{g.label}</span>
            <span className="font-bold text-emerald-700/70">· {g.rows.length} {g.rows.length === 1 ? 'entidad' : 'entidades'}</span>
            <span className="font-mono tabular-nums text-emerald-800">· {formatAmount(bandTotal('variables', g.rows))}</span>
          </button>
          {!g.hidden && g.rows.map((row) => (
            <EntityCard key={row.id} row={row} ri={indexOf.get(row.id)} grid={grid} compact={compact} change={changes?.cells?.[row.id]} isNew={!!changes?.added?.has(row.id)} prevLabel={prevLabel} onPatch={onPatch} onStatus={onStatus} onAddRow={onAddRow} onDeleteRow={onDeleteRow} listFor={listFor} />
          ))}
        </div>
      ))}
      <button onClick={() => onAddRow(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-emerald-400 hover:text-emerald-700">
        <Plus className="w-3.5 h-3.5" /> Agregar entidad
      </button>
    </div>
  );
}

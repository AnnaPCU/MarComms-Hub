// ════════════════════════════════════════════════════════════════════
// CrmExtraTable — «CRM (Ale)»: conceptos y totales de abajo
// ════════════════════════════════════════════════════════════════════
// Debajo de las licencias, el Excel de cada mes tiene sus propias filas
// (ej. «CRM Horas Ale · 3910 euros», «TOTAL CRM Licencias = C24 + C21»).
// Acá cada fila es un concepto (monto + moneda) o un total, que suma lo
// que se elija: las licencias del mes y/o otros conceptos (lo mismo que
// hacía la fórmula del Excel).
//
// Props: grid, rows (crm_extra ordenadas), licenses (total de licencias),
//   onPatch(row, patch, remove), onAdd(data), onMove(row, dir), onDelete(row),
//   readOnly (link externo: solo se ve)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, MoreHorizontal, Plus, Sigma } from 'lucide-react';
import { CRM_CURRENCIES, CRM_LICENSES_REF } from '@/constants/invoicing';
import { crmExtraValue, formatAmount } from '@/utils/invoicing';
import GridCell from './GridCell';
import RowMenu from './RowMenu';

function SumPicker({ row, rows, licenses, onChange, onClose }) {
  const sel = row.data?.sumOf || [];
  const options = [
    { id: CRM_LICENSES_REF, label: `Licencias del mes (${formatAmount(licenses)} USD)` },
    ...rows.filter((r) => r.data?.kind !== 'total').map((r, i) => ({
      id: r.id,
      label: `${r.data?.concepto || `Fila ${i + 1} sin nombre`} (${formatAmount(crmExtraValue(r, rows, licenses)) || '—'} ${r.data?.moneda || 'USD'})`,
    })),
  ];
  const toggle = (id) => onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  return (
    <div className="basis-full mt-1 bg-white border border-slate-200 rounded-xl p-2 space-y-1" role="group" aria-label="Qué suma este total">
        <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Este total suma</p>
        {options.map((o) => (
          <button key={o.id} onClick={() => toggle(o.id)} role="checkbox" aria-checked={sel.includes(o.id)} className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
            <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${sel.includes(o.id) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
              {sel.includes(o.id) && <Check className="w-3 h-3 text-white" />}
            </span>
            {o.label}
          </button>
        ))}
        <button onClick={onClose} className="mt-1 w-full rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700">Listo</button>
    </div>
  );
}

export default function CrmExtraTable({ grid, rows = [], licenses = 0, onPatch, onAdd, onMove, onDelete, readOnly = false }) {
  const [menu, setMenu] = useState(null);
  const [picker, setPicker] = useState(null);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const refLabel = (ref) => (ref === CRM_LICENSES_REF ? 'Licencias' : byId[ref]?.data?.concepto || 'Fila sin nombre');

  return (
    <div>
      <div className="overflow-x-auto lg:overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="table-fixed border-collapse text-xs" style={{ width: 46 + 330 + 130 + 90 + 340 }}>
          <colgroup><col style={{ width: 46 }} /><col style={{ width: 330 }} /><col style={{ width: 130 }} /><col style={{ width: 90 }} /><col style={{ width: 340 }} /></colgroup>
          <thead>
            <tr className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600">
              <th className="border-b border-r border-slate-200 text-[9px] text-slate-400">#</th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-left">Concepto</th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-right">Monto</th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-left">Moneda</th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-left">Suma de (solo los totales)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs font-bold text-slate-400">Sin conceptos este mes.</td></tr>}
            {rows.map((row, ri) => {
              const d = row.data || {};
              const isTotal = d.kind === 'total';
              const value = crmExtraValue(row, rows, licenses);
              const actions = [
                { label: 'Subir fila', onClick: () => onMove(row, -1), disabled: ri === 0 },
                { label: 'Bajar fila', onClick: () => onMove(row, 1), disabled: ri === rows.length - 1 },
                { label: isTotal ? 'Pasar a concepto (monto a mano)' : 'Pasar a total (suma filas)', onClick: () => (isTotal ? onPatch(row, { kind: 'concepto', monto: String(value ?? '') }, ['sumOf']) : onPatch(row, { kind: 'total', sumOf: [] }, ['monto'])) },
                { label: 'Eliminar fila', onClick: () => onDelete(row), danger: true },
              ];
              return (
                <tr key={row.id} className={`group ${isTotal ? 'bg-yellow-50' : ''}`}>
                  <td className="border-b border-r border-slate-200 bg-slate-50 p-0">
                    <div className="relative flex items-center justify-between pl-1.5 pr-0.5">
                      <span className="font-mono text-[10px] text-slate-400">{ri + 1}</span>
                      {!readOnly && <button onClick={() => setMenu(menu === row.id ? null : row.id)} className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center opacity-40 group-hover:opacity-100 focus:opacity-100" title="Opciones de la fila" aria-label={`Opciones de la fila ${ri + 1}`}>
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      </button>}
                      {menu === row.id && !readOnly && <RowMenu actions={actions} onClose={() => setMenu(null)} />}
                    </div>
                  </td>
                  <td className={`border-b border-r border-slate-200 p-0 ${isTotal ? 'font-black' : ''}`}>
                    <GridCell grid={grid} r={ri} c={0} value={d.concepto} placeholder="Sin nombre" readOnly={readOnly} onCommit={(v) => (v ? onPatch(row, { concepto: v }) : onPatch(row, {}, ['concepto']))} />
                  </td>
                  <td className="border-b border-r border-slate-200 p-0">
                    {isTotal
                      ? <p className="px-2 py-1.5 text-right font-mono font-black tabular-nums text-slate-800">{formatAmount(value)}</p>
                      : <GridCell grid={grid} r={ri} c={1} type="number" value={d.monto} readOnly={readOnly} onCommit={(v) => (v ? onPatch(row, { monto: v }) : onPatch(row, {}, ['monto']))} />}
                  </td>
                  <td className="border-b border-r border-slate-200 p-0">
                    {readOnly ? <p className="px-2 py-1.5 text-xs font-bold text-slate-700">{d.moneda || 'USD'}</p> : <select value={d.moneda || 'USD'} onChange={(e) => onPatch(row, { moneda: e.target.value })} className="w-full bg-transparent px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-400" aria-label="Moneda">
                      {CRM_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>}
                  </td>
                  <td className="border-b border-r border-slate-200 px-2 py-1">
                    {isTotal && (
                      <div className="flex flex-wrap items-center gap-1">
                        {(d.sumOf || []).filter((ref) => ref === CRM_LICENSES_REF || byId[ref]).map((ref) => (
                          <span key={ref} className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{refLabel(ref)}</span>
                        ))}
                        {!readOnly && <button onClick={() => setPicker(picker === row.id ? null : row.id)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-50">
                          <Sigma className="w-3 h-3" /> Elegir qué suma
                        </button>}
                        {picker === row.id && !readOnly && <SumPicker row={row} rows={rows} licenses={licenses} onChange={(sumOf) => onPatch(row, { sumOf })} onClose={() => setPicker(null)} />}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => onAdd({ moneda: 'USD' })} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-emerald-400 hover:text-emerald-700">
          <Plus className="w-3.5 h-3.5" /> Agregar concepto
        </button>
        <button onClick={() => onAdd({ kind: 'total', concepto: 'TOTAL', moneda: 'USD', sumOf: [CRM_LICENSES_REF] })} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-emerald-400 hover:text-emerald-700">
          <Sigma className="w-3.5 h-3.5" /> Agregar total
        </button>
      </div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// EntitiesTable — Entidades facturadas en el mes elegido
// ════════════════════════════════════════════════════════════════════
// Una fila por entidad (columna del Excel): manager, licencias, detalle,
// precio del mes y variación contra el mes anterior. Cliquear una fila
// despliega usuarios e historial (EntityDetail).
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, Info } from 'lucide-react';

import { monthOf, previousMonth, priceCheck, licensesOf, userLicenseCheck } from '@/utils/hubspotBilling';
import { BrandChip, Delta, money } from './BillingBits';
import EntityDetail from './EntityDetail';

export default function EntitiesTable({ entities, month, meta }) {
  const [open, setOpen] = useState(null);
  const prev = previousMonth(month);
  const rows = [...entities].sort((a, b) => (monthOf(b, month)?.price || 0) - (monthOf(a, month)?.price || 0) || a.position - b.position);

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-3">Entidades · {month}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-100">
              <th className="py-2 px-2">Entidad</th><th className="py-2 px-2">Manager</th><th className="py-2 px-2 text-center">Licencias</th>
              <th className="py-2 px-2">Detalle</th><th className="py-2 px-2 text-right">Precio</th><th className="py-2 px-2 text-right">vs {prev ? prev.slice(0, 3) : '—'}</th><th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const m = monthOf(e, month) || {};
              const before = prev ? (monthOf(e, prev)?.price ?? null) : null;
              const lic = licensesOf(m);
              const check = priceCheck(m, meta.unitPrices);
              const warn = check && check.hasLicenses && !check.explained;
              const userWarn = m.price > 0 && !userLicenseCheck(e, m).ok;
              const isOpen = open === e.key;
              return (
                <React.Fragment key={e.key}>
                  <tr onClick={() => setOpen(isOpen ? null : e.key)} className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 align-top ${!m.price ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5"><BrandChip entityKey={e.key} /><span className="font-black text-slate-800 text-xs">{e.key}</span></div>
                      <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{e.legalEntity}</p>
                    </td>
                    <td className="py-2.5 px-2 text-[11px] font-bold text-slate-600 max-w-[180px]">{e.manager || '—'}</td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {lic.salesPro > 0 && <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-1.5 py-0.5 text-[10px] font-black mr-1 font-mono">{lic.salesPro} SP</span>}
                      {lic.core > 0 && <span className="inline-block bg-sky-50 text-sky-700 border border-sky-200 rounded-md px-1.5 py-0.5 text-[10px] font-black font-mono">{lic.core} Core</span>}
                      {!lic.salesPro && !lic.core && <span className="text-slate-300 text-[11px]">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-600 whitespace-pre-line min-w-[160px]">{m.detail || '—'}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-black text-slate-800 whitespace-nowrap">
                      {money(m.price)}
                      {warn && <span title={`Licencias × tarifa = ${money(check.expected)}`}><AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1 -mt-0.5" /></span>}
                      {check && check.extras.length > 0 && check.diff !== 0 && <span title={`Incluye ${check.extras.join(', ')} (+${money(check.diff)})`}><Info className="w-3.5 h-3.5 text-sky-500 inline ml-1 -mt-0.5" /></span>}
                      {userWarn && <span className="block text-[9px] font-sans font-black text-amber-600 uppercase tracking-wider">usuarios ≠ licencias</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap"><Delta now={m.price} before={before} /></td>
                    <td className="py-2.5 px-2 text-slate-300"><ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <td colSpan={7} className="px-4 py-4"><EntityDetail entity={e} month={month} meta={meta} /></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

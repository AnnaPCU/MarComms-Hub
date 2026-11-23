// ════════════════════════════════════════════════════════════════════
// EntityDetail — Detalle de una entidad: usuarios e historial mensual
// ════════════════════════════════════════════════════════════════════
// Se muestra desplegado debajo de la fila en la tabla de entidades.
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';

import { LICENSE_TYPES, monthEn } from '@/constants/hubspotBilling';
import { priceCheck, userLicenseCheck, monthOf, unitPricesFor } from '@/utils/hubspotBilling';
import { money } from './BillingBits';

export default function EntityDetail({ entity, month, meta }) {
  const userCheck = userLicenseCheck(entity, monthOf(entity, month));
  const groups = [
    ['salesPro', entity.users.filter((u) => u.license === 'salesPro')],
    ['core', entity.users.filter((u) => u.license === 'core')],
    ['', entity.users.filter((u) => !u.license)],
  ].filter(([, list]) => list.length);
  const summary = (meta.summaryPrices || []).find((p) => p.entityKey === entity.key);
  const history = entity.months.filter((m) => m.price || m.detail);

  return (
    <div className="grid lg:grid-cols-5 gap-4 text-xs">
      <div className="lg:col-span-2 space-y-3">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Legal name</p>
          <p className="font-bold text-slate-700">{entity.legalEntity || '—'}</p>
        </div>
        {summary && (
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price in the Summary sheet</p>
            <p className="font-mono font-black text-slate-700">{money(summary.price)}</p>
          </div>
        )}
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Users className="w-3 h-3" /> Users ({entity.users.length})</p>
          <div className="space-y-2">
            {groups.map(([type, list]) => (
              <div key={type || 'none'}>
                <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider mb-1 ${type ? LICENSE_TYPES[type].chip : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {type ? LICENSE_TYPES[type].label : 'No license type'} · {list.length}
                </span>
                <p className="text-slate-600 leading-relaxed">{list.map((u) => u.name).join(', ')}</p>
              </div>
            ))}
          </div>
          {!userCheck.ok && (
            <p className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              In {monthEn(month)}, {userCheck.licSalesPro} Sales Pro and {userCheck.licCore} Core are billed, but the list has {userCheck.usersSalesPro} Sales Pro (°) and {userCheck.usersCore} Core (-).
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">History</p>
        {history.length === 0 ? <p className="text-slate-400">No billing loaded.</p> : (
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-200">
                <th className="py-1.5 pr-2">Month</th><th className="py-1.5 px-2">Detail</th><th className="py-1.5 px-2 text-right">Billed</th><th className="py-1.5 pl-2 text-right">Licenses × rate</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => {
                const up = unitPricesFor(entity, m.month, meta.unitPrices);
                const c = priceCheck(m, up);
                const warn = c && c.hasLicenses && !c.explained;
                return (
                  <tr key={m.month} className={`border-b border-slate-100 align-top ${m.month === month ? 'bg-sky-50/40' : ''}`}>
                    <td className="py-1.5 pr-2 font-black text-slate-600">{monthEn(m.month)}</td>
                    <td className="py-1.5 px-2 text-slate-600 whitespace-pre-line">{m.detail || '—'}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-slate-800">{money(m.price)}</td>
                    <td className={`py-1.5 pl-2 text-right font-mono ${warn ? 'text-amber-600 font-black' : 'text-slate-400'}`}>
                      {c && c.hasLicenses ? money(c.expected) : '—'}
                      {c && c.diff !== 0 && c.extras.length > 0 && <span className="block text-[10px] text-slate-400 font-sans">+{money(c.diff)} {c.extras.join(', ')}</span>}
                      {c?.agreed && <span className="block text-[10px] text-sky-600 font-sans">{c.agreed}</span>}
                      {up.special && c?.hasLicenses && <span className="block text-[10px] text-sky-600 font-sans" title="This entity's special rate">special rate: SP {money(up.salesPro)} · Core {money(up.core)}</span>}
                      {warn && <span className="block text-[10px] font-sans">difference {c.diff > 0 ? '+' : '−'}{money(Math.abs(c.diff))}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

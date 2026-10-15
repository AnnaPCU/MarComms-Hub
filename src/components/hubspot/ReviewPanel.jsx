// ════════════════════════════════════════════════════════════════════
// ReviewPanel — Lo que conviene revisar en el Excel
// ════════════════════════════════════════════════════════════════════
// · TOTAL del Excel que no coincide con la suma de las entidades
// · Precio cobrado distinto de licencias × tarifa, sin otro concepto
// · Usuarios (° Sales Pro / - Core) que no coinciden con las licencias del mes
// Cada advertencia tiene un id estable y se puede borrar (onDismiss); las
// borradas (`dismissed`) no se muestran. `total:<mes>` es también el aviso
// del TOTAL que está arriba del dashboard.
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

import { MONTHS_ES } from '@/constants/hubspotBilling';
import { totalCheck, priceCheck, userLicenseCheck, monthOf } from '@/utils/hubspotBilling';
import { money } from './BillingBits';

export const totalWarningId = (month) => `total:${month}`;

export const reviewItems = (entities, meta, month) => {
  const items = [];
  MONTHS_ES.forEach((m) => {
    const t = totalCheck(entities, meta, m);
    if (t && t.diff !== 0) items.push({ id: totalWarningId(m), kind: 'total', month: m, text: `${m}: el TOTAL del Excel dice ${money(t.excel)} y las entidades suman ${money(t.computed)}${t.missing.length ? ` (falta ${t.missing.join(', ')})` : ''}.` });
  });
  entities.forEach((e) => e.months.forEach((m) => {
    const c = priceCheck(m, meta.unitPrices);
    if (c && c.hasLicenses && !c.explained) {
      items.push({ id: `price:${e.key}:${m.month}`, kind: 'price', month: m.month, text: `${e.key} · ${m.month}: se cobra ${money(m.price)} y las licencias del detalle suman ${money(c.expected)} (${c.diff > 0 ? '+' : '−'}${money(Math.abs(c.diff))} sin detalle).` });
    }
  }));
  entities.forEach((e) => {
    const m = monthOf(e, month);
    if (!m || !m.price) return;
    const u = userLicenseCheck(e, m);
    if (!u.ok) items.push({ id: `users:${e.key}:${month}`, kind: 'users', month, text: `${e.key} · ${month}: ${u.licSalesPro} Sales Pro + ${u.licCore} Core facturadas, pero la lista de usuarios tiene ${u.usersSalesPro} Sales Pro (°) y ${u.usersCore} Core (-).` });
  });
  return items;
};

export function DismissButton({ onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} title="Borrar advertencia" aria-label="Borrar advertencia" className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-black/10 transition-all ${className}`}>
      <X className="w-3.5 h-3.5" />
    </button>
  );
}

export default function ReviewPanel({ entities, meta, month, dismissed, onDismiss }) {
  const all = reviewItems(entities, meta, month);
  const items = dismissed ? all.filter((it) => !dismissed.has(it.id)) : all;
  const hidden = all.length - items.length;
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5" /> Para revisar en el Excel
        {hidden > 0 && <span className="ml-auto text-[10px] font-bold normal-case tracking-normal text-slate-400">{hidden} {hidden === 1 ? 'advertencia borrada' : 'advertencias borradas'}</span>}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {hidden ? 'No queda nada para revisar.' : 'Todo cuadra.'}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className={`text-[11px] rounded-lg pl-3 pr-1.5 py-2 border flex items-start gap-2 ${it.kind === 'total' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span className="flex-1 min-w-0">{it.text}</span>
              {onDismiss && <DismissButton onClick={() => onDismiss(it.id)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

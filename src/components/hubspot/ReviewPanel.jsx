// ════════════════════════════════════════════════════════════════════
// ReviewPanel — Lo que conviene revisar en el Excel
// ════════════════════════════════════════════════════════════════════
// · TOTAL del Excel que no coincide con la suma de las entidades
// · Precio cobrado distinto de licencias × tarifa, sin otro concepto
// · Usuarios (° Sales Pro / - Core) que no coinciden con las licencias del mes
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { MONTHS_ES } from '@/constants/hubspotBilling';
import { totalCheck, priceCheck, userLicenseCheck, monthOf } from '@/utils/hubspotBilling';
import { money } from './BillingBits';

export const reviewItems = (entities, meta, month) => {
  const items = [];
  MONTHS_ES.forEach((m) => {
    const t = totalCheck(entities, meta, m);
    if (t && t.diff !== 0) items.push({ kind: 'total', month: m, text: `${m}: el TOTAL del Excel dice ${money(t.excel)} y las entidades suman ${money(t.computed)}${t.missing.length ? ` (falta ${t.missing.join(', ')})` : ''}.` });
  });
  entities.forEach((e) => e.months.forEach((m) => {
    const c = priceCheck(m, meta.unitPrices);
    if (c && c.hasLicenses && !c.explained) {
      items.push({ kind: 'price', month: m.month, text: `${e.key} · ${m.month}: se cobra ${money(m.price)} y las licencias del detalle suman ${money(c.expected)} (${c.diff > 0 ? '+' : '−'}${money(Math.abs(c.diff))} sin detalle).` });
    }
  }));
  entities.forEach((e) => {
    const m = monthOf(e, month);
    if (!m || !m.price) return;
    const u = userLicenseCheck(e, m);
    if (!u.ok) items.push({ kind: 'users', month, text: `${e.key} · ${month}: ${u.licSalesPro} Sales Pro + ${u.licCore} Core facturadas, pero la lista de usuarios tiene ${u.usersSalesPro} Sales Pro (°) y ${u.usersCore} Core (-).` });
  });
  return items;
};

export default function ReviewPanel({ entities, meta, month }) {
  const items = reviewItems(entities, meta, month);
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5" /> Para revisar en el Excel
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Todo cuadra.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className={`text-[11px] rounded-lg px-3 py-2 border ${it.kind === 'total' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{it.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

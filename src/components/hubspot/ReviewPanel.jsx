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

import { MONTHS_ES, monthEn } from '@/constants/hubspotBilling';
import { totalCheck, priceCheck, userLicenseCheck, monthOf, unitPricesFor } from '@/utils/hubspotBilling';
import { money } from './BillingBits';

export const totalWarningId = (month) => `total:${month}`;

export const reviewItems = (entities, meta, month) => {
  const items = [];
  MONTHS_ES.forEach((m) => {
    const t = totalCheck(entities, meta, m);
    if (t && t.diff !== 0) items.push({ id: totalWarningId(m), kind: 'total', month: m, text: `${monthEn(m)}: the Excel TOTAL says ${money(t.excel)} and the entities add up to ${money(t.computed)}${t.missing.length ? ` (missing ${t.missing.join(', ')})` : ''}.` });
  });
  entities.forEach((e) => e.months.forEach((m) => {
    const c = priceCheck(m, unitPricesFor(e, m.month, meta.unitPrices));
    if (c && c.hasLicenses && !c.explained) {
      items.push({ id: `price:${e.key}:${m.month}`, kind: 'price', month: m.month, text: `${e.key} · ${monthEn(m.month)}: billed ${money(m.price)} but the licenses in the detail add up to ${money(c.expected)} (${c.diff > 0 ? '+' : '−'}${money(Math.abs(c.diff))} unexplained).` });
    }
  }));
  entities.forEach((e) => {
    const m = monthOf(e, month);
    if (!m || !m.price) return;
    const u = userLicenseCheck(e, m);
    if (!u.ok) items.push({ id: `users:${e.key}:${month}`, kind: 'users', month, text: `${e.key} · ${monthEn(month)}: ${u.licSalesPro} Sales Pro + ${u.licCore} Core billed, but the user list has ${u.usersSalesPro} Sales Pro (°) and ${u.usersCore} Core (-).` });
  });
  return items;
};

export function DismissButton({ onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} title="Dismiss warning" aria-label="Dismiss warning" className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-black/10 transition-all ${className}`}>
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
        <AlertTriangle className="w-3.5 h-3.5" /> To review in the Excel
        {hidden > 0 && <span className="ml-auto text-[10px] font-bold normal-case tracking-normal text-slate-400">{hidden} {hidden === 1 ? 'dismissed warning' : 'dismissed warnings'}</span>}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {hidden ? 'Nothing left to review.' : 'Everything adds up.'}</p>
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

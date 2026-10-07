// ════════════════════════════════════════════════════════════════════
// BillingBits — Piezas chicas de CRM HubSpot (montos, deltas, KPIs)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { brandOfEntity } from '@/constants/hubspotBilling';

export const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export function Delta({ now, before }) {
  if (before === null || before === undefined) return <span className="text-slate-300 text-[11px]">—</span>;
  const d = (now || 0) - (before || 0);
  if (d === 0) return <span className="text-slate-400 text-[11px] font-mono">=</span>;
  const up = d > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-black ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon className="w-3 h-3" />{up ? '+' : '−'}{money(Math.abs(d))}
    </span>
  );
}

export function BrandChip({ entityKey }) {
  const ps = brandOfEntity(entityKey) === 'Peterson Solutions';
  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${ps ? 'bg-slate-100 text-slate-600' : 'bg-sky-50 text-sky-700'}`}>
      {ps ? 'PS' : 'CU'}
    </span>
  );
}

export function Kpi({ label, value, hint, accent = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className={`text-2xl md:text-3xl font-black font-mono mt-1 ${accent}`}>{value}</div>
      {hint && <div className="text-[10px] font-medium text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

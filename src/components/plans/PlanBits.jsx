// ════════════════════════════════════════════════════════════════════
// PlanBits — Piezas chicas de Planes de Marketing (badges, barras, KPIs)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { statusMeta, priorityMeta, TASK_STATUSES } from '@/constants/marketingPlans';

export const pctLabel = (pct) => `${Math.round((pct || 0) * 100)}%`;

export function StatusBadge({ status }) {
  const s = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${s.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = priorityMeta(priority);
  if (!p) return <span className="text-slate-300 text-[10px]">—</span>;
  return <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${p.chip}`}>{p.id}</span>;
}

export function ProgressBar({ pct, className = 'h-2' }) {
  return (
    <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all" style={{ width: pctLabel(pct) }} />
    </div>
  );
}

// Barra apilada por estado (cuántas tareas hay en cada uno)
export function StatusStack({ byStatus, total }) {
  if (!total) return <div className="h-1.5 rounded-full bg-slate-100" />;
  const parts = [...TASK_STATUSES, statusMeta('')].map((s) => ({ ...s, n: byStatus[s.id] || 0 })).filter((s) => s.n > 0);
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100" title={parts.map((p) => `${p.label}: ${p.n}`).join(' · ')}>
      {parts.map((p) => <div key={p.label} className={p.dot} style={{ width: `${(p.n / total) * 100}%` }} />)}
    </div>
  );
}

export function Kpi({ label, value, hint, accent = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black font-mono mt-1 ${accent}`}>{value}</p>
      {hint && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function SectionTitle({ n, children, right }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
        {n && <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center text-[10px]">{n}</span>}
        {children}
      </h3>
      {right}
    </div>
  );
}

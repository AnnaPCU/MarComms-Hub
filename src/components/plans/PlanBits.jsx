// ════════════════════════════════════════════════════════════════════
// PlanBits — Piezas chicas de la sección Planes (badges, barras, KPIs)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PLAN_TASK_STATUSES, PLAN_TASK_STATUS_BY_ID } from '@/constants/planTasks';
import { splitLinks } from '@/utils/planTasks';

export const pctLabel = (pct) => `${Math.round((pct || 0) * 100)}%`;

export const statusMeta = (status) => PLAN_TASK_STATUS_BY_ID[status] || PLAN_TASK_STATUS_BY_ID.Pendiente;

export function StatusBadge({ status }) {
  const s = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${s.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

export function ProgressBar({ pct, className = 'h-2' }) {
  return (
    <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all" style={{ width: pctLabel(pct) }} />
    </div>
  );
}

// Barra apilada por estado (cuántas tareas hay en cada uno)
export function StatusStack({ byStatus, total }) {
  if (!total) return <div className="h-1.5 rounded-full bg-slate-100" />;
  const parts = PLAN_TASK_STATUSES.map((s) => ({ ...s, n: byStatus[s.id] || 0 })).filter((s) => s.n > 0);
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100" title={parts.map((p) => `${p.label}: ${p.n}`).join(' · ')}>
      {parts.map((p) => <div key={p.id} className={p.solid} style={{ width: `${(p.n / total) * 100}%` }} />)}
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

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">{children}</h3>
      {right}
    </div>
  );
}

// Columna Link: puede traer varios links y textos sueltos (como en el Excel)
export function TaskLinks({ value }) {
  const parts = splitLinks(value);
  if (!parts.length) return <span className="text-slate-300">—</span>;
  let n = 0;
  return (
    <div className="flex flex-col gap-0.5">
      {parts.map((p, i) => (p.type === 'url' ? (
        <a key={i} href={p.value} target="_blank" rel="noopener noreferrer" title={p.value} className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 hover:underline whitespace-nowrap">
          <ExternalLink className="w-3 h-3" /> Link {(n += 1)}
        </a>
      ) : (
        <span key={i} className="text-[10px] text-slate-500 leading-snug">{p.value}</span>
      )))}
    </div>
  );
}

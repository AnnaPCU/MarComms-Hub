// ════════════════════════════════════════════════════════════════════
// PlanBits — Piezas chicas de la sección Planes (badges, barras, KPIs)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PLAN_TASK_STATUS_BY_ID } from '@/constants/planTasks';
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

// Columna Link: puede traer varios links y textos sueltos (como en el Excel).
// Un texto seguido de una URL ("Reporte.html" + vínculo) se muestra como
// un link con ese nombre. `color`: color de la marca (vista externa).
export function TaskLinks({ value, color }) {
  const parts = splitLinks(value);
  if (!parts.length) return <span className="text-slate-300">—</span>;
  const items = [];
  parts.forEach((p, i) => {
    const prev = items[items.length - 1];
    if (p.type === 'url' && prev && prev.type === 'text' && !prev.url) prev.url = p.value;
    else items.push({ ...p, key: i, url: p.type === 'url' ? p.value : null });
  });
  let n = 0;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {items.map((it) => (it.url ? (
        <a key={it.key} href={it.url} target="_blank" rel="noopener noreferrer" title={it.url} onClick={(e) => e.stopPropagation()} style={color ? { color } : undefined} className={`inline-flex items-start gap-1 text-[10px] font-black hover:underline ${color ? '' : 'text-emerald-700'}`}>
          <ExternalLink className="w-3 h-3 shrink-0 mt-px" />
          <span className="break-all line-clamp-2">{it.type === 'text' ? it.value : `Link ${(n += 1)}`}</span>
        </a>
      ) : (
        <span key={it.key} className="text-[10px] text-slate-500 leading-snug">{it.value}</span>
      )))}
    </div>
  );
}

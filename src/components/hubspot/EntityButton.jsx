// ════════════════════════════════════════════════════════════════════
// EntityButton — Una entidad en la lista del Weekly check
// ════════════════════════════════════════════════════════════════════
// Código · nombre · país, punto y barra con el color del semáforo (verde
// 100 %, amarillo 50–99 %, rojo < 50 %), importancia, tags y alertas de
// deadline (vencidos / vencen en 7 días).
//
// Props: entity, summary (entitySummary), active, onClick
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { CRM_PRIORITIES } from '@/constants/crmWeekly';
import { trafficLight } from '@/utils/crmWeekly';

export function PriorityChip({ priority, className = '' }) {
  const p = CRM_PRIORITIES.find((x) => x.id === priority);
  if (!p) return null;
  return <span className={`shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${p.chip} ${className}`} title={`Importancia ${p.label.toLowerCase()}`}>{p.label}</span>;
}

export function TagChip({ tag, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 px-1.5 py-0.5 text-[10px] font-bold">
      {tag}
      {onRemove && <button onClick={onRemove} className="text-sky-400 hover:text-sky-800 leading-none" title={`Sacar el tag ${tag}`} aria-label={`Sacar el tag ${tag}`}>×</button>}
    </span>
  );
}

export function LightDot({ summary, className = 'w-2.5 h-2.5' }) {
  const light = trafficLight(summary);
  return <span className={`shrink-0 rounded-full ${light ? light.dot : 'bg-slate-300'} ${className}`} title={light ? `${light.label} (${light.range})` : 'Sin ítems en el checklist'} />;
}

export default function EntityButton({ entity, summary, active, onClick }) {
  const light = trafficLight(summary);
  const tags = entity.tags || [];
  return (
    <button onClick={onClick} className={`w-full text-left rounded-2xl border px-3 py-2.5 transition-all ${active ? 'bg-sky-50 border-sky-300 shadow-sm' : 'bg-white border-slate-200 hover:border-sky-200'}`}>
      <div className="flex items-center gap-2">
        <LightDot summary={summary} />
        <span className="font-mono text-[10px] font-black text-slate-400 shrink-0">{entity.code}</span>
        <span className={`flex-1 min-w-0 truncate text-xs font-black ${active ? 'text-sky-800' : 'text-slate-700'}`} title={entity.name}>{entity.name}</span>
        <PriorityChip priority={entity.priority} />
        {summary.overdue > 0 && <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-red-50 text-red-600 px-1.5 py-0.5 text-[9px] font-black" title="Ítems vencidos"><AlertTriangle className="w-2.5 h-2.5" />{summary.overdue}</span>}
        {summary.soon > 0 && <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[9px] font-black" title="Vencen en 7 días o menos"><Clock className="w-2.5 h-2.5" />{summary.soon}</span>}
      </div>
      {(entity.country || tags.length > 0) && (
        <div className="mt-1 flex items-center gap-1 flex-wrap pl-[18px]">
          {entity.country && <span className="text-[10px] font-bold text-slate-400 mr-0.5">{entity.country}</span>}
          {tags.slice(0, 3).map((t) => <TagChip key={t} tag={t} />)}
          {tags.length > 3 && <span className="text-[10px] font-bold text-slate-400">+{tags.length - 3}</span>}
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${light ? light.bar : 'bg-slate-300'}`} style={{ width: `${summary.pct}%` }} />
        </div>
        <span className="font-mono text-[10px] font-black text-slate-500 shrink-0 whitespace-nowrap">{summary.pct} % · {summary.done}/{summary.total}</span>
      </div>
    </button>
  );
}

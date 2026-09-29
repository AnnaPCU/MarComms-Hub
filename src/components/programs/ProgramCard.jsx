// ════════════════════════════════════════════════════════════════════
// ProgramCard — Tarjeta de un programa en la lista
// ════════════════════════════════════════════════════════════════════
// Props: program, items (de programItems), summary (de programSummary), onOpen()
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ChevronRight, Globe, Layers } from 'lucide-react';
import { PILLAR_BY_ID } from '@/constants/campaigns';
import { PROGRAM_STATUS } from '@/constants/programs';
import { PILLAR_ICON } from './ProgramPillarsList';

export default function ProgramCard({ program, items, summary, onOpen }) {
  const st = PROGRAM_STATUS[summary.status] || PROGRAM_STATUS.planned;
  return (
    <button onClick={onOpen} className="group text-left bg-white border border-slate-200 hover:border-violet-400 hover:shadow-lg rounded-2xl p-4 transition-all w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${st.color}`}>{st.label}</span>
            {program.client && <span className="text-[10px] font-bold text-slate-400 truncate">{program.client}</span>}
          </div>
          <h3 className="font-black text-slate-900 leading-tight truncate">{program.name}</h3>
          <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1"><Globe className="w-3 h-3" /> {program.country || '—'} · {program.businessUnit || '—'}</p>
        </div>
        <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center shrink-0 transition-all"><Layers className="w-4 h-4" /></span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
          <span>{summary.completed}/{summary.total} pilares listos</span>
          <span className="font-mono">{summary.progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
          <div className={`h-full rounded-full ${summary.progress === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${summary.progress}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {items.map((it) => {
          const Icon = PILLAR_ICON[it.pillar];
          return (
            <span key={`${it.source}-${it.id}`} title={`${it.name} · ${it.progress}%`} className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${it.completed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {Icon && <Icon className="w-2.5 h-2.5" />} {PILLAR_BY_ID[it.pillar]?.label || it.pillar}
            </span>
          );
        })}
        {items.length === 0 && <span className="text-[10px] text-slate-400 italic">Sin pilares</span>}
        <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-violet-600" />
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// ProgramPillarsList — Pilares de un programa con su progreso
// ════════════════════════════════════════════════════════════════════
// Reutilizado por el detalle de Programas y por el Portal Cliente.
//
// Props:
//   items          — de programItems() (utils/programs)
//   onOpen(item)   — abrir el pilar (opcional)
//   compact        — filas más chicas (Portal)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Calendar, ChevronRight, Database, Mail, Search, Video, Zap } from 'lucide-react';
import { PILLAR_BY_ID } from '@/constants/campaigns';
import { formatDate } from '@/utils/date';

export const PILLAR_ICON = { webinars: Video, eventos: Calendar, email: Mail, paid: Zap, database: Database, research: Search };
const PILLAR_TONE = {
  webinars: 'bg-indigo-50 text-indigo-700 border-indigo-200', eventos: 'bg-orange-50 text-orange-700 border-orange-200',
  email: 'bg-blue-50 text-blue-700 border-blue-200', paid: 'bg-amber-50 text-amber-700 border-amber-200',
  database: 'bg-emerald-50 text-emerald-700 border-emerald-200', research: 'bg-purple-50 text-purple-700 border-purple-200',
};
const barTone = (p) => (p === 100 ? 'bg-emerald-500' : p >= 50 ? 'bg-violet-500' : p > 0 ? 'bg-amber-500' : 'bg-slate-300');

export default function ProgramPillarsList({ items, onOpen, compact = false }) {
  if (!items || items.length === 0) {
    return <p className="text-[11px] text-slate-400 font-medium italic py-2">Este programa todavía no tiene pilares vinculados.</p>;
  }
  return (
    <ul className={compact ? 'space-y-1' : 'space-y-2'}>
      {items.map((it) => {
        const Icon = PILLAR_ICON[it.pillar] || Mail;
        const label = PILLAR_BY_ID[it.pillar]?.label || it.pillar;
        const Row = onOpen ? 'button' : 'div';
        return (
          <li key={`${it.source}-${it.id}`}>
            <Row onClick={onOpen ? () => onOpen(it) : undefined} className={`w-full text-left flex items-center gap-3 rounded-xl border bg-white ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} ${onOpen ? 'hover:border-violet-400 hover:shadow-sm cursor-pointer' : ''} border-slate-200 transition-all`}>
              <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${PILLAR_TONE[it.pillar] || 'bg-slate-50 text-slate-500 border-slate-200'}`}><Icon className="w-4 h-4" /></span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                  {it.date && <span className="text-[9px] font-mono font-bold text-slate-400">{formatDate(it.date)}</span>}
                </span>
                <span className={`block font-black text-slate-800 leading-tight truncate ${compact ? 'text-xs' : 'text-sm'}`}>{it.name}</span>
                <span className="flex items-center gap-2 mt-1">
                  <span className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><span className={`block h-full rounded-full ${barTone(it.progress)}`} style={{ width: `${it.progress}%` }} /></span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 w-9 text-right">{it.progress}%</span>
                </span>
              </span>
              {onOpen && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
            </Row>
          </li>
        );
      })}
    </ul>
  );
}

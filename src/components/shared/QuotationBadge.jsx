// ════════════════════════════════════════════════════════════════════
// QuotationBadge — Chip clickeable para estado de validación de cotización
// ════════════════════════════════════════════════════════════════════
// Muestra "Cotización validada" (verde) o "Cotización sin validar" (slate)
// y al click togglea el estado. Usado en webinars, campañas y eventos.
//
// Props:
//   validated : boolean
//   onToggle  : (nextValue: boolean) => void
//   size      : 'sm' | 'md'  (default 'sm')
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { BadgeCheck, BadgeX } from 'lucide-react';

export default function QuotationBadge({ validated, onToggle, size = 'sm' }) {
  const isSm = size === 'sm';
  const pad = isSm ? 'px-2.5 py-1' : 'px-3 py-1.5';
  const text = isSm ? 'text-[9px]' : 'text-[11px]';
  const iconSize = isSm ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(!validated); }}
      title={validated ? 'Cotización validada — click para desmarcar' : 'Cotización sin validar — click para validar'}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-black uppercase tracking-wider transition-all ${pad} ${text} ${
        validated
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
      }`}
    >
      {validated
        ? <><BadgeCheck className={iconSize} /> Cotización validada</>
        : <><BadgeX className={iconSize} /> Cotización sin validar</>}
    </button>
  );
}

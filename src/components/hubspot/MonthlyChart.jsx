// ════════════════════════════════════════════════════════════════════
// MonthlyChart — Facturación total por mes (barras; cliquear elige el mes)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { money } from './BillingBits';

export default function MonthlyChart({ totals, selected, onSelect }) {
  const max = Math.max(1, ...totals.map((t) => t.total));
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-4">
        <BarChart3 className="w-3.5 h-3.5" /> Facturación por mes
      </h3>
      <div className="flex items-end gap-1.5 h-44">
        {totals.map((t) => {
          const active = t.month === selected;
          const empty = t.total === 0;
          return (
            <button
              key={t.month}
              type="button"
              disabled={empty}
              onClick={() => onSelect(t.month)}
              title={empty ? `${t.month}: sin facturación` : `${t.month}: ${money(t.total)} · ${t.billed} entidades`}
              className="flex-1 h-full flex flex-col justify-end items-center gap-1 group disabled:cursor-default"
            >
              {!empty && <span className={`text-[9px] font-black font-mono ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>{(t.total / 1000).toFixed(1)}k</span>}
              <div
                className={`w-full rounded-t-lg transition-all ${empty ? 'bg-slate-100' : active ? 'bg-gradient-to-t from-sky-500 to-blue-600' : 'bg-sky-200 group-hover:bg-sky-300'}`}
                style={{ height: empty ? '4px' : `${Math.max(6, (t.total / max) * 100)}%` }}
              />
              <span className={`text-[9px] font-black uppercase ${active ? 'text-blue-600' : 'text-slate-400'}`}>{t.month.slice(0, 3)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

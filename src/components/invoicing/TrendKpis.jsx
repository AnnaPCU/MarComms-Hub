// ════════════════════════════════════════════════════════════════════
// TrendKpis — Tarjetas del mes con variación y mini gráfico
// ════════════════════════════════════════════════════════════════════
// Fijo y facturas, Variables, Fijo + Variables y CRM · Licencias: el total
// del mes, la diferencia contra el mes anterior (▲ +1.000 vs sep) y un
// mini gráfico de barras de los últimos meses (el elegido más oscuro).
//
// Props: months (['YYYY-MM'] del más viejo al más nuevo), summaries
//   ({ [month]: monthSummary }), month (el elegido)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { formatAmount } from '@/utils/invoicing';
import { MONTHS_ES } from '@/constants/planTasks';

const SPARK_MONTHS = 6;
const CARDS = [
  { id: 'fijo', label: 'Fijo y facturas', hint: 'Total a cobrar', accent: 'text-emerald-600', bar: '#059669' },
  { id: 'variables', label: 'Variables', hint: 'Total del mes', accent: 'text-teal-600', bar: '#0d9488' },
  { id: 'fijoMasVariables', label: 'Fijo + Variables', hint: '', accent: 'text-slate-800', bar: '#334155' },
  { id: 'crmLicenses', label: 'CRM · Licencias', hint: 'USD', accent: 'text-sky-600', bar: '#0284c7' },
];

const shortMonth = (key) => MONTHS_ES[Number(key.slice(5, 7)) - 1].slice(0, 3).toLowerCase();

function Spark({ points, current, color }) {
  const W = 96; const H = 28; const gap = 2;
  const max = Math.max(1, ...points.map((p) => p.value));
  const bw = (W - gap * (points.length - 1)) / points.length;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0" role="img" aria-label={points.map((p) => `${shortMonth(p.month)} ${formatAmount(p.value)}`).join(', ')}>
      {points.map((p, i) => {
        const h = Math.max(2, (p.value / max) * (H - 2));
        return <rect key={p.month} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={2} fill={color} opacity={p.month === current ? 1 : 0.35}><title>{`${shortMonth(p.month)}: ${formatAmount(p.value)}`}</title></rect>;
      })}
    </svg>
  );
}

function Delta({ now, before, prevMonth }) {
  if (before === undefined) return <span className="text-[10px] font-bold text-slate-300">sin mes anterior</span>;
  const d = Math.round((now - before) * 100) / 100;
  if (!d) return <span className="text-[10px] font-bold text-slate-400">= {shortMonth(prevMonth)}</span>;
  return <span className={`text-[10px] font-black ${d > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{d > 0 ? '▲ +' : '▼ '}{formatAmount(d)} <span className="font-bold text-slate-400">vs {shortMonth(prevMonth)}</span></span>;
}

export default function TrendKpis({ months = [], summaries = {}, month }) {
  const idx = months.indexOf(month);
  if (idx < 0) return null;
  const prevMonth = months[idx - 1];
  const window = months.slice(Math.max(0, idx - SPARK_MONTHS + 1), idx + 1);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map((c) => {
        const now = summaries[month]?.[c.id] ?? 0;
        const before = prevMonth ? summaries[prevMonth]?.[c.id] ?? 0 : undefined;
        return (
          <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
            <div className="flex items-end justify-between gap-2 mt-1">
              <div className="min-w-0">
                <div className={`text-2xl md:text-3xl font-black font-mono leading-none ${c.accent}`}>{formatAmount(now)}</div>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <Delta now={now} before={before} prevMonth={prevMonth} />
                  {c.hint && <span className="text-[10px] font-medium text-slate-400">{c.hint}</span>}
                </div>
              </div>
              {window.length > 1 && <Spark points={window.map((m) => ({ month: m, value: summaries[m]?.[c.id] ?? 0 }))} current={month} color={c.bar} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

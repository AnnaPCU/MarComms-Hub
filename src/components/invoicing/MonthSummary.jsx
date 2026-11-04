// ════════════════════════════════════════════════════════════════════
// MonthSummary — «Mes a mes»: los totales de cada mes, lado a lado
// ════════════════════════════════════════════════════════════════════
// Una columna por mes (del más viejo al más nuevo) con los totales de
// cada hoja, y la diferencia contra el mes anterior. Los totales de abajo
// del CRM cambian de un mes a otro (cada Excel tenía los suyos): se listan
// tal cual en cada mes.
//
// Props: months, rows (todas), onOpenMonth(month)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { VARIABLE_CATEGORIES } from '@/constants/invoicing';
import { formatAmount, monthSummary } from '@/utils/invoicing';
import { monthLabel } from '@/utils/planTasks';

const LINES = [
  { id: 'fijo', label: 'Fijo y facturas · Total a cobrar', strong: true },
  { id: 'variables', label: 'Variables · Total', strong: true },
  ...VARIABLE_CATEGORIES.map((c) => ({ id: `cat:${c.id}`, label: c.label, sub: true })),
  { id: 'fijoMasVariables', label: 'Fijo + Variables', strong: true, accent: true },
  { id: 'mkt', label: 'MKT Plan (Felo) · Valor total' },
  { id: 'crmLicenses', label: 'CRM (Ale) · Licencias (USD)' },
];

const valueOf = (s, id) => (id.startsWith('cat:') ? s.variablesByCategory[id.slice(4)] : s[id]);

function Delta({ now, before }) {
  if (before === undefined || before === null) return null;
  const d = Math.round((now - before) * 100) / 100;
  if (!d) return <span className="block text-[9px] font-bold text-slate-300">= mes anterior</span>;
  return <span className={`block text-[9px] font-black ${d > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{d > 0 ? '▲ +' : '▼ '}{formatAmount(d)}</span>;
}

export default function MonthSummary({ months = [], rows = [], onOpenMonth }) {
  const sums = useMemo(() => months.map((m) => ({ month: m, s: monthSummary(rows.filter((r) => r.month === m)) })), [months, rows]);
  if (!months.length) return <p className="text-sm text-slate-400 text-center py-16">Todavía no hay meses cargados.</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="border-collapse text-xs w-full" style={{ minWidth: 300 + months.length * 150 }}>
        <thead>
          <tr className="bg-slate-100">
            <th className="sticky left-0 z-10 bg-slate-100 border-b border-r border-slate-200 px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-600 w-[300px]">Total</th>
            {sums.map(({ month }) => (
              <th key={month} className="border-b border-r border-slate-200 px-3 py-2 text-right">
                <button onClick={() => onOpenMonth?.(month)} className="text-[11px] font-black uppercase tracking-wider text-emerald-700 hover:underline" title={`Abrir ${monthLabel(month)}`}>{monthLabel(month)}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LINES.map((line) => (
            <tr key={line.id} className={line.accent ? 'bg-emerald-50' : ''}>
              <td className={`sticky left-0 z-10 border-b border-r border-slate-200 px-3 py-2 ${line.accent ? 'bg-emerald-50' : 'bg-white'} ${line.sub ? 'pl-7 text-slate-500 font-bold' : 'font-black text-slate-700'}`}>{line.label}</td>
              {sums.map(({ month, s }, i) => (
                <td key={month} className={`border-b border-r border-slate-200 px-3 py-2 text-right font-mono tabular-nums ${line.strong ? 'font-black text-slate-900' : 'text-slate-600'}`}>
                  {formatAmount(valueOf(s, line.id))}
                  {i > 0 && <Delta now={valueOf(s, line.id)} before={valueOf(sums[i - 1].s, line.id)} />}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-3 py-2 font-black text-slate-700 align-top">CRM (Ale) · Conceptos y totales de abajo</td>
            {sums.map(({ month, s }) => (
              <td key={month} className="border-b border-r border-slate-200 px-3 py-2 align-top">
                {s.crmExtra.length === 0 ? <span className="text-slate-300">—</span> : (
                  <ul className="space-y-1 text-right">
                    {s.crmExtra.map((x, i) => (
                      <li key={i} className={x.total ? 'font-black text-slate-900' : 'text-slate-500'}>
                        <span className="block text-[10px] font-bold text-slate-400 truncate" title={x.label}>{x.label || 'Sin nombre'}</span>
                        <span className="font-mono tabular-nums">{formatAmount(x.value)} {x.currency}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

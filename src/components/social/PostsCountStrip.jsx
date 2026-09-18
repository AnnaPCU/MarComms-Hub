// ════════════════════════════════════════════════════════════════════
// PostsCountStrip — Conteo de posteos por cuenta, siempre a la vista
// ════════════════════════════════════════════════════════════════════
// Tira compacta con un chip por cuenta ("Chile 2/2") para el mes actual,
// con la identidad de colores del conteo:
//   verde  = cumplió el plan          ámbar = falta
//   rojo   = se pasó del plan         gris  = sin plan
// Se muestra arriba de las pestañas de Social Media para que Delfi la
// tenga a mano en cualquier vista. Se recalcula sola con cada cambio.
//
// Props: accounts, posts, todayIso (default: hoy), onPick(account)?
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COUNTER_TONES, ACCOUNT_GROUPS } from '@/constants/socialPosts';
import { weeksOfMonth, accountMonthSummary, counterTone } from '@/utils/socialPosts';
import { todayIso as getTodayIso } from '@/utils/date';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function PostsCountStrip({ accounts, posts, todayIso }) {
  const today = todayIso || getTodayIso();
  const [open, setOpen] = useState(true);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const rows = useMemo(() => {
    const weeks = weeksOfMonth(year, month);
    const monthPosts = (posts || []).filter((p) => p.monthKey === monthKey);
    const list = (accounts || []).filter((a) => a.active !== false);
    const order = [...ACCOUNT_GROUPS];
    list.forEach((a) => { if (!order.includes(a.group)) order.push(a.group); });
    return order.map((g) => ({
      group: g,
      items: list
        .filter((a) => a.group === g)
        .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0))
        .map((a) => {
          const s = accountMonthSummary(a, monthPosts, weeks);
          return { account: a, ...s, tone: counterTone(s.count, s.expected) };
        }),
    })).filter((g) => g.items.length > 0);
  }, [accounts, posts, year, month, monthKey]);

  const totals = useMemo(() => {
    const t = { complete: 0, partial: 0, over: 0, count: 0, expected: 0 };
    rows.forEach((g) => g.items.forEach((i) => {
      t.count += i.count; t.expected += i.expected;
      if (i.tone in t) t[i.tone] += 1;
    }));
    return t;
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Conteo de {MONTHS[month - 1]}
        </button>
        <span className="text-[11px] font-bold text-slate-500">
          <span className="font-mono text-slate-800">{totals.count}</span> de <span className="font-mono text-slate-800">{totals.expected}</span> posteos esperados
        </span>
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
          <span className={`px-1.5 py-0.5 rounded ${COUNTER_TONES.complete}`}>{totals.complete} al día</span>
          <span className={`px-1.5 py-0.5 rounded ${COUNTER_TONES.partial}`}>{totals.partial} con faltantes</span>
          {totals.over > 0 && <span className={`px-1.5 py-0.5 rounded ${COUNTER_TONES.over}`}>{totals.over} pasadas</span>}
        </span>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {rows.map((g) => (
            <div key={g.group} className="flex flex-wrap items-center gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-0.5">{g.group}</span>
              {g.items.map((i) => (
                <span
                  key={i.account.id}
                  title={i.expected > 0 ? `${i.account.name}: ${i.count} de ${i.expected} esperados este mes` : `${i.account.name}: ${i.count} posteos (sin plan)`}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${COUNTER_TONES[i.tone]}`}
                >
                  {i.account.name} <span className="font-mono font-black">{i.count}{i.expected > 0 ? `/${i.expected}` : ''}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MonthBreakdown — «Mes a mes»: desglose de un mes al cliquear su barra
// ════════════════════════════════════════════════════════════════════
// Los mismos tramos de la barra (Fijo y facturas + las seis categorías de
// Variables), cada uno con su total, su parte del mes y lo que lo compone:
// Fijo por país con cada fila (Valor, Country Website, Valor Plan MKT y
// Total) y cada categoría con sus cargos (entidad, detalle, CC y precio).
// Arriba, la barra de composición del mes. Cada tramo se pliega; el que
// se cliqueó en el gráfico arranca resaltado. Si Variables tiene totales
// escritos a mano, lo avisa abajo (las categorías suman los cargos; el
// total de la hoja manda, como en el Excel).
//
// Props: month, rows (del mes), focus (id del tramo cliqueado | null),
//   onOpen(tab: 'fijo' | 'variables'), onClose(), onOtrosInfo()
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, X } from 'lucide-react';
import { countryGroupKey, formatAmount, round2 } from '@/utils/invoicing';
import { monthBreakdown, sharePct } from '@/utils/invoicingBreakdown';
import { monthLabel } from '@/utils/planTasks';

const btn = 'inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50';
const th = 'py-1 pr-2 text-[10px] font-black uppercase tracking-wider text-slate-500';
const num = (n) => (n ? formatAmount(n) : <span className="text-slate-300">—</span>);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function MonthBreakdown({ month, rows = [], focus = null, onOpen, onClose, onOtrosInfo }) {
  const b = useMemo(() => monthBreakdown(rows), [rows]);
  const [closed, setClosed] = useState(() => new Set());
  const ref = useRef(null);
  useEffect(() => { setClosed(new Set()); }, [month]);
  useEffect(() => {
    const el = focus ? ref.current?.querySelector(`[data-segment-section="${focus}"]`) : ref.current;
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [focus, month]);
  const toggle = (id) => setClosed((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const manualDiff = round2(b.variables - b.chargesSum);

  return (
    <section ref={ref} className="bg-white rounded-2xl border border-emerald-200 shadow-sm" aria-label={`Desglose de ${monthLabel(month)}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Desglose del mes</p>
          <h3 className="text-lg font-black text-slate-900">{monthLabel(month)} <span className="font-mono tabular-nums text-emerald-700">· {formatAmount(b.total)}</span></h3>
          <p className="text-[11px] font-bold text-slate-400">Fijo y facturas {formatAmount(b.fijo)} + Variables {formatAmount(b.variables)} · los mismos números que la barra</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onOpen?.('fijo')} className={btn}>Abrir Fijo</button>
          <button onClick={() => onOpen?.('variables')} className={btn}>Abrir Variables</button>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center" title="Cerrar el desglose" aria-label="Cerrar el desglose"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
      </header>
      <div className="px-5 py-3 border-b border-slate-100">
        <CompositionBar segments={b.segments} total={b.total} manualDiff={manualDiff} />
      </div>
      <div className="divide-y divide-slate-100">
        {b.segments.map((s) => (
          <SegmentSection key={s.id} segment={s} open={!closed.has(s.id)} focused={focus === s.id} onToggle={() => toggle(s.id)} onOpen={() => onOpen?.(s.id === 'fijo' ? 'fijo' : 'variables')} onOtrosInfo={s.id === 'otros' ? onOtrosInfo : null} />
        ))}
      </div>
      {b.manualRows.length > 0 && <ManualNote rows={b.manualRows} diff={manualDiff} />}
    </section>
  );
}

function CompositionBar({ segments, total, manualDiff }) {
  const parts = segments.filter((s) => s.total > 0);
  if (!total) return <p className="text-xs font-bold text-slate-400">Sin montos este mes.</p>;
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-lg bg-slate-100" role="img" aria-label={parts.map((s) => `${s.label} ${sharePct(s.share)}`).join(', ')}>
        {parts.map((s) => <div key={s.id} style={{ width: `${s.share * 100}%`, background: s.color }} title={`${s.label}: ${formatAmount(s.total)} · ${sharePct(s.share)}`} />)}
        {manualDiff > 0 && <div className="bg-slate-300" style={{ width: `${(manualDiff / total) * 100}%` }} title={`Totales escritos a mano: ${formatAmount(manualDiff)}`} />}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Composición del mes">
        {segments.map((s) => (
          <li key={s.id} className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${s.total ? 'text-slate-600' : 'text-slate-300'}`}>
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color, opacity: s.total ? 1 : 0.35 }} />{s.short} <span className="font-mono tabular-nums">{formatAmount(s.total)}</span> <span className="text-slate-400">· {sharePct(s.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SegmentSection({ segment: s, open, focused, onToggle, onOpen, onOtrosInfo }) {
  const empty = s.count === 0;
  return (
    <section data-segment-section={s.id} className={focused ? 'bg-emerald-50/60' : ''} aria-label={s.label}>
      <div className="flex items-center gap-2 px-5 py-2.5 flex-wrap">
        <button onClick={onToggle} aria-expanded={open && !empty} disabled={empty} className="flex items-center gap-2 min-w-0 text-left disabled:cursor-default">
          {empty ? <span className="w-3.5 shrink-0" /> : open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: s.color, opacity: empty ? 0.35 : 1 }} />
          <span className={`text-xs font-black ${empty ? 'text-slate-400' : 'text-slate-800'}`}>{s.label}</span>
          <span className={`font-mono tabular-nums text-xs font-black ${empty ? 'text-slate-400' : 'text-slate-900'}`}>{formatAmount(s.total)}</span>
          <span className="text-[10px] font-bold text-slate-400">· {sharePct(s.share)} del mes · {s.id === 'fijo' ? plural(s.count, 'fila', 'filas') : plural(s.count, 'cargo', 'cargos')}</span>
        </button>
        <span className="ml-auto flex items-center gap-1.5">
          {onOtrosInfo && (
            <button onClick={onOtrosInfo} className="inline-flex items-center gap-1 rounded-lg border border-yellow-300 bg-yellow-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-900 hover:bg-yellow-100"><HelpCircle className="w-3 h-3" /> ¿Qué va en Otros?</button>
          )}
          <button onClick={onOpen} className="text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:underline">Abrir la hoja</button>
        </span>
      </div>
      {s.hint && <p className="px-5 pb-2 -mt-1 text-[11px] text-slate-500">{s.hint}.</p>}
      {empty ? (
        <p className="px-5 pb-3 text-[11px] font-bold text-slate-300">Sin {s.id === 'fijo' ? 'filas con plata' : 'cargos'} este mes.</p>
      ) : open && (s.groups ? <FijoTable groups={s.groups} /> : <ChargesTable items={s.items} />)}
    </section>
  );
}

function FijoTable({ groups }) {
  return (
    <div className="overflow-x-auto px-5 pb-3">
      <table className="w-full min-w-[720px] border-collapse text-[11px]">
        <thead>
          <tr>
            <th className={`${th} text-left`}>País</th><th className={`${th} text-left`}>Empresa/Sector</th><th className={`${th} text-left`}>Entidad</th><th className={`${th} text-left`}>Plan</th>
            <th className={`${th} text-right`}>Valor</th><th className={`${th} text-right`}>Country Website</th><th className={`${th} text-right`}>Valor Plan MKT</th><th className={`${th} text-right pr-0`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <React.Fragment key={g.key}>
              <tr className="bg-emerald-50/60">
                <td colSpan={7} className="py-1 pr-2 text-[10px] font-black uppercase tracking-wider text-emerald-900">{g.label} <span className="normal-case tracking-normal font-bold text-emerald-700/70">· {plural(g.items.length, 'fila', 'filas')}</span></td>
                <td className="py-1 text-right font-mono tabular-nums font-black text-emerald-800">{formatAmount(g.total)}</td>
              </tr>
              {g.items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="py-1 pr-2 text-slate-500">{it.pais}</td>
                  <td className="py-1 pr-2 font-bold text-slate-700">{it.empresa}</td>
                  <td className="py-1 pr-2 font-mono text-slate-500">{it.cuenta}</td>
                  <td className="py-1 pr-2 text-slate-500">{it.plan}</td>
                  <td className="py-1 pr-2 text-right font-mono tabular-nums text-slate-700">{num(it.valor)}</td>
                  <td className="py-1 pr-2 text-right font-mono tabular-nums text-slate-700">{num(it.website)}</td>
                  <td className="py-1 pr-2 text-right font-mono tabular-nums text-slate-700">{num(it.planMkt)}</td>
                  <td className="py-1 text-right font-mono tabular-nums font-black text-slate-900 whitespace-nowrap">{formatAmount(it.total)}{it.manual && <span className="ml-1 text-[9px] font-black text-amber-600" title="Total escrito a mano: manda sobre la suma">a mano</span>}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChargesTable({ items }) {
  return (
    <div className="overflow-x-auto px-5 pb-3">
      <table className="w-full min-w-[640px] border-collapse text-[11px]">
        <thead>
          <tr>
            <th className={`${th} text-left`}>País</th><th className={`${th} text-left`}>Empresa/Sector</th><th className={`${th} text-left`}>Entidad</th><th className={`${th} text-left`}>Detalle</th><th className={`${th} text-left`}>CC</th><th className={`${th} text-right pr-0`}>Precio</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-slate-100">
              <td className="py-1 pr-2 text-slate-500" title={it.pais}>{countryGroupKey(it.pais)}</td>
              <td className="py-1 pr-2 font-bold text-slate-700">{it.empresa}</td>
              <td className="py-1 pr-2 font-mono text-slate-500">{it.cuenta}</td>
              <td className="py-1 pr-2 text-slate-700">{it.detalle || <span className="text-slate-300">Sin detalle</span>}</td>
              <td className="py-1 pr-2 font-mono text-slate-500">{it.cc || <span className="text-[10px] font-black text-amber-600">sin CC</span>}</td>
              <td className="py-1 text-right font-mono tabular-nums font-black text-slate-900">{formatAmount(it.precio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualNote({ rows, diff }) {
  const abs = formatAmount(Math.abs(diff));
  return (
    <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/60 text-[11px] text-amber-900">
      <p className="font-black">Totales escritos a mano en Variables</p>
      <p>{rows.length === 1 ? 'Una fila tiene' : `${rows.length} filas tienen`} el total escrito a mano, como en el Excel: cuenta ese total y no la suma de sus cargos{diff ? `, por eso las categorías suman ${abs} ${diff > 0 ? 'menos' : 'más'} que el total de Variables` : ''}.</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((r) => <li key={r.id}>· {[countryGroupKey(r.pais), r.empresa, r.cuenta].filter(Boolean).join(' · ')}: total <span className="font-mono tabular-nums font-black">{formatAmount(r.total)}</span>, cargos <span className="font-mono tabular-nums">{formatAmount(r.charges)}</span></li>)}
      </ul>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// OtrosInfoModal — «¿Qué va en CC: Otros?»
// ════════════════════════════════════════════════════════════════════
// Explica la última categoría de Variables del Excel con las otras cinco
// al lado: qué va en cada una (`hint` de VARIABLE_CATEGORIES), el CC que el
// Hub completa al agregar un cargo, y los cargos reales ya cargados como
// ejemplo (categoryExamples: más reciente primero, hasta MAX_EXAMPLES por
// categoría). Si todavía no hay nada en Otros, lo dice. Se abre desde la
// leyenda del gráfico de «Mes a mes» y desde el tramo Otros del desglose.
//
// Props: rows (todas, de todos los meses), months, onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { VARIABLE_CATEGORIES } from '@/constants/invoicing';
import { MONTHS_ES } from '@/constants/planTasks';
import { countryGroupKey, formatAmount } from '@/utils/invoicing';
import { categoryExamples } from '@/utils/invoicingBreakdown';
import { monthLabel } from '@/utils/planTasks';

const MAX_EXAMPLES = 8;
const shortMonth = (key) => `${MONTHS_ES[Number(key.slice(5, 7)) - 1].slice(0, 3)} ${key.slice(0, 4)}`;
const listOf = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);

export default function OtrosInfoModal({ rows = [], months = [], onClose }) {
  const examples = useMemo(() => categoryExamples(rows), [rows]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const otros = VARIABLE_CATEGORIES.find((c) => c.id === 'otros');
  const others = VARIABLE_CATEGORIES.filter((c) => c.id !== 'otros');
  const loaded = listOf(months.map((m) => monthLabel(m).toLowerCase()));

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Qué va en Otros" onClick={onClose}>
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <header className="sticky top-0 z-10 bg-white px-6 pt-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-800">Variables · CC: Otros</p>
              <h3 className="text-lg font-black text-slate-900">¿Qué va en «Otros»?</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center" title="Cerrar" aria-label="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
          </header>
          <div className="px-6 py-4 space-y-5 text-xs text-slate-700">
            <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 space-y-1.5">
              <p className="font-black text-yellow-900">{otros.hint}.</p>
              <p>«Otros» es la última columna de Variables del Excel: va ahí un cargo que no es de Campañas, BBDD, Eventos, Content ni Website. Al agregarlo en el Hub, el CC (centro de costo) se completa con <code className="font-mono font-bold">{otros.cc}</code>; se puede cambiar en la celda CC.</p>
              <p className="text-[11px] text-yellow-900">Antes de ponerlo en Otros, fijate si encaja en alguna de las cinco de abajo. Si un mismo tipo de cargo se repite en Otros mes a mes, conviene darle una categoría propia.</p>
            </section>
            <section>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Cargos catalogados como Otros {loaded && <span className="normal-case tracking-normal font-bold text-slate-400">· en {loaded}</span>}</h4>
              <Examples items={examples.otros.items} ccUsed={examples.otros.ccUsed} empty="Todavía no hay ningún cargo catalogado como Otros. Cuando se cargue uno, va a aparecer acá como ejemplo." />
            </section>
            <section>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Las otras cinco categorías, con lo que ya se cargó en cada una</h4>
              <ul className="space-y-3">
                {others.map((c) => (
                  <li key={c.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${c.chip}`}>{c.short}</span>
                      <span className="font-black text-slate-800">{c.label}</span>
                      <span className="font-mono text-[10px] text-slate-400">CC: {c.cc}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{c.hint}.</p>
                    <Examples items={examples[c.id].items} ccUsed={examples[c.id].ccUsed} empty="Todavía sin cargos en los meses cargados." compact />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function Examples({ items = [], ccUsed = {}, empty, compact = false }) {
  if (!items.length) return <p className={`${compact ? 'mt-1.5' : ''} text-[11px] font-bold text-slate-400`}>{empty}</p>;
  const shown = items.slice(0, MAX_EXAMPLES);
  const ccs = Object.entries(ccUsed).map(([cc, n]) => `${cc} (${n})`).join(', ');
  return (
    <div className={compact ? 'mt-1.5' : ''}>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {shown.map((it) => (
          <li key={it.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px]">
            <span className="w-16 shrink-0 font-bold text-slate-400">{shortMonth(it.month)}</span>
            <span className="min-w-0 flex-1 truncate" title={[countryGroupKey(it.pais), it.empresa, it.detalle].filter(Boolean).join(' · ')}>
              <span className="font-bold text-slate-700">{[countryGroupKey(it.pais), it.empresa].filter(Boolean).join(' · ')}</span>
              {it.detalle && <span className="text-slate-500"> · {it.detalle}</span>}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-slate-400">{it.cc || 'sin CC'}</span>
            <span className="shrink-0 font-mono tabular-nums font-black text-slate-800">{formatAmount(it.precio)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] font-bold text-slate-400">{items.length > shown.length ? `y ${items.length - shown.length} más · ` : ''}CC usado: {ccs}</p>
    </div>
  );
}

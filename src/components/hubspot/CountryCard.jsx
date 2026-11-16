// ════════════════════════════════════════════════════════════════════
// CountryCard — Varias entidades del mismo país en una sola tarjeta
// ════════════════════════════════════════════════════════════════════
// Lista «Por entidad» del Weekly check y del Global check (nov 2026): si
// un país tiene más de una entidad (ej. Argentina: 538, 592, 765…), van
// juntas. Arriba, el país con el semáforo y el avance de todas sumadas;
// debajo, un chip por entidad (con su punto de color) y flechas ‹ › para
// pasar de una a otra (en el celular también se desliza con el dedo).
// Elegir una la abre a la derecha; clic en el cuerpo también.
//
// Props: card ({ key, country, entities }, de countryCards), summaries,
//   activeCode (la entidad abierta), showRegion, onPick(code, { scroll })
// ════════════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sumSummaries, trafficLight } from '@/utils/crmWeekly';
import { EntityLines, LightDot } from './EntityButton';

const SWIPE_PX = 40;

export default function CountryCard({ card, summaries, activeCode, showRegion = false, onPick }) {
  const list = card.entities;
  const activeIdx = list.findIndex((e) => e.code === activeCode);
  const [idx, setIdx] = useState(0);
  const shown = activeIdx >= 0 ? activeIdx : Math.min(idx, list.length - 1);
  const entity = list[shown];
  const active = activeIdx >= 0;
  const total = sumSummaries(list.map((e) => summaries[e.code]));
  const light = trafficLight(total);
  const touchX = useRef(null);
  const regions = [...new Set(list.map((e) => e.region || 'Américas'))];

  // Cambiar de entidad la abre, sin bajar hasta el detalle en el celular
  const go = (i) => {
    const n = (i + list.length) % list.length;
    setIdx(n);
    onPick(list[n].code, { scroll: false });
  };
  const onTouchStart = (ev) => { touchX.current = ev.touches[0].clientX; };
  const onTouchEnd = (ev) => {
    if (touchX.current === null) return;
    const dx = ev.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) >= SWIPE_PX) go(shown + (dx < 0 ? 1 : -1));
  };
  const arrow = 'w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-sky-700 hover:bg-sky-50 shrink-0';

  return (
    <section className={`rounded-2xl border transition-all ${active ? 'bg-sky-50 border-sky-300 shadow-sm' : 'bg-white border-slate-200 hover:border-sky-200'}`} aria-label={`${card.country}: ${list.length} entidades`}>
      <header className="px-3 pt-2.5 flex items-center gap-2">
        <LightDot summary={total} className="w-2.5 h-2.5" />
        <span className="text-xs font-black text-slate-800 truncate">{card.country}</span>
        {showRegion && regions.map((r) => <span key={r} className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 rounded px-1 py-px">{r}</span>)}
        <span className="text-[10px] font-bold text-slate-400 shrink-0">{list.length} entidades</span>
        <span className="ml-auto font-mono text-[10px] font-black text-slate-500 shrink-0" title={light ? `${light.label}: todas las entidades del país juntas` : ''}>{total.pct} %</span>
      </header>
      <div className="px-2 pt-1.5 flex items-center gap-1">
        <button onClick={() => go(shown - 1)} className={arrow} aria-label="Entidad anterior" title="Anterior"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto" role="tablist" aria-label={`Entidades de ${card.country}`}>
          {list.map((e, i) => (
            <button
              key={e.code}
              role="tab"
              aria-selected={i === shown}
              onClick={() => go(i)}
              title={e.name}
              className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] font-black border transition-colors ${i === shown ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300'}`}
            >
              <LightDot summary={summaries[e.code]} className="w-1.5 h-1.5" />{e.code}
            </button>
          ))}
        </div>
        <button onClick={() => go(shown + 1)} className={arrow} aria-label="Entidad siguiente" title="Siguiente"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <button
        onClick={() => onPick(entity.code, { scroll: true })}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="w-full text-left px-3 pt-2 pb-2.5"
        title="Abrir la entidad"
      >
        <EntityLines entity={entity} summary={summaries[entity.code]} showCountry={false} active={active} />
      </button>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
// UpcomingActivities — Weekly check · «Próximas actividades» (nov 2026)
// ════════════════════════════════════════════════════════════════════
// Resumen de lo que viene en cada entidad o país, y nada más: los ítems
// del checklist sin tildar que tienen deadline y los próximos steps sin
// completar (entityActivities). Vencidas y más cercanas primero, con el
// color del deadline. Ventana: 7 / 14 / 30 días o todas (las vencidas
// siempre se ven; las sin fecha, solo en «Todas»). Se agrupa por entidad o
// por país y sigue el orden y los filtros de la lista. Tildar acá guarda
// igual que en la ficha; clic en el nombre abre la entidad.
//
// Props: entities (filtradas y ordenadas), map (checksByEntity), steps,
//   items, summaries ({ [code]: entitySummary }), todayIso, dark,
//   tracking, range, onRange, groupBy, onGroupBy, groupOptions (por defecto
//   entidad / país; el Global check suma región), onOpenEntity(code),
//   onToggleCheck(entity, itemId, done), onToggleStep(step)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { CalendarClock, Check, ChevronRight } from 'lucide-react';
import { ACTIVITY_RANGES } from '@/constants/crmWeekly';
import { activityGroups, deadlineTone, entityActivities, formatShortDate } from '@/utils/crmWeekly';
import { LightDot, PriorityChip, TagChip } from './EntityButton';

const tab = (on) => `px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors ${on ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`;

function ActivityRow({ a, entity, showEntity, todayIso, dark, onOpen, onToggle }) {
  const tone = a.date ? deadlineTone(a.date, false, todayIso, dark) : null;
  const style = tone ? { color: tone.text, background: tone.bg, borderColor: tone.border } : undefined;
  return (
    <li className="py-2 flex items-start gap-3">
      <button
        onClick={onToggle}
        role="checkbox" aria-checked={false} aria-label={`Marcar como hecho: ${a.title}`}
        title={a.kind === 'check' ? 'Tildar el ítem del checklist' : 'Marcar el step como completado'}
        className="mt-0.5 w-5 h-5 rounded-md border-2 bg-white border-slate-300 hover:border-sky-400 flex items-center justify-center shrink-0 group"
      >
        <Check className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-60" strokeWidth={3} />
      </button>
      <span className="w-[132px] shrink-0 text-center rounded-md border px-1.5 py-0.5 whitespace-nowrap" style={style}>
        {a.date ? (
          <>
            <span className="block font-mono text-[11px] font-black">{formatShortDate(a.date)}</span>
            <span className="block text-[9px] font-black uppercase tracking-wider leading-tight">{tone?.label}</span>
          </>
        ) : <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">Sin fecha</span>}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 leading-snug">{a.title}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className={`rounded px-1 py-px uppercase tracking-wider text-[9px] font-black ${a.kind === 'check' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{a.kind === 'check' ? 'Checklist' : a.category}</span>
          {showEntity && <button onClick={onOpen} className="hover:text-sky-700 font-mono">{entity.code} · {entity.name}</button>}
          {a.detail && <span className="truncate max-w-[420px] font-medium" title={a.detail}>{a.detail}</span>}
        </p>
      </div>
    </li>
  );
}

export default function UpcomingActivities({ entities, map, steps, items, summaries, todayIso, dark = false, tracking = false, range, onRange, groupBy, onGroupBy, groupOptions = ['entity', 'country'], onOpenEntity, onToggleCheck, onToggleStep }) {
  const maxDays = ACTIVITY_RANGES.find((r) => r.id === range)?.days ?? null;

  const groups = useMemo(() => activityGroups(entities, groupBy).map((g) => {
    const rows = g.entities.flatMap((e) => entityActivities(e, { checks: map[e.code], steps, items, todayIso, maxDays }).items.map((a) => ({ a, e })));
    rows.sort((x, y) => (x.a.days === null) - (y.a.days === null) || (x.a.days ?? 0) - (y.a.days ?? 0));
    const undated = g.entities.reduce((n, e) => n + entityActivities(e, { checks: map[e.code], steps, items, todayIso, maxDays }).undated, 0);
    const sum = g.entities.reduce((acc, e) => { const s = summaries[e.code]; if (s) { acc.done += s.done; acc.total += s.total; } return acc; }, { done: 0, total: 0 });
    return { ...g, rows, undated, sum, overdue: rows.filter((r) => r.a.days !== null && r.a.days < 0).length };
  }), [entities, groupBy, map, steps, items, todayIso, maxDays, summaries]);

  const withRows = groups.filter((g) => g.rows.length);
  const empty = groups.filter((g) => !g.rows.length);
  const total = withRows.reduce((n, g) => n + g.rows.length, 0);
  const overdue = withRows.reduce((n, g) => n + g.overdue, 0);

  const toggle = (e, a) => (a.kind === 'check' ? onToggleCheck(e, a.source.id, true) : onToggleStep(a.source));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1" role="tablist" aria-label="Ventana de días">
          {ACTIVITY_RANGES.map((r) => <button key={r.id} role="tab" aria-selected={range === r.id} onClick={() => onRange(r.id)} className={tab(range === r.id)}>{r.days ? `Próximos ${r.label}` : r.label}</button>)}
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1" role="tablist" aria-label="Agrupar">
          {groupOptions.map((g) => (
            <button key={g} role="tab" aria-selected={groupBy === g} onClick={() => onGroupBy(g)} className={tab(groupBy === g)}>{{ entity: 'Por entidad', country: 'Por país', region: 'Por región' }[g]}</button>
          ))}
        </div>
        <p className="text-[11px] font-bold text-slate-500 ml-auto">
          <span className="font-mono font-black text-slate-800">{total}</span> actividades{overdue ? <> · <span className="text-red-600 font-black">{overdue} vencidas</span></> : ''}
        </p>
      </div>

      {!tracking && <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 text-[11px] font-bold">Por ahora solo se ven los deadlines del checklist: la fecha de los próximos steps se activa con la migración 0070.</p>}

      {withRows.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center">
          <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-600">No hay actividades {maxDays ? `en los próximos ${maxDays} días` : 'pendientes'}.</p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">Son los ítems del checklist sin tildar con deadline y los próximos steps sin completar{tracking ? ' (con fecha)' : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {withRows.map((g) => {
            const one = g.entities.length === 1 ? g.entities[0] : null;
            const pct = g.sum.total ? Math.round((g.sum.done / g.sum.total) * 100) : 0;
            return (
              <section key={g.key} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm min-w-0">
                <header className="flex items-start gap-2 pb-2 border-b border-slate-100">
                  <LightDot summary={g.sum} className="w-3 h-3 mt-1" />
                  <div className="flex-1 min-w-0">
                    {one ? (
                      <button onClick={() => onOpenEntity(one.code)} className="text-left group" title="Abrir la entidad">
                        <p className="font-mono text-[10px] font-black text-sky-600 uppercase tracking-widest">{one.code}{one.country ? ` · ${one.country}` : ''}</p>
                        <h3 className="text-sm font-black text-slate-900 leading-tight group-hover:text-sky-700 flex items-center gap-1">{one.name}<ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" /></h3>
                      </button>
                    ) : (
                      <>
                        <p className="font-mono text-[10px] font-black text-sky-600 uppercase tracking-widest">{g.entities.length} entidades</p>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">{g.label}</h3>
                      </>
                    )}
                    {one && (one.priority || (one.tags || []).length > 0) && (
                      <div className="mt-1 flex items-center gap-1 flex-wrap"><PriorityChip priority={one.priority} />{(one.tags || []).map((t) => <TagChip key={t} tag={t} />)}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-lg font-black text-slate-800 leading-none">{g.rows.length}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{g.overdue ? <span className="text-red-600">{g.overdue} vencidas</span> : 'actividades'}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Checklist {pct} %</p>
                  </div>
                </header>
                <ul className="divide-y divide-slate-100">
                  {g.rows.map(({ a, e }) => (
                    <ActivityRow key={`${e.code}-${a.id}`} a={a} entity={e} showEntity={!one} todayIso={todayIso} dark={dark} onOpen={() => onOpenEntity(e.code)} onToggle={() => toggle(e, a)} />
                  ))}
                </ul>
                {g.undated > 0 && <p className="pt-2 text-[10px] font-bold text-slate-400">+ {g.undated} sin fecha (se ven en «Todas»)</p>}
              </section>
            );
          })}
        </div>
      )}

      {empty.length > 0 && withRows.length > 0 && (
        <p className="text-[11px] font-bold text-slate-400">
          Sin actividades {maxDays ? `en los próximos ${maxDays} días` : 'pendientes'}: {empty.map((g) => g.label).join(' · ')}
        </p>
      )}
    </div>
  );
}

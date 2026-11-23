// ════════════════════════════════════════════════════════════════════
// StepsTable — Tablas de próximos steps de una entidad (por tipo)
// ════════════════════════════════════════════════════════════════════
// Como las iniciativas de los planes (# · Próximo step · Detalle), más
// Fecha (con el color del deadline: verde → rojo a medida que se acerca)
// y el tilde de completado, cuando la migración 0070 está (`tracking`).
// Clic en la fila → editor; el tilde se guarda al instante.
//
// Props: groups (initiativeGroups), c, navy, todayIso, dark, tracking,
//   onRowClick(step), onToggleDone(step), footer(group)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Check } from 'lucide-react';
import { GroupLabel } from '@/components/plans/PlanReportBlocks';
import { deadlineTone, formatShortDate } from '@/utils/crmWeekly';

const th = 'px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white';

export default function StepsTable({ groups, c, navy, todayIso, dark = false, tracking = false, onRowClick, onToggleDone, footer }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key || 'sin-tipo'}>
          {(g.label || groups.length > 1) && <GroupLabel label={g.label || 'Other steps'} count={g.items.length} c={c} />}
          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr style={{ background: navy }}>
                  {tracking && <th className={`${th} w-10`}><span className="sr-only">Done</span></th>}
                  <th className={`${th} w-12`}>#</th>
                  <th className={`${th} sm:w-[34%]`}>Next step</th>
                  <th className={th}>Detail</th>
                  {tracking && <th className={`${th} w-28 whitespace-nowrap`}>Date</th>}
                </tr>
              </thead>
              <tbody>
                {g.items.map((s, i) => {
                  const tone = tracking ? deadlineTone(s.dueDate, s.done, todayIso, dark) : null;
                  return (
                    <tr key={s.id} onClick={() => onRowClick(s)} title="Click to edit the step" className={`border-t border-slate-100 align-top cursor-pointer hover:bg-slate-50/60 ${s.done ? 'opacity-60' : ''}`}>
                      {tracking && (
                        <td className="px-3 py-2.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleDone(s); }}
                            role="checkbox" aria-checked={!!s.done} aria-label={`Done: ${s.title}`}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${s.done ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-300 hover:border-sky-400'}`}
                          >
                            {s.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3 text-[12px]" style={{ color: c.label }}>{i + 1}</td>
                      <td className={`px-4 py-3 text-[13px] font-bold leading-snug ${s.done ? 'line-through' : ''}`} style={{ color: c.dark }}>{s.title}</td>
                      <td className="px-4 py-3 text-[12px] leading-snug whitespace-pre-line" style={{ color: c.text }}>{s.detail || <span className="text-slate-300">—</span>}</td>
                      {tracking && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {s.dueDate ? (
                            <>
                              <span className="font-mono text-[12px] font-bold" style={tone?.tone === 'open' ? { color: tone.text } : { color: c.label }}>{formatShortDate(s.dueDate)}</span>
                              {tone && <span className="block text-[9px] font-black uppercase tracking-wider" style={tone.tone === 'open' ? { color: tone.text } : { color: c.label }}>{s.done ? 'Done' : tone.label}</span>}
                            </>
                          ) : <span className="text-slate-300 text-[12px]">—</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {footer && footer(g)}
          </div>
        </div>
      ))}
    </div>
  );
}

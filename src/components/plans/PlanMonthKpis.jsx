// ════════════════════════════════════════════════════════════════════
// PlanMonthKpis — KPIs del mes en la vista interna de un plan
// ════════════════════════════════════════════════════════════════════
// Va dentro de la tabla de tareas, arriba de las tareas, y sigue al mes
// elegido ahí. Muestra los 6 KPIs como en el reporte; los que están
// vacíos o en 0 se ven punteados (no van en el link externo). Performance
// compara con el mes anterior. Clic en una tarjeta o en «Editar KPIs» →
// KpiEditor.
//
// Props: plan, monthKey ('YYYY-MM' | 'all' | 'none'), tasks (las del
//   plan), stored (kpis guardados de ese mes), prevStored (los del mes
//   anterior, para comparar performance), c, navy (colores de la
//   marca), missing (falta la migración 0038), onSave(kpis) (async)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { BarChart3, Pencil } from 'lucide-react';
import { MONTHS_ES } from '@/constants/planTasks';
import { autoKpis, monthKpiGroups, previousMonthKey } from '@/utils/planKpis';
import { monthLabel } from '@/utils/planTasks';
import { KpiGroupsView, ReportSectionTitle } from './PlanReportBlocks';
import KpiEditor from './KpiEditor';

const MONTH_RE = /^\d{4}-\d{2}$/;

const hintOf = (k) => {
  const off = k.visible ? '' : ' · no va en el link';
  if (!k.auto) return k.visible ? null : k.value === 0 ? 'En 0: no va en el link' : 'No va en el link';
  if (k.manual) return `Corregido a mano · calculado: ${k.computed}${off}`;
  if (k.id === 'meetings') return k.meetingTasks ? `De ${k.meetingTasks} ${k.meetingTasks === 1 ? 'tarea de reunión' : 'tareas de reunión'}` : `Automático · sin reuniones${off}`;
  return `Automático · tareas completadas${off}`;
};

export default function PlanMonthKpis({ plan, monthKey, tasks, stored, prevStored, c, navy, missing = false, onSave }) {
  const [editing, setEditing] = useState(false);
  const isMonth = MONTH_RE.test(monthKey || '');

  if (!isMonth) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-slate-400 flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5" /> Elegí un mes para ver y cargar sus KPIs.
      </div>
    );
  }

  const groups = monthKpiGroups(tasks, monthKey, stored, prevStored);
  const prevKey = previousMonthKey(monthKey);
  const prevLabel = MONTHS_ES[Number(prevKey.slice(5, 7)) - 1].toLowerCase();
  const shownInLink = groups.flatMap((g) => g.items).filter((k) => k.visible).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4">
      <ReportSectionTitle title={`KPIs del mes · ${monthLabel(monthKey)}`} aside={`${shownInLink} de 6 en el link`} c={c}>
        {!missing && (
          <button onClick={() => setEditing(true)} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <Pencil className="w-3 h-3" /> Editar KPIs
          </button>
        )}
      </ReportSectionTitle>
      {missing ? (
        <p className="text-[11px] font-bold text-amber-800">Los KPIs todavía no están activados en la base (falta la migración 0038 en Supabase).</p>
      ) : (
        <KpiGroupsView groups={groups} c={c} navy={navy} internal hintOf={hintOf} prevLabel={prevLabel} onCardClick={() => setEditing(true)} />
      )}
      {editing && (
        <KpiEditor
          plan={plan}
          monthKey={monthKey}
          stored={stored}
          auto={autoKpis(tasks, monthKey)}
          onSave={async (kpis) => { await onSave(kpis); setEditing(false); }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// EntitiesPanel — Tarjetas por entidad (cliente interno del CRM)
// ════════════════════════════════════════════════════════════════════
// Agrupadas por unidad (Control Union / Peterson Solutions / PTech).
// Cada tarjeta: progreso de adopción, checklist, reglas de facturación
// y conteo de entrenamientos. Clic → editor. "+" → nuevo entrenamiento.
//
// Props: entities, trainings, onEdit(entity), onCreate(), onNewTraining(entityId)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { Check, Plus, Receipt, UserCheck } from 'lucide-react';
import { CRM_UNITS, ADOPTION_CHECKS, BILLING_MEDIUM_BY_ID } from '@/constants/crm';
import { adoptionScore, entityTrainingStats } from '@/utils/crm';

const progressTone = (p) => (p >= 0.8 ? 'bg-emerald-500' : p >= 0.4 ? 'bg-sky-500' : p > 0 ? 'bg-amber-500' : 'bg-slate-300');

export default function EntitiesPanel({ entities, trainings, onEdit, onCreate, onNewTraining }) {
  const groups = useMemo(() => CRM_UNITS.map((u) => ({
    unit: u,
    items: (entities || []).filter((e) => e.unit === u.id && e.active !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  })).filter((g) => g.items.length > 0), [entities]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-slate-500">Clic en una tarjeta para editar facturación y adopción.</p>
        <button onClick={onCreate} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-sky-400 text-slate-700 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">
          <Plus className="w-3.5 h-3.5" /> Nueva entidad
        </button>
      </div>
      {groups.map((g) => (
        <div key={g.unit.id}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{g.unit.label} · {g.items.length}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {g.items.map((en) => {
              const score = adoptionScore(en);
              const p = en.progress === null || en.progress === undefined ? score.ratio : en.progress;
              const stats = entityTrainingStats(en.id, trainings);
              const medium = BILLING_MEDIUM_BY_ID[en.billingMedium];
              return (
                <div key={en.id} onClick={() => onEdit(en)} className="group bg-white border border-slate-200 hover:border-sky-400 hover:shadow-lg rounded-2xl p-4 cursor-pointer transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 leading-tight truncate">{en.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{en.legalEntity || 'Sin entidad legal cargada'}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onNewTraining(en.id); }} title="Nuevo entrenamiento para esta entidad" className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white flex items-center justify-center shrink-0 transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progreso */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <span>Adopción</span>
                      <span className="font-mono">{Math.round(p * 100)}% · {score.done}/{score.total}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${progressTone(p)}`} style={{ width: `${Math.round(p * 100)}%` }} />
                    </div>
                  </div>

                  {/* Checklist compacto */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ADOPTION_CHECKS.map((c) => {
                      const on = !!en.checks?.[c.id];
                      return (
                        <span key={c.id} title={c.label} className={`inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${on ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                          {on && <Check className="w-2.5 h-2.5" />}{c.short}
                        </span>
                      );
                    })}
                  </div>

                  {/* Facturación + entrenamientos */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1" title="Medio de facturación"><Receipt className="w-3 h-3" /> {medium ? medium.label : '—'}</span>
                    <span className="flex items-center gap-1 truncate" title={`Autoriza: ${en.approver || '—'}`}><UserCheck className="w-3 h-3 shrink-0" /> <span className="truncate">{en.approver || '—'}</span></span>
                    <span className="ml-auto font-mono text-slate-700 whitespace-nowrap" title={`${stats.cobrado} cobrados · ${stats.realizado} por cobrar · ${stats.planificado} planificados`}>
                      {stats.total} entren.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

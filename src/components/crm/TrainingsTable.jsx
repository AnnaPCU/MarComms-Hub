// ════════════════════════════════════════════════════════════════════
// TrainingsTable — Listado de entrenamientos del CRM con filtros
// ════════════════════════════════════════════════════════════════════
// Filtros: entidad, tipo, estado, año. Clic en una fila → editor.
// Fecha descendente; los sin fecha (importados del Excel) van al final.
//
// Props:
//   trainings, entities, todayIso
//   onEdit(training), onCreate(entityId?)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Users } from 'lucide-react';
import { CRM_UNIT_BY_ID, TRAINING_TYPES, TRAINING_TYPE_BY_ID, TRAINING_STATUSES, TRAINING_STATUS_BY_ID, BILLING_PENDING_DAYS } from '@/constants/crm';
import { sortTrainings, trainingYears, matchesTrainingYear, monthKeyLabel, pendingBillingTrainings } from '@/utils/crm';
import { formatDate } from '@/utils/date';

const sel = 'bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-sky-300';

export default function TrainingsTable({ trainings, entities, todayIso, onEdit, onCreate }) {
  const [entityId, setEntityId] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [year, setYear] = useState('all');

  const entityById = useMemo(() => Object.fromEntries((entities || []).map((e) => [e.id, e])), [entities]);
  const years = useMemo(() => trainingYears(trainings), [trainings]);
  const pendingIds = useMemo(() => new Set(pendingBillingTrainings(trainings, todayIso).map((t) => t.id)), [trainings, todayIso]);

  const rows = useMemo(() => sortTrainings(
    (trainings || []).filter((t) =>
      (entityId === 'all' || t.entityId === entityId)
      && (type === 'all' || t.type === type)
      && (status === 'all' || t.status === status)
      && matchesTrainingYear(t, year),
    ),
  ), [trainings, entityId, type, status, year]);

  const sortedEntities = [...(entities || [])].sort((a, b) => (a.unit + a.name).localeCompare(b.unit + b.name));

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className={sel}>
          <option value="all">Todas las entidades</option>
          {sortedEntities.map((en) => <option key={en.id} value={en.id}>{CRM_UNIT_BY_ID[en.unit]?.short} · {en.name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
          <option value="all">Todos los tipos</option>
          {TRAINING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
          <option value="all">Todos los estados</option>
          {TRAINING_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={sel}>
          <option value="all">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{rows.length} de {trainings.length}</span>
        <div className="flex-1" />
        <button onClick={() => onCreate(entityId === 'all' ? undefined : entityId)} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Nuevo entrenamiento
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 760 }}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="text-left px-3 py-2">Fecha</th>
              <th className="text-left px-3 py-2">Entidad</th>
              <th className="text-left px-3 py-2">Tipo · Tema</th>
              <th className="text-left px-3 py-2">Capacitador</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2">Cobro</th>
              <th className="text-right px-3 py-2">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">No hay entrenamientos con estos filtros</td></tr>
            )}
            {rows.map((t) => {
              const en = entityById[t.entityId];
              const unit = en ? CRM_UNIT_BY_ID[en.unit] : null;
              const tp = TRAINING_TYPE_BY_ID[t.type];
              const st = TRAINING_STATUS_BY_ID[t.status];
              const pending = pendingIds.has(t.id);
              return (
                <tr key={t.id} onClick={() => onEdit(t)} className="border-b border-slate-100 hover:bg-sky-50/40 cursor-pointer align-top">
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">{t.date ? formatDate(t.date) : <span className="text-slate-300">Sin fecha</span>}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-black text-slate-800 leading-tight">{en?.name || '—'}</p>
                    {unit && <span className={`inline-block mt-0.5 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${unit.color}`}>{unit.label}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {tp && <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${tp.color}`}>{tp.short}</span>}
                    <p className="font-bold text-slate-700 mt-0.5 leading-snug">{t.title}</p>
                    {t.notes && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2" title={t.notes}>{t.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-600">
                    {t.trainer || <span className="text-slate-300">—</span>}
                    {t.attendees !== null && t.attendees !== undefined && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5"><Users className="w-3 h-3" /> {t.attendees}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {st && <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${st.solid}`}>{st.label}</span>}
                    {pending && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-600 mt-1" title={`Realizado hace más de ${BILLING_PENDING_DAYS} días y todavía no se cobró`}>
                        <AlertTriangle className="w-3 h-3" /> Por cobrar
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">{t.billedMonth ? monthKeyLabel(t.billedMonth) : <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                    {t.amount !== null && t.amount !== undefined ? `${t.currency || 'USD'} ${t.amount.toLocaleString('es-AR')}` : <span className="text-slate-300" title="Va dentro del total del mes con las licencias">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

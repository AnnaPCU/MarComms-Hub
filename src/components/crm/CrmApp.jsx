// ════════════════════════════════════════════════════════════════════
// CrmApp — Trackeo de entrenamientos del CRM HubSpot (clientes internos)
// ════════════════════════════════════════════════════════════════════
// MarComms implementa y entrena en el uso del CRM a las entidades del
// grupo (CU Peru, PS España, PTech…). Acá se sigue:
//   · Entrenamientos: planificados, realizados, cobrados (y cuándo)
//   · Entidades: reglas de facturación y checklist de adopción
//
// Props:
//   crm         — de useCrm (entities, trainings, create/update/remove…)
//   currentUser
//   onBack
//   autoNew     — abrir el editor de entrenamiento al entrar (Acción Rápida)
//   onAutoNewConsumed()
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarClock, Database, GraduationCap } from 'lucide-react';
import { trainingsSummary, pendingBillingTrainings, upcomingTrainings } from '@/utils/crm';
import { todayIso as getTodayIso, formatDate } from '@/utils/date';
import TrainingsTable from './TrainingsTable';
import TrainingEditor from './TrainingEditor';
import EntitiesPanel from './EntitiesPanel';
import EntityEditor from './EntityEditor';

const TABS = [
  { id: 'entrenamientos', label: 'Entrenamientos', icon: GraduationCap },
  { id: 'entidades',      label: 'Entidades',      icon: Building2 },
];

export default function CrmApp({ crm, currentUser, onBack, autoNew, onAutoNewConsumed, todayIso }) {
  const today = todayIso || getTodayIso();
  const [tab, setTab] = useState('entrenamientos');
  const [editor, setEditor] = useState(null);       // { training } | { defaultEntityId }
  const [entityEditor, setEntityEditor] = useState(null); // { entity } | {}

  const { entities, trainings, usingFallback, loading } = crm;
  const summary = useMemo(() => trainingsSummary(trainings), [trainings]);
  const pending = useMemo(() => pendingBillingTrainings(trainings, today), [trainings, today]);
  const upcoming = useMemo(() => upcomingTrainings(trainings, today), [trainings, today]);
  const entityById = useMemo(() => Object.fromEntries(entities.map((e) => [e.id, e])), [entities]);

  useEffect(() => {
    if (autoNew && !usingFallback && !loading) {
      setEditor({ defaultEntityId: undefined });
      onAutoNewConsumed && onAutoNewConsumed();
    }
  }, [autoNew, usingFallback, loading, onAutoNewConsumed]);

  const openNew = (defaultEntityId) => {
    if (usingFallback) { alert('Todavía no se puede cargar entrenamientos: corré la migración 0018 en Supabase.'); return; }
    setEditor({ defaultEntityId });
  };

  const saveTraining = async (form) => {
    if (editor?.training) await crm.updateTraining(editor.training.id, form);
    else await crm.createTraining(form);
    setEditor(null);
  };
  const saveEntity = async (form) => {
    if (entityEditor?.entity && !entityEditor.entity.isFallback) await crm.updateEntity(entityEditor.entity.id, form);
    else {
      const maxOrder = Math.max(0, ...entities.map((e) => e.sortOrder ?? 0));
      await crm.createEntity({ ...form, key: entityEditor?.entity?.key, sortOrder: entityEditor?.entity?.sortOrder ?? maxOrder + 10 });
    }
    setEntityEditor(null);
  };

  const kpis = [
    { label: 'Entrenamientos', value: summary.total, tone: 'text-slate-800' },
    { label: 'Planificados',   value: summary.planificado, tone: 'text-slate-600' },
    { label: 'Realizados',     value: summary.realizado, tone: 'text-blue-600', hint: 'Hechos, todavía sin cobrar' },
    { label: 'Cobrados',       value: summary.cobrado, tone: 'text-emerald-600' },
    { label: 'Por cobrar',     value: pending.length, tone: pending.length ? 'text-amber-600' : 'text-slate-400', hint: 'Realizados hace más de 30 días' },
    { label: 'Cobrado (USD)',  value: summary.amountBilled.toLocaleString('es-AR'), tone: 'text-emerald-700', hint: 'Solo los que tienen monto propio' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Volver"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-3">
            <div className="bg-white text-blue-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> CRM</div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Entrenamientos CRM</h1>
              <p className="text-[10px] text-sky-100 font-bold uppercase tracking-widest">HubSpot · uso comercial · clientes internos del grupo</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full p-6 space-y-4">
        {usingFallback && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold px-4 py-2 rounded-xl">
            Mostrando las entidades por defecto: las tablas del CRM todavía no existen en Supabase. Corré la migración 0018 (y el seed opcional) para poder cargar entrenamientos.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5" title={k.hint}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">{k.label}</p>
              <p className={`text-xl font-black font-mono leading-tight ${k.tone}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Próximos */}
        {upcoming.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400"><CalendarClock className="w-3.5 h-3.5" /> Próximos</span>
            {upcoming.slice(0, 5).map((t) => (
              <button key={t.id} onClick={() => setEditor({ training: t })} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100">
                <span className="font-mono">{formatDate(t.date)}</span> · {entityById[t.entityId]?.name || '—'} · {t.title}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 inline-flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${active ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'entrenamientos' ? (
          <TrainingsTable trainings={trainings} entities={entities} todayIso={today} onEdit={(t) => setEditor({ training: t })} onCreate={openNew} />
        ) : (
          <EntitiesPanel entities={entities} trainings={trainings} onEdit={(e) => setEntityEditor({ entity: e })} onCreate={() => setEntityEditor({})} onNewTraining={openNew} />
        )}
      </div>

      {editor && (
        <TrainingEditor
          training={editor.training || null}
          entities={entities}
          defaultEntityId={editor.defaultEntityId}
          currentUser={currentUser}
          onSave={saveTraining}
          onDelete={editor.training ? async () => { await crm.removeTraining(editor.training.id); setEditor(null); } : undefined}
          onClose={() => setEditor(null)}
        />
      )}
      {entityEditor && (
        <EntityEditor
          entity={entityEditor.entity || null}
          onSave={saveEntity}
          onDelete={entityEditor.entity && !entityEditor.entity.isFallback ? async () => { await crm.removeEntity(entityEditor.entity.id); setEntityEditor(null); } : undefined}
          onClose={() => setEntityEditor(null)}
        />
      )}
    </div>
  );
}

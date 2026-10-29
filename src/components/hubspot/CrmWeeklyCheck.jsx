// ════════════════════════════════════════════════════════════════════
// CrmWeeklyCheck — CRM HubSpot · «Weekly check» (oct 2026)
// ════════════════════════════════════════════════════════════════════
// Seguimiento de la implementación de HubSpot en cada entidad: a la
// izquierda las 16 entidades (avance del checklist y alertas de
// deadline), a la derecha la entidad elegida con su checklist (tilde +
// deadline en dd/mm/aaaa que se pone más rojo cuanto más cerca está) y sus
// próximos steps (como las iniciativas de los planes). Los ítems del
// checklist valen para todas las entidades y se pueden agregar, renombrar
// y eliminar desde acá. Todo en tiempo real.
//
// Props: data (de useCrmWeekly: lo carga App, que también arma los avisos
//   de deadlines en rojo), currentUser, dark
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { CRM_BRANDS, CRM_ENTITIES } from '@/constants/crmWeekly';
import { todayIso as getTodayIso } from '@/utils/date';
import { checksByEntity, entitySummary, newCheckItemId, weeklyTotals } from '@/utils/crmWeekly';
import { useConfirm } from '@/hooks/useConfirm';
import { Kpi } from './BillingBits';
import WeeklyChecklist from './WeeklyChecklist';
import CrmNextSteps from './CrmNextSteps';

// Colores de las tablas de steps (paleta del módulo: sky / azul)
const LIGHT = { primary: '#0284c7', dark: '#0f172a', label: '#64748b', text: '#334155' };
const DARK = { primary: '#38bdf8', dark: '#f1f5f9', label: '#94a3b8', text: '#cbd5e1' };
const NAVY = '#0c4a6e';

function EntityButton({ entity, summary, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left rounded-2xl border px-3 py-2.5 transition-all ${active ? 'bg-sky-50 border-sky-300 shadow-sm' : 'bg-white border-slate-200 hover:border-sky-200'}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-black text-slate-400 shrink-0">{entity.code}</span>
        <span className={`flex-1 min-w-0 truncate text-xs font-black ${active ? 'text-sky-800' : 'text-slate-700'}`} title={entity.name}>{entity.name}</span>
        {summary.overdue > 0 && <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-red-50 text-red-600 px-1.5 py-0.5 text-[9px] font-black" title="Ítems vencidos"><AlertTriangle className="w-2.5 h-2.5" />{summary.overdue}</span>}
        {summary.soon > 0 && <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[9px] font-black" title="Vencen en 7 días o menos"><Clock className="w-2.5 h-2.5" />{summary.soon}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${summary.pct}%` }} />
        </div>
        <span className="font-mono text-[10px] font-black text-slate-500 shrink-0">{summary.done}/{summary.total}</span>
      </div>
    </button>
  );
}

export default function CrmWeeklyCheck({ data, currentUser, dark = false }) {
  const { items, checks, steps, loading, error, missing, saveCheck, createStep, updateStep, removeStep, createItem, updateItem, removeItem } = data;
  const confirm = useConfirm();
  const [brand, setBrand] = useState('');
  const [selected, setSelected] = useState(CRM_ENTITIES[0].code);
  const [saveError, setSaveError] = useState('');
  const detailRef = useRef(null);
  const todayIso = getTodayIso();
  const c = dark ? DARK : LIGHT;

  const map = useMemo(() => checksByEntity(checks), [checks]);
  const visible = CRM_ENTITIES.filter((e) => !brand || e.brand === brand);
  const entity = visible.find((e) => e.code === selected) || visible[0];
  const entitySteps = steps.filter((s) => s.entityCode === entity?.code);
  const summary = entity ? entitySummary(map[entity.code], todayIso, items) : null;
  const totals = weeklyTotals(visible, map, todayIso, items);

  // En pantallas chicas la lista va arriba: al elegir, baja a la entidad
  const pick = (code) => {
    setSelected(code);
    if (window.innerWidth < 1024) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const onSave = async (itemId, patch) => {
    setSaveError('');
    try { await saveCheck({ entityCode: entity.code, itemId, patch, updatedBy: currentUser?.name || '' }); }
    catch (_e) { setSaveError('No se pudo guardar el cambio. Probá de nuevo; si sigue fallando, revisá la consola.'); }
  };

  // Ítems del checklist (para todas las entidades)
  const run = async (fn, msg) => {
    setSaveError('');
    try { await fn(); } catch (e) { setSaveError(msg); throw e; }
  };
  const addItem = (label) => run(
    () => createItem({ id: newCheckItemId(), label, position: items.reduce((m, it) => Math.max(m, (it.position ?? 0) + 1), 0), createdBy: currentUser?.name || '' }),
    'No se pudo agregar el ítem. Probá de nuevo.',
  );
  const renameItem = (it, label) => (label === it.label ? Promise.resolve() : run(() => updateItem(it.id, { label }), 'No se pudo renombrar el ítem. Probá de nuevo.'));
  const deleteItem = async (it) => {
    const ok = await confirm({
      title: '¿Eliminar el ítem del checklist?',
      message: `"${it.label}" se va a eliminar del checklist de las ${CRM_ENTITIES.length} entidades, junto con lo que tenía cargado cada una (tilde y deadline). Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok) await run(() => removeItem(it.id), 'No se pudo eliminar el ítem. Probá de nuevo.').catch(() => {});
  };

  if (missing) {
    return <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-bold">El Weekly check todavía no está activado en la base (falta la migración 0043 en Supabase).</p>;
  }

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudieron cargar los datos desde Supabase. Revisá la consola.</div>}
      {saveError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">{saveError}</div>}

      <div className="flex items-center gap-2 flex-wrap">
        {['', ...CRM_BRANDS].map((b) => (
          <button key={b || 'all'} onClick={() => setBrand(b)} className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${brand === b ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {b || 'Todas las entidades'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Ítems cumplidos" value={`${totals.done}/${totals.total}`} accent="text-sky-600" hint={`${totals.total ? Math.round((totals.done / totals.total) * 100) : 0} % del checklist`} />
        <Kpi label="Vencidos" value={totals.overdue} accent={totals.overdue ? 'text-red-600' : 'text-slate-800'} hint="Sin tildar y con la fecha pasada" />
        <Kpi label="Vencen en 7 días" value={totals.soon} accent={totals.soon ? 'text-amber-600' : 'text-slate-800'} hint="Sin tildar" />
        <Kpi label="Entidades al 100 %" value={totals.complete} hint={`de ${visible.length}`} />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-16">Cargando el Weekly check…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
          <nav className="space-y-1.5 lg:sticky lg:top-36" aria-label="Entidades">
            {visible.map((e) => (
              <EntityButton key={e.code} entity={e} summary={entitySummary(map[e.code], todayIso, items)} active={entity?.code === e.code} onClick={() => pick(e.code)} />
            ))}
          </nav>

          {entity && (
            <div ref={detailRef} className="space-y-5 min-w-0 scroll-mt-24">
              <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-black text-sky-600 uppercase tracking-widest">{entity.code} · {entity.brand}</p>
                    <h2 className="text-lg font-black text-slate-900 leading-tight">{entity.name}</h2>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-2xl font-black text-sky-600 leading-none">{summary.done}/{summary.total}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Checklist</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${summary.pct}%` }} />
                </div>
                <WeeklyChecklist
                  entityCode={entity.code}
                  items={items}
                  checks={map[entity.code]}
                  todayIso={todayIso}
                  dark={dark}
                  onSave={onSave}
                  onAddItem={addItem}
                  onRenameItem={renameItem}
                  onDeleteItem={deleteItem}
                />
                <p className="mt-2 text-[10px] font-bold text-slate-400">El deadline (dd/mm/aaaa) se pone más rojo a medida que se acerca; al tildar el ítem deja de resaltarse. Los ítems del checklist valen para todas las entidades.</p>
              </section>

              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <CrmNextSteps
                  key={entity.code}
                  entity={entity}
                  steps={entitySteps}
                  c={c}
                  navy={NAVY}
                  currentUser={currentUser}
                  createStep={createStep}
                  updateStep={updateStep}
                  removeStep={removeStep}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

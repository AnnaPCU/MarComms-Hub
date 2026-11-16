// ════════════════════════════════════════════════════════════════════
// CrmWeeklyCheck — CRM HubSpot · «Weekly check» (oct 2026)
// ════════════════════════════════════════════════════════════════════
// Seguimiento de la implementación de HubSpot en cada entidad. Dos vistas:
//   · «Por entidad»: a la izquierda las entidades (semáforo del avance,
//     importancia, tags y alertas de deadline), a la derecha la elegida
//     con sus deals nuevos de HubSpot (si está la 0071), su checklist
//     (tilde + deadline en dd/mm/aaaa que se pone más rojo cuanto más cerca
//     está) y sus próximos steps.
//   · «Próximas actividades» (UpcomingActivities): solo lo que viene, por
//     entidad o por país.
// Arriba, filtros (marca, semáforo, importancia, tag) y orden (por color
// del semáforo, importancia, país) que valen para las dos vistas.
// Las entidades se suman, editan y borran desde acá (EntityFormModal,
// tabla crm_weekly_entities, migration 0070; sin la 0070 quedan las 16 de
// CRM_ENTITIES y no se pueden editar). Los ítems del checklist valen para
// todas las entidades y se pueden agregar, renombrar y eliminar. Todo en
// tiempo real.
//
// Nov 2026: scope 'weekly' (pestaña «Weekly check»: solo las entidades de
// Américas) o 'global' (pestaña «Global check»: Américas, EMEA y APAC, con
// filtro por región). Son las mismas entidades, tildes y steps.
//
// Props: scope ('weekly' | 'global'), data (de useCrmWeekly: lo carga App,
//   que también arma los avisos de deadlines en rojo), currentUser, dark
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useRef, useState } from 'react';
import { CalendarClock, LayoutList, Pencil, Plus } from 'lucide-react';
import { todayIso as getTodayIso } from '@/utils/date';
import { checksByEntity, countryOptions, entitySummary, entityTags, filterEntities, newCheckItemId, sortEntities, trafficLight } from '@/utils/crmWeekly';
import { useConfirm } from '@/hooks/useConfirm';
import { useStoredPref } from '@/hooks/useStoredPref';
import WeeklyChecklist from './WeeklyChecklist';
import CrmNextSteps from './CrmNextSteps';
import EntityButton, { PriorityChip } from './EntityButton';
import EntityFilters from './EntityFilters';
import EntityFormModal from './EntityFormModal';
import TagsInput from './TagsInput';
import UpcomingActivities from './UpcomingActivities';
import DealsSyncBar from './DealsSyncBar';
import { DealsPanel } from './DealsSpark';

// Colores de las tablas de steps (paleta del módulo: sky / azul)
const LIGHT = { primary: '#0284c7', dark: '#0f172a', label: '#64748b', text: '#334155' };
const DARK = { primary: '#38bdf8', dark: '#f1f5f9', label: '#94a3b8', text: '#cbd5e1' };
const NAVY = '#0c4a6e';

const SUBVIEWS = [
  { id: 'entities', label: 'Por entidad', icon: LayoutList },
  { id: 'activities', label: 'Próximas actividades', icon: CalendarClock },
];

const NO_FILTERS = { brand: '', light: '', priority: '', tag: '', region: '' };

export default function CrmWeeklyCheck({ scope = 'weekly', data, currentUser, dark = false }) {
  const isGlobal = scope === 'global';
  const {
    entities: allEntities, weeklyEntities, tracking, items, checks, steps, loading, error, missing,
    dealCounts, dealSync, dealsReady, refreshDeals,
    saveCheck, createStep, updateStep, removeStep, updateStepOptimistic,
    createItem, updateItem, removeItem, createEntity, updateEntity, removeEntity,
  } = data;
  const confirm = useConfirm();
  // Weekly check: solo Américas; Global check: todas
  const entities = isGlobal ? allEntities : weeklyEntities;
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sortFirst, setSortFirst] = useStoredPref('marcomms_hub_crm_weekly_sort', 'manual');
  const [sortSecond, setSortSecond] = useStoredPref('marcomms_hub_crm_weekly_sort2', 'manual');
  const sort = [sortFirst, sortSecond];
  const setSort = ([a, b]) => { setSortFirst(a); setSortSecond(b); };
  const [subview, setSubview] = useStoredPref('marcomms_hub_crm_weekly_view', 'entities');
  const [range, setRange] = useStoredPref('marcomms_hub_crm_weekly_range', '14');
  const [groupBy, setGroupBy] = useStoredPref(`marcomms_hub_crm_${scope}_group`, isGlobal ? 'region' : 'entity');
  const [selected, setSelected] = useState(null);
  const [entityModal, setEntityModal] = useState(null); // { entity } | { entity: null }
  const [saveError, setSaveError] = useState('');
  const detailRef = useRef(null);
  const todayIso = getTodayIso();
  const c = dark ? DARK : LIGHT;
  const by = currentUser?.name || '';

  const map = useMemo(() => checksByEntity(checks), [checks]);
  const summaries = useMemo(() => Object.fromEntries(entities.map((e) => [e.code, entitySummary(map[e.code], todayIso, items)])), [entities, map, todayIso, items]);
  const tags = useMemo(() => entityTags(entities), [entities]);
  const countries = useMemo(() => countryOptions(allEntities), [allEntities]);
  const regionCounts = useMemo(() => entities.reduce((acc, e) => { const r = e.region || 'Américas'; acc[r] = (acc[r] || 0) + 1; return acc; }, {}), [entities]);
  // Los colores del semáforo cuentan sin el filtro de color (para poder cambiar de color)
  const lightCounts = useMemo(() => filterEntities(entities, { ...filters, light: '' }, summaries).reduce((acc, e) => {
    const l = trafficLight(summaries[e.code]); if (l) acc[l.id] = (acc[l.id] || 0) + 1; return acc;
  }, {}), [entities, filters, summaries]);
  const visible = useMemo(() => sortEntities(filterEntities(entities, filters, summaries), sort, summaries), [entities, filters, summaries, sortFirst, sortSecond]); // eslint-disable-line react-hooks/exhaustive-deps
  const entity = visible.find((e) => e.code === selected) || visible[0];
  const entitySteps = steps.filter((s) => s.entityCode === entity?.code);
  const summary = entity ? summaries[entity.code] : null;
  const light = trafficLight(summary);

  // En pantallas chicas la lista va arriba: al elegir, baja a la entidad
  const pick = (code) => {
    setSelected(code);
    if (window.innerWidth < 1024) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const openEntity = (code) => { setSubview('entities'); pick(code); };

  const saveFor = async (entityCode, itemId, patch) => {
    setSaveError('');
    try { await saveCheck({ entityCode, itemId, patch, updatedBy: by }); }
    catch (_e) { setSaveError('No se pudo guardar el cambio. Probá de nuevo; si sigue fallando, revisá la consola.'); }
  };
  const onSave = (itemId, patch) => saveFor(entity.code, itemId, patch);

  // Ítems del checklist (para todas las entidades)
  const run = async (fn, msg) => {
    setSaveError('');
    try { await fn(); } catch (e) { setSaveError(msg); throw e; }
  };
  const addItem = (label) => run(
    () => createItem({ id: newCheckItemId(), label, position: items.reduce((m, it) => Math.max(m, (it.position ?? 0) + 1), 0), createdBy: by }),
    'No se pudo agregar el ítem. Probá de nuevo.',
  );
  const renameItem = (it, label) => (label === it.label ? Promise.resolve() : run(() => updateItem(it.id, { label }), 'No se pudo renombrar el ítem. Probá de nuevo.'));
  const deleteItem = async (it) => {
    const ok = await confirm({
      title: '¿Eliminar el ítem del checklist?',
      message: `"${it.label}" se va a eliminar del checklist de las ${entities.length} entidades, junto con lo que tenía cargado cada una (tilde y deadline). Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok) await run(() => removeItem(it.id), 'No se pudo eliminar el ítem. Probá de nuevo.').catch(() => {});
  };

  // Entidades
  const saveEntity = async (form) => {
    if (entityModal.entity) await updateEntity(entityModal.entity.code, form);
    else {
      await createEntity({ ...form, position: entities.reduce((m, e) => Math.max(m, (e.position ?? 0) + 1), 0), createdBy: by });
      setFilters(NO_FILTERS);
      setSelected(form.code);
    }
    setEntityModal(null);
  };
  const deleteEntity = async () => { await removeEntity(entityModal.entity.code); setSelected(null); setEntityModal(null); };
  const patchEntity = (patch) => run(() => updateEntity(entity.code, patch), 'No se pudo guardar el cambio de la entidad. Probá de nuevo.').catch(() => {});

  const toggleStep = (s) => run(() => updateStepOptimistic(s.id, { done: !s.done }), 'No se pudo guardar el step. Probá de nuevo.').catch(() => {});

  if (missing) {
    return <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-bold">El Weekly check todavía no está activado en la base (falta la migración 0043 en Supabase).</p>;
  }

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudieron cargar los datos desde Supabase. Revisá la consola.</div>}
      {saveError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">{saveError}</div>}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1" role="tablist" aria-label="Vista del Weekly check">
          {SUBVIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={subview === id} onClick={() => setSubview(id)} className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${subview === id ? 'bg-sky-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setEntityModal({ entity: null })}
          disabled={!tracking}
          title={tracking ? 'Sumar una entidad / país al Weekly check' : 'Para sumar entidades falta correr la migración 0070 en Supabase'}
          className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar entidad / país
        </button>
      </div>

      {dealsReady && <DealsSyncBar sync={dealSync} onRefresh={refreshDeals} />}

      <EntityFilters showRegion={isGlobal} regionCounts={isGlobal ? regionCounts : null} filters={filters} onChange={(p) => setFilters((f) => ({ ...f, ...p }))} sort={sort} onSort={setSort} lightCounts={lightCounts} tags={tags} />

      {!tracking && !loading && <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 text-[11px] font-bold">Para sumar entidades, ponerles importancia y tags, y cargar fechas en los próximos steps, falta correr la migración 0070 en Supabase. Mientras tanto se ven las 16 entidades de siempre.</p>}

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-16">Cargando el Weekly check…</p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center">
          <p className="text-sm font-black text-slate-600">Ninguna entidad coincide con los filtros.</p>
          <button onClick={() => setFilters(NO_FILTERS)} className="mt-2 text-[11px] font-black uppercase tracking-wider text-sky-700 hover:text-sky-900">Limpiar filtros</button>
        </div>
      ) : subview === 'activities' ? (
        <UpcomingActivities
          entities={visible}
          map={map}
          steps={tracking ? steps : []}
          items={items}
          summaries={summaries}
          todayIso={todayIso}
          dark={dark}
          tracking={tracking}
          range={range}
          onRange={setRange}
          groupBy={groupBy}
          groupOptions={isGlobal ? ['region', 'country', 'entity'] : ['entity', 'country']}
          onGroupBy={setGroupBy}
          onOpenEntity={openEntity}
          onToggleCheck={(e, itemId, done) => saveFor(e.code, itemId, { done })}
          onToggleStep={toggleStep}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
          <nav className="space-y-1.5 lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-1" aria-label="Entidades">
            {visible.map((e) => (
              <EntityButton key={e.code} entity={e} summary={summaries[e.code]} showRegion={isGlobal} active={entity?.code === e.code} onClick={() => pick(e.code)} />
            ))}
          </nav>

          {entity && (
            <div ref={detailRef} className="space-y-5 min-w-0 scroll-mt-24">
              {dealsReady && (
                <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: c.primary }}>Deals nuevos en HubSpot</p>
                  <DealsPanel key={entity.code} counts={dealCounts} code={entity.code} dark={dark} />
                </section>
              )}
              <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-black text-sky-600 uppercase tracking-widest">{entity.code} · {entity.brand}{entity.country ? ` · ${entity.country}` : ''}{isGlobal ? ` · ${entity.region || 'Américas'}` : ''}</p>
                    <h2 className="text-lg font-black text-slate-900 leading-tight flex items-center gap-2 flex-wrap">
                      {entity.name}
                      <PriorityChip priority={entity.priority} />
                      {tracking && <button onClick={() => setEntityModal({ entity })} className="w-7 h-7 rounded-lg text-slate-300 hover:text-sky-700 hover:bg-sky-50 flex items-center justify-center" title="Editar entidad (nombre, país, marca, importancia, tags) o eliminarla" aria-label="Editar entidad"><Pencil className="w-3.5 h-3.5" /></button>}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-2xl font-black leading-none flex items-center justify-end gap-2">
                      <span className={`w-3 h-3 rounded-full ${light ? light.dot : 'bg-slate-300'}`} />
                      <span className="text-slate-800">{summary.done}/{summary.total}</span>
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{summary.pct} % · {light ? light.label : 'Checklist'}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${light ? light.bar : 'bg-slate-300'}`} style={{ width: `${summary.pct}%` }} />
                </div>
                {tracking && (
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags</span>
                    <div className="flex-1 min-w-[200px]"><TagsInput compact tags={entity.tags || []} options={tags} onChange={(t) => patchEntity({ tags: t })} /></div>
                  </div>
                )}
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
                  tracking={tracking}
                  todayIso={todayIso}
                  dark={dark}
                  createStep={createStep}
                  updateStep={updateStep}
                  removeStep={removeStep}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {entityModal && (
        <EntityFormModal
          entity={entityModal.entity}
          entities={allEntities}
          tagOptions={tags}
          countryOptions={countries}
          defaultRegion={isGlobal && filters.region ? filters.region : 'Américas'}
          onSave={saveEntity}
          onDelete={entityModal.entity ? deleteEntity : null}
          onClose={() => setEntityModal(null)}
        />
      )}
    </div>
  );
}

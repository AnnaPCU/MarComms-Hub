// ════════════════════════════════════════════════════════════════════
// PlansApp — Sección Planes
// ════════════════════════════════════════════════════════════════════
// Un plan = un plan de `billing_plans` (Control Union Argentina, Peterson
// Solutions Argentina…). Cada plan tiene:
//   - sus tareas (réplica de la tabla "3) TAREAS" de cada pestaña del
//     Excel "Seguimiento Planes Marketing"), editables en tiempo real
//   - los pilares que cubre (lo que antes estaba en Portal Cliente →
//     "Por plan")
//
// Pantalla interna: nuevo plan y edición de tareas. Todo se carga y edita
// desde acá (la carga inicial del Excel se hizo una sola vez, oct 2026).
// La vista externa es por plan: el link que se le pasa al cliente
// (/?plan=<token>), que se ve desde el detalle de cada plan.
//
// Las tarjetas se agrupan por marca: Control Union y Peterson Solutions
// nunca se mezclan en un mismo bloque.
//
// Props:
//   planTasks (usePlanTasks), webinars, campaigns, events, teamNames,
//   currentUser, onOpenProject(section, id), onBack
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Plus, Target, X } from 'lucide-react';

import { useBillingPlans } from '@/hooks/useBillingPlans';
import { planBrand, planPillarItems, taskStats } from '@/utils/planTasks';
import { todayIso as getTodayIso } from '@/utils/date';
import { Kpi, pctLabel } from './PlanBits';
import PlanCard from './PlanCard';
import PlanDetail from './PlanDetail';

const BRAND_ORDER = ['Control Union', 'Peterson Solutions', ''];

export default function PlansApp({ planTasks, webinars, campaigns, events, teamNames = [], currentUser, onOpenProject, onBack }) {
  const { plans, loading: plansLoading, addPlan, rotatePublicToken } = useBillingPlans();
  const { tasks, loading: tasksLoading, error, createTask, updateTask, removeTask } = planTasks;
  const [openId, setOpenId] = useState(null);
  const [newPlan, setNewPlan] = useState(null); // { name, saving, error }
  const [flash, setFlash] = useState('');
  const todayIso = getTodayIso();

  const tasksByPlan = useMemo(() => {
    const m = new Map();
    tasks.forEach((t) => { const k = String(t.planId); if (!m.has(k)) m.set(k, []); m.get(k).push(t); });
    return m;
  }, [tasks]);
  const pillarsByPlan = useMemo(() => new Map(plans.map((p) => [String(p.id), planPillarItems(p.id, { webinars, campaigns, events })])), [plans, webinars, campaigns, events]);
  const groups = useMemo(() => BRAND_ORDER
    .map((brand) => ({ brand, plans: plans.filter((p) => planBrand(p.name) === brand) }))
    .filter((g) => g.plans.length > 0), [plans]);

  // Pilares "Cubierto por un plan" sin plan elegido (o con un plan que ya no existe)
  const unassignedPillars = useMemo(() => {
    const ids = new Set(plans.map((p) => String(p.id)));
    const loose = (x) => x && x.billing === 'plan' && (!x.planId || !ids.has(String(x.planId)));
    return webinars.filter(loose).length + events.filter(loose).length + campaigns.filter((c) => c.variant !== 'webinar' && loose(c)).length;
  }, [plans, webinars, campaigns, events]);

  const stats = taskStats(tasks);
  const openPlan = plans.find((p) => String(p.id) === String(openId));
  const loading = plansLoading || tasksLoading;

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 6000); };

  const createPlan = async () => {
    if (!newPlan?.name.trim() || newPlan.saving) return;
    setNewPlan({ ...newPlan, saving: true, error: '' });
    try {
      const plan = await addPlan(newPlan.name);
      setNewPlan(null);
      if (plan) showFlash(`Plan «${plan.name}» listo.`);
    } catch (_e) {
      setNewPlan({ ...newPlan, saving: false, error: 'No se pudo crear el plan. Probá de nuevo.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Volver"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-white text-emerald-700 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> PLANES</div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black uppercase tracking-tight">Planes</h1>
              <p className="text-[10px] text-emerald-50 font-bold uppercase tracking-widest truncate">Seguimiento de tareas por plan · en tiempo real</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-5">
        {flash && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {flash}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudieron cargar o guardar las tareas en Supabase. Revisá la consola.</div>}

        {loading && plans.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">Cargando planes…</p>
        ) : openPlan ? (
          <PlanDetail
            plan={openPlan}
            tasks={tasksByPlan.get(String(openPlan.id)) || []}
            pillarItems={pillarsByPlan.get(String(openPlan.id)) || []}
            todayIso={todayIso}
            teamNames={teamNames}
            currentUser={currentUser}
            createTask={createTask}
            updateTask={updateTask}
            removeTask={removeTask}
            onOpenPillar={(it) => onOpenProject && onOpenProject('campaigns', it.id)}
            onRotateToken={rotatePublicToken}
            onBack={() => setOpenId(null)}
          />
        ) : (
          <>
            {/* Totales de todos los planes (interno: mezcla marcas) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Planes" value={plans.length} />
              <Kpi label="Tareas" value={stats.total} />
              <Kpi label="Completadas" value={stats.completed} accent="text-emerald-600" hint={`${stats.open} abiertas`} />
              <Kpi label="% avance" value={pctLabel(stats.pct)} accent="text-emerald-700" hint="completadas / (completadas + abiertas)" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {newPlan ? (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
                  <input
                    autoFocus
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value, error: '' })}
                    onKeyDown={(e) => { if (e.key === 'Enter') createPlan(); if (e.key === 'Escape') setNewPlan(null); }}
                    placeholder="Ej: Control Union Chile"
                    className="w-64 text-xs font-bold text-slate-800 bg-transparent px-2 py-1.5 outline-none"
                  />
                  <button onClick={createPlan} disabled={!newPlan.name.trim() || newPlan.saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-40">{newPlan.saving ? 'Creando…' : 'Crear'}</button>
                  <button onClick={() => setNewPlan(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center" title="Cancelar"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => setNewPlan({ name: '', saving: false, error: '' })} className="bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Nuevo plan
                </button>
              )}
              {newPlan?.error && <span className="text-[11px] font-bold text-red-600">{newPlan.error}</span>}
              {unassignedPillars > 0 && !plansLoading && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {unassignedPillars} {unassignedPillars === 1 ? 'pilar está cubierto' : 'pilares están cubiertos'} por un plan «Sin especificar»: elegí el plan en el presupuesto del pilar.
                </span>
              )}
            </div>

            {plans.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
                <Target className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Todavía no hay planes</p>
                <p className="text-xs text-slate-400 mt-1">Creá el primero con «Nuevo plan».</p>
              </div>
            ) : groups.map((g) => (
              <section key={g.brand || 'otros'} className="space-y-3">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{g.brand || 'Otros planes'}</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {g.plans.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      tasks={tasksByPlan.get(String(p.id)) || []}
                      pillarsCount={(pillarsByPlan.get(String(p.id)) || []).length}
                      todayIso={todayIso}
                      onOpen={(pl) => setOpenId(pl.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

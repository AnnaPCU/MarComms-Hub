// ════════════════════════════════════════════════════════════════════
// MarketingPlansApp — Planes de Marketing (réplica del Excel de seguimiento)
// ════════════════════════════════════════════════════════════════════
// Reemplaza a la sección CRM (oct 2026). Muestra el Excel "Seguimiento
// Planes Marketing" como dashboard: resumen general, una tarjeta por plan,
// carga por responsable y tareas vencidas. Cada plan abre su detalle
// (objetivos, seguimiento mensual y tareas).
// Los datos se actualizan importando el Excel desde acá (PlanImportModal);
// el realtime de Supabase hace que todos lo vean al instante.
//
// Props: data (de useMarketingPlans), currentUser, onBack
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, FileSpreadsheet, Target, Upload } from 'lucide-react';

import { overallStats, overdueTasks } from '@/utils/marketingPlans';
import { formatDate } from '@/utils/date';
import { Kpi, SectionTitle, pctLabel } from './PlanBits';
import PlanCard from './PlanCard';
import PlanDetail from './PlanDetail';
import OwnerLoadPanel from './OwnerLoadPanel';
import PlanImportModal from './PlanImportModal';

const selectCls = 'bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-300';
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function MarketingPlansApp({ data, currentUser, onBack }) {
  const { plans, imports, loading, error, importPlans } = data;
  const [openName, setOpenName] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [brand, setBrand] = useState('');
  const [country, setCountry] = useState('');
  const [flash, setFlash] = useState('');

  const brands = useMemo(() => [...new Set(plans.map((p) => p.brand).filter(Boolean))].sort(), [plans]);
  const countries = useMemo(() => [...new Set(plans.map((p) => p.country).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [plans]);
  const visible = plans.filter((p) => (!brand || p.brand === brand) && (!country || p.country === country));
  const stats = overallStats(visible);
  const overdue = visible.flatMap((p) => overdueTasks(p).map((t) => ({ ...t, plan: p.name }))).sort((a, b) => a.date.localeCompare(b.date));
  const lastImport = imports[0];
  const openPlan = plans.find((p) => p.name === openName);

  const handleImport = async (newPlans, { fileName }) => {
    const summary = await importPlans(newPlans, { fileName, importedBy: currentUser?.name || '' });
    setFlash(`Listo: ${summary.plans} planes y ${summary.tasks} tareas importados${summary.deleted ? `, ${summary.deleted} borrados` : ''}.`);
    setTimeout(() => setFlash(''), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Volver"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-white text-blue-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> PLANES</div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black uppercase tracking-tight">Planes de Marketing</h1>
              <p className="text-[10px] text-sky-100 font-bold uppercase tracking-widest truncate">
                {lastImport ? `Actualizado ${fmtDateTime(lastImport.importedAt)}${lastImport.importedBy ? ` por ${lastImport.importedBy}` : ''}${lastImport.fileName ? ` · ${lastImport.fileName}` : ''}` : 'Seguimiento general · se actualiza importando el Excel'}
              </p>
            </div>
          </div>
          <button onClick={() => setShowImport(true)} className="bg-white text-blue-700 hover:bg-sky-50 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-md">
            <Upload className="w-4 h-4" /> Importar Excel
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-5">
        {flash && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {flash}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudieron cargar los planes desde Supabase. Revisá la consola.</div>}

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-16">Cargando planes…</p>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
            <FileSpreadsheet className="w-10 h-10 text-sky-400 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Todavía no se importó ningún Excel</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Importá el archivo «Seguimiento Planes Marketing» para ver los planes acá.</p>
            <button onClick={() => setShowImport(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Importar Excel</button>
          </div>
        ) : openPlan ? (
          <PlanDetail plan={openPlan} onBack={() => setOpenName(null)} />
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectCls}>
                <option value="">Todas las marcas</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectCls}>
                <option value="">Todos los países</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Planes" value={stats.plans} />
              <Kpi label="Tareas" value={stats.total} />
              <Kpi label="Completadas" value={stats.completed} accent="text-emerald-600" />
              <Kpi label="Abiertas" value={stats.open} accent="text-amber-600" />
              <Kpi label="% avance" value={pctLabel(stats.pct)} accent="text-blue-600" hint="completadas / (completadas + abiertas)" />
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((p) => <PlanCard key={p.id || p.name} plan={p} onOpen={(pl) => setOpenName(pl.name)} />)}
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <OwnerLoadPanel plans={visible} />
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <SectionTitle><Clock className="w-3.5 h-3.5" /> Tareas vencidas</SectionTitle>
                {overdue.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay tareas abiertas con fecha pasada.</p>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {overdue.map((t, i) => (
                      <li key={`${t.plan}-${t.row}-${i}`} className="py-2 flex items-center gap-3">
                        <span className="font-mono text-[11px] font-black text-red-600 w-20 shrink-0">{formatDate(t.date)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{t.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.plan} · {t.owner || 'Sin responsable'} · {t.status || 'Sin estado'}</p>
                        </div>
                        <button onClick={() => setOpenName(t.plan)} className="text-[10px] font-black text-sky-600 uppercase tracking-wider shrink-0">Ver plan</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {showImport && <PlanImportModal currentPlans={plans} onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  );
}

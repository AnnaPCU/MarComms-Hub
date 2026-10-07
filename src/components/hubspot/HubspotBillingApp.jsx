// ════════════════════════════════════════════════════════════════════
// HubspotBillingApp — CRM HubSpot: facturación de licencias por entidad
// ════════════════════════════════════════════════════════════════════
// Réplica del Excel "Facturacion_HUBSPOT" como dashboard (oct 2026, en el
// lugar de la vieja sección CRM): total facturado por mes, variación,
// licencias Sales Pro / Core, una fila por entidad con su detalle y
// usuarios, y una lista de lo que no cuadra en el Excel.
// Los datos se actualizan importando el Excel (BillingImportModal); el
// realtime de Supabase hace que todos lo vean al instante.
//
// Props: data (de useHubspotBilling), currentUser, onBack
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Database, FileSpreadsheet, Upload } from 'lucide-react';

import { brandOfEntity } from '@/constants/hubspotBilling';
import { monthTotals, latestBilledMonth, previousMonth, monthOf, licensesOf, totalCheck } from '@/utils/hubspotBilling';
import { Delta, Kpi, money } from './BillingBits';
import MonthlyChart from './MonthlyChart';
import EntitiesTable from './EntitiesTable';
import ReviewPanel from './ReviewPanel';
import BillingImportModal from './BillingImportModal';

const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function HubspotBillingApp({ data, currentUser, onBack }) {
  const { entities, imports, meta, loading, error, importExcel } = data;
  const [brand, setBrand] = useState('');
  const [month, setMonth] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [flash, setFlash] = useState('');

  const visible = useMemo(() => entities.filter((e) => !brand || brandOfEntity(e.key) === brand), [entities, brand]);
  const latest = latestBilledMonth(entities);
  useEffect(() => { if (!month && entities.length) setMonth(latest); }, [entities.length, latest, month]);
  const current = month || latest;

  const totals = monthTotals(visible);
  const now = totals.find((t) => t.month === current) || { total: 0, billed: 0 };
  const prev = previousMonth(current);
  const before = prev ? totals.find((t) => t.month === prev) : null;
  const lic = visible.reduce((acc, e) => { const l = licensesOf(monthOf(e, current)); acc.sp += l.salesPro; acc.core += l.core; return acc; }, { sp: 0, core: 0 });
  const tCheck = !brand ? totalCheck(entities, meta, current) : null;
  const lastImport = imports[0];

  const handleImport = async (newEntities, newMeta, { fileName }) => {
    const s = await importExcel(newEntities, newMeta, { fileName, importedBy: currentUser?.name || '' });
    setMonth(null);
    setFlash(`Listo: ${s.entities} entidades importadas${s.deleted ? `, ${s.deleted} borradas` : ''}.`);
    setTimeout(() => setFlash(''), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Volver"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-white text-blue-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> CRM</div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black uppercase tracking-tight">Facturación HubSpot</h1>
              <p className="text-[10px] text-sky-100 font-bold uppercase tracking-widest truncate">
                {lastImport ? `Actualizado ${fmtDateTime(lastImport.importedAt)}${lastImport.importedBy ? ` por ${lastImport.importedBy}` : ''}${lastImport.fileName ? ` · ${lastImport.fileName}` : ''}` : 'Licencias por entidad · se actualiza importando el Excel'}
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
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudieron cargar los datos desde Supabase. Revisá la consola.</div>}

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-16">Cargando facturación…</p>
        ) : entities.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
            <FileSpreadsheet className="w-10 h-10 text-sky-400 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Todavía no se importó ningún Excel</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Importá «Facturacion_HUBSPOT» para ver la facturación por entidad.</p>
            <button onClick={() => setShowImport(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Importar Excel</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {['', 'Control Union', 'Peterson Solutions'].map((b) => (
                <button key={b || 'all'} onClick={() => setBrand(b)} className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${brand === b ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {b || 'Todas las entidades'}
                </button>
              ))}
              <span className="text-[11px] font-bold text-slate-400 ml-auto">Tarifas: Sales Pro {money(meta.unitPrices?.salesPro)} · Core {money(meta.unitPrices?.core)}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label={`Facturado ${current}`} value={money(now.total)} accent="text-blue-600" hint={<span className="flex items-center gap-1">vs {prev || '—'}: <Delta now={now.total} before={before ? before.total : null} /></span>} />
              <Kpi label="Entidades facturadas" value={now.billed} hint={`de ${visible.length}`} />
              <Kpi label="Licencias Sales Pro" value={lic.sp} hint={money(lic.sp * (meta.unitPrices?.salesPro || 0))} />
              <Kpi label="Licencias Core" value={lic.core} hint={money(lic.core * (meta.unitPrices?.core || 0))} />
              <Kpi label="Acumulado del año" value={money(totals.reduce((a, t) => a + t.total, 0))} hint={`${totals.filter((t) => t.total > 0).length} meses facturados`} />
            </div>

            {tCheck && tCheck.diff !== 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>El TOTAL del Excel para {current} dice {money(tCheck.excel)}, pero las entidades suman {money(tCheck.computed)}{tCheck.missing.length ? `: la fórmula no incluye ${tCheck.missing.join(', ')}` : ''}. Acá se muestra la suma real.</span>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2"><MonthlyChart totals={totals} selected={current} onSelect={setMonth} /></div>
              <ReviewPanel entities={visible} meta={meta} month={current} />
            </div>

            <EntitiesTable entities={visible} month={current} meta={meta} />
          </>
        )}
      </main>

      {showImport && <BillingImportModal currentEntities={entities} onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  );
}

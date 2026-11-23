// ════════════════════════════════════════════════════════════════════
// HubspotBillingApp — CRM HubSpot: facturación de licencias por entidad
// ════════════════════════════════════════════════════════════════════
// Réplica del Excel "Facturacion_HUBSPOT" como dashboard (oct 2026, en el
// lugar de la vieja sección CRM): total facturado por mes, variación,
// licencias Sales Pro / Core, una fila por entidad con su detalle y
// usuarios, y una lista de lo que no cuadra en el Excel. Las advertencias
// (aviso del TOTAL y "Para revisar en el Excel") se pueden borrar, con
// confirmación; quedan borradas para todo el equipo hasta la próxima
// importación.
// Los datos se actualizan importando el Excel (BillingImportModal); el
// realtime de Supabase hace que todos lo vean al instante.
// Desde oct 2026 el header tiene dos vistas: «Facturación HubSpot» (esta)
// y «Weekly check» (CrmWeeklyCheck: checklist de implementación y
// próximos steps de cada entidad). Nov 2026: tercera vista «Global check»
// (el mismo CrmWeeklyCheck con scope 'global': todas las entidades de
// Américas, EMEA y APAC, con filtro por región; mismos tildes y steps).
//
// Props: data (de useHubspotBilling), weekly (de useCrmWeekly, lo carga App
//   para los avisos), autoView ('weekly' al venir de un aviso) +
//   onAutoViewDone, currentUser, dark, onBack
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Database, FileSpreadsheet, Globe2, Receipt, Upload } from 'lucide-react';

import { useConfirm } from '@/hooks/useConfirm';
import { brandOfEntity, SPECIAL_UNIT_PRICES, monthEn } from '@/constants/hubspotBilling';
import { monthTotals, latestBilledMonth, previousMonth, monthOf, licensesOf, totalCheck, unitPricesFor } from '@/utils/hubspotBilling';
import { Delta, Kpi, money } from './BillingBits';
import MonthlyChart from './MonthlyChart';
import EntitiesTable from './EntitiesTable';
import ReviewPanel, { DismissButton, totalWarningId } from './ReviewPanel';
import BillingImportModal from './BillingImportModal';
import CrmWeeklyCheck from './CrmWeeklyCheck';

const VIEWS = [
  { id: 'billing', label: 'HubSpot billing', icon: Receipt },
  { id: 'weekly', label: 'Weekly check', icon: ClipboardCheck },
  { id: 'global', label: 'Global check', icon: Globe2 },
];
const TITLES = {
  weekly: ['Weekly check', 'HubSpot rollout by entity · checklist and next steps'],
  global: ['Global check', 'Americas, EMEA and APAC · same checklist and next steps as the Weekly check'],
};

const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function HubspotBillingApp({ data, weekly, autoView = null, onAutoViewDone, currentUser, dark = false, onBack }) {
  const { entities, imports, meta, dismissed, loading, error, importExcel, dismissWarning } = data;
  const confirm = useConfirm();
  const [view, setView] = useState(autoView || 'billing');
  useEffect(() => { if (autoView) { setView(autoView); if (onAutoViewDone) onAutoViewDone(); } }, [autoView]); // eslint-disable-line react-hooks/exhaustive-deps
  const [brand, setBrand] = useState('');
  const [month, setMonth] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [flash, setFlash] = useState('');
  const [dismissError, setDismissError] = useState('');

  const visible = useMemo(() => entities.filter((e) => !brand || brandOfEntity(e.key) === brand), [entities, brand]);
  const latest = latestBilledMonth(entities);
  useEffect(() => { if (!month && entities.length) setMonth(latest); }, [entities.length, latest, month]);
  const current = month || latest;

  const totals = monthTotals(visible);
  const now = totals.find((t) => t.month === current) || { total: 0, billed: 0 };
  const prev = previousMonth(current);
  const before = prev ? totals.find((t) => t.month === prev) : null;
  // Licencias del mes y su valor (con la tarifa especial de cada entidad, ej. PS Technology)
  const lic = visible.reduce((acc, e) => {
    const l = licensesOf(monthOf(e, current));
    const up = unitPricesFor(e, current, meta.unitPrices);
    acc.sp += l.salesPro; acc.core += l.core; acc.variable = acc.variable || Boolean(up.variable);
    acc.spMoney += l.salesPro * (up.salesPro || 0); acc.coreMoney += l.core * (up.core || 0);
    return acc;
  }, { sp: 0, core: 0, spMoney: 0, coreMoney: 0, variable: false });
  const tCheck = !brand ? totalCheck(entities, meta, current) : null;
  const lastImport = imports[0];
  const showTotalWarning = tCheck && tCheck.diff !== 0 && !dismissed.has(totalWarningId(current));

  const handleDismiss = async (warningId) => {
    const ok = await confirm({
      title: 'Dismiss this warning?',
      message: 'It will be hidden for the whole team. If the Excel is imported again and it still does not add up, it will show up again.',
      confirmText: 'Dismiss', cancelText: 'Cancel', tone: 'warning',
    });
    if (!ok) return;
    setDismissError('');
    try { await dismissWarning(warningId); }
    catch (err) { console.error('[HubspotBillingApp] dismiss error:', err); setDismissError('Could not dismiss the warning. Please try again.'); }
  };

  const handleImport = async (newEntities, newMeta, { fileName }) => {
    const s = await importExcel(newEntities, newMeta, { fileName, importedBy: currentUser?.name || '' });
    setMonth(null);
    setFlash(`Done: ${s.entities} entities imported${s.deleted ? `, ${s.deleted} deleted` : ''}.`);
    setTimeout(() => setFlash(''), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Back"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-white text-blue-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> CRM</div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black uppercase tracking-tight">{TITLES[view]?.[0] || 'HubSpot billing'}</h1>
              <p className="text-[10px] text-sky-100 font-bold uppercase tracking-widest truncate">
                {TITLES[view] ? TITLES[view][1] : lastImport ? `Updated ${fmtDateTime(lastImport.importedAt)}${lastImport.importedBy ? ` by ${lastImport.importedBy}` : ''}${lastImport.fileName ? ` · ${lastImport.fileName}` : ''}` : 'Licenses by entity · updated by importing the Excel'}
              </p>
            </div>
          </div>
          <div className="flex bg-white/15 rounded-xl p-1 gap-1" role="tablist" aria-label="CRM HubSpot view">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`px-3 py-2 rounded-lg font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5 transition-colors ${view === id ? 'bg-white text-blue-700 shadow' : 'text-white hover:bg-white/15'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          {view === 'billing' && (
            <button onClick={() => setShowImport(true)} className="bg-white text-blue-700 hover:bg-sky-50 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-md">
              <Upload className="w-4 h-4" /> Import Excel
            </button>
          )}
        </div>
      </header>

      {TITLES[view] ? (
        <main className="max-w-7xl mx-auto w-full p-6">
          <CrmWeeklyCheck key={view} scope={view} data={weekly} currentUser={currentUser} dark={dark} />
        </main>
      ) : (
      <main className="max-w-7xl mx-auto w-full p-6 space-y-5">
        {flash && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {flash}</div>}
        {dismissError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">{dismissError}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">Could not load the data from Supabase. Check the console.</div>}

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-16">Loading billing…</p>
        ) : entities.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
            <FileSpreadsheet className="w-10 h-10 text-sky-400 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">No Excel has been imported yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Import «Facturacion_HUBSPOT» to see billing by entity.</p>
            <button onClick={() => setShowImport(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Import Excel</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {['', 'Control Union', 'Peterson Solutions'].map((b) => (
                <button key={b || 'all'} onClick={() => setBrand(b)} className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${brand === b ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {b || 'All entities'}
                </button>
              ))}
              <span className="text-[11px] font-bold text-slate-400 ml-auto">Rates: Sales Pro {money(meta.unitPrices?.salesPro)} · Core {money(meta.unitPrices?.core)}{SPECIAL_UNIT_PRICES.length > 0 && <span title={SPECIAL_UNIT_PRICES.map((s) => `${s.entityKey}: Sales Pro ${money(s.salesPro)} · Core ${money(s.core)} from ${monthEn(s.from)}${s.agreed ? ` (${Object.keys(s.agreed).map(monthEn).join(', ')}: agreed price)` : ''}`).join('\n')}> · {SPECIAL_UNIT_PRICES.map((s) => s.entityKey).join(', ')} on a special rate</span>}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label={`Billed ${monthEn(current)}`} value={money(now.total)} accent="text-blue-600" hint={<span className="flex items-center gap-1">vs {prev ? monthEn(prev) : '—'}: <Delta now={now.total} before={before ? before.total : null} /></span>} />
              <Kpi label="Entities billed" value={now.billed} hint={`of ${visible.length}`} />
              <Kpi label="Sales Pro licenses" value={lic.sp} hint={lic.variable ? 'variable price' : money(lic.spMoney)} />
              <Kpi label="Core licenses" value={lic.core} hint={lic.variable ? 'variable price' : money(lic.coreMoney)} />
              <Kpi label="Year to date" value={money(totals.reduce((a, t) => a + t.total, 0))} hint={`${totals.filter((t) => t.total > 0).length} months billed`} />
            </div>

            {showTotalWarning && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl pl-4 pr-2 py-2.5 text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1 min-w-0">The Excel TOTAL for {monthEn(current)} says {money(tCheck.excel)}, but the entities add up to {money(tCheck.computed)}{tCheck.missing.length ? `: the formula leaves out ${tCheck.missing.join(', ')}` : ''}. The actual sum is shown here.</span>
                <DismissButton onClick={() => handleDismiss(totalWarningId(current))} />
              </div>
            )}

            <MonthlyChart totals={totals} selected={current} onSelect={setMonth} />
            <ReviewPanel entities={visible} meta={meta} month={current} dismissed={dismissed} onDismiss={handleDismiss} />

            <EntitiesTable entities={visible} month={current} meta={meta} />
          </>
        )}
      </main>
      )}

      {showImport && <BillingImportModal currentEntities={entities} onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  );
}

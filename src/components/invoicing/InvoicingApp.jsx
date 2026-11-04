// ════════════════════════════════════════════════════════════════════
// InvoicingApp — Facturación MarComms (nov 2026)
// ════════════════════════════════════════════════════════════════════
// Reemplaza al Excel «Facturacion_MarComms_<Mes>»: una pestaña por hoja,
// con el mismo nombre que en el Excel, y un selector de mes (cada mes
// tiene sus hojas). «Entidades» no depende del mes. «Mes a mes» pone los
// totales de todos los meses lado a lado (gráfico + tabla; cliquear una
// barra abre MonthSplitModal: % y monto de cada categoría) e «Historial» muestra quién cambió qué y cuándo. Arriba de cada hoja: totales con
// tendencia, «Para revisar», buscador, filtro de marca, vista compacta,
// «Qué cambió» contra el mes anterior y Exportar (Excel / PDF).
//
// Props: onBack, currentUser, invoicing (useInvoicing, lo carga App para
//   armar los avisos de etiquetas), people (equipo), autoView
//   ('YYYY-MM:hoja' al venir de un aviso) + onAutoViewDone
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarPlus, Receipt } from 'lucide-react';
import { DISMISSED_KEY, INVOICING_TABS } from '@/constants/invoicing';
import { useConfirm } from '@/hooks/useConfirm';
import { useStoredPref } from '@/hooks/useStoredPref';
import { monthSummary, nextMonthKey, sortRows } from '@/utils/invoicing';
import { computeMonthDiffs, monthWarnings, rowLabel } from '@/utils/invoicingReview';
import { exportMonthXlsx } from '@/utils/invoicingExport';
import { downloadMonthPdf } from '@/utils/invoicingPdf';
import { monthLabel } from '@/utils/planTasks';
import { todayIso } from '@/utils/date';
import { CUENTAS_LIST_ID, CrmSheet, FijoSheet, MktSheet, OfficesSheet, VariablesSheet } from './InvoicingSheets';
import InvoicingToolbar from './InvoicingToolbar';
import TrendKpis from './TrendKpis';
import ReviewPanel from './ReviewPanel';
import ChangesPanel from './ChangesPanel';
import MonthChart from './MonthChart';
import MonthSummary from './MonthSummary';
import MonthSplitModal from './MonthSplitModal';
import HistoryView from './HistoryView';
import NewMonthModal from './NewMonthModal';

const SHEET_VIEWS = { fijo: FijoSheet, variables: VariablesSheet, mkt: MktSheet, crm: CrmSheet, entidades: OfficesSheet };
const MONTHLY_TABS = ['fijo', 'variables', 'mkt', 'crm'];
const SHEET_TAB = { crm_extra: 'crm', mkt_libre: 'mkt', notas: 'fijo' };

export default function InvoicingApp({ onBack, currentUser, invoicing, people = [], autoView = null, onAutoViewDone }) {
  const api = invoicing;
  const { months, rows, loading, error, missing } = api;
  const confirm = useConfirm();
  const [tab, setTab] = useState('fijo');
  const [month, setMonth] = useState('');
  const [filters, setFilters] = useState({ q: '', brand: '' });
  const [compact, setCompact] = useStoredPref('marcomms_hub_fact_compact', false);
  const [varView, setVarView] = useStoredPref('marcomms_hub_fact_variables', 'lista');
  const [showChanges, setShowChanges] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [focus, setFocus] = useState(null); // { id, tick }
  const [exporting, setExporting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [breakdown, setBreakdown] = useState(null); // Mes a mes: { month, segment } del modal de categorías abierto

  // Arranca en el mes actual si existe; si no, en el último cargado
  useEffect(() => {
    if (month && months.includes(month)) return;
    const current = todayIso().slice(0, 7);
    setMonth(months.includes(current) ? current : months[months.length - 1] || '');
  }, [months, month]);

  // Abrir el mes y la hoja de un aviso («te etiquetaron en …»). Espera a
  // que terminen de cargar los meses; si el mes ya no está (o la carga
  // falló), abre igual la hoja y da por usado el aviso.
  useEffect(() => {
    const m = /^(\d{4}-\d{2}):([a-z_]+)$/.exec(autoView || '');
    if (!m || loading) return;
    if (months.includes(m[1])) setMonth(m[1]);
    setTab(SHEET_TAB[m[2]] || m[2]);
    onAutoViewDone?.();
  }, [autoView, months, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const idx = months.indexOf(month);
  const prevMonth = idx > 0 ? months[idx - 1] : null;
  const prevLabel = prevMonth ? monthLabel(prevMonth) : '';
  const nextMonth = months.length ? nextMonthKey(months[months.length - 1]) : todayIso().slice(0, 7);
  const summaries = useMemo(() => Object.fromEntries(months.map((m) => [m, monthSummary(rows.filter((r) => r.month === m))])), [months, rows]);
  const breakdownRows = useMemo(() => (breakdown ? rows.filter((r) => r.month === breakdown.month) : []), [rows, breakdown]);
  const openMonth = (m, t = 'fijo') => { setMonth(m); setTab(t); };
  const monthRows = useMemo(() => rows.filter((r) => r.month === month), [rows, month]);
  const notes = useMemo(() => sortRows(monthRows.filter((r) => r.sheet === 'notas'))[0]?.data || {}, [monthRows]);
  const dismissed = useMemo(() => new Set(Array.isArray(notes[DISMISSED_KEY]) ? notes[DISMISSED_KEY] : []), [notes]);
  const warningsAll = useMemo(() => monthWarnings(monthRows), [monthRows]);
  const warnings = useMemo(() => warningsAll.filter((w) => !dismissed.has(w.id)), [warningsAll, dismissed]);
  const diffs = useMemo(() => (prevMonth ? computeMonthDiffs(rows, month, prevMonth) : null), [rows, month, prevMonth]);
  const changesCount = diffs ? Object.values(diffs).reduce((n, d) => n + d.count, 0) : null;
  const cuentas = useMemo(() => [...new Set(rows.filter((r) => r.sheet === 'entidades' || r.sheet === 'fijo').map((r) => String(r.data?.cuenta || '').trim()).filter((c) => c && c !== '?'))].sort(), [rows]);
  const tabLabel = INVOICING_TABS.find((t) => t.id === tab)?.label || '';
  const monthly = MONTHLY_TABS.includes(tab);
  const sheetChanges = (sheet) => (showChanges && diffs?.[sheet] ? { cells: diffs[sheet].cells, added: new Set(diffs[sheet].added.map((r) => r.id)) } : null);

  const run = async (fn) => {
    setSaveError('');
    try { await fn(); } catch (_e) { setSaveError('No se pudo guardar el cambio. Probá de nuevo; si sigue fallando, revisá la consola.'); }
  };
  const askDelete = (row) => confirm({
    title: '¿Eliminar la fila?',
    message: `${rowLabel(row.sheet, row.data)} se va a eliminar de «${tabLabel}»${tab === 'entidades' ? '' : ` · ${monthLabel(month)}`}. Queda registrado en el historial. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    tone: 'danger',
  });
  const createMonth = async (opts) => {
    setCreating(true);
    setSaveError('');
    try {
      await api.createMonth(opts);
      setMonth(opts.toMonth);
      setShowNew(false);
      if (!monthly) setTab('fijo');
    } catch (_e) {
      setSaveError(`No se pudo armar ${monthLabel(opts.toMonth)}. Probá de nuevo.`);
    } finally {
      setCreating(false);
    }
  };
  const dismissWarning = (id) => run(() => api.patchSingleton(month, 'notas', { [DISMISSED_KEY]: [...dismissed, id] }));
  const goTo = (sheet, rowId) => {
    setTab(SHEET_TAB[sheet] || sheet);
    if (rowId) setFocus({ id: rowId, tick: Date.now() });
  };
  const onExport = async (kind) => {
    setExporting(true); setSaveError('');
    try { if (kind === 'xlsx') await exportMonthXlsx(rows, month); else await downloadMonthPdf(rows, month); }
    catch (e) { console.error('[InvoicingApp] export error:', e); setSaveError('No se pudo exportar. Probá de nuevo; si sigue fallando, revisá la consola.'); }
    finally { setExporting(false); }
  };

  const View = SHEET_VIEWS[tab];
  const sheetProps = {
    month: monthly ? month : null, rows, api, run, askDelete, filters, compact, prevLabel, people,
    changes: sheetChanges(tab), focusRow: focus ? `${focus.tick}:${focus.id}` : null, varView,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 sm:px-6 py-5 shadow-lg">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Volver al Hub"><ArrowLeft className="w-5 h-5 text-white" /></button>
            <div className="bg-white/20 p-2 rounded-xl"><Receipt className="w-5 h-5" /></div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Facturación</h1>
              <p className="text-[10px] text-emerald-50 font-bold uppercase tracking-widest">{monthly && month ? monthLabel(month) : 'Facturación MarComms'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {months.length > 0 && (
              <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={!monthly} aria-label="Mes" className="bg-white text-emerald-700 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md outline-none border-0 disabled:opacity-60">
                {[...months].reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            )}
            <button onClick={() => setShowNew(true)} disabled={missing} className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-md">
              <CalendarPlus className="w-4 h-4" /> Mes nuevo
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30" aria-label="Hojas">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-6 flex gap-1 overflow-x-auto">
          {INVOICING_TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 px-3 sm:px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-colors ${tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto w-full p-4 sm:p-6 space-y-4">
        {missing && <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-bold">La facturación todavía no está activada en la base (falta la migración 0048 en Supabase).</p>}
        {error && <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudieron cargar los datos desde Supabase. Revisá la consola.</p>}
        {saveError && <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">{saveError}</p>}

        {monthly && month && !loading && (
          <>
            <TrendKpis months={months} summaries={summaries} month={month} />
            <ReviewPanel items={warnings} hidden={warningsAll.length - warnings.length} open={reviewOpen} onToggle={() => setReviewOpen(!reviewOpen)} onDismiss={dismissWarning} onGo={(it) => goTo(it.sheet, it.rowId)} />
          </>
        )}
        {(monthly || tab === 'entidades') && !loading && (
          <InvoicingToolbar
            filters={filters}
            onFilters={setFilters}
            compact={compact}
            onCompact={setCompact}
            varView={tab === 'variables' ? varView : null}
            onVarView={setVarView}
            changesCount={monthly ? changesCount : null}
            showChanges={showChanges}
            onToggleChanges={() => setShowChanges(!showChanges)}
            onExport={onExport}
            exporting={exporting}
          />
        )}

        {showChanges && monthly && diffs && !loading && (
          <div className="lg:hidden">
            <ChangesPanel monthLabel={monthLabel(month)} prevLabel={prevLabel} now={summaries[month]} prev={summaries[prevMonth]} diffs={diffs} onGo={goTo} onClose={() => setShowChanges(false)} />
          </div>
        )}
        <div className={showChanges && monthly && diffs && !loading ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-4 lg:items-start' : ''}>
        <div className="min-w-0">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-16">Cargando la facturación…</p>
        ) : tab === 'resumen' ? (
          <div className="space-y-4">
            <MonthChart
              months={months}
              summaries={summaries}
              selected={breakdown?.month || null}
              onSelect={(m, segment) => setBreakdown({ month: m, segment: segment || null })}
            />
            {breakdown && months.includes(breakdown.month) && (
              <MonthSplitModal month={breakdown.month} rows={breakdownRows} focus={breakdown.segment} onClose={() => setBreakdown(null)} />
            )}
            <MonthSummary months={months} rows={rows} onOpenMonth={(m) => openMonth(m)} />
          </div>
        ) : tab === 'historial' ? (
          <HistoryView months={months} />
        ) : monthly && !month ? (
          <p className="text-sm text-slate-400 text-center py-16">Todavía no hay meses. Cliqueá «Mes nuevo» para armar el primero.</p>
        ) : (
          <View {...sheetProps} />
        )}
        </div>
        {showChanges && monthly && diffs && !loading && (
          <div className="hidden lg:block">
            <ChangesPanel monthLabel={monthLabel(month)} prevLabel={prevLabel} now={summaries[month]} prev={summaries[prevMonth]} diffs={diffs} onGo={goTo} onClose={() => setShowChanges(false)} />
          </div>
        )}
        </div>
      </main>

      <datalist id={CUENTAS_LIST_ID}>{cuentas.map((c) => <option key={c} value={c} />)}</datalist>

      {showNew && (
        <NewMonthModal
          toMonth={nextMonth}
          months={months}
          defaultFrom={months[months.length - 1] || ''}
          busy={creating}
          onCreate={createMonth}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

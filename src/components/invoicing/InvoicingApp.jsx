// ════════════════════════════════════════════════════════════════════
// InvoicingApp — Facturación MarComms (nov 2026)
// ════════════════════════════════════════════════════════════════════
// Reemplaza al Excel «Facturacion_MarComms_<Mes>»: una pestaña por hoja,
// con el mismo nombre que en el Excel, y un selector de mes (cada mes
// tiene sus hojas). «Entidades» no depende del mes. «Mes a mes» pone los
// totales de todos los meses lado a lado. Todo editable como el Excel y
// en tiempo real.
//
// Props: onBack, currentUser
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarPlus, Receipt } from 'lucide-react';
import { INVOICING_TABS } from '@/constants/invoicing';
import { useInvoicing } from '@/hooks/useInvoicing';
import { useConfirm } from '@/hooks/useConfirm';
import { formatAmount, monthSummary, nextMonthKey } from '@/utils/invoicing';
import { monthLabel } from '@/utils/planTasks';
import { todayIso } from '@/utils/date';
import { Kpi } from '@/components/hubspot/BillingBits';
import { CUENTAS_LIST_ID, CrmSheet, FijoSheet, MktSheet, OfficesSheet, VariablesSheet } from './InvoicingSheets';
import MonthSummary from './MonthSummary';
import NewMonthModal from './NewMonthModal';

const SHEET_VIEWS = { fijo: FijoSheet, variables: VariablesSheet, mkt: MktSheet, crm: CrmSheet, entidades: OfficesSheet };
const MONTHLY_TABS = ['fijo', 'variables', 'mkt', 'crm'];

const rowName = (row) => {
  const d = row.data || {};
  return d.empresa || d.entidad || d.concepto || d.oficina || d.cliente || d.pais || '';
};

export default function InvoicingApp({ onBack, currentUser }) {
  const api = useInvoicing(currentUser);
  const { months, rows, loading, error, missing } = api;
  const confirm = useConfirm();
  const [tab, setTab] = useState('fijo');
  const [month, setMonth] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);

  // Arranca en el mes actual si existe; si no, en el último cargado
  useEffect(() => {
    if (month && months.includes(month)) return;
    const current = todayIso().slice(0, 7);
    setMonth(months.includes(current) ? current : months[months.length - 1] || '');
  }, [months, month]);

  const nextMonth = months.length ? nextMonthKey(months[months.length - 1]) : todayIso().slice(0, 7);
  const summary = useMemo(() => monthSummary(rows.filter((r) => r.month === month)), [rows, month]);
  const cuentas = useMemo(() => [...new Set(rows.filter((r) => r.sheet === 'entidades' || r.sheet === 'fijo').map((r) => String(r.data?.cuenta || '').trim()).filter((c) => c && c !== '?'))].sort(), [rows]);
  const tabLabel = INVOICING_TABS.find((t) => t.id === tab)?.label || '';

  const run = async (fn) => {
    setSaveError('');
    try { await fn(); } catch (_e) { setSaveError('No se pudo guardar el cambio. Probá de nuevo; si sigue fallando, revisá la consola.'); }
  };
  const askDelete = (row) => confirm({
    title: '¿Eliminar la fila?',
    message: `${rowName(row) ? `«${rowName(row)}» ` : 'La fila '}se va a eliminar de «${tabLabel}»${tab === 'entidades' ? '' : ` · ${monthLabel(month)}`}. Esta acción no se puede deshacer.`,
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
      if (!MONTHLY_TABS.includes(tab)) setTab('fijo');
    } catch (_e) {
      setSaveError(`No se pudo armar ${monthLabel(opts.toMonth)}. Probá de nuevo.`);
    } finally {
      setCreating(false);
    }
  };

  const View = SHEET_VIEWS[tab];
  const monthly = MONTHLY_TABS.includes(tab);

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

      <main className="max-w-[1600px] mx-auto w-full p-4 sm:p-6 space-y-5">
        {missing && <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-bold">La facturación todavía no está activada en la base (falta la migración 0048 en Supabase).</p>}
        {error && <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudieron cargar los datos desde Supabase. Revisá la consola.</p>}
        {saveError && <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">{saveError}</p>}

        {monthly && month && !loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Fijo y facturas" value={formatAmount(summary.fijo)} accent="text-emerald-600" hint="Total a cobrar" />
            <Kpi label="Variables" value={formatAmount(summary.variables)} accent="text-teal-600" hint="Total del mes" />
            <Kpi label="Fijo + Variables" value={formatAmount(summary.fijoMasVariables)} hint={monthLabel(month)} />
            <Kpi label="CRM · Licencias" value={formatAmount(summary.crmLicenses)} accent="text-sky-600" hint="USD" />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-16">Cargando la facturación…</p>
        ) : tab === 'resumen' ? (
          <MonthSummary months={months} rows={rows} onOpenMonth={(m) => { setMonth(m); setTab('fijo'); }} />
        ) : monthly && !month ? (
          <p className="text-sm text-slate-400 text-center py-16">Todavía no hay meses. Cliqueá «Mes nuevo» para armar el primero.</p>
        ) : (
          <View month={monthly ? month : null} rows={rows} api={api} run={run} askDelete={askDelete} />
        )}
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

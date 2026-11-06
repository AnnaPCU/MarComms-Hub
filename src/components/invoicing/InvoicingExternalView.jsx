// ════════════════════════════════════════════════════════════════════
// InvoicingExternalView — Facturación en el link externo (solo lectura)
// ════════════════════════════════════════════════════════════════════
// Las mismas hojas que en el Hub (Fijo y facturas, Variables, MKT Plan,
// CRM, Entidades y Mes a mes), con el selector de mes, los totales con
// tendencia y el estado de cada cobro, pero sin editar: las hojas van con
// readOnly (sin notas del mes, ayudas de edición ni zona libre; Variables
// como tabla). Sin «Para revisar», «Qué cambió», exportar ni historial.
//
// Props: months, rows, updatedAt (último cambio en la base), loadedAt
//   (última lectura)
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { INVOICING_TABS } from '@/constants/invoicing';
import { monthSummary } from '@/utils/invoicing';
import { monthLabel } from '@/utils/planTasks';
import { todayIso } from '@/utils/date';
import { CrmSheet, FijoSheet, MktSheet, OfficesSheet, VariablesSheet } from './InvoicingSheets';
import TrendKpis from './TrendKpis';
import MonthChart from './MonthChart';
import MonthSummary from './MonthSummary';
import MonthSplitModal from './MonthSplitModal';

const TABS = INVOICING_TABS.filter((t) => t.id !== 'historial');
const SHEET_VIEWS = { fijo: FijoSheet, variables: VariablesSheet, mkt: MktSheet, crm: CrmSheet, entidades: OfficesSheet };
const MONTHLY = ['fijo', 'variables', 'mkt', 'crm'];
const NOOP = () => {};
const FILTERS = { q: '', brand: '' };
const MARCOMMS_LOGO = '/logos/marcomms-white.png';
const timeOf = (d) => (d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '');

export default function InvoicingExternalView({ months = [], rows = [], updatedAt = null, loadedAt = null }) {
  const [tab, setTab] = useState('fijo');
  const [month, setMonth] = useState('');
  const [split, setSplit] = useState(null); // Mes a mes: { month, segment }

  // Arranca en el mes actual si existe; si no, en el último
  useEffect(() => {
    if (month && months.includes(month)) return;
    const current = todayIso().slice(0, 7);
    setMonth(months.includes(current) ? current : months[months.length - 1] || '');
  }, [months, month]);

  const summaries = useMemo(() => Object.fromEntries(months.map((m) => [m, monthSummary(rows.filter((r) => r.month === m))])), [months, rows]);
  const monthly = MONTHLY.includes(tab);
  const View = SHEET_VIEWS[tab];
  const sheetProps = { month: monthly ? month : null, rows, api: {}, run: NOOP, askDelete: NOOP, filters: FILTERS, compact: false, prevLabel: '', changes: null, focusRow: null, readOnly: true };

  return (
    <div className="flex flex-col w-full">
      <header className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 sm:px-6 py-5 shadow-lg">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={MARCOMMS_LOGO} alt="MarComms" className="h-7 w-auto shrink-0" />
            <div className="min-w-0 border-l border-white/30 pl-3">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Facturación</h1>
              <p className="text-[10px] text-emerald-50 font-bold uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                <Eye className="w-3 h-3" /> Solo lectura · se actualiza sola{updatedAt ? ` · último cambio ${timeOf(updatedAt)}` : ''}
              </p>
            </div>
          </div>
          {months.length > 0 && (
            <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={!monthly} aria-label="Mes" className="bg-white text-emerald-700 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md outline-none border-0 disabled:opacity-60">
              {[...months].reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          )}
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30" aria-label="Hojas">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 px-3 sm:px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-colors ${tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto w-full p-4 sm:p-6 space-y-4">
        {monthly && month && <TrendKpis months={months} summaries={summaries} month={month} />}
        {tab === 'resumen' ? (
          <div className="space-y-4">
            <MonthChart months={months} summaries={summaries} selected={split?.month || null} onSelect={(m, segment) => setSplit({ month: m, segment: segment || null })} />
            <MonthSummary months={months} rows={rows} onOpenMonth={(m) => { setMonth(m); setTab('fijo'); }} />
            {split && months.includes(split.month) && (
              <MonthSplitModal month={split.month} rows={rows.filter((r) => r.month === split.month)} focus={split.segment} onClose={() => setSplit(null)} />
            )}
          </div>
        ) : monthly && !month ? (
          <p className="text-sm text-slate-400 text-center py-16">Todavía no hay meses cargados.</p>
        ) : View ? (
          <View {...sheetProps} />
        ) : null}
        {loadedAt && <p className="text-[10px] font-bold text-slate-400 text-right">Leído a las {loadedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} · se vuelve a leer cada 30 segundos</p>}
      </main>
    </div>
  );
}

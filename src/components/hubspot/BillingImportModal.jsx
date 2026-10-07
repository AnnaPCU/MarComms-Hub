// ════════════════════════════════════════════════════════════════════
// BillingImportModal — Importar el Excel de Facturación HubSpot
// ════════════════════════════════════════════════════════════════════
// 1. Elegir el archivo → se lee en el navegador
// 2. Vista previa: entidades nuevas / con cambios / sin cambios / que se
//    borran, más los avisos (TOTAL que no suma todo, Summary…)
// 3. Confirmar → reemplaza los datos del Hub (todos lo ven al instante)
//
// Props: currentEntities, onImport(entities, meta, { fileName }) (async), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Minus, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';

import ModalPortal from '@/components/shared/ModalPortal';
import { readExcelFile } from '@/utils/xlsxGrid';
import { parseBillingWorkbook, diffImport, monthTotals, latestBilledMonth } from '@/utils/hubspotBilling';
import { money } from './BillingBits';

function DiffList({ icon: Icon, tone, title, items, render }) {
  if (!items.length) return null;
  return (
    <div className={`rounded-2xl border p-3 ${tone}`}>
      <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><Icon className="w-3.5 h-3.5" /> {title} ({items.length})</p>
      <ul className="space-y-1 text-xs">{items.map((it) => <li key={typeof it === 'string' ? it : it.key}>{render(it)}</li>)}</ul>
    </div>
  );
}

export default function BillingImportModal({ currentEntities, onImport, onClose }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setError(''); setParsed(null); setFileName(file.name); setBusy(true);
    try {
      const result = parseBillingWorkbook(await readExcelFile(file));
      setParsed({ ...result, diff: diffImport(currentEntities, result.entities) });
    } catch (e) {
      console.error('[BillingImport] no se pudo leer el Excel:', e);
      setError('No se pudo leer el archivo. Asegurate de que sea el Excel (.xlsx) de Facturación HubSpot.');
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!parsed?.entities.length || busy) return;
    setBusy(true); setError('');
    try { await onImport(parsed.entities, parsed.meta, { fileName }); onClose(); }
    catch (e) { console.error('[BillingImport] error al importar:', e); setError('No se pudo guardar la importación. Probá de nuevo; si sigue fallando, revisá la consola.'); setBusy(false); }
  };

  const d = parsed?.diff;
  const last = parsed?.entities.length ? latestBilledMonth(parsed.entities) : null;
  const lastTotal = last ? monthTotals(parsed.entities).find((t) => t.month === last).total : 0;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-blue-50 rounded-t-3xl">
            <div>
              <h2 className="font-black text-slate-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-sky-600" /> Importar Facturación HubSpot</h2>
              <p className="text-[11px] font-bold text-slate-500">El Excel manda: las entidades del Hub se reemplazan por las del archivo.</p>
            </div>
            <button onClick={() => !busy && onClose()} className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center"><X className="w-4 h-4 text-slate-500" /></button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
              disabled={busy}
              className="w-full border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/40 rounded-2xl p-6 text-center transition-colors disabled:opacity-60"
            >
              <Upload className="w-6 h-6 text-sky-500 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-700">{fileName || 'Elegí o arrastrá el Excel'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Hoja «Facturacion HUBSPOT» (una columna por entidad) + «Summary» con las tarifas.</p>
            </button>

            {busy && !parsed && <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Leyendo el Excel…</p>}
            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

            {parsed && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center"><p className="text-2xl font-black font-mono text-slate-800">{parsed.entities.length}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">entidades</p></div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center"><p className="text-2xl font-black font-mono text-slate-800">{money(lastTotal)}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">facturado en {last || '—'}</p></div>
                </div>
                <div className="space-y-2">
                  <DiffList icon={Plus} tone="border-emerald-200 bg-emerald-50 text-emerald-800" title="Entidades nuevas" items={d.added} render={(it) => <b>{it.key}</b>} />
                  <DiffList icon={RefreshCw} tone="border-sky-200 bg-sky-50 text-sky-800" title="Con cambios" items={d.updated}
                    render={(it) => <><b>{it.key}</b>{it.changedMonths.length ? ` · ${it.changedMonths.join(', ')}` : ''}{it.otherChanged ? ' · datos o usuarios' : ''}</>} />
                  <DiffList icon={Minus} tone="border-slate-200 bg-slate-50 text-slate-600" title="Sin cambios" items={d.unchanged} render={(it) => it.key} />
                  <DiffList icon={Trash2} tone="border-red-200 bg-red-50 text-red-700" title="Se borran del Hub (no están en el Excel)" items={d.removed} render={(k) => <b>{k}</b>} />
                </div>
                {parsed.warnings.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5 mb-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Para revisar en el Excel</p>
                    <ul className="space-y-1 text-xs text-amber-900 list-disc pl-4">{parsed.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onClick={onClose} disabled={busy} className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
            <button
              onClick={confirm}
              disabled={!parsed?.entities.length || busy}
              className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:shadow-lg disabled:opacity-40 flex items-center gap-2"
            >
              {busy && parsed ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Importar y reemplazar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

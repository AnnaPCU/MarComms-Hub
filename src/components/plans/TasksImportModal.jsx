// ════════════════════════════════════════════════════════════════════
// TasksImportModal — Importar las tareas desde el Excel de planes
// ════════════════════════════════════════════════════════════════════
// 1. Elegir el archivo (.xlsx) → se lee en el navegador
// 2. Cada pestaña de plan → a qué plan del Hub va (se sugiere por nombre:
//    "CU USA Organic" → "Control Union Estados Unidos Orgánico")
// 3. Modo: "Agregar las que faltan" (no duplica: mismo título + mes) o
//    "Reemplazar" (borra las tareas del plan y carga las del Excel)
// 4. Vista previa + avisos → Importar (todos lo ven al instante)
//
// Del Excel se toma solo la tabla "3) TAREAS"; "Fecha" y "Prioridad" no
// se traen y "Comentario" pasa a "Detalle".
//
// Props: plans, tasks (todas), teamNames, currentUser,
//        onImport({ toInsert, replacePlanIds }) (async), onDone(msg), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';

import ModalPortal from '@/components/shared/ModalPortal';
import { readExcelFile } from '@/utils/xlsxGrid';
import { parsePlanTasksWorkbook, suggestPlanForSheet, buildTaskImport } from '@/utils/planTasks';
import { todayIso as getTodayIso } from '@/utils/date';

const selectCls = 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300';
const MODES = [
  { id: 'add', label: 'Agregar las que faltan', hint: 'Suma las tareas que no están en el plan (mismo título y mes). No borra nada.' },
  { id: 'replace', label: 'Reemplazar', hint: 'Borra las tareas del plan y carga las del Excel. Los cambios hechos en el Hub se pierden.' },
];

export default function TasksImportModal({ plans, tasks, teamNames, currentUser, onImport, onDone, onClose }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null); // { sheets, warnings }
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState('add');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setError(''); setParsed(null); setFileName(file.name); setBusy(true);
    try {
      const book = await readExcelFile(file);
      const result = parsePlanTasksWorkbook(book, { todayIso: getTodayIso() });
      setParsed(result);
      setMapping(Object.fromEntries(result.sheets.map((s) => [s.sheet, suggestPlanForSheet(s.sheet, plans)])));
    } catch (e) {
      console.error('[TasksImport] no se pudo leer el Excel:', e);
      setError('No se pudo leer el archivo. Asegurate de que sea el Excel (.xlsx) de Seguimiento de Planes de Marketing.');
    } finally { setBusy(false); }
  };

  const plan = useMemo(() => (parsed ? buildTaskImport({
    sheets: parsed.sheets, mapping, existingTasks: tasks, mode, teamNames, createdBy: currentUser?.name || '',
  }) : null), [parsed, mapping, tasks, mode, teamNames, currentUser]);

  const planName = (id) => plans.find((p) => String(p.id) === String(id))?.name || '—';
  const totalDelete = plan ? plan.summary.reduce((n, s) => n + s.toDelete, 0) : 0;
  const canImport = !!plan && !busy && (plan.toInsert.length > 0 || plan.replacePlanIds.length > 0);

  const confirm = async () => {
    if (!canImport) return;
    setBusy(true); setError('');
    try {
      await onImport({ toInsert: plan.toInsert, replacePlanIds: plan.replacePlanIds });
      onDone(`Listo: ${plan.toInsert.length} ${plan.toInsert.length === 1 ? 'tarea importada' : 'tareas importadas'}${totalDelete ? ` (${totalDelete} reemplazadas)` : ''}.`);
    } catch (e) {
      console.error('[TasksImport] error al importar:', e);
      setError('No se pudo guardar la importación. Probá de nuevo; si sigue fallando, revisá la consola.');
      setBusy(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-3xl">
            <div>
              <h2 className="font-black text-slate-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Importar tareas del Excel</h2>
              <p className="text-[11px] font-bold text-slate-500">Se trae la tabla «3) TAREAS» de cada pestaña de plan (sin Fecha ni Prioridad).</p>
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
              className="w-full border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 rounded-2xl p-6 text-center transition-colors disabled:opacity-60"
            >
              <Upload className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-700">{fileName || 'Elegí o arrastrá el Excel'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">«Seguimiento Planes Marketing» (.xlsx)</p>
            </button>

            {busy && !parsed && <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Leyendo el Excel…</p>}
            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

            {parsed && parsed.sheets.length > 0 && (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pestaña del Excel → plan del Hub</p>
                  {parsed.sheets.map((s) => (
                    <div key={s.sheet} className="grid grid-cols-[1fr_1.4fr] gap-3 items-center">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{s.sheet}</p>
                        <p className="text-[10px] font-bold text-slate-400">{s.tasks.length} {s.tasks.length === 1 ? 'tarea' : 'tareas'}</p>
                      </div>
                      <select value={mapping[s.sheet] || ''} onChange={(e) => setMapping((m) => ({ ...m, [s.sheet]: e.target.value }))} className={selectCls}>
                        <option value="">No importar</option>
                        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400">¿Falta un plan? Crealo con «Nuevo plan» y volvé a abrir la importación.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODES.map((m) => (
                    <button key={m.id} type="button" onClick={() => setMode(m.id)} className={`text-left rounded-2xl border p-3 transition-all ${mode === m.id ? (m.id === 'replace' ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50') : 'border-slate-200 hover:bg-slate-50'}`}>
                      <p className={`text-xs font-black ${mode === m.id && m.id === 'replace' ? 'text-red-700' : 'text-slate-800'}`}>{m.label}</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-snug">{m.hint}</p>
                    </button>
                  ))}
                </div>

                {plan.summary.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
                    {plan.summary.map((s) => (
                      <div key={s.planId} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 truncate">{planName(s.planId)}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate">desde {s.sheets.join(', ')}</p>
                        </div>
                        <span className="font-mono font-black text-emerald-700 whitespace-nowrap">+{s.toAdd}</span>
                        {s.duplicates > 0 && <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{s.duplicates} ya estaban</span>}
                        {s.toDelete > 0 && <span className="text-[10px] font-black text-red-600 whitespace-nowrap">−{s.toDelete} se borran</span>}
                        {s.incoming === 0 && <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">sin tareas en el Excel</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-400">Elegí al menos un plan para importar.</p>
                )}
              </>
            )}

            {parsed && parsed.warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5 mb-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Para revisar en el Excel</p>
                <ul className="space-y-1 text-xs text-amber-900 list-disc pl-4">{parsed.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onClick={onClose} disabled={busy} className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
            <button
              onClick={confirm}
              disabled={!canImport}
              className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white hover:shadow-lg disabled:opacity-40 flex items-center gap-2 ${mode === 'replace' ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}
            >
              {busy && parsed ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {mode === 'replace' ? 'Reemplazar e importar' : `Importar ${plan ? plan.toInsert.length : 0} tareas`}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

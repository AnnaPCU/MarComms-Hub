// ════════════════════════════════════════════════════════════════════
// ProgramWizard — Crear un programa y generar sus pilares
// ════════════════════════════════════════════════════════════════════
// Dos pasos:
//   1. Datos del programa: nombre, cliente, país, unidad, objetivo, fechas
//   2. Pilares a generar: tildar cada uno; nombre opcional, fecha (webinar
//      y evento la necesitan) y presupuesto opcional (USD o cubierto por un plan).
// Al guardar llama onCreate(form) — App.jsx crea el programa y los pilares.
//
// Props: onCreate(form) (async), onClose(), currentUser
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Layers, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import BudgetInput from '@/components/shared/BudgetInput';
import { MARKETS, unitsForCountry } from '@/constants/markets';
import { PROGRAM_PILLARS as ALL_PROGRAM_PILLARS } from '@/constants/programs';
import { isPillarHidden } from '@/constants/sections';

const PROGRAM_PILLARS = ALL_PROGRAM_PILLARS.filter((p) => !isPillarHidden(p.id));
import { missingProgramFields, defaultPillarName } from '@/utils/programs';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function ProgramWizard({ onCreate, onClose }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', client: '', country: '', businessUnit: '', objective: '', startDate: '', endDate: '', notes: '',
    pillars: Object.fromEntries(PROGRAM_PILLARS.map((p) => [p.id, { enabled: false, name: '', date: '', budget: '', billing: 'usd', planId: null }])),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPillar = (id, patch) => setForm((f) => ({ ...f, pillars: { ...f.pillars, [id]: { ...f.pillars[id], ...patch } } }));

  const step1Ok = form.name.trim() && form.country && form.businessUnit;
  const missing = missingProgramFields(form);
  const enabledCount = Object.values(form.pillars).filter((p) => p.enabled).length;

  const submit = async () => {
    if (missing.length || saving) return;
    setSaving(true); setError('');
    try { await onCreate(form); }
    catch (_e) { setError('No se pudo crear el programa. Revisá la consola.'); setSaving(false); }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-violet-50 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><Layers className="w-4 h-4 text-violet-600" /> Nuevo programa</h2>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">Paso {step} de 2 · {step === 1 ? 'Datos del programa' : 'Qué pilares incluye'}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center" title="Cerrar"><X className="w-4 h-4 text-slate-500" /></button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            {step === 1 ? (
              <>
                <div className="space-y-1">
                  <label className={labelCls}>Nombre del programa *</label>
                  <input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: ISO 27001 España 2026" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={labelCls}>País *</label>
                    <select value={form.country} onChange={(e) => { set('country', e.target.value); set('businessUnit', ''); }} className={inputCls}>
                      <option value="">Seleccionar...</option>
                      {Object.keys(MARKETS).sort().map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Unidad de negocio *</label>
                    <select value={form.businessUnit} onChange={(e) => set('businessUnit', e.target.value)} disabled={!form.country} className={`${inputCls} disabled:opacity-50`}>
                      <option value="">Seleccionar...</option>
                      {form.country && unitsForCountry(form.country).map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Cliente</label>
                    <input value={form.client} onChange={(e) => set('client', e.target.value)} placeholder="Ej: Multi-cliente" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Objetivo</label>
                    <input value={form.objective} onChange={(e) => set('objective', e.target.value)} placeholder="Ej: Generar leads ISO 27001" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Inicio</label>
                    <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Fin</label>
                    <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Notas</label>
                  <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500">Tildá los pilares. Cada uno se crea como proyecto propio, ya cargado con país y unidad del programa.</p>
                {PROGRAM_PILLARS.map((p) => {
                  const cfg = form.pillars[p.id];
                  return (
                    <div key={p.id} className={`rounded-2xl border p-3 transition-all ${cfg.enabled ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200 bg-white'}`}>
                      <button onClick={() => setPillar(p.id, { enabled: !cfg.enabled })} className="w-full flex items-center gap-3 text-left">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${cfg.enabled ? 'bg-violet-600 text-white' : 'border-2 border-slate-300'}`}>{cfg.enabled && <Check className="w-3.5 h-3.5" />}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-black text-sm text-slate-800">{p.label}</span>
                          <span className="block text-[10px] font-medium text-slate-400 truncate">{p.hint}</span>
                        </span>
                      </button>
                      {cfg.enabled && (
                        <div className="mt-3 space-y-2">
                          <div className={`grid gap-2 ${p.needsDate ? 'grid-cols-[1fr_150px]' : 'grid-cols-1'}`}>
                            <input value={cfg.name} onChange={(e) => setPillar(p.id, { name: e.target.value })} placeholder={defaultPillarName(form.name, p.id)} className={`${inputCls} py-2 text-xs`} />
                            {p.needsDate && <input type="date" value={cfg.date} onChange={(e) => setPillar(p.id, { date: e.target.value })} className={`${inputCls} py-2 text-xs`} title="Fecha (obligatoria)" />}
                          </div>
                          <BudgetInput
                            label="Presupuesto (opcional)"
                            accent="violet"
                            size="sm"
                            amount={cfg.budget}
                            billing={cfg.billing}
                            planId={cfg.planId}
                            onAmount={(v) => setPillar(p.id, { budget: v })}
                            onBillingChange={(patch) => setPillar(p.id, patch)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 px-3 py-2 rounded-xl"><ArrowLeft className="w-3.5 h-3.5" /> Atrás</button>
            )}
            <div className="flex-1 text-[10px] font-bold text-slate-400">
              {step === 2 && (missing.length ? `Falta: ${missing.join(', ')}` : `${enabledCount} pilar${enabledCount === 1 ? '' : 'es'} a crear`)}
            </div>
            <button onClick={onClose} className="text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 px-3 py-2 rounded-xl">Cancelar</button>
            {step === 1 ? (
              <button onClick={() => setStep(2)} disabled={!step1Ok} className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 px-4 py-2 rounded-xl shadow-sm">Siguiente <ArrowRight className="w-3.5 h-3.5" /></button>
            ) : (
              <button onClick={submit} disabled={missing.length > 0 || saving} className="text-[11px] font-black uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 px-4 py-2 rounded-xl shadow-sm">{saving ? 'Creando…' : 'Crear programa y pilares'}</button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

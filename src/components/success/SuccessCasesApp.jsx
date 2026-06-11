// ════════════════════════════════════════════════════════════════════
// SuccessCasesApp — Casos de Éxito
// ════════════════════════════════════════════════════════════════════
// Lista de casos guardados + wizard guiado para armar uno nuevo.
// Cada caso se puede descargar como PDF y eliminar.
// Persiste en Supabase (tabla success_cases) vía useSuccessCases.
//
// Props:
//   onBack, currentUser
//   cases, loading, error, createCase, removeCase  (del hook useSuccessCases)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  ArrowLeft, Award, Building2, ChevronLeft, ChevronRight, Download,
  Globe, Pencil, Plus, Sparkles, Trash2, Trophy, User, X,
} from 'lucide-react';

import { MARKETS } from '@/constants/markets';
import { generateSuccessCasePDF } from '@/utils/successCasePdf';
import { useConfirm } from '@/hooks/useConfirm';

const SERVICE_OPTIONS = [
  { value: 'webinar',  label: 'Webinar' },
  { value: 'campaign', label: 'Campaña' },
  { value: 'event',    label: 'Evento' },
  { value: 'content',  label: 'Content / Diseño' },
  { value: 'otro',     label: 'Otro' },
];

const EMPTY = {
  title: '', client: '', country: '', businessUnit: '', serviceType: '',
  challenge: '', solution: '', results: '', metrics: '', testimonial: '',
};

// Pasos del wizard
const STEPS = [
  {
    id: 'basics',
    title: 'Datos del caso',
    subtitle: '¿De quién y de qué servicio hablamos?',
  },
  {
    id: 'challenge',
    title: 'La situación inicial',
    subtitle: '¿Qué desafío o necesidad tenía el cliente?',
  },
  {
    id: 'solution',
    title: 'La solución',
    subtitle: '¿Qué hizo Marcomms para resolverlo?',
  },
  {
    id: 'results',
    title: 'Los resultados',
    subtitle: '¿Qué se logró? Números concretos si los hay.',
  },
  {
    id: 'testimonial',
    title: 'Testimonio (opcional)',
    subtitle: 'Una frase del cliente le da fuerza al caso.',
  },
  {
    id: 'review',
    title: 'Revisión final',
    subtitle: 'Revisá antes de guardar y descargar.',
  },
];

export default function SuccessCasesApp({ onBack, currentUser, cases, loading, error, createCase, updateCase, removeCase }) {
  const confirm = useConfirm();
  const [mode, setMode] = useState('list'); // 'list' | 'wizard'
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creando, id = editando

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startWizard = () => { setForm(EMPTY); setStep(0); setEditingId(null); setMode('wizard'); };
  const startEdit = (sc) => {
    setForm({
      title: sc.title || '', client: sc.client || '', country: sc.country || '',
      businessUnit: sc.businessUnit || '', serviceType: sc.serviceType || '',
      challenge: sc.challenge || '', solution: sc.solution || '',
      results: sc.results || '', metrics: sc.metrics || '', testimonial: sc.testimonial || '',
    });
    setStep(0);
    setEditingId(sc.id);
    setMode('wizard');
  };
  const cancelWizard = () => { setMode('list'); setForm(EMPTY); setStep(0); setEditingId(null); };

  // Validación mínima por paso
  const canAdvance = () => {
    if (STEPS[step].id === 'basics') return form.title.trim() && form.client.trim();
    return true;
  };

  const saveAndDownload = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, author: currentUser?.name || '' };

    // 1) Generar y descargar el PDF SIEMPRE — es client-side (jsPDF),
    //    no depende de Supabase. Así el PDF sale aunque el guardado falle.
    try {
      await generateSuccessCasePDF(payload);
    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('No se pudo generar el PDF. Revisá la consola.');
      setSaving(false);
      return;
    }

    // 2) Guardar en Supabase: update si estamos editando, create si es nuevo
    try {
      if (editingId) await updateCase(editingId, payload);
      else await createCase(payload);
    } catch (e) {
      console.error('Error guardando caso de éxito en Supabase:', e);
      alert('El PDF se descargó correctamente, pero el caso no se pudo guardar en la base.\n\nProbablemente falta correr la migration 0007_success_cases.sql en Supabase.');
    } finally {
      setSaving(false);
      cancelWizard();
    }
  };

  const onDelete = async (sc) => {
    const ok = await confirm({
      title: '¿Eliminar caso de éxito?',
      message: `Vas a eliminar "${sc.title}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    try { await removeCase(sc.id); } catch (e) { console.error(e); }
  };

  const inputCls = 'w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400 transition-all';
  const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';
  const taCls = inputCls + ' min-h-[110px] resize-y';

  // ════════════════════════════════════════════════════════════════
  // RENDER: lista
  // ════════════════════════════════════════════════════════════════
  if (mode === 'list') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col w-full">
        <header className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white p-6 sticky top-0 z-30 shadow-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white text-amber-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> CASOS DE ÉXITO
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">Casos de Éxito</h1>
                  <p className="text-[10px] text-amber-100 font-bold uppercase tracking-widest">
                    {cases.length} {cases.length === 1 ? 'caso armado' : 'casos armados'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={startWizard}
              className="bg-white text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Nuevo caso
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto w-full p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-xl mb-4 text-center">
              ⚠️ No se pudieron cargar los casos. Revisá la consola.
            </div>
          )}
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-sm">Cargando…</div>
          ) : cases.length === 0 ? (
            <div className="bg-amber-50/40 border-2 border-dashed border-amber-200 rounded-3xl p-12 text-center mt-6">
              <Trophy className="w-12 h-12 text-amber-300 mx-auto mb-4" />
              <p className="text-sm font-black text-amber-700 uppercase tracking-widest mb-1">Todavía no hay casos de éxito</p>
              <p className="text-[11px] text-amber-600 font-medium mb-5">Armá el primero respondiendo unas preguntas guiadas.</p>
              <button
                onClick={startWizard}
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest inline-flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Armar caso de éxito
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {cases.map((sc) => (
                <div key={sc.id} className="bg-white rounded-2xl p-5 border-2 border-amber-100 hover:border-amber-300 hover:shadow-lg transition-all relative group">
                  <button
                    onClick={() => onDelete(sc)}
                    title="Eliminar caso"
                    className="absolute top-3 right-3 w-8 h-8 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center border border-red-100 hover:border-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-3">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-black text-slate-800 text-sm uppercase leading-tight mb-1 pr-8">{sc.title}</h3>
                  {sc.client && <p className="text-[11px] font-bold text-slate-500 mb-1">{sc.client}</p>}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {[sc.country, sc.businessUnit].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {sc.results && <p className="text-[11px] text-slate-600 line-clamp-3 mb-3">{sc.results}</p>}
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => startEdit(sc)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg py-2 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => generateSuccessCasePDF(sc)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg py-2 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER: wizard
  // ════════════════════════════════════════════════════════════════
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={cancelWizard} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">{editingId ? 'Editar caso de éxito' : 'Nuevo caso de éxito'}</h1>
              <p className="text-[10px] text-amber-100 font-bold uppercase tracking-widest">
                Paso {step + 1} de {STEPS.length} · {current.title}
              </p>
            </div>
          </div>
          <Sparkles className="w-6 h-6 text-white/70" />
        </div>
        {/* Progreso */}
        <div className="max-w-3xl mx-auto mt-4 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full p-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{current.title}</h2>
          <p className="text-sm text-slate-500 font-medium mb-6">{current.subtitle}</p>

          {/* Paso: básicos */}
          {current.id === 'basics' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Título del caso *</label>
                <input className={inputCls} placeholder="Ej: Webinar ISO 9001 — récord de leads"
                  value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Cliente / Empresa *</label>
                <input className={inputCls} placeholder="Ej: Control Union España"
                  value={form.client} onChange={(e) => set('client', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>País</label>
                  <select className={inputCls} value={form.country}
                    onChange={(e) => set('country', e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {Object.keys(MARKETS).sort().map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Unidad de negocio</label>
                  <select className={inputCls} value={form.businessUnit}
                    onChange={(e) => set('businessUnit', e.target.value)}>
                    <option value="">Seleccionar…</option>
                    <option value="Control Union">Control Union</option>
                    <option value="Peterson Solutions">Peterson Solutions</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Servicio relacionado</label>
                <select className={inputCls} value={form.serviceType}
                  onChange={(e) => set('serviceType', e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {SERVICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {current.id === 'challenge' && (
            <div>
              <label className={labelCls}>Situación / desafío inicial</label>
              <textarea className={taCls} placeholder="¿Qué necesidad, problema u oportunidad existía antes de la acción de Marcomms?"
                value={form.challenge} onChange={(e) => set('challenge', e.target.value)} />
            </div>
          )}

          {current.id === 'solution' && (
            <div>
              <label className={labelCls}>Solución aplicada</label>
              <textarea className={taCls} placeholder="¿Qué hizo el equipo? Estrategia, piezas, canales, etc."
                value={form.solution} onChange={(e) => set('solution', e.target.value)} />
            </div>
          )}

          {current.id === 'results' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Resultados</label>
                <textarea className={taCls} placeholder="¿Qué se logró? Contalo en prosa."
                  value={form.results} onChange={(e) => set('results', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Métricas clave</label>
                <input className={inputCls} placeholder="Ej: 320 inscriptos · 45 leads · 8 deals · 22% open rate"
                  value={form.metrics} onChange={(e) => set('metrics', e.target.value)} />
              </div>
            </div>
          )}

          {current.id === 'testimonial' && (
            <div>
              <label className={labelCls}>Testimonio del cliente (opcional)</label>
              <textarea className={taCls} placeholder="“El equipo de Marcomms superó nuestras expectativas…”"
                value={form.testimonial} onChange={(e) => set('testimonial', e.target.value)} />
            </div>
          )}

          {current.id === 'review' && (
            <div className="space-y-3">
              {[
                ['Título', form.title],
                ['Cliente', form.client],
                ['País', form.country],
                ['Unidad', form.businessUnit],
                ['Servicio', (SERVICE_OPTIONS.find(o => o.value === form.serviceType) || {}).label],
                ['Desafío', form.challenge],
                ['Solución', form.solution],
                ['Resultados', form.results],
                ['Métricas', form.metrics],
                ['Testimonio', form.testimonial],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex gap-3 border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest w-28 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-slate-700 font-medium">{value}</span>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 font-medium pt-2">
                Al guardar se crea el caso y se descarga el PDF automáticamente.
              </p>
            </div>
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => (step === 0 ? cancelWizard() : setStep((s) => s - 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancelar' : 'Atrás'}
            </button>
            {isLast ? (
              <button
                onClick={saveAndDownload}
                disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-all shadow-md"
              >
                <Download className="w-4 h-4" /> {saving ? 'Guardando…' : (editingId ? 'Guardar cambios y descargar PDF' : 'Guardar y descargar PDF')}
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-all shadow-md"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

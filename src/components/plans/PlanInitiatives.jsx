// ════════════════════════════════════════════════════════════════════
// PlanInitiatives — Iniciativas de un plan (vista interna)
// ════════════════════════════════════════════════════════════════════
// Entre las tareas y los pilares que cubre el plan. Como en el reporte:
// una tabla por tipo (# · Iniciativa · Detalle), con los colores de la
// marca. Se editan como las tareas: clic en una fila → editor; «Agregar
// iniciativa» al pie de cada tipo carga directo (Enter guarda, Esc
// cancela); «Nueva iniciativa» abre el editor con el tipo libre.
// No van por mes: son las que están en definición o en marcha.
//
// Props: plan, initiatives (las del plan), c, navy, currentUser, missing,
//   createInitiative / updateInitiative / removeInitiative
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, Lightbulb, Plus, X } from 'lucide-react';
import { DEFAULT_INITIATIVE_CATEGORY } from '@/constants/planKpis';
import { initiativeCategories, initiativeGroups } from '@/utils/planKpis';
import { InitiativesTables, ReportSectionTitle } from './PlanReportBlocks';
import InitiativeEditor from './InitiativeEditor';

export default function PlanInitiatives({ plan, initiatives, c, navy, currentUser, missing = false, createInitiative, updateInitiative, removeInitiative }) {
  const [editor, setEditor] = useState(null); // { initiative } | { defaults }
  const [quick, setQuick] = useState(null);   // { key, category, title, saving }
  const [flashError, setFlashError] = useState('');
  const groups = initiativeGroups(initiatives);
  const categories = initiativeCategories(initiatives, [DEFAULT_INITIATIVE_CATEGORY]);
  const nextPosition = initiatives.reduce((m, i) => Math.max(m, (i.position ?? 0) + 1), 0);
  const showError = (msg) => { setFlashError(msg); setTimeout(() => setFlashError(''), 6000); };

  const saveQuick = async () => {
    if (!quick || !quick.title.trim() || quick.saving) return;
    setQuick({ ...quick, saving: true });
    try {
      await createInitiative({ planId: plan.id, category: quick.category, title: quick.title.trim(), position: nextPosition, createdBy: currentUser?.name || '' });
      setQuick({ ...quick, title: '', saving: false }); // queda abierto para cargar otra
    } catch (_e) {
      setQuick({ ...quick, saving: false });
      showError('No se pudo agregar la iniciativa. Probá de nuevo.');
    }
  };

  const saveEditor = async (data) => {
    if (editor.initiative) { if (Object.keys(data).length) await updateInitiative(editor.initiative.id, data); }
    else await createInitiative({ ...data, planId: plan.id, position: nextPosition, createdBy: currentUser?.name || '' });
    setEditor(null);
  };

  const footer = (g) => (
    <div className="border-t border-slate-100 px-4 py-2">
      {quick && quick.key === g.key ? (
        <div className="flex items-center gap-1.5 max-w-xl">
          <input
            autoFocus
            value={quick.title}
            onChange={(e) => setQuick({ ...quick, title: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') saveQuick(); if (e.key === 'Escape') setQuick(null); }}
            placeholder={`Nueva iniciativa${g.label ? ` en ${g.label}` : ''}…`}
            className="flex-1 text-xs font-bold text-slate-800 bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button onClick={saveQuick} disabled={!quick.title.trim() || quick.saving} className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40" title="Guardar (Enter)"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setQuick(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center" title="Cancelar (Esc)"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <button onClick={() => setQuick({ key: g.key, category: g.label, title: '', saving: false })} className="text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-emerald-700 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Agregar iniciativa
        </button>
      )}
    </div>
  );

  return (
    <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <ReportSectionTitle title="Iniciativas" aside="En definición o en marcha" c={c}>
        {!missing && (
          <button onClick={() => setEditor({ defaults: { category: groups[0]?.label || DEFAULT_INITIATIVE_CATEGORY } })} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Nueva iniciativa
          </button>
        )}
      </ReportSectionTitle>

      {flashError && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-xs font-bold">{flashError}</div>}

      {missing ? (
        <p className="text-[11px] font-bold text-amber-800">Las iniciativas todavía no están activadas en la base (falta la migración 0038 en Supabase).</p>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
          <Lightbulb className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-[11px] font-bold text-slate-400">Este plan todavía no tiene iniciativas. Cargá la primera con «Nueva iniciativa»: si no hay ninguna, el link externo no muestra la sección.</p>
        </div>
      ) : (
        <>
          <InitiativesTables groups={groups} c={c} navy={navy} onRowClick={(it) => setEditor({ initiative: it })} footer={footer} />
          <p className="mt-2 px-1 text-[10px] font-bold text-slate-400">Clic en una iniciativa para editarla (tipo, nombre, detalle) o eliminarla.</p>
        </>
      )}

      {editor && (
        <InitiativeEditor
          initiative={editor.initiative || null}
          plan={plan}
          defaults={editor.defaults}
          categories={categories}
          onSave={saveEditor}
          onDelete={editor.initiative ? async () => {
            try { await removeInitiative(editor.initiative.id); setEditor(null); }
            catch (_e) { showError('No se pudo eliminar la iniciativa. Probá de nuevo.'); }
          } : null}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}

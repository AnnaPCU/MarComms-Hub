// ════════════════════════════════════════════════════════════════════
// CrmNextSteps — Próximos steps de una entidad (Weekly check)
// ════════════════════════════════════════════════════════════════════
// Igual que las iniciativas de los planes: una tabla por tipo (# · Próximo
// step · Detalle). Clic en una fila → editor; «Agregar step» al pie de
// cada tabla carga directo (Enter guarda, Esc cancela); «Nuevo step»
// abre el editor.
//
// Props: entity, steps (los de la entidad), c, navy, currentUser,
//   createStep / updateStep / removeStep
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, ListTodo, Plus, X } from 'lucide-react';
import { initiativeCategories, initiativeGroups } from '@/utils/planKpis';
import { InitiativesTables, ReportSectionTitle } from '@/components/plans/PlanReportBlocks';
import NextStepEditor from './NextStepEditor';

export default function CrmNextSteps({ entity, steps, c, navy, currentUser, createStep, updateStep, removeStep }) {
  const [editor, setEditor] = useState(null); // { step } | { defaults }
  const [quick, setQuick] = useState(null);   // { key, category, title, saving }
  const [flashError, setFlashError] = useState('');
  const groups = initiativeGroups(steps);
  const categories = initiativeCategories(steps);
  const nextPosition = steps.reduce((m, s) => Math.max(m, (s.position ?? 0) + 1), 0);
  const showError = (msg) => { setFlashError(msg); setTimeout(() => setFlashError(''), 6000); };
  const by = currentUser?.name || '';

  const saveQuick = async () => {
    if (!quick || !quick.title.trim() || quick.saving) return;
    setQuick({ ...quick, saving: true });
    try {
      await createStep({ entityCode: entity.code, category: quick.category, title: quick.title.trim(), position: nextPosition, createdBy: by });
      setQuick({ ...quick, title: '', saving: false }); // queda abierto para cargar otro
    } catch (_e) {
      setQuick({ ...quick, saving: false });
      showError('No se pudo agregar el step. Probá de nuevo.');
    }
  };

  const saveEditor = async (data) => {
    if (editor.step) { if (Object.keys(data).length) await updateStep(editor.step.id, data); }
    else await createStep({ ...data, entityCode: entity.code, position: nextPosition, createdBy: by });
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
            placeholder={`Nuevo step${g.label ? ` en ${g.label}` : ''}…`}
            className="flex-1 text-xs font-bold text-slate-800 bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button onClick={saveQuick} disabled={!quick.title.trim() || quick.saving} className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center disabled:opacity-40" title="Guardar (Enter)"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setQuick(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center" title="Cancelar (Esc)"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <button onClick={() => setQuick({ key: g.key, category: g.label, title: '', saving: false })} className="text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-sky-700 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Agregar step
        </button>
      )}
    </div>
  );

  return (
    <section>
      <ReportSectionTitle title="Próximos steps" aside="Lo que sigue en esta entidad" c={c}>
        <button onClick={() => setEditor({ defaults: { category: groups[0]?.label || '' } })} className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Nuevo step
        </button>
      </ReportSectionTitle>

      {flashError && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-xs font-bold">{flashError}</div>}

      {groups.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
          <ListTodo className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-[11px] font-bold text-slate-400">Todavía no hay próximos steps para esta entidad. Cargá el primero con «Nuevo step».</p>
        </div>
      ) : (
        <>
          <InitiativesTables
            groups={groups}
            c={c}
            navy={navy}
            titleLabel="Próximo step"
            otherLabel="Otros steps"
            rowHint="Clic para editar el step"
            onRowClick={(s) => setEditor({ step: s })}
            footer={footer}
          />
          <p className="mt-2 px-1 text-[10px] font-bold text-slate-400">Clic en un step para editarlo (tipo, nombre, detalle) o eliminarlo.</p>
        </>
      )}

      {editor && (
        <NextStepEditor
          step={editor.step || null}
          entity={entity}
          defaults={editor.defaults}
          categories={categories}
          onSave={saveEditor}
          onDelete={editor.step ? async () => {
            try { await removeStep(editor.step.id); setEditor(null); }
            catch (_e) { showError('No se pudo eliminar el step. Probá de nuevo.'); }
          } : null}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}

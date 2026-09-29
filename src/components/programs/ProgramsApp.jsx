// ════════════════════════════════════════════════════════════════════
// ProgramsApp — Programas: campañas integrales que agrupan pilares
// ════════════════════════════════════════════════════════════════════
// Lista de programas (filtros por país, unidad y estado) y detalle con
// sus pilares, progreso, link al pilar y al Portal Cliente del país.
//
// Props:
//   programs (usePrograms), webinars, campaigns, events
//   onBack, onNew()                  — abrir el wizard (vive en App.jsx)
//   onOpenProject(section, id)       — navegar al pilar (navigateToProject)
//   onOpenPortal(country, unit)      — abrir el dashboard del Portal Cliente
//   focusProgramId, onFocusHandled   — abrir un programa al entrar
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Calendar, ExternalLink, Layers, Pencil, Plus, Target, User } from 'lucide-react';
import { PROGRAM_STATUS } from '@/constants/programs';
import { programItems, programSummary } from '@/utils/programs';
import { formatDate } from '@/utils/date';
import ProgramCard from './ProgramCard';
import ProgramPillarsList from './ProgramPillarsList';
import ProgramEditor from './ProgramEditor';

const sel = 'bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-violet-300';

export default function ProgramsApp({ programs, webinars, campaigns, events, onBack, onNew, onOpenProject, onOpenPortal, focusProgramId, onFocusHandled }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [country, setCountry] = useState('all');
  const [unit, setUnit] = useState('all');
  const [status, setStatus] = useState('all');

  const list = programs.programs || [];
  const data = { webinars, campaigns, events };
  const enriched = useMemo(() => list.map((p) => { const items = programItems(p, data); return { program: p, items, summary: programSummary(items) }; }), [list, webinars, campaigns, events]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focusProgramId) { setSelectedId(focusProgramId); onFocusHandled && onFocusHandled(); }
  }, [focusProgramId, onFocusHandled]);

  const countries = [...new Set(list.map((p) => p.country).filter(Boolean))].sort();
  const units = [...new Set(list.map((p) => p.businessUnit).filter(Boolean))].sort();
  const rows = enriched.filter(({ program, summary }) =>
    (country === 'all' || program.country === country) && (unit === 'all' || program.businessUnit === unit) && (status === 'all' || summary.status === status));
  const selected = enriched.find((e) => e.program.id === selectedId) || null;

  const sectionFor = () => 'campaigns'; // todos los pilares viven en la sección Pilares

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={selected ? () => setSelectedId(null) : onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Volver"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-white text-violet-700 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> PROGRAMAS</div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black uppercase tracking-tight truncate">{selected ? selected.program.name : 'Programas'}</h1>
              <p className="text-[10px] text-violet-100 font-bold uppercase tracking-widest">{selected ? `${selected.program.country || '—'} · ${selected.program.businessUnit || '—'}` : 'Una campaña integral que agrupa varios pilares'}</p>
            </div>
          </div>
          {!selected && (
            <button onClick={onNew} className="flex items-center gap-1.5 bg-white text-violet-700 hover:bg-violet-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md"><Plus className="w-3.5 h-3.5" /> Nuevo programa</button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full p-6 space-y-4">
        {selected ? (
          <ProgramDetail
            program={selected.program} items={selected.items} summary={selected.summary}
            onEdit={() => setEditing(true)}
            onOpenItem={(it) => onOpenProject && onOpenProject(sectionFor(it), it.id)}
            onOpenPortal={() => onOpenPortal && onOpenPortal(selected.program.country, selected.program.businessUnit)}
          />
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={sel}><option value="all">Todos los países</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={sel}><option value="all">Todas las unidades</option>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel}><option value="all">Todos los estados</option>{Object.values(PROGRAM_STATUS).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto">{rows.length} de {list.length}</span>
            </div>
            {programs.loading && list.length === 0 ? (
              <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest py-10">Cargando…</p>
            ) : rows.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-black text-slate-700">Todavía no hay programas{list.length ? ' con estos filtros' : ''}.</p>
                <p className="text-xs text-slate-400 mt-1">Un programa agrupa webinar, evento, email, paid, BBDD e investigación bajo un mismo objetivo.</p>
                {!list.length && <button onClick={onNew} className="mt-4 inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"><Plus className="w-3.5 h-3.5" /> Crear el primero</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {rows.map(({ program, items, summary }) => <ProgramCard key={program.id} program={program} items={items} summary={summary} onOpen={() => setSelectedId(program.id)} />)}
              </div>
            )}
          </>
        )}
      </div>

      {editing && selected && (
        <ProgramEditor
          program={selected.program}
          onSave={async (patch) => { await programs.updateProgram(selected.program.id, patch); setEditing(false); }}
          onDelete={async () => { await programs.removeProgram(selected.program.id); setEditing(false); setSelectedId(null); }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── Detalle de un programa ──
function ProgramDetail({ program, items, summary, onEdit, onOpenItem, onOpenPortal }) {
  const st = PROGRAM_STATUS[summary.status] || PROGRAM_STATUS.planned;
  const facts = [
    { icon: User,      label: 'Cliente',  value: program.client },
    { icon: Target,    label: 'Objetivo', value: program.objective },
    { icon: Calendar,  label: 'Período',  value: [program.startDate && formatDate(program.startDate), program.endDate && formatDate(program.endDate)].filter(Boolean).join(' → ') },
    { icon: Building2, label: 'Unidad',   value: program.businessUnit },
  ].filter((f) => f.value);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilares del programa · {summary.completed}/{summary.total} listos</p>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${st.color}`}>{st.label}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4"><div className={`h-full rounded-full ${summary.progress === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${summary.progress}%` }} /></div>
          <ProgramPillarsList items={items} onOpen={onOpenItem} />
          <p className="text-[10px] text-slate-400 mt-3">Clic en un pilar para abrirlo en Pilares y trabajar sus tareas.</p>
        </div>
      </div>
      <aside className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          {facts.length === 0 && <p className="text-[11px] text-slate-400 italic">Sin cliente, objetivo ni fechas cargados.</p>}
          {facts.map((f) => { const Icon = f.icon; return (
            <div key={f.label} className="flex items-start gap-2">
              <Icon className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
              <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{f.label}</p><p className="text-xs font-bold text-slate-800 break-words">{f.value}</p></div>
            </div>
          ); })}
          {program.notes && <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{program.notes}</p>}
          <button onClick={onEdit} className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl"><Pencil className="w-3.5 h-3.5" /> Editar programa</button>
        </div>
        {program.country && (
          <button onClick={onOpenPortal} className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-teal-600 hover:bg-teal-700 px-3 py-2.5 rounded-xl shadow-sm"><ExternalLink className="w-3.5 h-3.5" /> Ver en Portal Cliente · {program.country}</button>
        )}
      </aside>
    </div>
  );
}

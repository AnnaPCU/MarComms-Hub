// ════════════════════════════════════════════════════════════════════
// EventsApp — Módulo de Eventos
// ════════════════════════════════════════════════════════════════════
// 5 fases (setup, diseño, difusión, in_event, post_event).
// CustomTasks por fase. RemovedDefaults. Participants para LinkedIn.
// UTM Builder embebido (accent orange).
//
// Props:
//   onBack — volver al hub
//   events / setEvents — array global
//   campaigns — para linkear tareas a campañas de email
// ════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, BarChart3, Calendar, CheckCircle2, ChevronRight,
  Clock, DollarSign, ExternalLink, FileText, Mail, Plus, Send,
  Settings, Share2, Sparkles, Target, Trash2, User, X,
} from 'lucide-react';

import { calcEventProgress } from '@/utils/progress';
import { makeEvent, recalcEventDates } from '@/utils/events';
import { MARKETS } from '@/constants/markets';
import { SERVICE_OWNERS } from '@/constants/team';
import { EVENT_PHASES } from '@/constants/events';

import OwnerPicker from '@/components/shared/OwnerPicker';
import ProjectLinks from '@/components/shared/ProjectLinks';
import MarcommsUtmBuilder from '@/components/shared/MarcommsUtmBuilder';
import QuotationBadge from '@/components/shared/QuotationBadge';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';

export default function EventsApp({ onBack, events, setEvents, campaigns, focusProjectId, onFocusHandled, embedded = false }) {
  const confirm = useConfirm();
  const [activeEvent, setActiveEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newEvent, setNewEvent] = useState({ name: "", date: "", country: "", businessUnit: "", client: "", fee: "" });
  const [newCustomTask, setNewCustomTask] = useState({});
  const [newParticipant, setNewParticipant] = useState({});

  // ─── Sync activeEvent con cambios externos al array events ───
  useEffect(() => {
    if (activeEvent) {
      const fresh = events.find(ev => ev.id === activeEvent.id);
      if (fresh && fresh !== activeEvent) setActiveEvent(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // ─── Deep-link: abrir el detalle de un evento al venir desde Mi Semana ───
  useEffect(() => {
    if (!focusProjectId) return;
    const ev = events.find(x => String(x.id) === String(focusProjectId));
    if (ev) setActiveEvent(ev);
    if (onFocusHandled) onFocusHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusProjectId]);

  // ─── Auto-marca completedAt cuando el evento llega al 100% ───
  useEffect(() => {
    let needsUpdate = false;
    const updated = events.map(ev => {
      const p = calcEventProgress(ev);
      if (p === 100 && !ev.completedAt) {
        needsUpdate = true;
        return { ...ev, completedAt: new Date().toISOString() };
      }
      if (p < 100 && ev.completedAt) {
        needsUpdate = true;
        const { completedAt, ...rest } = ev;
        return rest;
      }
      return ev;
    });
    if (needsUpdate) setEvents(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const phaseColorMap = {
    blue:    { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200",    chip: "bg-blue-100 text-blue-700",       bar: "bg-blue-500" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-200",  chip: "bg-indigo-100 text-indigo-700",   bar: "bg-indigo-500" },
    purple:  { bg: "bg-purple-50",  text: "text-purple-600",  border: "border-purple-200",  chip: "bg-purple-100 text-purple-700",   bar: "bg-purple-500" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200",   chip: "bg-amber-100 text-amber-700",     bar: "bg-amber-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", chip: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" }
  };

  const getPhaseIcon = (iconName) => {
    const map = { Settings, FileText, Share2: Send, Target, BarChart3 };
    return map[iconName] || Settings;
  };

  const createEvent = () => {
    if (!newEvent.name || !newEvent.date) return;
    const ev = makeEvent(newEvent.name, newEvent.date, newEvent.country, newEvent.businessUnit, newEvent.client, newEvent.fee);
    setEvents([ev, ...events]);
    setNewEvent({ name: "", date: "", country: "", businessUnit: "", client: "", fee: "" });
    setShowCreateModal(false);
  };

  const updateEvent = (id, field, value) => {
    setEvents(events.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, [field]: value };
      if (field === "date") updated.tasks = recalcEventDates(value, e.tasks, e.removedDefaults || []);
      if (activeEvent && activeEvent.id === id) setActiveEvent(updated);
      return updated;
    }));
  };

  const updateTaskField = async (eventId, taskId, field, value) => {
    if (field === 'done' && value === true) {
      const ok = await confirm({
        title: '¿Tarea concretada?',
        message: 'Vas a marcar esta tarea del evento como completada. ¿Confirmás que ya está hecha?',
        confirmText: 'Sí, completar', cancelText: 'Todavía no', tone: 'success',
      });
      if (!ok) return;
    }
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const updated = {
        ...e,
        tasks: { ...e.tasks, [taskId]: { ...(e.tasks[taskId] || {}), [field]: value } }
      };
      if (activeEvent && activeEvent.id === eventId) setActiveEvent(updated);
      return updated;
    }));
  };

  const updateCustomTaskField = async (eventId, taskIdx, field, value) => {
    if (field === 'done' && value === true) {
      const ok = await confirm({
        title: '¿Tarea concretada?',
        message: 'Vas a marcar esta tarea del evento como completada. ¿Confirmás que ya está hecha?',
        confirmText: 'Sí, completar', cancelText: 'Todavía no', tone: 'success',
      });
      if (!ok) return;
    }
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const updated = {
        ...e,
        customTasks: e.customTasks.map((t, i) => i === taskIdx ? { ...t, [field]: value } : t)
      };
      if (activeEvent && activeEvent.id === eventId) setActiveEvent(updated);
      return updated;
    }));
  };

  const addCustomTask = (eventId, phaseId) => {
    const label = (newCustomTask[`${eventId}_${phaseId}`] || "").trim();
    if (!label) return;
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const newT = { id: `custom_${Date.now()}`, label, phaseId, done: false, owner: "", date: "", isCustom: true };
      const updated = { ...e, customTasks: [...(e.customTasks || []), newT] };
      if (activeEvent && activeEvent.id === eventId) setActiveEvent(updated);
      return updated;
    }));
    setNewCustomTask({ ...newCustomTask, [`${eventId}_${phaseId}`]: "" });
  };

  const removeCustomTask = async (eventId, taskId) => {
    const ok = await confirm({
      title: '¿Eliminar tarea?',
      message: 'Vas a eliminar esta tarea personalizada del evento. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const updated = { ...e, customTasks: (e.customTasks || []).filter(t => t.id !== taskId) };
      if (activeEvent && activeEvent.id === eventId) setActiveEvent(updated);
      return updated;
    }));
  };

  const removeDefaultTask = async (eventId, taskId) => {
    const ok = await confirm({
      title: '¿Eliminar tarea del workflow?',
      message: 'Vas a quitar esta tarea estándar del evento. Podés re-agregarla manualmente después si la necesitás.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const newTasks = { ...e.tasks };
      delete newTasks[taskId];
      const updated = {
        ...e,
        tasks: newTasks,
        removedDefaults: [...(e.removedDefaults || []), taskId]
      };
      if (activeEvent && activeEvent.id === eventId) setActiveEvent(updated);
      return updated;
    }));
  };

  const addParticipant = (eventId, taskId) => {
    const name = (newParticipant[`${eventId}_${taskId}`] || "").trim();
    if (!name) return;
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const task = e.tasks[taskId] || {};
      const participants = [...(task.participants || []), { id: Date.now(), name }];
      const updated = {
        ...e,
        tasks: { ...e.tasks, [taskId]: { ...task, participants } }
      };
      if (activeEvent && activeEvent.id === eventId) setActiveEvent(updated);
      return updated;
    }));
    setNewParticipant({ ...newParticipant, [`${eventId}_${taskId}`]: "" });
  };

  const removeParticipant = async (eventId, taskId, participantId) => {
    const ok = await confirm({
      title: '¿Quitar participante?',
      message: 'Vas a remover este participante de la tarea.',
      confirmText: 'Quitar', tone: 'danger',
    });
    if (!ok) return;
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const task = e.tasks[taskId] || {};
      const participants = (task.participants || []).filter(p => p.id !== participantId);
      const updated = {
        ...e,
        tasks: { ...e.tasks, [taskId]: { ...task, participants } }
      };
      if (activeEvent && activeEvent.id === eventId) setActiveEvent(updated);
      return updated;
    }));
  };

  const deleteEvent = (id) => {
    setEvents(events.filter(e => e.id !== id));
    setConfirmDelete(null);
    if (activeEvent && activeEvent.id === id) setActiveEvent(null);
  };

  // ── Vista Lista ──
  if (!activeEvent) {
    return (
      <div className={embedded ? 'w-full' : 'min-h-screen bg-slate-50 flex flex-col w-full'}>
        {embedded ? (
          <div className="max-w-7xl mx-auto w-full px-6 pt-6 flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-600 text-white hover:bg-orange-700 px-5 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Nuevo Evento
            </button>
          </div>
        ) : (
          <header className="bg-orange-600 text-white p-6 sticky top-0 z-30 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded text-orange-600 font-black text-xs">EV</div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">Events Hub</h1>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-orange-600 hover:bg-orange-50 px-5 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Nuevo Evento
              </button>
            </div>
          </header>
        )}

        <main className="max-w-7xl mx-auto w-full p-6">
          {(() => {
            const eventsActivos = events.filter(ev => calcEventProgress(ev) < 100);
            const eventsCompletados = events.filter(ev => calcEventProgress(ev) === 100);
            const totalFacturable = eventsCompletados.reduce((acc, ev) => acc + Number(ev.fee || 0), 0);

            const renderEventCard = (ev, isCompleted = false) => {
              const prog = calcEventProgress(ev);
              return (
                <div
                  key={ev.id}
                  className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden ${isCompleted ? 'border-emerald-200 hover:border-emerald-400' : 'border-slate-200 hover:border-orange-300'}`}
                >
                  {/* Botón borrar — siempre visible arriba a la derecha */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(ev); }}
                    title="Eliminar evento"
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center border border-red-100 hover:border-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div onClick={() => setActiveEvent(ev)} className="cursor-pointer">
                    <div className="flex items-center gap-2 mb-4 pr-10">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">{ev.country || "GLO"}</span>
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{ev.businessUnit || "—"}</span>
                      {isCompleted && (
                        <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Listo
                        </span>
                      )}
                    </div>
                    <h3 className={`text-lg font-black text-slate-900 uppercase leading-tight mb-2 transition-colors ${isCompleted ? 'group-hover:text-emerald-600' : 'group-hover:text-orange-600'}`}>{ev.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> {ev.date || "Sin Fecha"}
                    </p>
                    <p className={`text-[11px] font-black uppercase mb-2 flex items-center gap-1.5 ${isCompleted ? 'text-emerald-600' : 'text-orange-600'}`}>
                      <DollarSign className="w-3 h-3" /> Fee: ${(ev.fee || 0).toLocaleString()}
                    </p>
                    <div className="mb-3">
                      <QuotationBadge
                        validated={!!ev.quotationValidated}
                        onToggle={(next) => updateEvent(ev.id, 'quotationValidated', next)}
                      />
                    </div>
                    {/* Responsable general del evento */}
                    <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 px-2.5 py-1.5 rounded-lg w-fit mb-3">
                      <User className="w-3 h-3 text-purple-600" />
                      <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">Responsable</span>
                      <span className="text-[10px] font-black text-purple-800 uppercase">{ev.serviceOwner || SERVICE_OWNERS.event}</span>
                    </div>
                    {isCompleted && ev.completedAt && (
                      <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> Completado: {new Date(ev.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>{prog}%</div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Servicio</span>
                      </div>
                      <ChevronRight className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity ${isCompleted ? 'text-emerald-400' : 'text-orange-400'}`} />
                    </div>

                    <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Sección 1 — Activos */}
                <section className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Eventos Activos</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En proceso de servicio</p>
                      </div>
                    </div>
                    <span className="bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-xs font-black border border-orange-100">
                      {eventsActivos.length} {eventsActivos.length === 1 ? 'EVENTO' : 'EVENTOS'}
                    </span>
                  </div>

                  {eventsActivos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {eventsActivos.map(ev => renderEventCard(ev, false))}
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay eventos activos</p>
                    </div>
                  )}
                </section>

                {/* Sección 2 — Completados / Listos para facturar */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Eventos Completados</h2>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Listos para Facturar</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
                        <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Total a facturar</p>
                        <p className="text-lg font-black text-emerald-700">${totalFacturable.toLocaleString()}</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black border border-emerald-100">
                        {eventsCompletados.length} {eventsCompletados.length === 1 ? 'EVENTO' : 'EVENTOS'}
                      </span>
                    </div>
                  </div>

                  {eventsCompletados.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {eventsCompletados.map(ev => renderEventCard(ev, true))}
                    </div>
                  ) : (
                    <div className="bg-emerald-50/30 border-2 border-dashed border-emerald-200 rounded-3xl p-12 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-1">Sin eventos completados aún</p>
                      <p className="text-[10px] text-emerald-500 font-medium">Los eventos pasarán acá automáticamente al llegar al 100% de servicio</p>
                    </div>
                  )}
                </section>
              </>
            );
          })()}
        </main>

        {showCreateModal && (
          <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-6" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-orange-50">
                <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Nuevo Evento</h2>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full hover:bg-orange-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                  <input type="text" placeholder="Ej: ExpoAgro 2025" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold text-slate-700" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                    <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                    <select value={newEvent.country} onChange={e => setNewEvent({...newEvent, country: e.target.value, businessUnit: ""})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold text-slate-700">
                      <option value="">SELECCIONAR...</option>
                      {Object.keys(MARKETS).sort().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad de Negocio</label>
                    <select value={newEvent.businessUnit} onChange={e => setNewEvent({...newEvent, businessUnit: e.target.value})} disabled={!newEvent.country} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold text-slate-700 disabled:opacity-50">
                      <option value="">SELECCIONAR...</option>
                      {(MARKETS[newEvent.country] || []).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente (opcional)</label>
                    <input type="text" placeholder="Ej: Multi-cliente" value={newEvent.client} onChange={e => setNewEvent({...newEvent, client: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold text-slate-700" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Marcomms (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={newEvent.fee}
                      onChange={e => setNewEvent({...newEvent, fee: e.target.value})}
                      className="w-full p-4 pl-8 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium ml-1">Se sumará automáticamente a la facturación del país.</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-orange-700 leading-relaxed">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Se generarán automáticamente las tareas de las 5 fases (Setup, Diseño, Difusión, Durante el Evento y Post Evento) con fechas calculadas según la fecha del evento.
                  </p>
                </div>
                <button onClick={createEvent} disabled={!newEvent.name || !newEvent.date} className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                  Crear Evento
                </button>
              </div>
            </div>
          </div>
          </ModalPortal>
        )}

        {/* Modal de confirmación de borrado (vista lista) */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">¿Eliminar evento?</h2>
                <p className="text-slate-500 text-sm font-medium">
                  Vas a eliminar <span className="font-black text-slate-800">{confirmDelete.name}</span>. Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                  <button onClick={() => deleteEvent(confirmDelete.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 transition-all">Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vista Detalle ──
  const ev = activeEvent;
  const prog = calcEventProgress(ev);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button onClick={() => setActiveEvent(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Evento</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{ev.country} / {ev.businessUnit}</span>
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 truncate">{ev.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl">
              <p className="text-[8px] font-black text-orange-700 uppercase tracking-widest">Servicio</p>
              <p className="text-lg font-black text-orange-700">{prog}%</p>
            </div>
            <button onClick={() => setConfirmDelete(ev)} className="bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 p-2.5 rounded-xl border border-red-100 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* Configuración General */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-50 pb-3 flex items-center justify-between">
            <span>Configuración del Evento</span>
            <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-[9px] font-black border border-orange-100 flex items-center gap-1.5">
              <DollarSign className="w-3 h-3" /> Fee: ${(ev.fee || 0).toLocaleString()}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha del evento</label>
              <input type="date" value={ev.date} onChange={e => updateEvent(ev.id, "date", e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-orange-400 font-bold text-slate-700 text-sm" />
              <p className="text-[9px] text-orange-600 font-bold mt-1">Recalcula fechas</p>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">País</label>
              <select value={ev.country} onChange={e => { updateEvent(ev.id, "country", e.target.value); updateEvent(ev.id, "businessUnit", ""); }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-orange-400 font-bold text-slate-700 text-sm">
                <option value="">—</option>
                {Object.keys(MARKETS).sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-[9px] text-orange-600 font-bold mt-1">Linkea a Países</p>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Unidad de Negocio</label>
              <select value={ev.businessUnit} onChange={e => updateEvent(ev.id, "businessUnit", e.target.value)} disabled={!ev.country} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-orange-400 font-bold text-slate-700 text-sm disabled:opacity-50">
                <option value="">—</option>
                {(MARKETS[ev.country] || []).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cliente</label>
              <input type="text" value={ev.client} onChange={e => updateEvent(ev.id, "client", e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-orange-400 font-bold text-slate-700 text-sm" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fee Marcomms (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={ev.fee || 0}
                  onChange={e => updateEvent(ev.id, "fee", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-3 pl-7 bg-orange-50 border border-orange-200 rounded-xl outline-none focus:border-orange-500 font-black text-orange-700 text-sm"
                />
              </div>
              <p className="text-[9px] text-orange-600 font-bold mt-1">Va a facturación</p>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Deals HubSpot</label>
              <input
                type="number"
                min="0"
                value={ev.dealsCreated ?? ""}
                onChange={e => updateEvent(ev.id, "dealsCreated", e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
                className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-black text-blue-700 text-sm text-center"
              />
              <p className="text-[9px] text-blue-600 font-bold mt-1">Reporte al cliente</p>
            </div>
            <div>
              <label className="text-[9px] font-black text-purple-600 uppercase ml-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Responsable
              </label>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-2">
                <OwnerPicker
                  value={ev.serviceOwner || SERVICE_OWNERS.event}
                  onChange={(v) => updateEvent(ev.id, 'serviceOwner', v)}
                  compact={true}
                  placeholder="Asignar..."
                />
              </div>
              <p className="text-[9px] text-purple-600 font-bold mt-1">Líder del servicio</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50">
            <ProjectLinks
              columns
              plannerLink={ev.plannerLink}
              hubspotLink={ev.hubspotLink}
              onChange={(field, v) => updateEvent(ev.id, field, v)}
            />
          </div>
        </div>

        {/* Fases */}
        {EVENT_PHASES.map(phase => {
          const colors = phaseColorMap[phase.color];
          const PhaseIcon = getPhaseIcon(phase.icon);
          const phaseTasks = phase.tasks.filter(t => ev.tasks[t.id]); // no eliminadas
          const customForPhase = (ev.customTasks || []).filter(t => t.phaseId === phase.id);
          const allPhaseTasks = [
            ...phaseTasks.map(t => ({ ...t, isCustom: false })),
            ...customForPhase
          ];
          const doneCount = allPhaseTasks.filter(t => {
            const tData = t.isCustom ? t : ev.tasks[t.id];
            return tData?.done;
          }).length;
          const phaseProg = allPhaseTasks.length > 0 ? Math.round((doneCount / allPhaseTasks.length) * 100) : 0;

          return (
            <div key={phase.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className={`${colors.bg} px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center border ${colors.border}`}>
                    <PhaseIcon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${colors.text} uppercase tracking-widest`}>Fase</p>
                    <h3 className="text-base font-black text-slate-800 uppercase">{phase.label}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{doneCount}/{allPhaseTasks.length}</p>
                    <p className={`text-lg font-black ${colors.text}`}>{phaseProg}%</p>
                  </div>
                  <div className="w-20 bg-white rounded-full h-2 overflow-hidden border border-slate-100">
                    <div className={`h-full ${colors.bar}`} style={{ width: `${phaseProg}%` }} />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {/* Tareas standard */}
                {phaseTasks.map(t => {
                  const tData = ev.tasks[t.id];
                  const linkedCamp = t.linkable === "campaign" && tData.linkedCampaignId
                    ? campaigns.find(c => c.id === tData.linkedCampaignId) : null;
                  return (
                    <div key={t.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input type="checkbox" checked={!!tData.done} onChange={e => updateTaskField(ev.id, t.id, "done", e.target.checked)} className="w-5 h-5 accent-orange-500 cursor-pointer rounded shrink-0" />
                          <span className="text-[12px] font-extrabold uppercase text-slate-700 tracking-wide truncate">{t.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <OwnerPicker value={tData.owner || ""} onChange={(v) => updateTaskField(ev.id, t.id, "owner", v)} compact={true} placeholder="OWNER" />
                          <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                            <Calendar className="w-2.5 h-2.5 text-orange-500" />
                            <input type="date" value={tData.date || ""} onChange={e => updateTaskField(ev.id, t.id, "date", e.target.value)} className="text-[10px] py-0.5 font-bold outline-none bg-transparent text-orange-700" />
                          </div>
                          <button onClick={() => removeDefaultTask(ev.id, t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subcampos especiales */}
                      {t.hasParticipants && (
                        <div className="ml-8 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Participantes ({(tData.participants || []).length})</p>
                          </div>
                          {(tData.participants || []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {tData.participants.map(p => (
                                <span key={p.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700">
                                  <User className="w-3 h-3 text-purple-500" />
                                  {p.name}
                                  <button onClick={() => removeParticipant(ev.id, t.id, p.id)} className="ml-1 text-slate-300 hover:text-red-500">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input type="text" placeholder="Agregar nombre..." value={newParticipant[`${ev.id}_${t.id}`] || ""}
                              onChange={e => setNewParticipant({ ...newParticipant, [`${ev.id}_${t.id}`]: e.target.value })}
                              onKeyDown={e => e.key === "Enter" && addParticipant(ev.id, t.id)}
                              className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-400" />
                            <button onClick={() => addParticipant(ev.id, t.id)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {t.linkable === "campaign" && (
                        <div className="ml-8 mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                          <p className="text-[9px] font-black text-purple-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Mail className="w-3 h-3" /> Campaña vinculada
                          </p>
                          <select
                            value={tData.linkedCampaignId || ""}
                            onChange={e => updateTaskField(ev.id, t.id, "linkedCampaignId", e.target.value ? Number(e.target.value) : null)}
                            className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            <option value="">Sin vincular</option>
                            {(campaigns || []).filter(c => c.type === "email").map(c => (
                              <option key={c.id} value={c.id}>{c.name} · {c.businessUnit}</option>
                            ))}
                          </select>
                          {linkedCamp && (
                            <p className="text-[9px] text-purple-600 font-bold mt-1.5">
                              <ExternalLink className="w-2.5 h-2.5 inline mr-1" />
                              Vinculado: {linkedCamp.name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Tareas custom de esta fase */}
                {customForPhase.map((t, idxInList) => {
                  const taskIdx = (ev.customTasks || []).findIndex(ct => ct.id === t.id);
                  return (
                    <div key={t.id} className="p-4 bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input type="checkbox" checked={!!t.done} onChange={e => updateCustomTaskField(ev.id, taskIdx, "done", e.target.checked)} className="w-5 h-5 accent-orange-500 cursor-pointer rounded shrink-0" />
                          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">+Custom</span>
                          <input type="text" value={t.label} onChange={e => updateCustomTaskField(ev.id, taskIdx, "label", e.target.value)} className="text-[12px] font-extrabold uppercase text-slate-700 tracking-wide bg-transparent outline-none border-b border-transparent focus:border-orange-300 flex-1 min-w-0 truncate" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <OwnerPicker value={t.owner || ""} onChange={(v) => updateCustomTaskField(ev.id, taskIdx, "owner", v)} compact={true} placeholder="OWNER" />
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            <input type="date" value={t.date || ""} onChange={e => updateCustomTaskField(ev.id, taskIdx, "date", e.target.value)} className="text-[10px] py-0.5 font-bold outline-none bg-transparent text-slate-600" />
                          </div>
                          <button onClick={() => removeCustomTask(ev.id, t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Agregar tarea custom */}
                <div className="p-3 bg-slate-50/50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`+ Agregar tarea a "${phase.label}"...`}
                      value={newCustomTask[`${ev.id}_${phase.id}`] || ""}
                      onChange={e => setNewCustomTask({ ...newCustomTask, [`${ev.id}_${phase.id}`]: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && addCustomTask(ev.id, phase.id)}
                      className="flex-1 p-2.5 bg-white border border-dashed border-slate-300 rounded-lg text-xs outline-none focus:border-orange-400"
                    />
                    <button onClick={() => addCustomTask(ev.id, phase.id)} disabled={!(newCustomTask[`${ev.id}_${phase.id}`] || "").trim()} className="bg-slate-700 hover:bg-orange-600 disabled:opacity-30 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── UTM Builder Widget ── */}
        <div className="mt-4">
          <MarcommsUtmBuilder
            defaultCampaignName={ev.name}
            defaultCountry={ev.country}
            defaultBusinessUnit={ev.businessUnit}
            accentColor="orange"
          />
        </div>
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">¿Eliminar evento?</h2>
              <p className="text-slate-500 text-sm font-medium">
                Vas a eliminar <span className="font-black text-slate-800">{confirmDelete.name}</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={() => deleteEvent(confirmDelete.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

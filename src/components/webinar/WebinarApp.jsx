// ════════════════════════════════════════════════════════════════════
// WebinarApp — Módulo de Webinars
// ════════════════════════════════════════════════════════════════════
// 21 tareas distribuidas en 3 secciones (operativas, contenido, mailings).
// Sync bidireccional con Campaña linkeada (5 mailings).
// UTM Builder embebido al final del detalle.
//
// Props:
//   webinars                — array global
//   setWebinars             — setter
//   onBack                  — volver al hub
//   onWebinarCreated(w)     — callback al crear (auto-crea campaña linkeada)
//   onWebinarMailToggled    — callback al togglear mail (sync con campaña)
//   onWebinarDeleted(w)     — callback al eliminar (limpia campaña linkeada)
// ════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, Database,
  DollarSign, Lock, Plus, Trash2, User,
} from 'lucide-react';

import { calcProgress } from '@/utils/progress';
import { makeWebinar, autoCalcDates } from '@/utils/webinar';
import { COUNTRY_BU_MAPPING_WEBINAR, unitsForCountry } from '@/constants/markets';
import { SERVICE_OWNERS } from '@/constants/team';
import { WEBINAR_MAIL_TO_STEP } from '@/constants/webinar';

import Ico from '@/components/shared/Ico';
import OwnerPicker from '@/components/shared/OwnerPicker';
import ProjectLinks from '@/components/shared/ProjectLinks';
import TaskEditorRow from '@/components/shared/TaskEditorRow';
import MarcommsUtmBuilder from '@/components/shared/MarcommsUtmBuilder';
import QuotationBadge from '@/components/shared/QuotationBadge';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';

export default function WebinarApp({ webinars, setWebinars, onBack, onWebinarCreated, onWebinarMailToggled, onWebinarDeleted, focusProjectId, onFocusHandled, embedded = false }) {
  const confirm = useConfirm();
  const [view,setView]=useState("internal"); 
  const [activeW,setActiveW]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [newW,setNewW]=useState({name:"",date:"",client:"",monto:"",pais:"",unidadNegocio:""});
  const [copyFeedback,setCopyFeedback]=useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── Sync activeW con cambios externos al array webinars ───
  // Cuando Content Hub o cualquier otro módulo actualiza un webinar,
  // necesitamos refrescar la copia local activeW.
  useEffect(() => {
    if (activeW) {
      const fresh = webinars.find(w => w.id === activeW.id);
      if (fresh && fresh !== activeW) setActiveW(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinars]);

  // ─── Deep-link: abrir el detalle de un webinar al venir desde Mi Semana ───
  useEffect(() => {
    if (!focusProjectId) return;
    const w = webinars.find(x => String(x.id) === String(focusProjectId));
    if (w) { setActiveW(w); setView('internal_detail'); }
    if (onFocusHandled) onFocusHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusProjectId]);

  // ─── Auto-marca completedAt cuando el webinar llega al 100% ───
  useEffect(() => {
    let needsUpdate = false;
    const updated = webinars.map(w => {
      const p = calcProgress(w);
      if (p === 100 && !w.completedAt) {
        needsUpdate = true;
        return { ...w, completedAt: new Date().toISOString() };
      }
      if (p < 100 && w.completedAt) {
        needsUpdate = true;
        const { completedAt, ...rest } = w;
        return rest;
      }
      return w;
    });
    if (needsUpdate) setWebinars(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinars]);

  const createWebinar = () => {
    if(!newW.name || !newW.date) return;
    const w = makeWebinar(newW.name, newW.date, newW.client, newW.monto, newW.pais, newW.unidadNegocio);
    setWebinars([w, ...webinars]);
    // Auto-crear campaña linkeada en la sección Campañas
    if (onWebinarCreated) onWebinarCreated(w);
    setNewW({name:"",date:"",client:"",monto:"",pais:"",unidadNegocio:""});
    setShowForm(false);
  };

  const updateField = async (id, path, val) => {
    // Confirmación al COMPLETAR una tarea (path tipo "mailPre1.done" → true)
    const partsCheck = path.split('.');
    const isCompletingTask = partsCheck.length === 2 && partsCheck[1] === 'done' && val === true;
    if (isCompletingTask) {
      const ok = await confirm({
        title: '¿Tarea concretada?',
        message: 'Vas a marcar esta tarea como completada. ¿Confirmás que ya está hecha?',
        confirmText: 'Sí, completar',
        cancelText: 'Todavía no',
        tone: 'success',
      });
      if (!ok) return;
    }

    setWebinars(webinars.map(w => {
      if(w.id !== id) return w;
      let clone = JSON.parse(JSON.stringify(w));
      const parts = path.split('.');
      let current = clone;
      for(let i=0; i<parts.length-1; i++) current = current[parts[i]];
      current[parts[parts.length-1]] = val;
      
      if(path === "mainDate") clone = autoCalcDates(val, clone);
      clone.updatedAt = new Date().toISOString();
      if (activeW && activeW.id === id) setActiveW(clone);
      return clone;
    }));

    // Sync con campaña linkeada: si tocaron .done de un mail tracked
    const parts = path.split('.');
    if (parts.length === 2 && parts[1] === 'done' && WEBINAR_MAIL_TO_STEP[parts[0]] && onWebinarMailToggled) {
      onWebinarMailToggled(id, parts[0], val);
    }
  };

  const deleteWebinarWithSync = (id) => {
    if (onWebinarDeleted) onWebinarDeleted(id);
    setWebinars(webinars.filter(w => w.id !== id));
    setConfirmDelete(null);
    setView("internal");
    if (activeW && activeW.id === id) setActiveW(null);
  };

  const deleteWebinar = (id) => deleteWebinarWithSync(id);

  const copyPIN = (pin) => {
    const el = document.createElement('textarea');
    el.value = pin;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyFeedback(pin);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if(view === "internal") return (
    <div className={embedded ? 'w-full' : 'min-h-screen bg-slate-50 flex flex-col w-full'}>
      {embedded ? (
        // Embebido en Campañas: solo el botón "Nuevo Webinar" (el header lo da CampanasApp)
        <div className="max-w-6xl mx-auto w-full px-6 pt-6 flex justify-end">
          <button onClick={()=>setShowForm(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20">
            <Ico name="Plus" size={16}/> Nuevo Webinar
          </button>
        </div>
      ) : (
        <header className="bg-slate-900 text-white p-6 sticky top-0 z-30 shadow-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><Ico name="ArrowLeft" size={20} color="#fff"/></button>
               <div>
                 <h1 className="text-xl font-black uppercase tracking-tight m-0">Webinars Hub</h1>
                 <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Panel Marcomms</p>
               </div>
            </div>
            <button onClick={()=>setShowForm(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20">
              <Ico name="Plus" size={16}/> Nuevo Webinar
            </button>
          </div>
        </header>
      )}

      <main className="max-w-6xl mx-auto w-full p-6">
        {(() => {
          const webinarsActivos = webinars.filter(w => calcProgress(w) < 100);
          const webinarsCompletos = webinars.filter(w => calcProgress(w) === 100);
          const totalFacturable = webinarsCompletos.reduce((acc, w) => acc + Number(w.monto || 0), 0);

          const renderCard = (w, isCompleted = false) => (
            <div
              key={w.id}
              className={`bg-white rounded-[24px] p-6 border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden ${isCompleted ? 'border-emerald-200 hover:border-emerald-400' : 'border-slate-200 hover:border-blue-300'}`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(w); }}
                title="Eliminar webinar"
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center border border-red-100 hover:border-red-500 transition-all"
              >
                <Ico name="Trash2" size={13}/>
              </button>

              <div onClick={()=>{setActiveW(w); setView("internal_detail");}} className="cursor-pointer">
                <div className="flex items-center gap-2 mb-4 pr-10 flex-wrap">
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">{w.pais || "GLO"}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{w.unidadNegocio || "CU"}</span>
                  {isCompleted && (
                    <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Ico name="CheckCircle2" size={9} color="#fff"/> Listo
                    </span>
                  )}
                </div>
                <h3 className={`text-lg font-black text-slate-900 uppercase leading-tight mb-2 transition-colors ${isCompleted ? 'group-hover:text-emerald-600' : 'group-hover:text-blue-600'}`}>{w.name}</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Ico name="Calendar" size={12}/> {w.mainDate || "Sin Fecha"}</p>
                {w.monto && Number(w.monto) > 0 && (
                  <p className={`text-[11px] font-black uppercase mb-2 flex items-center gap-1.5 ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>
                    <DollarSign className="w-3 h-3" /> Fee: ${Number(w.monto).toLocaleString()}
                  </p>
                )}
                <div className="mb-3">
                  <QuotationBadge
                    validated={!!w.quotationValidated}
                    onToggle={(next) => updateField(w.id, 'quotationValidated', next)}
                  />
                </div>
                {/* Responsable general del webinar */}
                <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 px-2.5 py-1.5 rounded-lg w-fit mb-3">
                  <User className="w-3 h-3 text-purple-600" />
                  <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">Responsable</span>
                  <span className="text-[10px] font-black text-purple-800 uppercase">{w.serviceOwner || SERVICE_OWNERS.webinar}</span>
                </div>
                {isCompleted && w.completedAt && (
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg">
                    <Ico name="CheckCircle2" size={11} color="#059669"/> Completado: {new Date(w.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>{calcProgress(w)}%</div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Progreso</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Ico name="Lock" size={11} color="#94a3b8"/>
                    <span className="text-[10px] font-black text-slate-700 tracking-widest">{w.clientPassword}</span>
                  </div>
                </div>

                <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${calcProgress(w)}%` }} />
                </div>
              </div>
            </div>
          );

          return (
            <>
              {/* Sección 1 — Webinars Activos */}
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Ico name="Clock" size={20} color="#2563eb"/>
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Webinars Activos</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En proceso de producción</p>
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black border border-blue-100">
                    {webinarsActivos.length} {webinarsActivos.length === 1 ? 'WEBINAR' : 'WEBINARS'}
                  </span>
                </div>

                {webinarsActivos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {webinarsActivos.map(w => renderCard(w, false))}
                  </div>
                ) : (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                    <Ico name="Calendar" size={40} color="#cbd5e1" className="mx-auto mb-3"/>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay webinars activos</p>
                  </div>
                )}
              </section>

              {/* Sección 2 — Webinars Completos */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Ico name="CheckCircle2" size={20} color="#059669"/>
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Webinars Completos</h2>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Listos para Facturar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
                      <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Total a facturar</p>
                      <p className="text-lg font-black text-emerald-700">${totalFacturable.toLocaleString()}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black border border-emerald-100">
                      {webinarsCompletos.length} {webinarsCompletos.length === 1 ? 'WEBINAR' : 'WEBINARS'}
                    </span>
                  </div>
                </div>

                {webinarsCompletos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {webinarsCompletos.map(w => renderCard(w, true))}
                  </div>
                ) : (
                  <div className="bg-emerald-50/30 border-2 border-dashed border-emerald-200 rounded-3xl p-12 text-center">
                    <Ico name="CheckCircle2" size={40} color="#6ee7b7" className="mx-auto mb-3"/>
                    <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-1">Sin webinars completos aún</p>
                    <p className="text-[10px] text-emerald-500 font-medium">Los webinars pasarán acá automáticamente al llegar al 100% de progreso</p>
                  </div>
                )}
              </section>
            </>
          );
        })()}
      </main>

      {/* Modal confirmación borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Ico name="Trash2" size={32} color="#dc2626"/>
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">¿Eliminar webinar?</h2>
              <p className="text-slate-500 text-sm font-medium">
                Vas a eliminar <span className="font-black text-slate-800">{confirmDelete.name}</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={() => deleteWebinar(confirmDelete.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ModalPortal>
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-6" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Nuevo Proyecto</h2>
              <button onClick={()=>setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center"><Ico name="Plus" className="rotate-45" size={20} color="#64748b"/></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Webinar</label>
                <input type="text" placeholder="Ej: Tendencias del Agro 2025" value={newW.name} onChange={e=>setNewW({...newW, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 font-bold text-slate-700 transition-colors uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Principal</label>
                  <input type="date" value={newW.date} onChange={e=>setNewW({...newW, date: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 font-bold text-slate-700 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                  <select value={newW.pais} onChange={e=>setNewW({...newW, pais: e.target.value, unidadNegocio: ""})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 font-bold text-slate-700 transition-colors">
                    <option value="">SELECCIONAR...</option>
                    {Object.keys(COUNTRY_BU_MAPPING_WEBINAR).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad de Negocio</label>
                <select value={newW.unidadNegocio} onChange={e=>setNewW({...newW, unidadNegocio: e.target.value})} disabled={!newW.pais} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 font-bold text-slate-700 transition-colors disabled:opacity-50">
                  <option value="">SELECCIONAR...</option>
                  {newW.pais && unitsForCountry(newW.pais).map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="pt-4">
                <button onClick={createWebinar} className="w-full bg-slate-900 hover:bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Crear Proyecto</button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );

  if(view === "internal_detail") return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={()=>setView("internal")} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors border border-slate-100"><Ico name="ArrowLeft" size={18} color="#64748b"/></button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Modo Admin</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{activeW.pais} / {activeW.unidadNegocio}</span>
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight m-0 text-slate-900">{activeW.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={()=>setConfirmDelete(activeW)} className="w-10 h-10 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors border border-red-100"><Ico name="Trash2" size={18} color="#ef4444"/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
             <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-50 pb-3">Configuración General</h3>
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Webinar</label>
                  <input type="date" value={activeW.mainDate} onChange={e=>updateField(activeW.id, "mainDate", e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cliente / Marca</label>
                  <input type="text" value={activeW.client} onChange={e=>updateField(activeW.id, "client", e.target.value.toUpperCase())} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 text-sm uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Presupuesto USD</label>
                  <input type="number" min="0" value={activeW.monto} onChange={e=>updateField(activeW.id, "monto", e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Asistentes Logueados</label>
                  <input type="number" min="0" value={activeW.asistentes} onChange={e=>updateField(activeW.id, "asistentes", e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-purple-600 uppercase ml-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Responsable del webinar
                  </label>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-2">
                    <OwnerPicker
                      value={activeW.serviceOwner || SERVICE_OWNERS.webinar}
                      onChange={(v) => updateField(activeW.id, 'serviceOwner', v)}
                      compact={false}
                      placeholder="Asignar responsable..."
                    />
                  </div>
                </div>
                <ProjectLinks
                  plannerLink={activeW.plannerLink}
                  hubspotLink={activeW.hubspotLink}
                  onChange={(field, v) => updateField(activeW.id, field, v)}
                />
                <div className="p-4 bg-slate-900 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Pin de Acceso Cliente</span>
                    <button onClick={()=>copyPIN(activeW.clientPassword)} className="text-[9px] font-black text-white bg-blue-600 px-2 py-1 rounded hover:bg-blue-500 transition-colors uppercase">{copyFeedback === activeW.clientPassword ? "Copiado!" : "Copiar"}</button>
                  </div>
                  <div className="text-xl font-black text-white tracking-[0.3em] text-center py-2">{activeW.clientPassword}</div>
                </div>
             </div>
           </div>
        </div>

        <div className="lg:col-span-8">
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Roadmap de Producción</h3>
                <span className="text-[9px] font-black text-blue-500 uppercase">{calcProgress(activeW)}% Completado</span>
             </div>
             
             <div className="divide-y divide-slate-50">
                {/* ── OPERATIVAS / TÉCNICAS ── */}
                <div className="bg-slate-50 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operativas</div>
                <TaskEditorRow title="Equipos (Teams/Zoom)" data={activeW.teamsGroup} field="teamsGroup" wId={activeW.id} updateField={updateField} />
                <TaskEditorRow title="Test Day (Simulacro)" data={activeW.testDay} field="testDay" wId={activeW.id} updateField={updateField} hasDate={true} isAutoDate={true} />
                <TaskEditorRow title="Base de Datos" data={activeW.bbdd} field="bbdd" wId={activeW.id} updateField={updateField} customDropdown={["PROPIA","COMPRADA","CLIENTE"]} hasCost hasTags />
                <TaskEditorRow title="Hubspot (Deals/Sync)" data={activeW.hubspot} field="hubspot" wId={activeW.id} updateField={updateField} hasDate={true} isAutoDate={true} />

                {/* ── CONTENIDO (alineado con Content Hub) ── */}
                <div className="bg-pink-50 px-4 py-2 text-[10px] font-black text-pink-600 uppercase tracking-widest border-t-2 border-pink-100">Contenido — Mesa de Contenido y Diseño</div>
                <TaskEditorRow title="Landing Livestorm" data={activeW.landingLivestorm} field="landingLivestorm" wId={activeW.id} updateField={updateField} hasDate={true} />
                <TaskEditorRow title='LKN post "anuncio"' data={activeW.lknAnuncio} field="lknAnuncio" wId={activeW.id} updateField={updateField} hasDate={true} />
                <TaskEditorRow title='LKN post "1 day to go"' data={activeW.lknReminder} field="lknReminder" wId={activeW.id} updateField={updateField} hasDate={true} isAutoDate={true} />
                <TaskEditorRow title='LKN post "es hoy"' data={activeW.lknHoy} field="lknHoy" wId={activeW.id} updateField={updateField} hasDate={true} isAutoDate={true} />
                <TaskEditorRow title='LKN post "recap del webinar"' data={activeW.lknPost} field="lknPost" wId={activeW.id} updateField={updateField} hasDate={true} isAutoDate={true} />
                <TaskEditorRow title="PPT" data={activeW.ppt} field="ppt" wId={activeW.id} updateField={updateField} />
                <TaskEditorRow title="One pager" data={activeW.onePager} field="onePager" wId={activeW.id} updateField={updateField} />
                <TaskEditorRow title="Banner email invitación 1" data={activeW.bannerInv1} field="bannerInv1" wId={activeW.id} updateField={updateField} />
                <TaskEditorRow title="Banner email invitación 2" data={activeW.bannerInv2} field="bannerInv2" wId={activeW.id} updateField={updateField} />
                <TaskEditorRow title="Banner email invitación 3" data={activeW.bannerInv3} field="bannerInv3" wId={activeW.id} updateField={updateField} />
                <TaskEditorRow title="Banner email post webinar" data={activeW.bannerPost} field="bannerPost" wId={activeW.id} updateField={updateField} />
                <TaskEditorRow title="Reporte final" data={activeW.reporte} field="reporte" wId={activeW.id} updateField={updateField} hasDate={true} isAutoDate={true} />

                {/* ── MAILINGS (sincronizan con campaña linkeada) ── */}
                <div className="bg-blue-50 px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-widest border-t-2 border-blue-100">Mailings (sync con Campaña linkeada)</div>
                <TaskEditorRow title="Mailing 01: Invitación" data={activeW.mailPre1} field="mailPre1" wId={activeW.id} updateField={updateField} hasDate={true} hasText={true} isAutoDate={true} />
                <TaskEditorRow title="Mailing 02: Teaser" data={activeW.mailPre2} field="mailPre2" wId={activeW.id} updateField={updateField} hasDate={true} hasText={true} isAutoDate={true} />
                <TaskEditorRow title="Mailing 03: H-24" data={activeW.mailPre3} field="mailPre3" wId={activeW.id} updateField={updateField} hasDate={true} hasText={true} isAutoDate={true} />
                <TaskEditorRow title="Mailing Post — Asistentes" data={activeW.mailPostAttended} field="mailPostAttended" wId={activeW.id} updateField={updateField} hasDate={true} hasText={true} isAutoDate={true} />
                <TaskEditorRow title="Mailing Post — No asistidos" data={activeW.mailPostNoShow} field="mailPostNoShow" wId={activeW.id} updateField={updateField} hasDate={true} hasText={true} isAutoDate={true} />

                {/* ── Deals creados ── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 my-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ico name="Database" size={16} color="#3b82f6"/>
                      <h4 className="font-black text-[11px] text-slate-700 uppercase tracking-widest">Deals creados en HubSpot</h4>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={activeW.dealsCreated ?? ""}
                      onChange={e => updateField(activeW.id, 'dealsCreated', e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0"
                      className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-lg font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-center"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium mt-1">Se reporta al cliente en el resumen mensual</p>
                </div>

                {/* ── UTM Builder Widget ── */}
                <div className="my-4">
                  <MarcommsUtmBuilder
                    defaultCampaignName={activeW.name}
                    defaultCountry={activeW.pais}
                    defaultBusinessUnit={activeW.unidadNegocio}
                    accentColor="indigo"
                  />
                </div>
             </div>
           </div>
        </div>
      </main>

      {/* Modal confirmación borrado (vista detalle) */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Ico name="Trash2" size={32} color="#dc2626"/>
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">¿Eliminar webinar?</h2>
              <p className="text-slate-500 text-sm font-medium">
                Vas a eliminar <span className="font-black text-slate-800">{confirmDelete.name}</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={() => deleteWebinar(confirmDelete.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

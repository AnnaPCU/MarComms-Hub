// ════════════════════════════════════════════════════════════════════
// CountryDetail — Drill-down por país
// ════════════════════════════════════════════════════════════════════
// Muestra webinars + campañas + eventos + pedidos del país seleccionado.
// Cada card tiene botón verde "⬇ Descargar PDF del checklist".
//
// Props:
//   country           — { pais, unidades }
//   webinars / campaigns / events / standalones  — arrays globales
//   onNavigate(section) — navegar a otra sección del hub
//   onViewAsClient(country) — abrir Portal Cliente para este país
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, Download,
  ExternalLink, FileText, LayoutDashboard, Mail, Plus, Receipt,
  Sparkles, User, Video, Zap,
} from 'lucide-react';

import { calcProgress, calcEventProgress } from '@/utils/progress';
import { STANDALONE_CATEGORIES } from '@/constants/standalones';
import { generateProjectPDF } from '@/utils/pdf';

export default function CountryDetail({ country, webinars, campaigns, events, standalones, onNavigate, onViewAsClient }) {
  const [selectedBU, setSelectedBU] = useState(null);

  const activeWebinars = webinars.filter(w => 
    w.pais === country.pais && (!selectedBU || w.unidadNegocio === selectedBU)
  );
  const activeCampaigns = campaigns.filter(c => 
    c.country === country.pais && (!selectedBU || c.businessUnit === selectedBU)
  );

  const activeEventsCountry = events.filter(ev =>
    ev.country === country.pais && (!selectedBU || ev.businessUnit === selectedBU)
  );

  // Pedidos standalone (Content Hub) — solo los cobrados (done con presupuesto)
  const activeStandalones = (standalones || []).filter(r =>
    r.status === 'done' &&
    r.country === country.pais &&
    (!selectedBU || r.businessUnit === selectedBU) &&
    Number(r.budget || 0) > 0
  );
  
  const baseFijos = selectedBU ? 0 : 1550; // Solo extras, ya no incluye "eventos" mock
  const totalWebinars = activeWebinars.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  const totalCampaigns = activeCampaigns.reduce((acc, curr) => acc + Number(curr.budget || 0), 0);
  const totalEvents = activeEventsCountry.reduce((acc, curr) => acc + Number(curr.fee || 0), 0);
  const totalStandalones = activeStandalones.reduce((acc, curr) => acc + Number(curr.budget || 0), 0);
  const facturacionTotal = totalWebinars + totalCampaigns + totalEvents + totalStandalones + baseFijos;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{country.pais}</h2>
          <p className="text-slate-500 font-medium mt-1">Centro de Operaciones y Facturación</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => onViewAsClient(country.pais)}
            className="w-full md:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <User size={16} /> Ver como Cliente
          </button>
          <a 
            href="https://share.hsforms.com/17nzrYb3HSta0xiURkq9lqAs14mk" 
            target="_blank" 
            rel="noreferrer" 
            className="w-full md:w-auto px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
          >
            <Zap size={16} className="fill-current" /> Marcomms Request
          </a>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
        <span className="text-slate-400 text-xs font-black uppercase tracking-widest mr-2">Unidades Activas:</span>
        <button 
          onClick={() => setSelectedBU(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
            selectedBU === null 
              ? 'bg-slate-800 text-white border-slate-800' 
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
        >
          TODAS
        </button>
        {country.empresas.map((emp, idx) => (
          <button 
            key={idx} 
            onClick={() => setSelectedBU(selectedBU === emp ? null : emp)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              selectedBU === emp 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {emp}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white grid grid-cols-1 lg:grid-cols-3 gap-8 shadow-xl">
        <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-700 pb-6 lg:pb-0 lg:pr-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="text-emerald-400 w-5 h-5" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Facturación Total (Mes Actual)</p>
          </div>
          <p className="text-5xl font-black text-emerald-400 mb-2 tracking-tight">${facturacionTotal.toLocaleString()}</p>
          <p className="text-xs font-medium text-slate-400">Datos vinculados dinámicamente al módulo central de Facturación.</p>
        </div>
        
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Desglose por UDN</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-200">
                  <span>Certificaciones</span><span>$8,500</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full w-[60%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-200">
                  <span>Peterson</span><span>$5,750</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full w-[40%]"></div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Desglose por Servicio</p>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2"><Mail size={14}/> Campañas</span>
                <span className="text-white font-bold">${totalCampaigns.toLocaleString()}</span>
              </li>
              <li className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2"><Video size={14}/> Webinars</span>
                <span className="text-white font-bold">${totalWebinars.toLocaleString()}</span>
              </li>
              <li className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2"><Calendar size={14}/> Eventos</span>
                <span className="text-white font-bold">${totalEvents.toLocaleString()}</span>
              </li>
              <li className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2"><Sparkles size={14}/> Content Hub</span>
                <span className="text-white font-bold">${totalStandalones.toLocaleString()}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-2"><LayoutDashboard size={14}/> Extras</span>
                <span className="text-white font-bold">${selectedBU ? '0' : '1,550'}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-black text-slate-800 text-lg">Campañas Activas</h3>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg">Vinculado a Campaigns Hub</span>
          </div>
          
          <div className="space-y-4">
            {activeCampaigns.length > 0 ? activeCampaigns.map((camp, i) => (
              <div 
                key={camp.id || i} 
                className="border border-slate-100 rounded-2xl bg-white hover:bg-purple-50/30 hover:border-purple-200 transition-colors group shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate('campaigns')}>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-black uppercase tracking-wider border border-purple-200 mb-1 inline-block">
                        {camp.businessUnit || "General"}
                      </span>
                      <h4 className="font-black text-slate-800 text-sm uppercase truncate">{camp.name}</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shrink-0 ml-3">
                      ${camp.budget?.toLocaleString()}
                    </span>
                  </div>
                  
                  {camp.report ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-50">
                      <div className="flex flex-col items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Enviados</p>
                        <p className="text-sm font-black text-slate-700">{camp.report.emailReports[0]?.delivered || "-"}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Apertura</p>
                        <p className="text-sm font-black text-emerald-600">{camp.report.emailReports[0]?.openRate || "-"}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clics</p>
                        <p className="text-sm font-black text-blue-600">{camp.report.emailReports[0]?.ctr || "-"}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hot Leads</p>
                        <p className="text-sm font-black text-amber-500">{camp.report.hotLeads?.length || 0}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <Clock size={12} /> Campaña en proceso / Sin reportes procesados
                    </div>
                  )}
                </div>
                {/* Botón PDF prominente */}
                <button
                  onClick={(e) => { e.stopPropagation(); generateProjectPDF(camp, 'campaign'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
                  title="Descargar reporte en PDF"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar PDF del checklist
                </button>
              </div>
            )) : (
              <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-400 bg-slate-50 uppercase tracking-widest">
                No hay campañas activas para este país
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Video className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-black text-slate-800 text-lg">Webinars Activos</h3>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg">Sincronizado</span>
            </div>
            <div className="space-y-3">
              {activeWebinars.length > 0 ? activeWebinars.map((web, i) => {
                const prog = calcProgress(web);
                const isDone = prog === 100;
                return (
                  <div key={web.id || i} className="border border-slate-100 rounded-2xl bg-white hover:bg-indigo-50/30 hover:border-indigo-100 transition-colors group overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-wider border border-indigo-200">
                            {web.unidadNegocio || "General"}
                          </span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 uppercase truncate">{web.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-blue-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Progreso: {prog}%</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onNavigate('webinar')}
                        className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors uppercase tracking-widest shrink-0 ml-3"
                      >
                        Panel <ChevronRight size={14} />
                      </button>
                    </div>
                    {/* Botón PDF prominente */}
                    <button
                      onClick={(e) => { e.stopPropagation(); generateProjectPDF(web, 'webinar'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
                      title="Descargar reporte en PDF"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PDF del checklist
                    </button>
                  </div>
                );
              }) : (
                <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-400 bg-slate-50 uppercase tracking-widest">
                  No hay webinars activos para este país
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-black text-slate-800 text-lg">Eventos Activos</h3>
              </div>
            </div>
            <div className="space-y-3">
              {activeEventsCountry.length > 0 ? activeEventsCountry.map((ev) => {
                const prog = calcEventProgress(ev);
                return (
                  <div key={ev.id} className="border border-slate-100 rounded-2xl bg-white hover:bg-orange-50/30 hover:border-orange-100 transition-colors group overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate('events')}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] font-black uppercase tracking-wider border border-orange-200">
                            {ev.businessUnit || "General"}
                          </span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 uppercase truncate">{ev.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${prog === 100 ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'}`}></span>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Servicio: {prog}% · {ev.date || "Sin fecha"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('events')}
                        className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-2 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors uppercase tracking-widest shrink-0 ml-3"
                      >
                        Ver <ChevronRight size={14} />
                      </button>
                    </div>
                    {/* Botón PDF prominente */}
                    <button
                      onClick={(e) => { e.stopPropagation(); generateProjectPDF(ev, 'event'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
                      title="Descargar reporte en PDF"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PDF del checklist
                    </button>
                  </div>
                );
              }) : (
                <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-400 bg-slate-50 uppercase tracking-widest">
                  No hay eventos activos para este país
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Pedidos Content Hub cobrados */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">Pedidos Content Hub Cobrados</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedidos standalone facturables a este {selectedBU ? 'unidad' : 'país'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-pink-50 text-pink-700 px-3 py-1.5 rounded-full text-xs font-black border border-pink-100">
                {activeStandalones.length} {activeStandalones.length === 1 ? 'PEDIDO' : 'PEDIDOS'}
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-black border border-emerald-100">
                ${totalStandalones.toLocaleString()}
              </span>
            </div>
          </div>
          {activeStandalones.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeStandalones.map(r => {
                const cat = STANDALONE_CATEGORIES.find(c => c.id === r.category) || STANDALONE_CATEGORIES[0];
                const completedDate = r.completedAt ? new Date(r.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                return (
                  <div key={r.id} className={`p-4 rounded-2xl border ${cat.color} hover:shadow-md transition-all`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/70">
                        {cat.label}
                      </span>
                      <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Cobrado
                      </span>
                    </div>
                    <h4 className="font-black text-slate-800 text-sm uppercase mb-1 leading-tight">{r.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{r.businessUnit || '—'}</p>
                    {r.requester && (
                      <p className="text-[10px] font-medium text-slate-500 mb-2">Solicitó: {r.requester}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{completedDate}</span>
                      <span className="text-base font-black text-slate-800">${Number(r.budget).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-400 bg-slate-50 uppercase tracking-widest">
              No hay pedidos del Content Hub cobrados para este país
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

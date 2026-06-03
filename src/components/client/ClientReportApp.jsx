// ════════════════════════════════════════════════════════════════════
// ClientReportApp — Portal Cliente externo
// ════════════════════════════════════════════════════════════════════
// Vista del cliente externo para ver el estado de sus servicios.
// Drill-down por país + filtros (mes, servicio, UN).
// Modal con checklist + botón "Descargar PDF para enviar al cliente".
//
// Props:
//   country     — { pais, unidades }
//   webinars / campaigns / events  — arrays globales filtrados
//   onBack      — volver al hub
//   isPublic    — true si está embebido sin auth (default false)
// ════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle2, CheckSquare, Circle, Clock,
  Database, DollarSign, Download, Filter, Globe, Mail, TrendingUp,
  Video, X, Zap,
} from 'lucide-react';

import { calcProgress } from '@/utils/progress';
import { generateProjectPDF } from '@/utils/pdf';

export default function ClientReportApp({ country, webinars, campaigns, events, onBack, isPublic = false }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState("all"); // "all" | "YYYY-MM"
  const [selectedService, setSelectedService] = useState("all"); // all | webinar | campaign | event
  const [selectedBU, setSelectedBU] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null); // item + rawData para mostrar checklist

  // Helper: construye lista de {label, done} según el tipo de servicio
  const buildChecklist = (rawData, source, subtype) => {
    const checklist = [];

    if (source === 'webinar') {
      const w = rawData;
      const tasks = [
        { key: 'teamsGroup', label: 'Grupo de Teams creado' },
        { key: 'presentacion', label: 'Presentación final aprobada' },
        { key: 'onePager', label: 'One pager listo' },
        { key: 'testDay', label: 'Día de prueba técnica' },
        { key: 'bbdd', label: 'Base de datos cargada' },
        { key: 'lknAnuncio', label: 'LinkedIn: Anuncio oficial' },
        { key: 'lknReminder', label: 'LinkedIn: Última llamada' },
        { key: 'mailPre1', label: 'Mailing 01: Invitación' },
        { key: 'mailPre2', label: 'Mailing 02: Teaser' },
        { key: 'mailPre3', label: 'Mailing 03: H-24 (último)' },
        { key: 'mailPostAttended', label: 'Mailing Post — Asistentes (grabación + PPT)' },
        { key: 'mailPostNoShow', label: 'Mailing Post — No asistidos (link a grabación)' },
        { key: 'lknPost', label: 'LinkedIn Post: Recap del webinar' },
        { key: 'hubspot', label: 'Carga de deals en HubSpot' },
        { key: 'reporte', label: 'Reporte final entregado' }
      ];
      tasks.forEach(t => {
        const td = w[t.key];
        checklist.push({ label: t.label, done: !!(td && td.done), date: td?.date });
      });
    }

    if (source === 'campaign') {
      const c = rawData;
      const completed = new Set(c.completedSteps || []);
      const map = {
        email: [
          { id: 'req', label: '1. Pedido de la campaña confirmado' },
          { id: 'num', label: '2. Cantidad de envíos definida' },
          { id: 'dates', label: '3. Fechas de envío establecidas' },
          { id: 'tag', label: '4. Etiqueta BBDD cargada' },
          { id: 'contents', label: '5. Contenidos listos (asuntos, mensajes, CTAs, links)' },
          { id: 'banners', label: '6. Banners preparados' },
          { id: 'sender', label: '7. Dirección de remitente validada' },
          { id: 'test', label: '8. Emails de prueba enviados y revisados' },
          { id: 'prog', label: '9. Envíos programados en Mailchimp' },
          { id: 'hs_deals', label: '10. Deals cargados en HubSpot' },
          { id: 'bbdd_del', label: '11. BBDD borrada de Mailchimp' },
          { id: 'client_report', label: '12. Reporte enviado al cliente' },
          { id: 'smartsheet', label: '13. Cargado en Smartsheet (facturación)' }
        ],
        paid: [
          { id: 'brief', label: 'Brief y creatividades aprobadas' },
          { id: 'creativities', label: 'Piezas subidas a plataforma' },
          { id: 'launch', label: 'Campaña lanzada' }
        ],
        database: [
          { id: 'brief_db', label: 'Brief y criterios aprobados' },
          { id: 'extraction', label: 'Datos extraídos / importados' },
          { id: 'delivery_db', label: 'BBDD entregada al solicitante' }
        ],
        research: [
          { id: 'brief_research', label: 'Brief y metodología aprobados' },
          { id: 'fieldwork', label: 'Trabajo de campo finalizado' },
          { id: 'delivery_rs', label: 'Informe final entregado' }
        ]
      };
      (map[c.type] || map.email).forEach(step => {
        checklist.push({ label: step.label, done: completed.has(step.id) });
      });
    }

    if (source === 'event') {
      const ev = rawData;
      if (typeof EVENT_PHASES !== 'undefined') {
        EVENT_PHASES.forEach(phase => {
          phase.tasks.forEach(t => {
            const td = ev.tasks?.[t.id];
            if (!td) return;
            checklist.push({ label: t.label, done: !!td.done, phase: phase.label, date: td.date });
          });
          (ev.customTasks || []).filter(ct => ct.phaseId === phase.id).forEach(ct => {
            checklist.push({ label: ct.label || '(tarea sin nombre)', done: !!ct.done, phase: phase.label, isCustom: true });
          });
        });
      }
    }

    return checklist;
  };

  // Helpers
  const monthKey = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const SERVICE_TYPES = {
    webinar: { label: "Webinars", icon: Video, color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
    campaign: { label: "Campañas", icon: Mail, color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
    event: { label: "Eventos", icon: Calendar, color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" }
  };

  // Normalizar todos los servicios del país en una sola lista
  const buildAllItems = () => {
    const items = [];

    (webinars || []).filter(w => w.pais === country).forEach(w => {
      const progress = calcProgress(w);
      items.push({
        id: `w-${w.id}`,
        source: 'webinar',
        name: w.name,
        businessUnit: w.unidadNegocio || '—',
        client: w.client || '',
        date: w.mainDate,
        fee: Number(w.monto) || 0,
        deals: Number(w.dealsCreated) || 0,
        progress,
        status: progress === 100 ? 'completed' : 'active',
        completedAt: w.completedAt,
        completedMonthKey: w.completedAt ? monthKey(w.completedAt) : null,
        meta: w.asistentes ? `${w.asistentes} asistentes` : null,
        rawData: w,
        subtype: null
      });
    });

    (campaigns || []).filter(c => c.country === country).forEach(c => {
      let totalSteps = 11;
      if (c.type === "paid" || c.type === "database" || c.type === "research") totalSteps = 3;
      const progress = Math.min(Math.round(((c.completedSteps || []).length / totalSteps) * 100), 100);
      const typeLabel = {
        email: "Email Marketing",
        paid: "Paid Media",
        research: "Investigación",
        database: "BBDD"
      };
      items.push({
        id: `c-${c.id}`,
        source: 'campaign',
        name: c.name,
        businessUnit: c.businessUnit || '—',
        subtype: typeLabel[c.type] || c.type,
        fee: Number(c.budget) || 0,
        platformInvestment: Number(c.platformInvestment) || 0,
        deals: Number(c.dealsCreated) || 0,
        progress,
        status: progress === 100 ? 'completed' : 'active',
        completedAt: c.completedAt,
        completedMonthKey: c.completedAt ? monthKey(c.completedAt) : null,
        rawData: c
      });
    });

    (events || []).filter(ev => ev.country === country).forEach(ev => {
      const tasks = Object.values(ev.tasks || {});
      const custom = ev.customTasks || [];
      const allTasks = [...tasks, ...custom];
      const doneCount = allTasks.filter(t => t.done).length;
      const progress = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;
      items.push({
        id: `e-${ev.id}`,
        source: 'event',
        name: ev.name,
        businessUnit: ev.businessUnit || '—',
        client: ev.client || '',
        date: ev.date,
        fee: Number(ev.fee) || 0,
        deals: Number(ev.dealsCreated) || 0,
        progress,
        status: progress === 100 ? 'completed' : 'active',
        completedAt: ev.completedAt,
        completedMonthKey: ev.completedAt ? monthKey(ev.completedAt) : null,
        rawData: ev,
        subtype: null
      });
    });

    return items;
  };

  const allItems = buildAllItems();

  // Aplicar filtros
  const filteredItems = allItems.filter(item => {
    if (selectedBU !== "all" && item.businessUnit !== selectedBU) return false;
    if (selectedService !== "all" && item.source !== selectedService) return false;
    if (selectedMonth !== "all") {
      // Un item entra al mes si su completedAt o su date caen en ese mes
      const match = item.completedMonthKey === selectedMonth || (item.date && monthKey(item.date) === selectedMonth);
      if (!match) return false;
    }
    return true;
  });

  const activeItems = filteredItems.filter(i => i.status === 'active');
  const completedItems = filteredItems.filter(i => i.status === 'completed');

  // Totales
  const totalFee = filteredItems.reduce((acc, i) => acc + i.fee, 0);
  const totalDeals = filteredItems.reduce((acc, i) => acc + i.deals, 0);
  const totalCompletedFee = completedItems.reduce((acc, i) => acc + i.fee, 0);

  // Deals por mes (para el gráfico de barras)
  const dealsByMonth = {};
  filteredItems.forEach(i => {
    if (i.completedMonthKey && i.deals > 0) {
      dealsByMonth[i.completedMonthKey] = (dealsByMonth[i.completedMonthKey] || 0) + i.deals;
    }
  });
  const dealsByMonthArr = Object.entries(dealsByMonth).sort(([a], [b]) => a.localeCompare(b));
  const maxDeals = Math.max(...dealsByMonthArr.map(([, v]) => v), 1);

  // Opciones de filtros
  const monthOptions = [];
  for (let i = -12; i <= 0; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    monthOptions.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  const uniqueBUs = [...new Set(allItems.map(i => i.businessUnit))].filter(Boolean).sort();

  const monthLabel = selectedMonth === "all" ? "Todos los meses" : (monthOptions.find(m => m.key === selectedMonth)?.label || selectedMonth);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* Header cliente */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              {onBack && (
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-white text-slate-900 px-3 py-1 rounded-lg font-black text-xs tracking-widest">REPORTE MARCOMMS</div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Globe className="w-6 h-6" /> {country}
                  </h1>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{monthLabel}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://share.hsforms.com/17nzrYb3HSta0xiURkq9lqAs14mk"
                target="_blank"
                rel="noreferrer"
                className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md"
              >
                <Zap className="w-3.5 h-3.5 fill-current" /> Marcomms Request
              </a>
              <a
                href="https://share.hsforms.com/1Ta-R_BYsTXe2ylGLrjWahgs14mk"
                target="_blank"
                rel="noreferrer"
                className="bg-orange-500 text-white hover:bg-orange-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md"
              >
                <Database className="w-3.5 h-3.5" /> HS Request
              </a>
              {isPublic && (
                <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  Portal Cliente
                </span>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/20">
              <Filter className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Filtros</span>
            </div>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded-xl font-black text-xs outline-none hover:bg-white/20 transition-colors">
              <option value="all" className="text-slate-900">Todos los meses</option>
              {monthOptions.map(m => <option key={m.key} value={m.key} className="text-slate-900">{m.label}</option>)}
            </select>
            <select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded-xl font-black text-xs outline-none hover:bg-white/20 transition-colors">
              <option value="all" className="text-slate-900">Todos los servicios</option>
              <option value="webinar" className="text-slate-900">Webinars</option>
              <option value="campaign" className="text-slate-900">Campañas</option>
              <option value="event" className="text-slate-900">Eventos</option>
            </select>
            <select value={selectedBU} onChange={e => setSelectedBU(e.target.value)} className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded-xl font-black text-xs outline-none hover:bg-white/20 transition-colors">
              <option value="all" className="text-slate-900">Todas las unidades</option>
              {uniqueBUs.map(b => <option key={b} value={b} className="text-slate-900">{b}</option>)}
            </select>
            {(selectedMonth !== "all" || selectedService !== "all" || selectedBU !== "all") && (
              <button onClick={() => { setSelectedMonth("all"); setSelectedService("all"); setSelectedBU("all"); }} className="text-[10px] font-black text-slate-300 hover:text-white uppercase tracking-widest">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicios activos</p>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{activeItems.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">en ejecución</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completados</p>
            </div>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{completedItems.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">listos / entregados</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fee Marcomms</p>
            </div>
            <p className="text-3xl font-black text-amber-600 tracking-tight">${totalFee.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              {totalCompletedFee > 0 ? `$${totalCompletedFee.toLocaleString()} facturado` : 'incluye activos'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Database className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deals generados</p>
            </div>
            <p className="text-3xl font-black text-blue-600 tracking-tight">{totalDeals}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">en HubSpot</p>
          </div>
        </div>

        {/* Gráfico de deals por mes */}
        {dealsByMonthArr.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Deals generados por mes
              </h3>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                {totalDeals} totales
              </span>
            </div>
            <div className="space-y-2">
              {dealsByMonthArr.map(([key, value]) => {
                const d = new Date(`${key}-01`);
                const label = d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
                const pct = Math.round((value / maxDeals) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider w-24 shrink-0">{label}</span>
                    <div className="flex-1 bg-slate-50 rounded-lg h-8 relative overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end pr-3 transition-all" style={{ width: `${pct}%` }}>
                        <span className="text-xs font-black text-white">{value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sección 1 - Activos */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">Servicios Activos</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En ejecución</p>
            </div>
            <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-black border border-amber-100">
              {activeItems.length}
            </span>
          </div>

          {activeItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeItems.map(item => {
                const s = SERVICE_TYPES[item.source];
                const Icon = s.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center border shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border ${s.color}`}>
                            {s.label}{item.subtype ? ` · ${item.subtype}` : ''}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-slate-800 uppercase leading-tight">{item.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{item.businessUnit}{item.date ? ` · ${item.date}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${s.dot}`} style={{ width: `${item.progress}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-slate-600">{item.progress}%</span>
                      </div>
                      {item.fee > 0 && <span className="text-xs font-black text-slate-700">${item.fee.toLocaleString()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay servicios activos con estos filtros</p>
            </div>
          )}
        </section>

        {/* Sección 2 - Completados */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">Servicios Completados</h2>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Entregados</p>
            </div>
            <div className="flex items-center gap-3">
              {totalCompletedFee > 0 && (
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
                  <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Fee facturado</p>
                  <p className="text-lg font-black text-amber-700">${totalCompletedFee.toLocaleString()}</p>
                </div>
              )}
              <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black border border-emerald-100">
                {completedItems.length}
              </span>
            </div>
          </div>

          {completedItems.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Servicio</th>
                      <th className="text-left p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Nombre</th>
                      <th className="text-left p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Unidad</th>
                      <th className="text-left p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Completado</th>
                      <th className="text-right p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Deals</th>
                      <th className="text-right p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedItems.map(item => {
                      const s = SERVICE_TYPES[item.source];
                      const Icon = s.icon;
                      const completedDate = item.completedAt ? new Date(item.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="p-3">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${s.color}`}>
                              <Icon className="w-3 h-3" />
                              <span className="text-[9px] font-black uppercase tracking-wider">{s.label}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-black text-slate-800 text-xs uppercase">{item.name}</p>
                            {item.subtype && <p className="text-[10px] text-slate-400 font-medium">{item.subtype}</p>}
                          </td>
                          <td className="p-3 text-[11px] font-bold text-slate-600 uppercase">{item.businessUnit}</td>
                          <td className="p-3 text-[11px] font-bold text-emerald-600 uppercase">{completedDate}</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded">
                              <Database className="w-3 h-3" /> {item.deals}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-slate-800">${item.fee.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                    <tr>
                      <td colSpan="4" className="p-3 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Totales</td>
                      <td className="p-3 text-right font-black text-blue-700">{completedItems.reduce((s, i) => s + i.deals, 0)}</td>
                      <td className="p-3 text-right font-black text-emerald-800">${totalCompletedFee.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin servicios completados con estos filtros</p>
            </div>
          )}
        </section>
      </main>

      {/* Modal de Checklist del Servicio */}
      {selectedItem && (() => {
        const checklist = buildChecklist(selectedItem.rawData, selectedItem.source, selectedItem.subtype);
        const doneCount = checklist.filter(c => c.done).length;
        const totalCount = checklist.length;
        const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        const s = SERVICE_TYPES[selectedItem.source];
        const HeaderIcon = s.icon;

        // Agrupar por fase si es un evento
        const byPhase = {};
        if (selectedItem.source === 'event') {
          checklist.forEach(item => {
            const k = item.phase || 'Otras';
            if (!byPhase[k]) byPhase[k] = [];
            byPhase[k].push(item);
          });
        }

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[80] flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header modal */}
              <div className={`p-6 border-b border-slate-100 ${s.color} flex items-start justify-between gap-4`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                    <HeaderIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-white/70">
                        {s.label}{selectedItem.subtype ? ` · ${selectedItem.subtype}` : ''}
                      </span>
                      {selectedItem.status === 'completed' && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-emerald-500 text-white flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Completado
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase leading-tight">{selectedItem.name}</h2>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                      {selectedItem.businessUnit}
                      {selectedItem.date ? ` · ${selectedItem.date}` : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="w-9 h-9 rounded-full bg-white/60 hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                  <X className="w-4 h-4 text-slate-700" />
                </button>
              </div>

              {/* Barra de progreso */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progreso del servicio</span>
                  <span className="text-xs font-black text-slate-700">{doneCount} / {totalCount} · {pct}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${s.dot} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Checklist */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5" /> Checklist del servicio
                </h3>

                {checklist.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold uppercase tracking-widest">Sin tareas registradas</p>
                  </div>
                ) : selectedItem.source === 'event' ? (
                  // Vista agrupada por fase para eventos
                  <div className="space-y-5">
                    {Object.entries(byPhase).map(([phase, items]) => {
                      const phDone = items.filter(i => i.done).length;
                      return (
                        <div key={phase}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{phase}</h4>
                            <span className="text-[10px] font-black text-slate-400">{phDone}/{items.length}</span>
                          </div>
                          <div className="space-y-1.5">
                            {items.map((c, idx) => (
                              <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${c.done ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                {c.done ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                                )}
                                <span className={`flex-1 text-xs font-bold ${c.done ? 'text-emerald-800' : 'text-slate-500'}`}>
                                  {c.label}
                                  {c.isCustom && <span className="ml-1 text-[9px] font-black text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase">Custom</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Lista plana para webinars y campañas
                  <div className="space-y-2">
                    {checklist.map((c, idx) => (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${c.done ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                        {c.done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                        )}
                        <span className={`flex-1 text-sm font-bold ${c.done ? 'text-emerald-800' : 'text-slate-500'}`}>
                          {c.label}
                        </span>
                        {c.date && c.done && (
                          <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-1 rounded border border-emerald-100">
                            {c.date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer con info resumen */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fee</p>
                  <p className="text-sm font-black text-slate-800">${selectedItem.fee.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deals HS</p>
                  <p className="text-sm font-black text-blue-600">{selectedItem.deals}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidad</p>
                  <p className="text-sm font-black text-slate-800 truncate">{selectedItem.businessUnit}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
                  <p className={`text-sm font-black ${selectedItem.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedItem.status === 'completed' ? 'Completado' : 'En curso'}
                  </p>
                </div>
              </div>

              {/* Botón Descargar PDF */}
              <div className="px-6 py-4 bg-white border-t border-slate-100">
                <button
                  onClick={() => generateProjectPDF(selectedItem.rawData, selectedItem.source)}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF para enviar al cliente
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                  Se abrirá una ventana de impresión. Elegí "Guardar como PDF" para descargar.
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

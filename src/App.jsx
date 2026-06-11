// ════════════════════════════════════════════════════════════════════
// App — Componente raíz del Marcomms Hub
// ════════════════════════════════════════════════════════════════════
// Maneja:
//   - Login gate (LoginScreen si no hay currentUser)
//   - Routing por state (currentSection)
//   - State global compartido (webinars, campaigns, events, standalones, tasks)
//   - Sync bidireccional Webinar ↔ Campaign via callbacks centralizados
//   - Sistema de notificaciones (5 tipos)
//   - Búsqueda global cross-módulo
//   - Acción rápida (atajos)
//
// ⚠️ State NO persiste — refresh borra todo (data demo se reinicializa).
// Para producción real, integrar Supabase (ver BACKEND_PLAN.md).
// ════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle, ArrowLeft, Bell, Building2, Calendar, CheckCircle2,
  ChevronRight, Clock, FileText, Globe, Globe2, Info, LayoutDashboard,
  LogOut, Mail, MoreVertical, Receipt, Search, Sparkles, Trophy, User,
  UserCheck, Video, X, Zap,
} from 'lucide-react';

// Constants
import { MARCOMMS, PEOPLE, SERVICE_OWNERS, TEAM_MEMBERS } from '@/constants/team';
import { MARKETS, MARKETS_LIST } from '@/constants/markets';
import { WEBINAR_MAIL_TO_STEP, STEP_TO_WEBINAR_MAIL } from '@/constants/webinar';
import { EVENT_PHASES } from '@/constants/events';
import { NOTIFICATION_TEMPLATES, NOTIFICATION_PRIORITY } from '@/constants/userNotifications';

// Hooks
import { useRequests } from '@/hooks/useRequests';
import { useWebinars } from '@/hooks/useWebinars';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useEvents } from '@/hooks/useEvents';
import { useAssignedTasks } from '@/hooks/useAssignedTasks';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useTeam } from '@/hooks/useTeam';
import { useSuccessCases } from '@/hooks/useSuccessCases';

// Utils
import { calcProgress } from '@/utils/progress';
import { makeCampaignFromWebinar } from '@/utils/webinar';
import { buildNotifications } from '@/utils/notifications';

// Components
import LoginScreen from '@/components/login/LoginScreen';
import WebinarApp from '@/components/webinar/WebinarApp';
import CampaignsApp from '@/components/campaigns/CampaignsApp';
import EventsApp from '@/components/events/EventsApp';
import ContentHubApp from '@/components/content/ContentHubApp';
import FacturacionApp from '@/components/facturacion/FacturacionApp';
import MyWeekApp from '@/components/myweek/MyWeekApp';
import ClientReportApp from '@/components/client/ClientReportApp';
import CountryDetail from '@/components/country/CountryDetail';
import SuccessCasesApp from '@/components/success/SuccessCasesApp';

// Claves de localStorage. Versionadas → si cambia el shape, subir el sufijo.
const SESSION_STORAGE_KEY = 'marcomms_hub_session_v1';
const READ_NOTIFS_STORAGE_KEY = 'marcomms_hub_read_notifs_v1';

const readStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.name) return parsed;
    return null;
  } catch (_e) {
    return null;
  }
};

const readStoredReadNotifs = () => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_NOTIFS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch (_e) {
    return new Set();
  }
};

export default function App() {
  // ── Sesión / login (persiste en localStorage) ──
  const [currentUser, setCurrentUser] = useState(readStoredUser);

  // Sync de currentUser → localStorage en cada cambio
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (currentUser) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (_e) {
      // localStorage podría estar deshabilitado (modo incógnito estricto, etc.) — ignorar
    }
  }, [currentUser]);

  // ─── Equipo (Supabase + fallback a constants/team.js) ───
  // Live: lista de miembros, derivados (people, serviceOwners) y helpers
  // (greetingFor, accentFor) que reemplazan los constants estáticos.
  const {
    team: liveTeam,
    people: livePeople,
    serviceOwners: liveServiceOwners,
    greetingFor,
  } = useTeam();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // Notificaciones leídas — persistidas en localStorage para que sobrevivan el refresh
  const [readNotifications, setReadNotifications] = useState(readStoredReadNotifs);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        READ_NOTIFS_STORAGE_KEY,
        JSON.stringify(Array.from(readNotifications)),
      );
    } catch (_e) {
      // localStorage podría estar deshabilitado — ignorar
    }
  }, [readNotifications]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showFastAction, setShowFastAction] = useState(false);
  const [contentAutoNew, setContentAutoNew] = useState(false); // abre "nuevo pedido" al entrar desde acción rápida

  const [currentSection, setCurrentSection] = useState('main');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [clientReportCountry, setClientReportCountry] = useState(null);

  // ─── Reset de scroll al cambiar de sección ───
  // Sin esto, al navegar desde una sección scrolleada hacia abajo a otra,
  // la nueva quedaba "scrolleada" (parecía rota) hasta volver al hub.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [currentSection, selectedCountry, clientReportCountry]);

  // ── Refs para cerrar dropdowns al hacer click afuera ──
  const searchContainerRef = useRef(null);
  const notificationsContainerRef = useRef(null);
  const fastActionContainerRef = useRef(null);

  useOnClickOutside(searchContainerRef,        () => setShowSearchResults(false), showSearchResults);
  useOnClickOutside(notificationsContainerRef, () => setShowNotifications(false), showNotifications);
  useOnClickOutside(fastActionContainerRef,    () => setShowFastAction(false),    showFastAction);
  
  // ─── Webinars / Campaigns / Events: Supabase + realtime via hooks ───
  // Los hooks devuelven [data, setData, meta] — setData se comporta
  // como un useState setter normal, pero persiste en Supabase.
  const [globalWebinars,  setGlobalWebinars,  webinarsMeta]  = useWebinars();
  const [globalCampaigns, setGlobalCampaigns, campaignsMeta] = useCampaigns();
  const [globalEvents,    setGlobalEvents,    eventsMeta]    = useEvents();

  if (webinarsMeta.error)  console.error('Webinars Supabase error:',  webinarsMeta.error);
  if (campaignsMeta.error) console.error('Campaigns Supabase error:', campaignsMeta.error);
  if (eventsMeta.error)    console.error('Events Supabase error:',    eventsMeta.error);

  // ─── Casos de éxito: Supabase + realtime ───
  const {
    data: successCases,
    loading: successCasesLoading,
    error: successCasesError,
    create: createSuccessCase,
    update: updateSuccessCase,
    remove: removeSuccessCase,
  } = useSuccessCases();

  // ─── Pedidos / Standalone requests: conectado a Supabase (tabla `requests`) ───
  // El hook maneja fetch inicial, realtime, create/update/delete y un overlay
  // local para comments/files (aún no persistidos en DB).
  const {
    data: globalStandaloneRequests,
    loading: requestsLoading,
    error: requestsError,
    create: createRequest,
    update: updateRequest,
    remove: removeRequest,
    setStatus: setRequestStatus,
    setOwner: setRequestOwner,
    addComment: addRequestComment,
    removeComment: removeRequestComment,
    addFile: addRequestFile,
    removeFile: removeRequestFile,
    updateContent: updateRequestContent,
  } = useRequests();

  if (requestsError) {
    // No bloquea la app — sólo log. La UI muestra lista vacía mientras se
    // recupera. Si se mantiene el error, revisar env vars y red en consola.
    // eslint-disable-next-line no-console
    console.error('Requests (Supabase) error:', requestsError);
  }

  // ─── Tareas asignadas entre usuarios (Supabase + realtime) ───
  const {
    tasks: globalAssignedTasks,
    create: createAssignedTaskSvc,
    toggleDone: toggleAssignedTaskDoneSvc,
    remove: deleteAssignedTaskSvc,
    error: assignedTasksError,
  } = useAssignedTasks();

  if (assignedTasksError) console.error('AssignedTasks Supabase error:', assignedTasksError);

  // Wrappers que mantienen la firma original que los hijos esperan
  const createAssignedTask = async ({ title, detail, assignedTo, deadline, project }) => {
    if (!currentUser) return null;
    if (!title || !title.trim())        { console.warn('createAssignedTask: title vacío'); return null; }
    if (!assignedTo || !assignedTo.trim()) { console.warn('createAssignedTask: assignedTo vacío'); return null; }
    try {
      return await createAssignedTaskSvc({
        title:      title.trim(),
        detail:     (detail || '').trim(),
        assignedTo: assignedTo.trim(),
        assignedBy: currentUser.name,
        deadline:   deadline || null,
        done:       false,
        project:    project || null,
      });
    } catch (e) {
      console.error('createAssignedTask error:', e);
      return null;
    }
  };

  const toggleAssignedTaskDone = (taskId, done) => {
    toggleAssignedTaskDoneSvc(taskId, done).catch((e) => console.error(e));
  };

  const deleteAssignedTask = (taskId) => {
    deleteAssignedTaskSvc(taskId).catch((e) => console.error(e));
  };

  // ─────────────────────────────────────────────────────────────
  // SYNC WEBINAR ↔ CAMPAIGN
  // Cuando se crea un webinar, se crea automáticamente una campaña linkeada.
  // Cuando se tilda un mail en el webinar, se tilda el step correspondiente
  // en la campaña linkeada (y viceversa).
  // ─────────────────────────────────────────────────────────────

  const onWebinarCreated = (newWebinar) => {
    const linkedCampaign = makeCampaignFromWebinar(newWebinar);
    // Linkear bidireccional
    setGlobalWebinars(prev => prev.map(w => w.id === newWebinar.id ? { ...w, linkedCampaignId: linkedCampaign.id } : w));
    setGlobalCampaigns(prev => [linkedCampaign, ...prev]);
  };

  const onWebinarMailToggled = (webinarId, mailKey, done) => {
    const stepKey = WEBINAR_MAIL_TO_STEP[mailKey];
    if (!stepKey) return;
    setGlobalCampaigns(prev => prev.map(c => {
      if (c.linkedWebinarId !== webinarId) return c;
      const completedSteps = c.completedSteps || [];
      if (done && !completedSteps.includes(stepKey)) {
        return { ...c, completedSteps: [...completedSteps, stepKey] };
      }
      if (!done && completedSteps.includes(stepKey)) {
        return { ...c, completedSteps: completedSteps.filter(s => s !== stepKey) };
      }
      return c;
    }));
  };

  const onCampaignWebinarStepToggled = (campaignId, stepKey, done) => {
    const mailKey = STEP_TO_WEBINAR_MAIL[stepKey];
    if (!mailKey) return;
    // Buscar la campaña dentro del setter para evitar closure stale
    setGlobalCampaigns(prevCampaigns => {
      const campaign = prevCampaigns.find(c => c.id === campaignId);
      if (!campaign?.linkedWebinarId) return prevCampaigns;
      setGlobalWebinars(prev => prev.map(w => {
        if (w.id !== campaign.linkedWebinarId) return w;
        const current = w[mailKey] || {};
        return { ...w, [mailKey]: { ...current, done } };
      }));
      return prevCampaigns;
    });
  };

  // Cuando se borra un webinar, también borramos la campaña linkeada
  const onWebinarDeleted = (webinarId) => {
    setGlobalCampaigns(prev => prev.filter(c => c.linkedWebinarId !== webinarId));
  };
  // Cuando se borra una campaña linkeada a webinar, desvincular del webinar
  const onCampaignDeleted = (campaignId) => {
    setGlobalCampaigns(prevCampaigns => {
      const camp = prevCampaigns.find(c => c.id === campaignId);
      if (camp?.linkedWebinarId) {
        setGlobalWebinars(prev => prev.map(w => w.id === camp.linkedWebinarId ? { ...w, linkedCampaignId: null } : w));
      }
      return prevCampaigns;
    });
  };

  const paisesData = MARKETS_LIST;

  const sections = [
    { id: 'paises', title: 'Países', description: 'Gestión de mercados globales y entidades.', icon: <Globe2 className="w-8 h-8 text-blue-600" />, stats: '15 Países', color: 'bg-blue-50' },
    { id: 'webinar', title: 'Webinar', description: 'Eventos virtuales y transmisiones.', icon: <Video className="w-8 h-8 text-indigo-600" />, stats: `${globalWebinars.length} Programados`, color: 'bg-indigo-50' },
    { id: 'campaigns', title: 'Campaigns', description: 'Automatización y seguimiento de leads.', icon: <Mail className="w-8 h-8 text-purple-600" />, stats: `${globalCampaigns.length} Activas`, color: 'bg-purple-50' },
    { id: 'events', title: 'Events', description: 'Logística de eventos presenciales.', icon: <Calendar className="w-8 h-8 text-orange-600" />, stats: `${globalEvents.length} Activos`, color: 'bg-orange-50' },
    { id: 'content', title: 'Content Hub', description: 'Mesa de contenido y diseño: Agus, Vicky, Fati, Delfi.', icon: <FileText className="w-8 h-8 text-pink-600" />, stats: 'Contenido + Diseño', color: 'bg-pink-50' },
    { id: 'my_week', title: 'Mi Semana', description: 'Mis tareas con deadline próximo, cross módulos.', icon: <Clock className="w-8 h-8 text-orange-600" />, stats: 'Cross módulos', color: 'bg-orange-50' },
    { id: 'facturacion', title: 'Facturación', description: 'ROI, presupuestos y gastos.', icon: <Receipt className="w-8 h-8 text-emerald-600" />, stats: 'Q2 Pendiente', color: 'bg-emerald-50' },
    { id: 'success_cases', title: 'Casos de Éxito', description: 'Armá y descargá casos de éxito en PDF.', icon: <Trophy className="w-8 h-8 text-amber-600" />, stats: `${successCases.length} ${successCases.length === 1 ? 'caso' : 'casos'}`, color: 'bg-amber-50' },
    { id: 'client_portal', title: 'Portal Cliente', description: 'Vista que ve cada país de sus servicios.', icon: <User className="w-8 h-8 text-teal-600" />, stats: 'Público', color: 'bg-teal-50' }
  ];


  const renderContent = () => {
    if (currentSection === 'main') {
      return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight italic">Marcomms Hub <span className="text-indigo-600 not-italic">Central</span></h1>
            {currentUser && (
              <p className="text-slate-500 mt-2 text-lg font-medium">
                {greetingFor(currentUser.name) || 'Panel Maestro de Control Global.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-10">
            {sections.map((section) => (
              <div 
                key={section.id}
                onClick={() => { setCurrentSection(section.id); setSelectedCountry(null); }}
                className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer"
              >
                <div className={`w-12 h-12 ${section.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(section.icon, { size: 24 })}
                </div>
                <h3 className="text-lg font-bold text-slate-800">{section.title}</h3>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">{section.stats}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Actividad Reciente por Clientes</h2>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">Ver Todo</span>
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 font-bold border border-slate-100">
                        {i % 2 === 0 ? "AR" : "US"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Campaña "Green Logistics" lanzada</p>
                        <p className="text-xs text-slate-400">Empresa: Peterson | Sector: Certificaciones</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2">Resumen Global Q2</h2>
                <p className="text-indigo-100 text-sm mb-8 opacity-80">Datos agregados de todos los países y verticales.</p>
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-indigo-200 uppercase mb-2">Webinars Ejecutados</p>
                    <p className="text-4xl font-black">{globalWebinars.length} <span className="text-sm font-medium text-emerald-400 ml-2">+12%</span></p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-200 uppercase mb-2">Campañas Lanzadas</p>
                    <p className="text-4xl font-black">{globalCampaigns.length}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      );
    }

    if (clientReportCountry) {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-50 min-h-[calc(100vh-80px)]">
          <ClientReportApp
            country={clientReportCountry}
            webinars={globalWebinars}
            campaigns={globalCampaigns}
            events={globalEvents}
            onBack={() => setClientReportCountry(null)}
          />
        </div>
      );
    }

    if (currentSection === 'client_portal') {
      return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentSection('main')}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <User className="w-8 h-8 text-teal-600" /> Portal Cliente
              </h1>
              <p className="text-slate-500 font-medium mt-1">Elegí un país para ver su reporte público de servicios.</p>
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-6">
            <p className="text-xs text-teal-800 font-medium leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Esta es la vista simplificada que puede ver cada país (cliente interno). Muestra sus servicios activos, completados, fee facturado y deals generados. Permite filtrar por mes, servicio y unidad de negocio.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.keys(MARKETS).sort().map(country => {
              const nWebinars = globalWebinars.filter(w => w.pais === country).length;
              const nCampaigns = globalCampaigns.filter(c => c.country === country).length;
              const nEvents = globalEvents.filter(e => e.country === country).length;
              const nStandalones = (globalStandaloneRequests || []).filter(r => r.country === country).length;
              const total = nWebinars + nCampaigns + nEvents + nStandalones;
              const udns = MARKETS[country] || [];
              const hasActivity = total > 0;
              return (
                <div
                  key={country}
                  onClick={() => setClientReportCountry(country)}
                  className={`group bg-white p-6 rounded-2xl border transition-all cursor-pointer ${hasActivity ? 'border-slate-200 hover:border-teal-500 hover:shadow-lg' : 'border-slate-100 hover:border-slate-300 opacity-75 hover:opacity-100'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${hasActivity ? 'bg-teal-50 group-hover:bg-teal-600' : 'bg-slate-100'}`}>
                      <Globe className={`w-5 h-5 transition-all ${hasActivity ? 'text-teal-600 group-hover:text-white' : 'text-slate-400'}`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 transition-colors" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 uppercase mb-2">{country}</h3>

                  {/* Lista de UDNs (igual que sección Países) */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {udns.map(udn => (
                      <span key={udn} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-100 uppercase tracking-wider">
                        {udn}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {nWebinars}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {nCampaigns}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {nEvents}</span>
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {nStandalones}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total servicios</span>
                    <span className={`text-lg font-black ${hasActivity ? 'text-teal-600' : 'text-slate-400'}`}>{total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (currentSection === 'paises') {
      return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => {
                if (selectedCountry) setSelectedCountry(null);
                else setCurrentSection('main');
              }}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-black text-slate-900">Directorio de Países y Clientes</h1>
          </div>

          {selectedCountry ? (
            <CountryDetail country={selectedCountry} webinars={globalWebinars} campaigns={globalCampaigns} events={globalEvents} standalones={globalStandaloneRequests} onNavigate={setCurrentSection} onViewAsClient={setClientReportCountry} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paisesData.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedCountry(item)}
                  className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer relative"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Building2 size={20} />
                    </div>
                    <MoreVertical size={16} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{item.pais}</h3>
                  <p className="text-xs text-slate-500 mb-4 font-medium italic">{item.empresas.join(", ")}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-indigo-600">W</div>
                      <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-purple-600">C</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Click para ver más</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (currentSection === 'webinar') {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-100 min-h-[calc(100vh-80px)]">
           <WebinarApp
             webinars={globalWebinars}
             setWebinars={setGlobalWebinars}
             onBack={() => setCurrentSection('main')}
             onWebinarCreated={onWebinarCreated}
             onWebinarMailToggled={onWebinarMailToggled}
             onWebinarDeleted={onWebinarDeleted}
           />
        </div>
      );
    }

    if (currentSection === 'campaigns') {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-50 min-h-[calc(100vh-80px)]">
           <CampaignsApp
             onBack={() => setCurrentSection('main')}
             campaigns={globalCampaigns}
             setCampaigns={setGlobalCampaigns}
             onCampaignWebinarStepToggled={onCampaignWebinarStepToggled}
             onCampaignDeleted={onCampaignDeleted}
             currentUser={currentUser}
           />
        </div>
      );
    }

    if (currentSection === 'events') {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-50 min-h-[calc(100vh-80px)]">
           <EventsApp onBack={() => setCurrentSection('main')} events={globalEvents} setEvents={setGlobalEvents} campaigns={globalCampaigns} />
        </div>
      );
    }

    if (currentSection === 'facturacion') {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-50 min-h-[calc(100vh-80px)]">
           <FacturacionApp
             onBack={() => setCurrentSection('main')}
             webinars={globalWebinars}
             campaigns={globalCampaigns}
             events={globalEvents}
             standaloneRequests={globalStandaloneRequests}
             onNavigate={setCurrentSection}
           />
        </div>
      );
    }

    if (currentSection === 'content') {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-50 min-h-[calc(100vh-80px)]">
           <ContentHubApp
             onBack={() => setCurrentSection('main')}
             webinars={globalWebinars}
             setWebinars={setGlobalWebinars}
             campaigns={globalCampaigns}
             setCampaigns={setGlobalCampaigns}
             events={globalEvents}
             setEvents={setGlobalEvents}
             standaloneRequests={globalStandaloneRequests}
             requestsLoading={requestsLoading}
             requestsError={requestsError}
             createRequest={createRequest}
             updateRequest={updateRequest}
             removeRequest={removeRequest}
             setRequestStatus={setRequestStatus}
             setRequestOwner={setRequestOwner}
             addRequestComment={addRequestComment}
             removeRequestComment={removeRequestComment}
             addRequestFile={addRequestFile}
             removeRequestFile={removeRequestFile}
             updateRequestContent={updateRequestContent}
             autoNew={contentAutoNew}
             onAutoNewDone={() => setContentAutoNew(false)}
           />
        </div>
      );
    }

    if (currentSection === 'success_cases') {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-50 min-h-[calc(100vh-80px)]">
          <SuccessCasesApp
            onBack={() => setCurrentSection('main')}
            currentUser={currentUser}
            cases={successCases}
            loading={successCasesLoading}
            error={successCasesError}
            createCase={createSuccessCase}
            updateCase={updateSuccessCase}
            removeCase={removeSuccessCase}
          />
        </div>
      );
    }

    if (currentSection === 'my_week') {
      return (
        <div className="relative animate-in fade-in duration-500 w-full h-full bg-slate-50 min-h-[calc(100vh-80px)]">
           <MyWeekApp
             onBack={() => setCurrentSection('main')}
             webinars={globalWebinars}
             setWebinars={setGlobalWebinars}
             campaigns={globalCampaigns}
             setCampaigns={setGlobalCampaigns}
             events={globalEvents}
             setEvents={setGlobalEvents}
             standaloneRequests={globalStandaloneRequests}
             setRequestStatus={setRequestStatus}
             assignedTasks={globalAssignedTasks}
             createAssignedTask={createAssignedTask}
             toggleAssignedTaskDone={toggleAssignedTaskDone}
             deleteAssignedTask={deleteAssignedTask}
             currentUser={currentUser}
             onNavigate={setCurrentSection}
           />
        </div>
      );
    }

    const sectionInfo = sections.find(s => s.id === currentSection);
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <button onClick={() => setCurrentSection('main')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-medium">
          <ArrowLeft size={20} /> Volver al Hub Central
        </button>
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className={`w-20 h-20 ${sectionInfo?.color} rounded-3xl flex items-center justify-center mx-auto mb-6`}>{sectionInfo?.icon}</div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">{sectionInfo?.title}</h2>
          <p className="text-slate-500 text-xl max-w-2xl mx-auto">Próximamente: Integración del código de <strong>{sectionInfo?.title}</strong>.</p>
        </div>
      </div>
    );
  };

  // ─── Notificaciones del usuario logueado (memoizado) ───
  // Lógica pura en src/utils/notifications.js (testeable con vitest).
  // Se recomputa solo cuando cambian las colecciones o el usuario.
  const notifications = useMemo(() => {
    if (!currentUser) return [];
    // Warning si currentUser.name no es del equipo (live de Supabase o fallback constants):
    // en ese caso las notificaciones quedan vacías porque nadie le matchea como owner.
    const validNames = livePeople.length > 0 ? livePeople : PEOPLE;
    if (currentUser.name && !validNames.includes(currentUser.name)) {
      console.warn(
        `[notifications] currentUser.name='${currentUser.name}' no está en el equipo. ` +
        `Las notificaciones no van a aparecer hasta que loggees con uno de: ${validNames.join(', ')}.`,
      );
    }
    return buildNotifications(currentUser, {
      webinars:      globalWebinars,
      campaigns:     globalCampaigns,
      events:        globalEvents,
      requests:      globalStandaloneRequests,
      assignedTasks: globalAssignedTasks,
    }, {
      peopleList:    validNames,
      serviceOwners: liveServiceOwners,
    });
  }, [currentUser, livePeople, liveServiceOwners, globalWebinars, globalEvents, globalCampaigns, globalStandaloneRequests, globalAssignedTasks]);

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  // ─── Búsqueda global ───
  const buildSearchResults = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const results = [];
    const matches = (...fields) => fields.some(f => (f || '').toString().toLowerCase().includes(q));

    (globalWebinars || []).forEach(w => {
      if (matches(w.name, w.client, w.pais, w.unidadNegocio)) {
        results.push({
          id: `w-${w.id}`,
          type: 'Webinar', icon: Video, color: 'bg-blue-50 text-blue-700 border-blue-200',
          title: w.name,
          subtitle: `${w.client || '—'} · ${w.pais || '—'} · ${w.unidadNegocio || '—'}`,
          extra: w.mainDate ? new Date(w.mainDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          navTo: 'webinar'
        });
      }
    });

    (globalCampaigns || []).forEach(c => {
      if (matches(c.name, c.country, c.businessUnit, c.data?.requester)) {
        const typeLabel = c.variant === 'webinar' ? 'Mailings Webinar' :
          c.type === 'email' ? 'Email Marketing' :
          c.type === 'paid' ? 'Paid Media' :
          c.type === 'database' ? 'BBDD' : 'Investigación';
        results.push({
          id: `c-${c.id}`,
          type: 'Campaña', icon: Mail, color: 'bg-purple-50 text-purple-700 border-purple-200',
          title: c.name,
          subtitle: `${typeLabel} · ${c.country || '—'} · ${c.businessUnit || '—'}`,
          extra: c.budget ? `$${Number(c.budget).toLocaleString()}` : '',
          navTo: 'campaigns'
        });
      }
    });

    (globalEvents || []).forEach(ev => {
      if (matches(ev.name, ev.client, ev.country, ev.businessUnit)) {
        results.push({
          id: `e-${ev.id}`,
          type: 'Evento', icon: Calendar, color: 'bg-orange-50 text-orange-700 border-orange-200',
          title: ev.name,
          subtitle: `${ev.client || '—'} · ${ev.country || '—'} · ${ev.businessUnit || '—'}`,
          extra: ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          navTo: 'events'
        });
      }
    });

    (globalStandaloneRequests || []).forEach(r => {
      if (matches(r.name, r.country, r.businessUnit, r.requester)) {
        results.push({
          id: `s-${r.id}`,
          type: 'Pedido', icon: Sparkles, color: 'bg-pink-50 text-pink-700 border-pink-200',
          title: r.name,
          subtitle: `${r.category} · ${r.country || '—'} · ${r.businessUnit || '—'}`,
          extra: r.budget ? `$${Number(r.budget).toLocaleString()}` : '',
          navTo: 'content'
        });
      }
    });

    // Países (matchea solo el nombre del país)
    Object.keys(MARKETS).forEach(country => {
      if (country.toLowerCase().includes(q)) {
        results.push({
          id: `country-${country}`,
          type: 'País', icon: Globe, color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          title: country,
          subtitle: `${(MARKETS[country] || []).length} unidades de negocio`,
          extra: '',
          navTo: 'paises',
          countryName: country
        });
      }
    });

    return results.slice(0, 12); // limitar a 12 resultados
  };

  const searchResults = currentUser ? buildSearchResults() : [];

  // ── Login: sin usuario activo, mostrar pantalla de login ──
  if (!currentUser) {
    return <LoginScreen teamMembers={liveTeam} onLogin={(member) => setCurrentUser(member)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      {/* Modal confirmación logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <LogOut className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase">¿Cerrar sesión?</h3>
              <p className="text-sm text-slate-500">Vas a volver a la pantalla de selección de perfil.</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setCurrentUser(null); setShowLogoutConfirm(false); setCurrentSection('main'); }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-200 transition-all"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <aside className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col sticky h-screen top-0 z-30 shadow-sm">
        {/* Bloque scrolleable: logo + nav. min-h-0 es clave para que overflow funcione dentro de un flex column. */}
        <div className="flex-1 min-h-0 overflow-y-auto p-8">
          <div className="flex items-center gap-3 text-indigo-600 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={24} fill="currentColor" />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-800">MARCOMMS HUB</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setCurrentSection('main'); setSelectedCountry(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${currentSection === 'main' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutDashboard size={20} /> Hub Central
            </button>
            <div className="pt-8 pb-3 px-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operaciones</p>
            </div>
            {sections.map(s => (
              <button 
                key={s.id}
                onClick={() => { setCurrentSection(s.id); setSelectedCountry(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${currentSection === s.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {React.cloneElement(s.icon, { size: 18, className: currentSection === s.id ? 'text-indigo-600' : 'text-slate-400' })} 
                {s.title}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Footer del sidebar: usuario + logout. shrink-0 asegura que no se comprima cuando el nav es largo. */}
        <div className="shrink-0 p-8 border-t border-slate-50 bg-slate-50/30">
          {currentUser ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${currentUser.color} border-2 border-white shadow-md flex items-center justify-center text-white text-sm font-black`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 leading-none truncate">{currentUser.name}</p>
                  <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-wider truncate">{currentUser.team}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full text-[10px] font-black bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3 h-3" /> Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-black">AD</div>
              <div>
                <p className="text-sm font-black text-slate-800 leading-none">Admin Hub</p>
                <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-wider">Global Access</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 px-8 py-4 sticky top-0 z-50 flex items-center justify-between">
          <div ref={searchContainerRef} className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Buscar webinar, evento, campaña, pedido o país..."
              className="w-full pl-12 pr-10 py-3 bg-slate-100/50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-600/10 transition-all text-sm font-medium outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown de resultados */}
            {showSearchResults && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-2 max-h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[60] overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                      {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
                    </span>
                    {searchResults.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">Click para ir al módulo</span>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {searchResults.length === 0 ? (
                      <div className="p-8 text-center">
                        <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin resultados</p>
                        <p className="text-[10px] text-slate-400 mt-1">Probá con otro término</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {searchResults.map(r => {
                          const ResIcon = r.icon;
                          return (
                            <button
                              key={r.id}
                              onClick={() => {
                                setShowSearchResults(false);
                                setSearchQuery('');
                                if (r.countryName) {
                                  setSelectedCountry({ pais: r.countryName });
                                  setCurrentSection('paises');
                                } else if (r.navTo) {
                                  setCurrentSection(r.navTo);
                                }
                              }}
                              className="w-full p-3 hover:bg-slate-50 text-left flex items-center gap-3 transition-colors"
                            >
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${r.color} flex items-center gap-1 shrink-0`}>
                                <ResIcon className="w-2.5 h-2.5" /> {r.type}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-800 leading-tight truncate">{r.title}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                                  {r.subtitle}
                                </p>
                              </div>
                              {r.extra && (
                                <span className="text-[10px] font-black text-slate-600 shrink-0">{r.extra}</span>
                              )}
                              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
            )}
          </div>
          <div ref={notificationsContainerRef} className="flex items-center gap-3 ml-8 relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-3 rounded-2xl transition-all relative ${showNotifications ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
              title={`${unreadCount} notificaciones`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white text-[9px] font-black text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Panel de notificaciones */}
            {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[60] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Notificaciones</h3>
                      </div>
                      <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-indigo-200">
                        {notifications.length}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Para {currentUser.name} · {unreadCount} sin leer
                    </p>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setReadNotifications(new Set(notifications.map(n => n.id)))}
                        className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">¡Todo al día!</p>
                        <p className="text-[10px] text-slate-400 mt-1">Sin notificaciones pendientes</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map(n => {
                          const NotifIcon = n.icon;
                          const isRead = readNotifications.has(n.id);
                          const colorMap = {
                            red: 'bg-red-50 text-red-600 border-red-100',
                            amber: 'bg-amber-50 text-amber-600 border-amber-100',
                            purple: 'bg-purple-50 text-purple-600 border-purple-100',
                            pink: 'bg-pink-50 text-pink-600 border-pink-100',
                            cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100'
                          };
                          return (
                            <button
                              key={n.id}
                              onClick={() => {
                                setReadNotifications(prev => new Set([...prev, n.id]));
                                setShowNotifications(false);
                                if (n.navTo) setCurrentSection(n.navTo);
                              }}
                              className={`w-full p-3 hover:bg-slate-50 text-left flex items-start gap-3 transition-colors ${isRead ? 'opacity-60' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${colorMap[n.color]}`}>
                                <NotifIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-xs font-black text-slate-800 leading-tight">{n.title}</p>
                                  {!isRead && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"></span>}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 truncate">{n.project}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-600">
                                    {n.source}
                                  </span>
                                  {n.date && (
                                    <span className="text-[9px] text-slate-400 font-bold">
                                      {new Date(n.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
            )}

            <div className="h-8 w-px bg-slate-200 mx-2"></div>

            {/* Fast Action: menú con accesos rápidos */}
            <div ref={fastActionContainerRef} className="relative">
              <button
                onClick={() => setShowFastAction(!showFastAction)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  showFastAction ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white hover:bg-indigo-600'
                }`}
              >
                <Zap size={14} className="fill-current" /> ACCIÓN RÁPIDA
              </button>
              {showFastAction && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[60] overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-900">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-300 fill-current" />
                        <h3 className="font-black text-sm text-white uppercase tracking-tight">Acción Rápida</h3>
                      </div>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                        Crear o ir directo
                      </p>
                    </div>
                    <div className="p-2">
                      {[
                        { id: 'webinar',  label: 'Nuevo webinar',         icon: Video,    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',         section: 'webinar' },
                        { id: 'campaign', label: 'Nueva campaña',         icon: Mail,     color: 'bg-purple-50 text-purple-700 hover:bg-purple-100',   section: 'campaigns' },
                        { id: 'event',    label: 'Nuevo evento',          icon: Calendar, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100',   section: 'events' },
                        { id: 'pedido',   label: 'Nuevo pedido Content',  icon: Sparkles, color: 'bg-pink-50 text-pink-700 hover:bg-pink-100',         section: 'content' },
                        { id: 'myweek',   label: 'Mi semana',             icon: Clock,    color: 'bg-amber-50 text-amber-700 hover:bg-amber-100',      section: 'my_week', divider: true },
                        { id: 'paises',   label: 'Vista de países',       icon: Globe,    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', section: 'paises' },
                        { id: 'fact',     label: 'Facturación',           icon: Receipt,  color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', section: 'facturacion' }
                      ].map(action => {
                        const ActionIcon = action.icon;
                        return (
                          <React.Fragment key={action.id}>
                            {action.divider && <div className="my-1 border-t border-slate-100" />}
                            <button
                              onClick={() => {
                                setShowFastAction(false);
                                setCurrentSection(action.section);
                                if (action.id === 'pedido') setContentAutoNew(true);
                              }}
                              className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-colors ${action.color}`}
                            >
                              <ActionIcon className="w-4 h-4 shrink-0" />
                              <span className="text-xs font-black uppercase tracking-wider flex-1 text-left">{action.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}


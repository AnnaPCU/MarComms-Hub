// ════════════════════════════════════════════════════════════════════
// CampanasApp — Hub unificado de Campañas (incluye Webinars como pilar)
// ════════════════════════════════════════════════════════════════════
// Contenedor con barra de filtro por pilar. Reusa WebinarApp y
// CampaignsApp embebidos (sin su header propio).
//
// Pilares: Webinars · Email · Paid Media · BBDD · Investigación
//
// Futuro: Eventos se sumará como un pilar más acá.
// ════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Video, Mail, Target, Database, BarChart3, Calendar } from 'lucide-react';

import WebinarApp from '@/components/webinar/WebinarApp';
import CampaignsApp from '@/components/campaigns/CampaignsApp';
import EventsApp from '@/components/events/EventsApp';

const PILARES = [
  { id: 'webinars', label: 'Webinars',      icon: Video,     accent: 'bg-indigo-600' },
  { id: 'eventos',  label: 'Eventos',       icon: Calendar,  accent: 'bg-orange-600' },
  { id: 'email',    label: 'Email Mkt',     icon: Mail,      accent: 'bg-blue-600' },
  { id: 'paid',     label: 'Paid Media',    icon: Target,    accent: 'bg-amber-600' },
  { id: 'database', label: 'Creación BBDD', icon: Database,  accent: 'bg-emerald-600' },
  { id: 'research', label: 'Investigación', icon: BarChart3, accent: 'bg-purple-600' },
];

export default function CampanasApp({
  onBack,
  // webinars
  webinars, setWebinars, onWebinarCreated, onWebinarMailToggled, onWebinarDeleted,
  // campañas
  campaigns, setCampaigns, onCampaignWebinarStepToggled, onCampaignDeleted,
  // eventos
  events, setEvents,
  currentUser,
  // deep-link
  focusProjectId, onFocusHandled,
}) {
  const [pilar, setPilar] = useState('webinars');

  // Deep-link: al venir desde Mi Semana con un focusProjectId, abrir el
  // pilar correcto (webinar o el tipo de la campaña) antes de pasar el foco.
  const [pendingFocus, setPendingFocus] = useState(null);
  useEffect(() => {
    if (!focusProjectId) return;
    const w = (webinars || []).find(x => String(x.id) === String(focusProjectId));
    if (w) { setPilar('webinars'); setPendingFocus(focusProjectId); return; }
    const ev = (events || []).find(x => String(x.id) === String(focusProjectId));
    if (ev) { setPilar('eventos'); setPendingFocus(focusProjectId); return; }
    const c = (campaigns || []).find(x => String(x.id) === String(focusProjectId));
    if (c) {
      const t = c.variant === 'webinar' ? 'email' : (c.type || 'email');
      setPilar(t);
      setPendingFocus(focusProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusProjectId]);

  // Cuenta por pilar para mostrar en los chips
  const countFor = (id) => {
    if (id === 'webinars') return (webinars || []).length;
    if (id === 'eventos') return (events || []).length;
    return (campaigns || []).filter(c => c.variant !== 'webinar' && c.type === id).length;
  };

  // El foco solo se pasa al hijo activo
  const focusForChild = (childPilar) => (pendingFocus && pilar === childPilar ? pendingFocus : null);
  const clearFocus = () => { setPendingFocus(null); if (onFocusHandled) onFocusHandled(); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* Header unificado + barra de pilares */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 pt-5 pb-3 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white text-purple-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest">CAMPAÑAS</div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight leading-none">Campañas</h1>
              <p className="text-[10px] text-pink-100 font-bold uppercase tracking-widest mt-0.5">Todos los pilares de Marcomms</p>
            </div>
          </div>
        </div>
        {/* Tabs de pilar */}
        <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-2 flex-wrap">
          {PILARES.map(p => {
            const PIco = p.icon;
            const active = pilar === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPilar(p.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  active ? 'bg-white text-purple-700 shadow-md' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <PIco className="w-3.5 h-3.5" />
                {p.label}
                <span className={`ml-0.5 rounded-full px-1.5 text-[9px] ${active ? 'bg-purple-100 text-purple-700' : 'bg-white/20 text-white'}`}>
                  {countFor(p.id)}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Body: render del pilar activo (componentes embebidos) */}
      <div className="flex-1">
        {pilar === 'webinars' && (
          <WebinarApp
            embedded
            webinars={webinars}
            setWebinars={setWebinars}
            onBack={onBack}
            onWebinarCreated={onWebinarCreated}
            onWebinarMailToggled={onWebinarMailToggled}
            onWebinarDeleted={onWebinarDeleted}
            focusProjectId={focusForChild('webinars')}
            onFocusHandled={clearFocus}
          />
        )}
        {pilar === 'eventos' && (
          <EventsApp
            embedded
            events={events}
            setEvents={setEvents}
            campaigns={campaigns}
            onBack={onBack}
            focusProjectId={focusForChild('eventos')}
            onFocusHandled={clearFocus}
          />
        )}
        {['email', 'paid', 'database', 'research'].includes(pilar) && (
          <CampaignsApp
            embedded
            filterType={pilar}
            onBack={onBack}
            campaigns={campaigns}
            setCampaigns={setCampaigns}
            onCampaignWebinarStepToggled={onCampaignWebinarStepToggled}
            onCampaignDeleted={onCampaignDeleted}
            currentUser={currentUser}
            focusProjectId={focusForChild(pilar)}
            onFocusHandled={clearFocus}
          />
        )}
      </div>
    </div>
  );
}

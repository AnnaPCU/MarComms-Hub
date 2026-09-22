// ════════════════════════════════════════════════════════════════════
// PortalHome — Inicio del Portal Cliente (unifica "Países" y "Portal")
// ════════════════════════════════════════════════════════════════════
// Dos unidades activas, cada una con sus alcances:
//   · Control Union Certificaciones → un dashboard por país
//   · Peterson Solutions            → Iberoamérica, Global o un país puntual
// Clic en un alcance abre el dashboard (ClientReportApp).
//
// Props:
//   webinars, campaigns, events, requests — colecciones globales
//   unitId, onUnitChange(id)              — unidad seleccionada (controlado)
//   onOpenScope(scope)                    — abrir dashboard del alcance
// ════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { Building2, Calendar, ChevronRight, Globe, Layers, Mail, Sparkles, Video } from 'lucide-react';
import { PORTAL_UNITS, scopeMatches } from '@/constants/markets';

export default function PortalHome({ webinars, campaigns, events, requests, unitId, onUnitChange, onOpenScope }) {
  const unit = PORTAL_UNITS.find((u) => u.id === unitId) || PORTAL_UNITS[0];

  // Conteo de servicios por alcance (solo para la tarjeta)
  const counts = useMemo(() => {
    const acc = {};
    unit.scopes.forEach((s) => {
      const n = (arr, cKey, bKey) => (arr || []).filter((x) => scopeMatches(s, x[cKey], x[bKey])).length;
      acc[s.id] = {
        webinars: n(webinars, 'pais', 'unidadNegocio'),
        campaigns: n(campaigns, 'country', 'businessUnit'),
        events: n(events, 'country', 'businessUnit'),
        requests: n(requests, 'country', 'businessUnit'),
      };
      acc[s.id].total = acc[s.id].webinars + acc[s.id].campaigns + acc[s.id].events + acc[s.id].requests;
    });
    return acc;
  }, [unit, webinars, campaigns, events, requests]);

  return (
    <div className="space-y-6">
      {/* Unidades activas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PORTAL_UNITS.map((u) => {
          const active = u.id === unit.id;
          return (
            <button
              key={u.id}
              onClick={() => onUnitChange(u.id)}
              className={`text-left rounded-2xl border-2 p-5 transition-all ${active ? `${u.activeCls} shadow-md` : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${active ? 'bg-white/20 text-white' : `${u.softCls}`}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-black leading-tight ${active ? 'text-white' : 'text-slate-800'}`}>{u.label}</p>
                  <p className={`text-[11px] font-bold mt-0.5 ${active ? 'text-white/80' : 'text-slate-500'}`}>{u.description}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {u.scopes.length} {u.scopeNoun}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Alcances de la unidad */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{unit.scopesTitle}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {unit.scopes.map((s) => {
            const c = counts[s.id];
            const hasActivity = c.total > 0;
            const Icon = s.kind === 'region' ? Layers : s.kind === 'global' ? Globe : Building2;
            return (
              <button
                key={s.id}
                onClick={() => onOpenScope({ ...s, unitId: unit.id, unitLabel: unit.label, units: unit.units })}
                className={`group text-left bg-white p-5 rounded-2xl border transition-all ${hasActivity ? 'border-slate-200 hover:border-teal-500 hover:shadow-lg' : 'border-slate-100 hover:border-slate-300 opacity-80 hover:opacity-100'} ${s.kind !== 'country' ? 'md:col-span-2 lg:col-span-1' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${hasActivity ? 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 transition-colors" />
                </div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">{s.label}</h3>
                {s.hint && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{s.hint}</p>}
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-3 mt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1" title="Webinars"><Video className="w-3 h-3" /> {c.webinars}</span>
                  <span className="flex items-center gap-1" title="Pilares"><Mail className="w-3 h-3" /> {c.campaigns}</span>
                  <span className="flex items-center gap-1" title="Eventos"><Calendar className="w-3 h-3" /> {c.events}</span>
                  <span className="flex items-center gap-1" title="Pedidos"><Sparkles className="w-3 h-3" /> {c.requests}</span>
                  <span className={`ml-auto text-sm font-black ${hasActivity ? 'text-teal-600' : 'text-slate-400'}`}>{c.total}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

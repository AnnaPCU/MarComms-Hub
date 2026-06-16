// ════════════════════════════════════════════════════════════════════
// ExtrasApp — Zona de mini-soluciones que ayudan a MarComms
// ════════════════════════════════════════════════════════════════════
// Grilla de herramientas. La primera funcional es el UTM Repository
// (generador + repositorio de UTMs reutilizables). Las demás figuran
// como "Próximamente" y no redirigen.
//
// Props: onBack, currentUser
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, Link2, Sparkles, Clock, ChevronRight } from 'lucide-react';
import MarcommsUtmBuilder from '@/components/shared/MarcommsUtmBuilder';

// Herramientas disponibles. `soon: true` = card deshabilitada "Próximamente".
const TOOLS = [
  {
    id: 'utm_repository',
    title: 'UTM Repository',
    description: 'Generá UTMs y reutilizá los ya creados por el equipo.',
    icon: Link2,
    color: 'from-purple-500 to-indigo-500',
    soon: false,
  },
  { id: 'soon_1', title: 'Próximamente', description: 'Nueva mini-solución en camino.', icon: Sparkles, color: 'from-slate-300 to-slate-400', soon: true },
  { id: 'soon_2', title: 'Próximamente', description: 'Nueva mini-solución en camino.', icon: Sparkles, color: 'from-slate-300 to-slate-400', soon: true },
  { id: 'soon_3', title: 'Próximamente', description: 'Nueva mini-solución en camino.', icon: Sparkles, color: 'from-slate-300 to-slate-400', soon: true },
];

export default function ExtrasApp({ onBack, currentUser }) {
  const [tool, setTool] = useState(null); // null = grilla, 'utm_repository' = abierta

  // ── Vista: UTM Repository ──
  if (tool === 'utm_repository') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col w-full">
        <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 sticky top-0 z-30 shadow-xl">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button onClick={() => setTool(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white text-indigo-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> EXTRAS
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">UTM Repository</h1>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">Generá y reutilizá UTMs del equipo</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto w-full p-6">
          <MarcommsUtmBuilder accentColor="indigo" currentUser={currentUser} />
        </main>
      </div>
    );
  }

  // ── Vista: grilla de herramientas ──
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white text-slate-800 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> EXTRAS
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Extras</h1>
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Mini-soluciones que ayudan a MarComms</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            if (t.soon) {
              return (
                <div key={t.id} className="bg-white/60 rounded-2xl p-5 border-2 border-dashed border-slate-200 relative opacity-70 cursor-not-allowed">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-3 opacity-60`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-black text-slate-500 text-sm uppercase leading-tight mb-1">{t.title}</h3>
                  <p className="text-[11px] font-medium text-slate-400">{t.description}</p>
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                    <Clock className="w-2.5 h-2.5" /> Próximamente
                  </span>
                </div>
              );
            }
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className="text-left bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:shadow-lg transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-slate-800 text-sm uppercase leading-tight mb-1">{t.title}</h3>
                <p className="text-[11px] font-medium text-slate-500 mb-3">{t.description}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  Abrir <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

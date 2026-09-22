// ════════════════════════════════════════════════════════════════════
// ExtrasApp — UTM Generator
// ════════════════════════════════════════════════════════════════════
// Desde sep 2026 la sección "Extras" es únicamente el UTM Generator
// (generador + repositorio de UTMs reutilizables). La grilla de
// mini-soluciones "Próximamente" se eliminó.
//
// Props: onBack, currentUser
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowLeft, Link2 } from 'lucide-react';
import MarcommsUtmBuilder from '@/components/shared/MarcommsUtmBuilder';

export default function ExtrasApp({ onBack, currentUser }) {
  // Única herramienta: UTM Generator (antes 'Extras' con grilla de mini-soluciones)
  const tool = 'utm_repository';
  if (tool === 'utm_repository') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col w-full">
        <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 sticky top-0 z-30 shadow-xl">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white text-indigo-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> HERRAMIENTA
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">UTM Generator</h1>
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

  // Desde sep 2026 Extras es solo el UTM Generator: no hay grilla.
  return null;
}

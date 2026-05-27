// ════════════════════════════════════════════════════════════════════
// LoginScreen — Pantalla de login compartido
// ════════════════════════════════════════════════════════════════════
// 9 miembros del equipo en grid (5 cols en desktop).
// Click en miembro → modal con input de password.
// Password compartida del archivo .env (VITE_SHARED_PASSWORD).
//
// Props:
//   onLogin(member): callback cuando login es exitoso
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Sparkles, Lock, Eye, EyeOff, AlertCircle, X, ChevronRight } from 'lucide-react';
import { TEAM_MEMBERS } from '@/constants/team';
import { checkPassword } from '@/services/auth';

export default function LoginScreen({ onLogin }) {
  const [hoveredMember, setHoveredMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    if (checkPassword(password)) {
      onLogin(selectedMember);
    } else {
      setError('Password incorrecta. Intentalo de nuevo.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-sm tracking-widest shadow-2xl">
              MARCOMMS HUB
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
            ¿Quién entra hoy?
          </h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            Seleccioná tu perfil para acceder al hub
          </p>
        </div>

        {/* Equipo unificado */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Equipo Marcomms</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Marketing + Comunicación
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">
              {TEAM_MEMBERS.length} miembros
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {TEAM_MEMBERS.map((member) => {
              const isHovered = hoveredMember === member.name;
              const teamShort = member.team === 'Comunicación' ? 'COMMS' : 'MKT';
              const teamChipColor = member.team === 'Comunicación'
                ? 'bg-pink-500/20 text-pink-300 border-pink-400/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-400/30';
              return (
                <button
                  key={member.name}
                  onClick={() => {
                    setSelectedMember(member);
                    setPassword('');
                    setError('');
                  }}
                  onMouseEnter={() => setHoveredMember(member.name)}
                  onMouseLeave={() => setHoveredMember(null)}
                  className={`group relative bg-white/5 hover:bg-white/10 border-2 rounded-2xl p-4 transition-all overflow-hidden ${
                    isHovered ? 'border-white/40 scale-105 shadow-2xl' : 'border-white/10'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-0 group-hover:opacity-20 transition-opacity`} />
                  <div className="relative flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-white font-black text-xl shadow-xl group-hover:scale-110 transition-transform`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white uppercase tracking-wide">{member.name}</p>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${teamChipColor}`}>
                        {teamShort}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Marcomms Hub · v2026 · Acceso restringido al equipo
          </p>
        </div>
      </div>

      {/* Modal de password */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => { setSelectedMember(null); setPassword(''); setError(''); }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-gradient-to-br ${selectedMember.color} p-8 text-center relative`}>
              <button
                onClick={() => { setSelectedMember(null); setPassword(''); setError(''); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-white font-black text-3xl shadow-xl mx-auto mb-3">
                {selectedMember.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">¡Hola, {selectedMember.name}!</h2>
              <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">
                {selectedMember.team} · {selectedMember.role}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Password de acceso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password.trim()) handleSubmit();
                    }}
                    placeholder="Ingresá la password"
                    className={`w-full pl-10 pr-12 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold text-slate-700 transition-colors ${
                      error ? 'border-red-300 focus:border-red-500' : 'border-slate-100 focus:border-slate-400'
                    }`}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && (
                  <p className="text-[11px] font-bold text-red-600 mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!password.trim()}
                className={`w-full bg-gradient-to-r ${selectedMember.color} hover:opacity-90 disabled:opacity-40 text-white p-3.5 rounded-xl font-black uppercase text-sm tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg`}
              >
                Ingresar al Hub <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => { setSelectedMember(null); setPassword(''); setError(''); }}
                className="w-full text-slate-400 hover:text-slate-700 text-[11px] font-bold uppercase tracking-widest py-2"
              >
                ← Cambiar de usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

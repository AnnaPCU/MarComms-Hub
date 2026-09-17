// ════════════════════════════════════════════════════════════════════
// WorldDaysCalendar — Calendario de días mundiales (módulo Social Media)
// ════════════════════════════════════════════════════════════════════
// Lista los próximos 12 meses de días mundiales relacionados a
// sustentabilidad y certificación, agrupados por mes, con filtro por
// temática. Muestra para cada día la fecha del aviso a la responsable
// (3 días hábiles antes) y resalta los que ya están en ventana de aviso.
//
// Props:
//   todayIso   — YYYY-MM-DD (default: hoy). Se pasa para tests/preview.
//   theme      — temática seleccionada ('all' | id) — controlado
//   onThemeChange(themeId)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { Bell, CalendarDays, Sparkles } from 'lucide-react';

import {
  WORLD_DAY_THEMES,
  WORLD_DAYS_NOTIFY_USER,
  WORLD_DAYS_NOTICE_BUSINESS_DAYS,
} from '@/constants/worldDays';
import { TEAM_MEMBERS } from '@/constants/team';
import { upcomingWorldDays, groupByMonth } from '@/utils/worldDays';
import { formatDate, todayIso as getTodayIso } from '@/utils/date';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

const countdownLabel = (daysLeft) => {
  if (daysLeft === 0) return 'Es hoy';
  if (daysLeft === 1) return 'Mañana';
  return `En ${daysLeft} días`;
};

export default function WorldDaysCalendar({ todayIso, theme = 'all', onThemeChange }) {
  const today = todayIso || getTodayIso();
  const notifyShort = TEAM_MEMBERS.find(m => m.name === WORLD_DAYS_NOTIFY_USER)?.short || WORLD_DAYS_NOTIFY_USER;

  const all = useMemo(() => upcomingWorldDays(today), [today]);
  const filtered = useMemo(() => (theme === 'all' ? all : all.filter(d => d.theme === theme)), [all, theme]);
  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const active = useMemo(() => all.filter(d => d.noticeActive), [all]);

  // Conteo por temática (para los chips)
  const countByTheme = useMemo(() => {
    const acc = {};
    all.forEach(d => { acc[d.theme] = (acc[d.theme] || 0) + 1; });
    return acc;
  }, [all]);

  return (
    <div className="space-y-5">
      {/* Cabecera + regla del aviso */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Calendario de días mundiales</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {filtered.length} fechas en los próximos 12 meses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 text-pink-700 px-3 py-2 rounded-xl">
          <Bell className="w-3.5 h-3.5 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-wider">
            Aviso a {notifyShort} {WORLD_DAYS_NOTICE_BUSINESS_DAYS} días hábiles antes de cada fecha
          </p>
        </div>
      </div>

      {/* Avisos activos hoy */}
      {active.length > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-2xl p-4">
          <p className="text-[10px] font-black text-pink-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> En ventana de aviso ahora
          </p>
          <div className="flex flex-wrap gap-2">
            {active.map(d => (
              <span key={d.id} className="bg-white border border-pink-200 text-slate-800 text-[11px] font-black px-3 py-1.5 rounded-lg flex items-center gap-2">
                {d.name}
                <span className="text-[9px] font-black uppercase tracking-wider text-pink-600">{countdownLabel(d.daysLeft)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por temática */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onThemeChange && onThemeChange('all')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
            theme === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
          }`}
        >
          Todas las temáticas · {all.length}
        </button>
        {WORLD_DAY_THEMES.map(t => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onThemeChange && onThemeChange(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                isActive ? `${t.color} ring-2 ring-offset-1 ring-slate-300` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
              {t.label} · {countByTheme[t.id] || 0}
            </button>
          );
        })}
      </div>

      {/* Lista por mes */}
      {groups.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay fechas para esta temática</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">{monthLabel(g.key)}</h3>
                <span className="text-[10px] font-black bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-full">{g.items.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {g.items.map(d => {
                  const t = d.themeInfo;
                  return (
                    <div
                      key={`${d.id}-${d.date}`}
                      className={`px-4 py-3 flex items-start gap-4 ${d.noticeActive ? 'bg-pink-50/60' : ''}`}
                    >
                      {/* Fecha grande */}
                      <div className="w-14 shrink-0 text-center">
                        <p className="text-2xl font-black text-slate-800 leading-none font-mono">{d.date.slice(8, 10)}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{MONTHS[Number(d.date.slice(5, 7)) - 1].slice(0, 3)}</p>
                      </div>

                      {/* Nombre + nota */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-slate-800 leading-tight">{d.name}</h4>
                          {t && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${t.color}`}>
                              {t.label}
                            </span>
                          )}
                          {d.noticeActive && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-pink-600 text-white">
                              {countdownLabel(d.daysLeft)}
                            </span>
                          )}
                        </div>
                        {d.note && <p className="text-[11px] text-slate-500 mt-1 leading-snug">{d.note}</p>}
                      </div>

                      {/* Aviso */}
                      <div className="shrink-0 text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1">
                          <Bell className="w-3 h-3" /> Aviso a {notifyShort}
                        </p>
                        <p className="text-[11px] font-black text-slate-700 font-mono">{formatDate(d.noticeDate)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

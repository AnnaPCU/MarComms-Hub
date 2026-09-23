// ════════════════════════════════════════════════════════════════════
// WorldDaysCalendar — Calendario de días mundiales (módulo Social Media)
// ════════════════════════════════════════════════════════════════════
// Grilla mensual (lunes a domingo) con los días mundiales de
// sustentabilidad y certificación. Se navega mes a mes, se filtra por
// temática con un desplegable y, al cliquear una fecha, el panel lateral
// muestra el detalle (temática, países donde repercute más, cuentas desde
// las que publicar, nota, día del aviso a la responsable).
// Sin selección, el panel lista las próximas fechas.
//
// Además muestra:
//   - los posteos de la hoja que tienen fecha de publicación pactada
//     (pill violeta con la cuenta), en el día correspondiente
//   - el bloque semanal de análisis de competencia (COMPETITION_REVIEW)
//     como zona reservada, todos los martes de 16 a 17 h
//
// Props:
//   todayIso   — YYYY-MM-DD (default: hoy). Se pasa para tests/preview.
//   theme      — temática seleccionada ('all' | id) — controlado
//   onThemeChange(themeId)
//   posts, accounts — de useSocialPosts (opcionales)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Globe, MapPin, Search, X } from 'lucide-react';

import {
  WORLD_DAY_THEMES,
  WORLD_DAY_THEME_BY_ID,
  WORLD_DAYS_NOTIFY_USER,
  WORLD_DAYS_NOTICE_BUSINESS_DAYS,
} from '@/constants/worldDays';
import { TEAM_MEMBERS } from '@/constants/team';
import { COMPETITION_REVIEW, POST_STATUS_BY_ID } from '@/constants/socialPosts';
import { isCompetitionReviewDay } from '@/utils/socialPosts';
import { worldDaysInMonth, monthGrid, upcomingWorldDays, worldDayCountries, worldDayCountriesText, accountsForWorldDay, isGlobalWorldDay } from '@/utils/worldDays';
import { formatDate, todayIso as getTodayIso } from '@/utils/date';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_PILLS = 2; // pills visibles por celda antes del "+n"

const countdown = (daysLeft) => {
  if (daysLeft === 0) return 'Es hoy';
  if (daysLeft === 1) return 'Es mañana';
  if (daysLeft > 1) return `En ${daysLeft} días`;
  return 'Ya pasó';
};

export default function WorldDaysCalendar({ todayIso, theme = 'all', onThemeChange, posts = [], accounts = [] }) {
  const today = todayIso || getTodayIso();
  const notifyShort = TEAM_MEMBERS.find(m => m.name === WORLD_DAYS_NOTIFY_USER)?.short || WORLD_DAYS_NOTIFY_USER;

  const [cursor, setCursor] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
  const [selected, setSelected] = useState(null); // día mundial decorado

  const isCurrentMonth = cursor.year === Number(today.slice(0, 4)) && cursor.month === Number(today.slice(5, 7));

  const goMonth = (delta) => {
    setCursor(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
    setSelected(null);
  };
  const goToday = () => {
    setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
    setSelected(null);
  };

  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const monthDays = useMemo(() => worldDaysInMonth(cursor.year, cursor.month, today, { theme }), [cursor, today, theme]);
  const byDate = useMemo(() => {
    const acc = {};
    monthDays.forEach(d => { (acc[d.date] = acc[d.date] || []).push(d); });
    return acc;
  }, [monthDays]);

  // Posteos con fecha de publicación pactada, por día
  const postsByDate = useMemo(() => {
    const byId = {};
    (accounts || []).forEach((a) => { byId[a.id] = a; });
    const acc = {};
    (posts || []).forEach((p) => {
      if (!p.publishDate) return;
      (acc[p.publishDate] = acc[p.publishDate] || []).push({ ...p, account: byId[p.accountId] });
    });
    return acc;
  }, [posts, accounts]);
  const [selectedPost, setSelectedPost] = useState(null);

  // Próximas fechas (independiente del mes que se está mirando)
  const upcoming = useMemo(() => upcomingWorldDays(today, { theme }).slice(0, 6), [today, theme]);

  const renderPill = (d, compact = true) => {
    const t = d.themeInfo;
    const isSel = selected && selected.id === d.id && selected.date === d.date;
    return (
      <button
        key={`${d.id}-${d.date}`}
        onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : d); }}
        title={`${d.name} · ${worldDayCountriesText(d, 4)}`}
        className={`w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold leading-tight truncate transition-all ${t ? t.color : 'bg-slate-50 text-slate-600 border-slate-200'} ${isSel ? 'ring-2 ring-pink-400' : 'hover:brightness-95'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t ? t.dot : 'bg-slate-400'}`} />
        <span className="truncate">{compact ? (d.short || d.name) : d.name}</span>
        {d.noticeActive && <Bell className="w-2.5 h-2.5 shrink-0 ml-auto text-pink-600" />}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
      {/* ── Calendario ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Barra superior: mes + navegación + filtro */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => goMonth(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600" title="Mes anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => goMonth(1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600" title="Mes siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-base font-black text-slate-800 tracking-tight">
            {MONTHS[cursor.month - 1]} <span className="text-slate-400 font-bold">{cursor.year}</span>
          </h2>
          {!isCurrentMonth && (
            <button onClick={goToday} className="text-[10px] font-black uppercase tracking-wider text-pink-600 hover:text-pink-700 px-2 py-1 rounded-md hover:bg-pink-50">
              Hoy
            </button>
          )}
          <div className="flex-1" />
          <select
            value={theme}
            onChange={e => { onThemeChange && onThemeChange(e.target.value); setSelected(null); }}
            className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="all">Todas las temáticas</option>
            {WORLD_DAY_THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* Cabecera de días */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {WEEKDAYS.map(w => (
            <div key={w} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{w}</div>
          ))}
        </div>

        {/* Grilla */}
        <div className="grid grid-cols-7">
          {weeks.flat().map((cell, idx) => {
            const items = byDate[cell.iso] || [];
            const isToday = cell.iso === today;
            const extra = items.length - MAX_PILLS;
            return (
              <div
                key={cell.iso}
                onClick={() => setSelected(items.length === 1 ? items[0] : null)}
                className={`min-h-[92px] p-1.5 border-b border-r border-slate-100 flex flex-col gap-1 ${idx % 7 === 6 ? 'border-r-0' : ''} ${cell.inMonth ? 'bg-white' : 'bg-slate-50/60'} ${isToday ? 'bg-pink-50/50' : ''}`}
              >
                <span className={`self-end w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-mono font-bold ${
                  isToday ? 'bg-pink-600 text-white' : cell.inMonth ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  {cell.day}
                </span>
                {isCompetitionReviewDay(cell.iso) && cell.inMonth && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-slate-300 bg-slate-100 text-slate-500 text-[9px] font-bold leading-tight" title={`${COMPETITION_REVIEW.label} · ${COMPETITION_REVIEW.start} a ${COMPETITION_REVIEW.end}`}>
                    <Search className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{COMPETITION_REVIEW.short}</span>
                  </div>
                )}
                {(postsByDate[cell.iso] || []).map(p => {
                  const st = POST_STATUS_BY_ID[p.status];
                  return (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); setSelected(null); setSelectedPost(p); }}
                      title={`${p.account?.name || ''}: ${p.title}`}
                      className={`w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold leading-tight truncate ${st ? st.color : 'bg-violet-50 text-violet-700 border-violet-200'} ${selectedPost?.id === p.id ? 'ring-2 ring-pink-400' : ''}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st ? st.dot : 'bg-violet-500'}`} />
                      <span className="truncate">{p.account?.name ? `${p.account.name}: ` : ''}{p.title}</span>
                    </button>
                  );
                })}
                {items.slice(0, MAX_PILLS).map(d => renderPill(d))}
                {extra > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(items[MAX_PILLS]); }}
                    className="text-[9px] font-black text-slate-400 hover:text-pink-600 text-left px-1"
                  >
                    +{extra} más
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie: regla del aviso */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <Bell className="w-3 h-3 text-pink-600 shrink-0" />
          Aviso a {notifyShort} {WORLD_DAYS_NOTICE_BUSINESS_DAYS} días hábiles antes de cada fecha. La campanita marca las que ya están en ventana de aviso.
          <span className="text-slate-300">·</span>
          <Search className="w-3 h-3 shrink-0" /> Bloque de competencia los martes de {COMPETITION_REVIEW.start} a {COMPETITION_REVIEW.end}.
        </div>
      </div>

      {/* ── Panel lateral ── */}
      <aside className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 lg:sticky lg:top-28">
        {selectedPost ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Posteo · {formatDate(selectedPost.publishDate)}</p>
                <h3 className="text-sm font-black text-slate-800 leading-snug mt-0.5">{selectedPost.title}</h3>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">{selectedPost.account?.group} · {selectedPost.account?.name}</p>
              </div>
              <button onClick={() => setSelectedPost(null)} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {POST_STATUS_BY_ID[selectedPost.status] && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${POST_STATUS_BY_ID[selectedPost.status].solid}`}>{POST_STATUS_BY_ID[selectedPost.status].label}</span>
              )}
              {selectedPost.theme && WORLD_DAY_THEME_BY_ID[selectedPost.theme] && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${WORLD_DAY_THEME_BY_ID[selectedPost.theme].color}`}>{WORLD_DAY_THEME_BY_ID[selectedPost.theme].label}</span>
              )}
            </div>
            {selectedPost.notes && <p className="text-xs text-slate-600 leading-relaxed">{selectedPost.notes}</p>}
            {selectedPost.link && <a href={selectedPost.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all">{selectedPost.link}</a>}
            <p className="text-[10px] text-slate-400">Se edita desde la pestaña Posteos.</p>
          </>
        ) : selected ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">{formatDate(selected.date)}</p>
                <h3 className="text-sm font-black text-slate-800 leading-snug mt-0.5">{selected.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {selected.themeInfo && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${selected.themeInfo.color}`}>
                  {selected.themeInfo.label}
                </span>
              )}
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${selected.daysLeft >= 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {countdown(selected.daysLeft)}
              </span>
            </div>
            {selected.note && <p className="text-xs text-slate-600 leading-relaxed">{selected.note}</p>}
            <WorldDayTargets day={selected} accounts={accounts} />
            <div className={`rounded-xl border p-3 flex items-center gap-2 ${selected.noticeActive ? 'bg-pink-50 border-pink-200' : 'bg-slate-50 border-slate-100'}`}>
              <Bell className={`w-4 h-4 shrink-0 ${selected.noticeActive ? 'text-pink-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Aviso a {notifyShort}</p>
                <p className="text-xs font-black text-slate-800 font-mono">{formatDate(selected.noticeDate)}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximas fechas</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-400">No hay fechas para esta temática.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map(d => (
                  <li key={`${d.id}-${d.date}`}>
                    <button
                      onClick={() => { setCursor({ year: Number(d.date.slice(0, 4)), month: Number(d.date.slice(5, 7)) }); setSelected(d); }}
                      className="w-full text-left py-2 flex items-start gap-3 hover:bg-slate-50 rounded-lg px-1 transition-colors"
                    >
                      <div className="w-9 shrink-0 text-center">
                        <p className="text-base font-black text-slate-800 leading-none font-mono">{d.date.slice(8, 10)}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400">{MONTHS[Number(d.date.slice(5, 7)) - 1].slice(0, 3)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{d.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${d.themeInfo?.dot || 'bg-slate-400'}`} />
                          {d.themeInfo?.label}
                          {d.noticeActive && <span className="text-pink-600 font-black">· {countdown(d.daysLeft)}</span>}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                          {isGlobalWorldDay(d) ? <Globe className="w-3 h-3 text-slate-400 shrink-0" /> : <MapPin className="w-3 h-3 text-pink-500 shrink-0" />}
                          <span className="truncate">{worldDayCountriesText(d)}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

// ── Países donde repercute más + cuentas desde las que publicar ──
// Global → "Todos los países" y todas las cuentas activas.
// Con países → chips por país y solo las cuentas de esos países.
function WorldDayTargets({ day, accounts }) {
  const global = isGlobalWorldDay(day);
  const countries = worldDayCountries(day);
  const targets = accountsForWorldDay(day, accounts);
  // Agrupar cuentas por grupo (CU Latinoamérica, PS Iberia & America…)
  const byGroup = targets.reduce((acc, a) => {
    (acc[a.group || 'Otras'] = acc[a.group || 'Otras'] || []).push(a.name);
    return acc;
  }, {});
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
          {global ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3 text-pink-500" />}
          {global ? 'Repercute en' : 'Repercute más en'}
        </p>
        {global ? (
          <p className="text-xs font-black text-slate-800 mt-1">Todos los países · día global</p>
        ) : (
          <div className="flex flex-wrap gap-1 mt-1">
            {countries.map((c) => (
              <span key={c} className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white border border-pink-200 text-pink-700">{c}</span>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cuentas para publicar</p>
        {(accounts || []).length === 0 ? (
          <p className="text-[11px] text-slate-400 mt-1">Sin cuentas cargadas.</p>
        ) : global ? (
          <p className="text-[11px] font-bold text-slate-700 mt-1">Todas las cuentas activas ({targets.length})</p>
        ) : targets.length === 0 ? (
          <p className="text-[11px] text-slate-400 mt-1">Ninguna cuenta de LinkedIn en esos países.</p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {Object.entries(byGroup).map(([group, names]) => (
              <li key={group} className="text-[11px] leading-snug">
                <span className="font-black text-slate-500">{group}:</span>{' '}
                <span className="font-bold text-slate-800">{names.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

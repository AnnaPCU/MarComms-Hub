// ════════════════════════════════════════════════════════════════════
// SOCIAL POSTS UTILS — Semanas del mes, conteos y avisos de posteo faltante
// ════════════════════════════════════════════════════════════════════
// Sin React. Recibe "hoy" como parámetro para ser testeable.
//
// Regla de semanas: las semanas van de lunes a domingo y pertenecen al
// mes en el que cae su jueves (regla ISO). Así ninguna semana aparece en
// dos meses y "4 posteos por mes" son 4 o 5 columnas según el mes.
// ════════════════════════════════════════════════════════════════════

import { addBusinessDays, addDays, daysBetween, toIsoDate } from './date';
import {
  MISSING_POST_GRACE_BUSINESS_DAYS,
  COMPETITION_REVIEW_WEEKDAY,
  postsPerMonthFor,
} from '@/constants/socialPosts';

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Lunes de la semana que contiene la fecha
export const mondayOf = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const offset = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - offset);
  return toIsoDate(d);
};

// "YYYY-MM" del mes al que pertenece la semana (mes de su jueves)
export const monthKeyOfWeek = (weekStartIso) => addDays(weekStartIso, 3).slice(0, 7);

// Semanas de un mes: [{ index (1..n), start, end, label }]
export const weeksOfMonth = (year, month) => {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const weeks = [];
  // Arrancar desde el lunes de la semana del día 1 y avanzar hasta salir del mes
  let start = mondayOf(`${key}-01`);
  for (let i = 0; i < 7; i++) {
    if (monthKeyOfWeek(start) === key) {
      const end = addDays(start, 6);
      weeks.push({ index: weeks.length + 1, start, end, label: weekLabel(start, end) });
    } else if (weeks.length > 0) {
      break;
    }
    start = addDays(start, 7);
  }
  return weeks;
};

// "7–13 sep" o "31 ago–6 sep" cuando cruza de mes
export const weekLabel = (startIso, endIso) => {
  const s = new Date(startIso + 'T00:00:00');
  const e = new Date(endIso + 'T00:00:00');
  const sm = MONTHS_SHORT[s.getMonth()];
  const em = MONTHS_SHORT[e.getMonth()];
  return sm === em
    ? `${s.getDate()}–${e.getDate()} ${sm}`
    : `${s.getDate()} ${sm}–${e.getDate()} ${em}`;
};

// Cuántos posteos deberían existir acumulados al cierre de la semana k
// (de n) para un plan. Con 4 por mes y 4 semanas: 1, 2, 3, 4.
// Con 2 por mes y 4 semanas: 1, 1, 2, 2. Con 0 → nunca falta nada.
export const expectedPostsBy = (plan, weekIndex, weeksCount) => {
  const perMonth = postsPerMonthFor(plan);
  if (!perMonth || !weeksCount) return 0;
  return Math.ceil((perMonth * weekIndex) / weeksCount);
};

// Índice { [accountId]: { [weekStart]: [posts] } }
export const indexPosts = (posts) => {
  const idx = {};
  (posts || []).forEach((p) => {
    if (!p.accountId || !p.weekStart) return;
    (idx[p.accountId] = idx[p.accountId] || {})[p.weekStart] =
      [...((idx[p.accountId] || {})[p.weekStart] || []), p];
  });
  return idx;
};

// Resumen del mes para una cuenta: total, esperado y por semana
export const accountMonthSummary = (account, posts, weeks) => {
  const byWeek = weeks.map((w) => (posts || []).filter((p) => p.accountId === account.id && p.weekStart === w.start));
  const count = byWeek.reduce((n, arr) => n + arr.length, 0);
  const expected = postsPerMonthFor(account.plan);
  return { count, expected, byWeek, missing: Math.max(0, expected - count) };
};

/**
 * Avisos de posteo faltante para `todayIso`.
 * Mira el mes actual y el anterior. Para cada cuenta con plan y cada
 * semana ya cerrada (+ margen hábil), compara acumulado real vs esperado.
 * Devuelve un aviso por cuenta y semana en falta, del más reciente al
 * más viejo.
 */
export const missingPostAlerts = (accounts, posts, todayIso) => {
  const alerts = [];
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7));
  const prev = new Date(year, month - 2, 1);
  const months = [[prev.getFullYear(), prev.getMonth() + 1], [year, month]];

  (accounts || []).filter((a) => a.active !== false && postsPerMonthFor(a.plan) > 0).forEach((account) => {
    months.forEach(([y, m]) => {
      const weeks = weeksOfMonth(y, m);
      let cumulative = 0;
      weeks.forEach((w) => {
        const actualThisWeek = (posts || []).filter((p) => p.accountId === account.id && p.weekStart === w.start).length;
        cumulative += actualThisWeek;
        const alertDate = addBusinessDays(w.end, MISSING_POST_GRACE_BUSINESS_DAYS);
        if (alertDate > todayIso) return; // la semana todavía no cerró (o está en margen)
        const expected = expectedPostsBy(account.plan, w.index, weeks.length);
        if (cumulative < expected) {
          alerts.push({
            account, week: w, monthKey: `${y}-${String(m).padStart(2, '0')}`,
            expected, actual: cumulative, alertDate,
            daysAgo: daysBetween(w.end, todayIso),
          });
        }
      });
    });
  });
  return alerts.sort((a, b) => (a.week.start < b.week.start ? 1 : -1));
};

// ¿Es el día del bloque de análisis de competencia?
export const isCompetitionReviewDay = (iso) => new Date(iso + 'T00:00:00').getDay() === COMPETITION_REVIEW_WEEKDAY;

// ¿Hoy toca el recordatorio semanal? Se muestra el día anterior (aviso
// "es mañana") y el día mismo ("es hoy").
export const competitionReviewActive = (todayIso) => {
  const dow = new Date(todayIso + 'T00:00:00').getDay();
  return dow === COMPETITION_REVIEW_WEEKDAY || dow === (COMPETITION_REVIEW_WEEKDAY + 6) % 7;
};

// ── Cierre de mes ──
// Última semana del mes (según la regla de semanas de arriba)
export const lastWeekOfMonth = (year, month) => {
  const weeks = weeksOfMonth(year, month);
  return weeks[weeks.length - 1];
};

// ¿Hoy es lunes o martes de la última semana del mes? (recordatorio de cierre)
export const monthCloseReminderActive = (todayIso) => {
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7));
  const last = lastWeekOfMonth(year, month);
  if (!last) return false;
  return todayIso === last.start || todayIso === addDays(last.start, 1);
};

// Cuentas que todavía no llegan a su plan en el mes de `todayIso`
export const monthCloseSummary = (accounts, posts, todayIso) => {
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7));
  const weeks = weeksOfMonth(year, month);
  return (accounts || [])
    .filter((a) => a.active !== false && postsPerMonthFor(a.plan) > 0)
    .map((a) => ({ account: a, ...accountMonthSummary(a, posts, weeks) }))
    .filter((s) => s.count < s.expected)
    .sort((x, y) => (y.expected - y.count) - (x.expected - x.count));
};

// Tono del conteo por cuenta (ver COUNTER_TONES):
//   sin plan → none · igual al plan → complete · menos → partial · más → over
export const counterTone = (count, expected) => {
  if (!expected) return 'none';
  if (count > expected) return 'over';
  if (count === expected) return 'complete';
  return 'partial';
};

// ── Programación (estado «Programado») ──
// Hora escrita a mano: '1830' → '18:30', '9:5' se completa al validar.
export const maskTime = (text) => {
  const raw = String(text || '');
  if (raw.includes(':')) {
    const [h, m = ''] = raw.split(':');
    return `${h.replace(/\D/g, '').slice(0, 2)}:${m.replace(/\D/g, '').slice(0, 2)}`;
  }
  const d = raw.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
};

// '18:30', '9:05', '930' → 'HH:MM' (24 h); null si no es una hora válida
export const parseTime = (text) => {
  const t = String(text || '').trim();
  const m = t.match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

// Qué falta para poder dejar un posteo en «Programado».
// data: { publishDate, publishTime, scheduledOn } → ['plataforma', 'fecha', 'hora']
export const scheduleMissing = (data = {}) => [
  !data.scheduledOn && 'dónde se programó',
  !data.publishDate && 'fecha de publicación',
  !parseTime(data.publishTime) && 'hora',
].filter(Boolean);

// "05/11 · 18:30 · LinkedIn" (lo que haya cargado)
export const scheduleLabel = (post = {}, platforms = {}) => [
  post.publishDate ? `${post.publishDate.slice(8, 10)}/${post.publishDate.slice(5, 7)}` : '',
  post.publishTime ? post.publishTime.slice(0, 5) : '',
  post.scheduledOn ? (platforms[post.scheduledOn]?.label || post.scheduledOn) : '',
].filter(Boolean).join(' · ');

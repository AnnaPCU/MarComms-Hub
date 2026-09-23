// ════════════════════════════════════════════════════════════════════
// WORLD DAYS UTILS — Lógica pura del calendario de días mundiales
// ════════════════════════════════════════════════════════════════════
// Sin React. Recibe "hoy" como parámetro para que sea testeable.
//
// - resolveWorldDayDate(day, year)   → ISO de ese día en ese año
// - nextOccurrence(day, todayIso)    → próxima ocurrencia (hoy o después)
// - noticeDateFor(dateIso)           → ISO del aviso (N días hábiles antes)
// - upcomingWorldDays(todayIso, opts)→ lista ordenada para el calendario
// - activeWorldDayNotices(todayIso)  → días cuyo aviso está vigente hoy
// - worldDayCountries(day)           → países donde repercute más ([] = global)
// - accountsForWorldDay(day, accts)  → cuentas de LinkedIn desde las que publicar
// ════════════════════════════════════════════════════════════════════

import {
  WORLD_DAYS,
  WORLD_DAYS_NOTICE_BUSINESS_DAYS,
  WORLD_DAY_THEME_BY_ID,
} from '@/constants/worldDays';
import { MARKETS_LIST } from '@/constants/markets';
import { daysBetween, subtractBusinessDays, toIsoDate } from './date';

// ────────────────────────────────────────────────────────────────────
// Países y cuentas
// ────────────────────────────────────────────────────────────────────

export const WORLD_DAY_GLOBAL_LABEL = 'Todos los países';

const normalize = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// Nombre para mostrar de una clave de MARKETS ('RD' → 'Rep. Dominicana')
export const countryDisplay = (key) => (MARKETS_LIST.find((m) => m.key === key) || {}).pais || key;

// ¿Es un día global (sin países con más peso)?
export const isGlobalWorldDay = (worldDay) => !worldDay || !Array.isArray(worldDay.countries) || worldDay.countries.length === 0;

// Países donde repercute más, para mostrar. [] si es global.
export const worldDayCountries = (worldDay) => (isGlobalWorldDay(worldDay) ? [] : worldDay.countries.map(countryDisplay));

// Texto corto: "Todos los países" | "Brasil, Peru, Ecuador" | "Brasil, Peru +3"
export const worldDayCountriesText = (worldDay, max = 3) => {
  const list = worldDayCountries(worldDay);
  if (list.length === 0) return WORLD_DAY_GLOBAL_LABEL;
  if (list.length <= max) return list.join(', ');
  return `${list.slice(0, max).join(', ')} +${list.length - max}`;
};

// Cuentas de LinkedIn desde las que conviene publicar ese día.
// Global → todas las cuentas activas. Con países → las cuentas cuyo nombre
// es uno de esos países (las cuentas se llaman 'Peru', 'Brasil', 'España'…).
export const accountsForWorldDay = (worldDay, accounts) => {
  const active = (accounts || []).filter((a) => a && a.active !== false);
  if (isGlobalWorldDay(worldDay)) return active;
  const wanted = new Set(worldDay.countries.flatMap((c) => [normalize(c), normalize(countryDisplay(c))]));
  return active.filter((a) => wanted.has(normalize(a.name)));
};

// Fecha ISO de un día mundial para un año dado.
// Soporta día fijo (`day`) o regla "n-ésimo día de semana" (`rule`).
export const resolveWorldDayDate = (worldDay, year) => {
  if (!worldDay) return '';
  if (worldDay.rule) {
    const { weekday, nth } = worldDay.rule;
    const first = new Date(year, worldDay.month - 1, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    const dayOfMonth = 1 + offset + (nth - 1) * 7;
    const d = new Date(year, worldDay.month - 1, dayOfMonth);
    // Si el mes no llega a ese n-ésimo (ej. 5° jueves), devolvemos vacío
    if (d.getMonth() !== worldDay.month - 1) return '';
    return toIsoDate(d);
  }
  return toIsoDate(new Date(year, worldDay.month - 1, worldDay.day));
};

// Próxima ocurrencia a partir de hoy (inclusive). Si ya pasó este año,
// devuelve la del año que viene.
export const nextOccurrence = (worldDay, todayIso) => {
  const year = Number(todayIso.slice(0, 4));
  const thisYear = resolveWorldDayDate(worldDay, year);
  if (thisYear && thisYear >= todayIso) return thisYear;
  return resolveWorldDayDate(worldDay, year + 1);
};

// Fecha en la que se dispara el aviso: N días hábiles antes del día.
export const noticeDateFor = (dateIso, businessDays = WORLD_DAYS_NOTICE_BUSINESS_DAYS) =>
  subtractBusinessDays(dateIso, businessDays);

// Enriquecer un día con su próxima fecha, aviso y días restantes.
const decorate = (worldDay, todayIso) => {
  const date = nextOccurrence(worldDay, todayIso);
  const noticeDate = noticeDateFor(date);
  const daysLeft = daysBetween(todayIso, date);
  return {
    ...worldDay,
    themeInfo: WORLD_DAY_THEME_BY_ID[worldDay.theme] || null,
    date,
    noticeDate,
    daysLeft,
    // El aviso está "activo" desde noticeDate hasta el día inclusive
    noticeActive: noticeDate <= todayIso && todayIso <= date,
  };
};

/**
 * Lista de días mundiales próximos, ordenados por fecha.
 * @param {string} todayIso  YYYY-MM-DD
 * @param {Object} opts      { theme: 'all' | themeId, days: WORLD_DAYS, months: 12 }
 */
export const upcomingWorldDays = (todayIso, opts = {}) => {
  const { theme = 'all', days = WORLD_DAYS, months = 12 } = opts;
  const limit = new Date(todayIso + 'T00:00:00');
  limit.setMonth(limit.getMonth() + months);
  const limitIso = toIsoDate(limit);

  return days
    .filter((d) => theme === 'all' || d.theme === theme)
    .map((d) => decorate(d, todayIso))
    .filter((d) => d.date && d.date <= limitIso)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
};

/**
 * Días mundiales cuyo aviso está vigente hoy (entre N hábiles antes y el
 * día mismo). Es lo que consume el sistema de notificaciones.
 */
export const activeWorldDayNotices = (todayIso, days = WORLD_DAYS) =>
  days
    .map((d) => decorate(d, todayIso))
    .filter((d) => d.date && d.noticeActive)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

// Agrupa una lista decorada por "YYYY-MM" (para la vista por mes)
export const groupByMonth = (list) => {
  const groups = [];
  const index = {};
  list.forEach((d) => {
    const key = d.date.slice(0, 7);
    if (index[key] === undefined) {
      index[key] = groups.length;
      groups.push({ key, items: [] });
    }
    groups[index[key]].items.push(d);
  });
  return groups;
};

// ────────────────────────────────────────────────────────────────────
// Vista de calendario (grilla mensual)
// ────────────────────────────────────────────────────────────────────

// Días mundiales que caen en un mes dado (año concreto), decorados
// respecto de `todayIso` (aviso, días restantes, ventana activa).
export const worldDaysInMonth = (year, month, todayIso, opts = {}) => {
  const { theme = 'all', days = WORLD_DAYS } = opts;
  return days
    .filter((d) => d.month === month && (theme === 'all' || d.theme === theme))
    .map((d) => {
      const date = resolveWorldDayDate(d, year);
      if (!date) return null;
      const noticeDate = noticeDateFor(date);
      return {
        ...d,
        themeInfo: WORLD_DAY_THEME_BY_ID[d.theme] || null,
        date,
        noticeDate,
        daysLeft: daysBetween(todayIso, date),
        noticeActive: noticeDate <= todayIso && todayIso <= date,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
};

// Grilla de semanas (lunes a domingo) que cubre el mes completo.
// Devuelve [[{ iso, day, inMonth }, ...7], ...]. Siempre 6 filas para que
// el alto de la grilla no salte al cambiar de mes.
export const monthGrid = (year, month) => {
  const first = new Date(year, month - 1, 1);
  // getDay(): 0 = domingo → queremos que la semana arranque en lunes
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - offset);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + i);
      row.push({ iso: toIsoDate(d), day: d.getDate(), inMonth: d.getMonth() === month - 1 });
    }
    weeks.push(row);
  }
  return weeks;
};

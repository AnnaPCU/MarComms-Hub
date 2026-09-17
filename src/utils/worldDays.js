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
// ════════════════════════════════════════════════════════════════════

import {
  WORLD_DAYS,
  WORLD_DAYS_NOTICE_BUSINESS_DAYS,
  WORLD_DAY_THEME_BY_ID,
} from '@/constants/worldDays';
import { daysBetween, subtractBusinessDays, toIsoDate } from './date';

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

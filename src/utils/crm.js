// ════════════════════════════════════════════════════════════════════
// CRM UTILS — Resúmenes de entrenamientos y adopción (lógica pura)
// ════════════════════════════════════════════════════════════════════
// Sin React. Recibe "hoy" como parámetro para que sea testeable.
//
// - trainingsSummary(trainings)              → conteo por estado + montos
// - entityTrainingStats(entityId, trainings) → conteos para la tarjeta de entidad
// - pendingBillingTrainings(trainings, today)→ realizados hace > N días sin cobrar
// - adoptionScore(entity)                    → checks cumplidos / total
// - sortTrainings(trainings)                 → fecha desc, sin fecha al final
// - monthKeyLabel('2026-03')                 → 'marzo 2026'
// ════════════════════════════════════════════════════════════════════

import { ADOPTION_CHECK_IDS, BILLING_PENDING_DAYS } from '@/constants/crm';
import { daysBetween } from './date';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const monthKeyLabel = (monthKey) => {
  if (!monthKey || !/^\d{4}-\d{2}/.test(monthKey)) return '';
  const m = Number(monthKey.slice(5, 7));
  return `${MONTHS[m - 1] || ''} ${monthKey.slice(0, 4)}`.trim();
};

// Conteo por estado y suma de lo cobrado / por cobrar
export const trainingsSummary = (trainings) => {
  const s = { total: 0, planificado: 0, realizado: 0, cobrado: 0, bonificado: 0, amountBilled: 0, amountPending: 0 };
  (trainings || []).forEach((t) => {
    s.total += 1;
    if (t.status in s) s[t.status] += 1;
    const amount = Number(t.amount) || 0;
    if (t.status === 'cobrado') s.amountBilled += amount;
    if (t.status === 'realizado') s.amountPending += amount;
  });
  return s;
};

export const entityTrainingStats = (entityId, trainings) =>
  trainingsSummary((trainings || []).filter((t) => t.entityId === entityId));

// Realizados hace más de N días que todavía no pasaron a cobrado
export const pendingBillingTrainings = (trainings, todayIso, days = BILLING_PENDING_DAYS) =>
  (trainings || []).filter((t) => {
    if (t.status !== 'realizado' || !t.date) return false;
    return daysBetween(t.date, todayIso) > days;
  });

// Próximos planificados (hoy o después), ordenados por fecha
export const upcomingTrainings = (trainings, todayIso) =>
  (trainings || [])
    .filter((t) => t.status === 'planificado' && t.date && t.date >= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

// Checks cumplidos sobre el total del checklist de adopción
export const adoptionScore = (entity) => {
  const c = (entity && entity.checks) || {};
  const done = ADOPTION_CHECK_IDS.filter((id) => !!c[id]).length;
  return { done, total: ADOPTION_CHECK_IDS.length, ratio: ADOPTION_CHECK_IDS.length ? done / ADOPTION_CHECK_IDS.length : 0 };
};

// Fecha descendente; los que no tienen fecha van al final (ordenados por mes de cobro)
export const sortTrainings = (trainings) =>
  [...(trainings || [])].sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    if (a.date) return -1;
    if (b.date) return 1;
    const am = a.billedMonth || '', bm = b.billedMonth || '';
    return am < bm ? 1 : am > bm ? -1 : 0;
  });

// Años presentes (por fecha o por mes de cobro) para el filtro
export const trainingYears = (trainings) => {
  const set = new Set();
  (trainings || []).forEach((t) => {
    const src = t.date || t.billedMonth || '';
    if (src) set.add(src.slice(0, 4));
  });
  return [...set].sort().reverse();
};

export const matchesTrainingYear = (t, year) => {
  if (!year || year === 'all') return true;
  return (t.date || t.billedMonth || '').slice(0, 4) === year;
};

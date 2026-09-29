// ════════════════════════════════════════════════════════════════════
// PROGRESS — Cálculo de progreso de proyectos
// ════════════════════════════════════════════════════════════════════

import { webinarTaskApplies } from '@/constants/webinar';

/**
 * Calcula el progreso % de un WEBINAR (21 tareas).
 * Cada tarea aporta 1/21 del total.
 */
export const WEBINAR_TASK_KEYS = [
  'teamsGroup', 'testDay', 'bbdd', 'hubspot',
  'landingLivestorm', 'ppt', 'onePager',
  'lknAnuncio', 'lknReminder', 'lknHoy', 'lknPost',
  'mailPre1', 'mailPre2', 'mailPre3', 'mailPostAttended', 'mailPostNoShow',
  'reporte',
];

// Las tareas opcionales (PPT, one pager) solo cuentan si en ese webinar
// se marcaron como "aplica". Así el 100% no depende de piezas que no van.
export const calcProgress = (w) => {
  if (!w) return 0;
  const keys = WEBINAR_TASK_KEYS.filter((k) => webinarTaskApplies(w, k));
  const done = keys.filter((k) => w[k]?.done).length;
  return Math.round((done / keys.length) * 100);
};

/**
 * Calcula el progreso % de un EVENTO.
 * Toma en cuenta tareas standard + custom tasks.
 */
export const calcEventProgress = (event) => {
  if (!event || !event.tasks) return 0;
  const allTasks = [
    ...Object.values(event.tasks || {}),
    ...(event.customTasks || []),
  ];
  if (allTasks.length === 0) return 0;
  const done = allTasks.filter((t) => t.done).length;
  return Math.round((done / allTasks.length) * 100);
};

/**
 * Calcula el progreso % de una CAMPAÑA.
 * Cuenta `completedSteps` sobre el total de steps del tipo.
 *
 * Steps por tipo:
 *   - email standalone: 13
 *   - email variant 'webinar': 5
 *   - paid: 3
 *   - database: 3
 *   - research: 3
 */
export const calcCampaignProgress = (campaign) => {
  if (!campaign) return 0;
  const completed = (campaign.completedSteps || []).length;
  let total = 13;
  if (campaign.variant === 'webinar') total = 5;
  else if (campaign.type === 'paid') total = 3;
  else if (campaign.type === 'database') total = 3;
  else if (campaign.type === 'research') total = 3;
  return Math.round((completed / total) * 100);
};

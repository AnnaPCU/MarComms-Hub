// ════════════════════════════════════════════════════════════════════
// PROGRESS — Cálculo de progreso de proyectos
// ════════════════════════════════════════════════════════════════════

import { webinarTaskApplies } from '@/constants/webinar';
import { CAMPAIGN_STEPS } from '@/constants/campaigns';

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
 * Total de pasos de una CAMPAÑA. Fuente única para Pilares, Portal Cliente,
 * Programas, Planes y PDF: la campaña de mailings de un webinar tiene 5;
 * el resto, los pasos de CAMPAIGN_STEPS de su tipo (Email Mkt 13, Paid
 * Media 4, BBDD 3, Investigación 3).
 */
export const campaignStepsTotal = (campaign) => {
  if (campaign?.variant === 'webinar') return 5;
  return (CAMPAIGN_STEPS[campaign?.type] || CAMPAIGN_STEPS.email).length;
};

/**
 * Calcula el progreso % de una CAMPAÑA: `completedSteps` sobre el total
 * de pasos de su tipo (tope 100).
 */
export const calcCampaignProgress = (campaign) => {
  if (!campaign) return 0;
  const completed = (campaign.completedSteps || []).length;
  return Math.min(100, Math.round((completed / campaignStepsTotal(campaign)) * 100));
};

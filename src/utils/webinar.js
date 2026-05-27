// ════════════════════════════════════════════════════════════════════
// WEBINAR UTILS — Constructores y helpers de webinars
// ════════════════════════════════════════════════════════════════════

import { addDays } from './date';
import { WEBINAR_MAIL_TO_STEP } from '@/constants/webinar';

/**
 * Calcula automáticamente las fechas de las tareas relativas al evento.
 * Cada tarea tiene un offset (días respecto a la fecha del webinar).
 */
export const autoCalcDates = (date, w = {}) => {
  if (!date) return w;
  return {
    ...w,
    testDay:          { ...(w.testDay || {}),          date: addDays(date, -10) },
    mailPre1:         { ...(w.mailPre1 || {}),         date: addDays(date, -15) },
    mailPre2:         { ...(w.mailPre2 || {}),         date: addDays(date, -8) },
    mailPre3:         { ...(w.mailPre3 || {}),         date: addDays(date, -1) },
    lknReminder:      { ...(w.lknReminder || {}),      date: addDays(date, -1) },
    lknHoy:           { ...(w.lknHoy || {}),           date: addDays(date, 0) },
    mailPostAttended: { ...(w.mailPostAttended || {}), date: addDays(date, 1) },
    mailPostNoShow:   { ...(w.mailPostNoShow || {}),   date: addDays(date, 1) },
    lknPost:          { ...(w.lknPost || {}),          date: addDays(date, 2) },
    hubspot:          { ...(w.hubspot || {}),          date: addDays(date, 3) },
    reporte:          { ...(w.reporte || {}),          date: addDays(date, 7) },
  };
};

/**
 * Crea un webinar con valores default.
 * Si se pasa una fecha, calcula automáticamente las fechas de las tareas.
 */
export const makeWebinar = (name, date, client, monto, pais, unidadNegocio) => {
  let w = {
    id: Date.now(),
    name,
    mainDate: date,
    client: client || '',
    monto: monto || '',
    pais: pais || '',
    unidadNegocio: unidadNegocio || '',
    clientPassword: Math.random().toString(36).slice(-6).toUpperCase(),
    asistentes: '',
    updatedAt: new Date().toISOString(),
    // ── Operativas ──
    teamsGroup:       { done: false, owner: 'FRAN' },
    testDay:          { done: false, date: '', owner: 'FRAN' },
    bbdd:             { done: false, type: '', owner: 'FELO' },
    hubspot:          { done: false, date: '', owner: 'TINO' },
    // ── Contenido ──
    landingLivestorm: { done: false, date: '', owner: 'VICKY' },
    ppt:              { done: false, owner: 'AGUS' },
    onePager:         { done: false, owner: 'AGUS' },
    lknAnuncio:       { done: false, date: '', owner: 'FATI' },
    lknReminder:      { done: false, date: '', owner: 'FATI' },
    lknHoy:           { done: false, date: '', owner: 'FATI' },
    lknPost:          { done: false, date: '', owner: 'FATI' },
    mailPre1:         { done: false, date: '', text: '', owner: 'FRAN' },
    mailPre2:         { done: false, date: '', text: '', owner: 'FRAN' },
    mailPre3:         { done: false, date: '', text: '', owner: 'FRAN' },
    mailPostAttended: { done: false, date: '', text: '', owner: 'FRAN' },
    mailPostNoShow:   { done: false, date: '', text: '', owner: 'FRAN' },
    bannerInv1:       { done: false, owner: 'VICKY' },
    bannerInv2:       { done: false, owner: 'VICKY' },
    bannerInv3:       { done: false, owner: 'VICKY' },
    bannerPost:       { done: false, owner: 'VICKY' },
    reporte:          { done: false, date: '', owner: 'DELFI' },
  };
  if (date) w = autoCalcDates(date, w);
  return w;
};

/**
 * Construye una campaña tipo "webinar email" auto-linkeada al webinar.
 * Sync inicial: si el webinar ya tiene mails tildados, marca los steps
 * correspondientes en la campaña.
 */
export const makeCampaignFromWebinar = (webinar) => {
  const initialCompleted = [];
  Object.entries(WEBINAR_MAIL_TO_STEP).forEach(([mailKey, stepKey]) => {
    if (webinar[mailKey]?.done) initialCompleted.push(stepKey);
  });

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: `WEBINAR - ${webinar.name}`,
    type: 'email',
    variant: 'webinar', // marca especial
    linkedWebinarId: webinar.id,
    country: webinar.pais || '',
    businessUnit: webinar.unidadNegocio || '',
    budget: 0,
    numEmails: 5, // 3 pre + 2 post
    completedSteps: initialCompleted,
    completedAt: null,
    comments: [],
    data: {
      requester: webinar.client || '',
      tag: '',
      senderEmail: '',
      contents: [],
      dates: [
        webinar.mailPre1?.date || '',
        webinar.mailPre2?.date || '',
        webinar.mailPre3?.date || '',
        webinar.mailPostAttended?.date || '',
        webinar.mailPostNoShow?.date || '',
      ],
      extras: [],
    },
  };
};

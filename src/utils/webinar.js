// ════════════════════════════════════════════════════════════════════
// WEBINAR UTILS — Constructores y helpers de webinars
// ════════════════════════════════════════════════════════════════════

import { addDays } from './date';
import { WEBINAR_MAIL_TO_STEP } from '@/constants/webinar';

// Compatibilidad: crypto.randomUUID en browsers modernos; fallback simple.
const newId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback (no criptográfico, sólo para devs muy viejos)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
    id: newId(),
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
    teamsGroup:       { done: false, owner: 'Francisco Capoulat' },
    testDay:          { done: false, date: '', owner: 'Francisco Capoulat' },
    bbdd:             { done: false, type: '', owner: 'Felipe Señorans' },
    hubspot:          { done: false, date: '', owner: 'Tomas Misrahi' },
    // ── Contenido ──
    landingLivestorm: { done: false, date: '', owner: 'Victoria Colombo' },
    ppt:              { done: false, owner: 'Agustina Ball' },
    onePager:         { done: false, owner: 'Agustina Ball' },
    lknAnuncio:       { done: false, date: '', owner: 'Fatima Lacroze' },
    lknReminder:      { done: false, date: '', owner: 'Fatima Lacroze' },
    lknHoy:           { done: false, date: '', owner: 'Fatima Lacroze' },
    lknPost:          { done: false, date: '', owner: 'Fatima Lacroze' },
    mailPre1:         { done: false, date: '', text: '', owner: 'Francisco Capoulat' },
    mailPre2:         { done: false, date: '', text: '', owner: 'Francisco Capoulat' },
    mailPre3:         { done: false, date: '', text: '', owner: 'Francisco Capoulat' },
    mailPostAttended: { done: false, date: '', text: '', owner: 'Francisco Capoulat' },
    mailPostNoShow:   { done: false, date: '', text: '', owner: 'Francisco Capoulat' },
    bannerInv1:       { done: false, owner: 'Victoria Colombo' },
    bannerInv2:       { done: false, owner: 'Victoria Colombo' },
    bannerInv3:       { done: false, owner: 'Victoria Colombo' },
    bannerPost:       { done: false, owner: 'Victoria Colombo' },
    reporte:          { done: false, date: '', owner: 'Delfina Palmero' },
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
    id: newId(),
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

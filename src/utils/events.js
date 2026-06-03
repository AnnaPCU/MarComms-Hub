// ════════════════════════════════════════════════════════════════════
// EVENTS UTILS — Constructores y helpers de eventos
// ════════════════════════════════════════════════════════════════════

import { addDaysIso } from './date';
import { EVENT_PHASES } from '@/constants/events';

const newId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Construye el objeto `tasks` inicial de un evento a partir de la fecha.
 * Cada tarea hereda su offset de EVENT_PHASES.
 */
export const buildEventTasks = (eventDate) => {
  const tasks = {};
  EVENT_PHASES.forEach((phase) => {
    phase.tasks.forEach((t) => {
      tasks[t.id] = {
        done: false,
        owner: '',
        date: eventDate ? addDaysIso(eventDate, t.offset) : '',
        ...(t.hasParticipants ? { participants: [] } : {}),
        ...(t.linkable === 'campaign' ? { linkedCampaignId: null } : {}),
      };
    });
  });
  return tasks;
};

/**
 * Recalcula las fechas de todas las tareas cuando cambia la fecha del evento.
 * Saltea las tareas que fueron eliminadas (removedDefaults).
 */
export const recalcEventDates = (eventDate, tasks, removedDefaults = []) => {
  if (!eventDate) return tasks;
  const updated = { ...tasks };
  EVENT_PHASES.forEach((phase) => {
    phase.tasks.forEach((t) => {
      if (removedDefaults.includes(t.id)) return;
      if (updated[t.id]) {
        updated[t.id] = { ...updated[t.id], date: addDaysIso(eventDate, t.offset) };
      }
    });
  });
  return updated;
};

/**
 * Crea un evento con valores default.
 */
export const makeEvent = (name, date, country, businessUnit, client, fee) => ({
  id: newId(),
  name: name || '',
  date: date || '',
  country: country || '',
  businessUnit: businessUnit || '',
  client: client || '',
  fee: fee !== undefined && fee !== '' ? parseFloat(fee) : 0,
  tasks: buildEventTasks(date),
  customTasks: [],
  removedDefaults: [],
  comments: [],
  createdAt: new Date().toISOString(),
});

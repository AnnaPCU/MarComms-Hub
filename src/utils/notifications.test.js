// ════════════════════════════════════════════════════════════════════
// Tests para buildNotifications
// ════════════════════════════════════════════════════════════════════
// Corré con: npm test
// O en modo watch: npm run test:watch
//
// Cada test fija "now" a una fecha conocida (2026-06-02) para que los
// rangos de "últimos 3 días" / "próximos 3 días" sean deterministas.
// ════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { buildNotifications } from './notifications';

const NOW = new Date('2026-06-02T10:00:00Z');
const TODAY_ISO = '2026-06-02';
const YESTERDAY = '2026-06-01';
const TOMORROW = '2026-06-03';
const IN_2_DAYS = '2026-06-04';
const IN_10_DAYS = '2026-06-12';
const LAST_WEEK = '2026-05-26';
// 2 días atrás (entra en ventana "last 3 days")
const TWO_DAYS_AGO_ISO = '2026-05-31T10:00:00.000Z';
// 10 días atrás (NO entra en ventana)
const TEN_DAYS_AGO_ISO = '2026-05-23T10:00:00.000Z';

const AGUS  = { name: 'Agustina Ball',  team: 'Comunicación' };
const VICKY = { name: 'Victoria Colombo', team: 'Comunicación' };
const FELO  = { name: 'Felipe Señorans',  team: 'Marketing' };

const opts = { now: NOW };

const EMPTY_DATA = {
  webinars: [], campaigns: [], events: [], requests: [], assignedTasks: [],
};

// Helper para chequear que un tipo de notif aparezca (al menos una)
const hasNotif = (notifs, predicate) => notifs.some(predicate);

describe('buildNotifications', () => {
  describe('precondiciones', () => {
    it('devuelve [] si no hay currentUser', () => {
      expect(buildNotifications(null, EMPTY_DATA, opts)).toEqual([]);
    });

    it('devuelve [] si el usuario no está en PEOPLE', () => {
      const fake = { name: 'NoExisto', team: 'Marketing' };
      expect(buildNotifications(fake, EMPTY_DATA, opts)).toEqual([]);
    });

    it('devuelve [] si todas las colecciones están vacías', () => {
      expect(buildNotifications(AGUS, EMPTY_DATA, opts)).toEqual([]);
    });
  });

  describe('1. overdue — tarea individual de webinar vencida', () => {
    it('genera notif overdue cuando una sub-tarea del webinar venció', () => {
      const webinar = {
        id: 'w1', name: 'Test Webinar', mainDate: IN_10_DAYS,
        ppt: { done: false, owner: 'Agustina Ball', date: YESTERDAY }, // vencida ayer
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(hasNotif(notifs, (n) => n.type === 'overdue' && n.source === 'Webinar')).toBe(true);
    });

    it('NO genera notif si la tarea está done', () => {
      const webinar = {
        id: 'w1', name: 'X',
        ppt: { done: true, owner: 'Agustina Ball', date: YESTERDAY },
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(notifs.filter((n) => n.type === 'overdue')).toHaveLength(0);
    });

    it('NO genera notif si el owner no soy yo', () => {
      const webinar = {
        id: 'w1', name: 'X',
        ppt: { done: false, owner: 'Fatima Lacroze', date: YESTERDAY },
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(notifs).toHaveLength(0);
    });
  });

  describe('2. soon — tarea individual próxima', () => {
    it('genera notif soon cuando una sub-tarea vence en próximos 3 días', () => {
      const webinar = {
        id: 'w1', name: 'X',
        ppt: { done: false, owner: 'Agustina Ball', date: TOMORROW },
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(hasNotif(notifs, (n) => n.type === 'soon')).toBe(true);
    });

    it('NO genera notif si la fecha es lejos en el futuro', () => {
      const webinar = {
        id: 'w1', name: 'X',
        ppt: { done: false, owner: 'Agustina Ball', date: IN_10_DAYS },
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(notifs.filter((n) => n.type === 'soon')).toHaveLength(0);
    });
  });

  describe('3. responsible — service owner con deadline cercano y progress < 80%', () => {
    it('genera notif responsible para el service owner del webinar', () => {
      const webinar = {
        id: 'w1', name: 'Mi Webinar',
        serviceOwner: 'Victoria Colombo',
        mainDate: TOMORROW,
        ppt: { done: true }, // 1/21 = 4%
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(hasNotif(notifs, (n) => n.type === 'responsible' && n.id === 'resp-w-w1')).toBe(true);
    });

    it('NO genera notif si progress >= 100', () => {
      const allDone = {};
      ['teamsGroup', 'testDay', 'bbdd', 'hubspot', 'landingLivestorm', 'ppt', 'onePager',
       'lknAnuncio', 'lknReminder', 'lknHoy', 'lknPost',
       'mailPre1', 'mailPre2', 'mailPre3', 'mailPostAttended', 'mailPostNoShow',
       'bannerInv1', 'bannerInv2', 'bannerInv3', 'bannerPost', 'reporte'].forEach((k) => {
        allDone[k] = { done: true };
      });
      const webinar = {
        id: 'w1', name: 'X', serviceOwner: 'Victoria Colombo', mainDate: TOMORROW, ...allDone,
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(notifs.filter((n) => n.id === 'resp-w-w1')).toHaveLength(0);
    });
  });

  describe('4. team_overdue — service owner ve proyecto con tareas atrasadas', () => {
    it('genera notif si hay tareas atrasadas asignadas a OTRO miembro', () => {
      const webinar = {
        id: 'w1', name: 'ISO 9001',
        serviceOwner: 'Victoria Colombo',
        mainDate: IN_10_DAYS, // deadline final NO cercano
        ppt: { done: false, owner: 'Agustina Ball', date: YESTERDAY }, // atrasada de otro miembro
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(hasNotif(notifs, (n) => n.id === 'team-overdue-w-w1')).toBe(true);
    });

    it('NO genera notif si no soy service owner', () => {
      const webinar = {
        id: 'w1', name: 'X',
        serviceOwner: 'Victoria Colombo',
        mainDate: IN_10_DAYS,
        ppt: { done: false, owner: 'Agustina Ball', date: YESTERDAY },
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(notifs.filter((n) => n.id === 'team-overdue-w-w1')).toHaveLength(0);
    });
  });

  describe('5. new — pedido del Content Hub creado en últimos 3 días', () => {
    it('genera notif new cuando el pedido es reciente y soy owner', () => {
      const request = {
        id: 'r1', name: 'Banner X', owner: 'Agustina Ball', status: 'pending',
        createdAt: TWO_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, requests: [request] }, opts);
      expect(hasNotif(notifs, (n) => n.type === 'new' && n.id === 'new-s-r1')).toBe(true);
    });

    it('NO genera notif si el pedido es viejo (>3 días)', () => {
      const request = {
        id: 'r1', name: 'X', owner: 'Agustina Ball', status: 'pending',
        createdAt: TEN_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, requests: [request] }, opts);
      expect(notifs.filter((n) => n.id === 'new-s-r1')).toHaveLength(0);
    });
  });

  describe('6. assigned — tarea asignada por otro usuario', () => {
    it('genera notif assigned cuando me asignan una tarea', () => {
      const task = {
        id: 't1', title: 'Revisar copy', assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo',
        done: false,
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, assignedTasks: [task] }, opts);
      expect(hasNotif(notifs, (n) => n.type === 'assigned')).toBe(true);
    });

    it('NO se duplica si pasamos la misma tarea dos veces', () => {
      const task = {
        id: 't1', title: 'X', assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo', done: false,
      };
      const notifs = buildNotifications(
        AGUS, { ...EMPTY_DATA, assignedTasks: [task, task] }, opts,
      );
      const assignedCount = notifs.filter((n) => n.id === 'assigned-t1').length;
      expect(assignedCount).toBe(1);
    });
  });

  describe('7. NUEVO — task_done_for_assigner', () => {
    it('notifica al ASIGNADOR cuando la tarea fue completada (últimos 3 días)', () => {
      const task = {
        id: 't1', title: 'Revisar copy',
        assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo',
        done: true, completedAt: TWO_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, assignedTasks: [task] }, opts);
      expect(hasNotif(notifs, (n) => n.id === 'task-done-t1')).toBe(true);
    });

    it('NO notifica al asignador si la completion es vieja (>3 días)', () => {
      const task = {
        id: 't1', title: 'X', assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo',
        done: true, completedAt: TEN_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, assignedTasks: [task] }, opts);
      expect(notifs.filter((n) => n.id === 'task-done-t1')).toHaveLength(0);
    });

    it('NO notifica si yo NO soy el asignador', () => {
      const task = {
        id: 't1', title: 'X', assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo',
        done: true, completedAt: TWO_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(FELO, { ...EMPTY_DATA, assignedTasks: [task] }, opts);
      expect(notifs.filter((n) => n.id === 'task-done-t1')).toHaveLength(0);
    });
  });

  describe('8. NUEVO — request_done_for_owner', () => {
    it('notifica al owner cuando su pedido fue marcado done (últimos 3 días)', () => {
      const r = {
        id: 'r1', name: 'Landing X', owner: 'Agustina Ball', status: 'done',
        createdAt: TEN_DAYS_AGO_ISO,
        completedAt: TWO_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, requests: [r] }, opts);
      expect(hasNotif(notifs, (n) => n.id === 'request-done-r1')).toBe(true);
    });

    it('NO notifica si completed > 3 días', () => {
      const r = {
        id: 'r1', name: 'X', owner: 'Agustina Ball', status: 'done',
        createdAt: TEN_DAYS_AGO_ISO, completedAt: TEN_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, requests: [r] }, opts);
      expect(notifs.filter((n) => n.id === 'request-done-r1')).toHaveLength(0);
    });
  });

  describe('9. NUEVO — project_created_for_owner', () => {
    it('notifica al service owner cuando se crea un webinar fresco', () => {
      const webinar = {
        id: 'w1', name: 'Nuevo Webinar', serviceOwner: 'Victoria Colombo',
        createdAt: TWO_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(hasNotif(notifs, (n) => n.id === 'new-project-w-w1')).toBe(true);
    });

    it('NO notifica si el webinar fue creado hace >3 días', () => {
      const webinar = {
        id: 'w1', name: 'X', serviceOwner: 'Victoria Colombo',
        createdAt: TEN_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(notifs.filter((n) => n.id === 'new-project-w-w1')).toHaveLength(0);
    });

    it('NO notifica campaign con variant=webinar (es auto-creada)', () => {
      const campaign = {
        id: 'c1', name: 'WEBINAR - X', type: 'email', variant: 'webinar',
        serviceOwner: 'Felipe Señorans', createdAt: TWO_DAYS_AGO_ISO,
      };
      const notifs = buildNotifications(FELO, { ...EMPTY_DATA, campaigns: [campaign] }, opts);
      expect(notifs.filter((n) => n.id === 'new-project-c-c1')).toHaveLength(0);
    });
  });

  describe('10. NUEVO — new_comment', () => {
    it('notifica al service owner cuando otro usuario comenta', () => {
      const campaign = {
        id: 'c1', name: 'FORESTRY', type: 'email', serviceOwner: 'Felipe Señorans',
        comments: [
          {
            id: 'cm1', text: 'Falta el banner', author: 'Victoria Colombo',
            date: TWO_DAYS_AGO_ISO,
          },
        ],
      };
      const notifs = buildNotifications(FELO, { ...EMPTY_DATA, campaigns: [campaign] }, opts);
      expect(hasNotif(notifs, (n) => n.id.startsWith('comment-c-c1'))).toBe(true);
    });

    it('NO notifica si el comentario lo escribí yo', () => {
      const campaign = {
        id: 'c1', name: 'X', type: 'email', serviceOwner: 'Felipe Señorans',
        comments: [{ id: 'cm1', text: 'mio', author: 'Felipe Señorans', date: TWO_DAYS_AGO_ISO }],
      };
      const notifs = buildNotifications(FELO, { ...EMPTY_DATA, campaigns: [campaign] }, opts);
      expect(notifs.filter((n) => n.id.startsWith('comment-c-c1'))).toHaveLength(0);
    });

    it('NO notifica si el comentario es viejo (>3 días)', () => {
      const campaign = {
        id: 'c1', name: 'X', type: 'email', serviceOwner: 'Felipe Señorans',
        comments: [{ id: 'cm1', text: 'viejo', author: 'Victoria Colombo', date: TEN_DAYS_AGO_ISO }],
      };
      const notifs = buildNotifications(FELO, { ...EMPTY_DATA, campaigns: [campaign] }, opts);
      expect(notifs.filter((n) => n.id.startsWith('comment-c-c1'))).toHaveLength(0);
    });
  });

  describe('11. NUEVO — daily_summary', () => {
    it('genera resumen diario si hay tareas para esta semana', () => {
      const webinar = {
        id: 'w1', name: 'X',
        ppt: { done: false, owner: 'Agustina Ball', date: IN_2_DAYS },
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(hasNotif(notifs, (n) => n.id.startsWith('daily-summary-'))).toBe(true);
    });

    it('el ID del resumen es estable por día (mismo día → mismo ID)', () => {
      const task = {
        id: 't1', title: 'X', assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo',
        done: false, deadline: IN_2_DAYS,
      };
      const a = buildNotifications(AGUS, { ...EMPTY_DATA, assignedTasks: [task] }, opts);
      const b = buildNotifications(AGUS, { ...EMPTY_DATA, assignedTasks: [task] }, opts);
      const idA = a.find((n) => n.id.startsWith('daily-summary'))?.id;
      const idB = b.find((n) => n.id.startsWith('daily-summary'))?.id;
      expect(idA).toBeTruthy();
      expect(idA).toBe(idB);
    });

    it('NO genera resumen si no hay tareas pendientes esta semana', () => {
      const notifs = buildNotifications(AGUS, EMPTY_DATA, opts);
      expect(notifs.filter((n) => n.id.startsWith('daily-summary'))).toHaveLength(0);
    });
  });

  describe('dedup + orden', () => {
    it('no duplica notifs con el mismo id', () => {
      const w = {
        id: 'w1', name: 'X',
        ppt: { done: false, owner: 'Agustina Ball', date: YESTERDAY },
      };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [w, w] }, opts);
      const overdueIds = notifs.filter((n) => n.id === 'overdue-w-w1-ppt');
      expect(overdueIds).toHaveLength(1);
    });

    it('ordena según prioridad del equipo Comunicación: assigned > overdue > soon > new > responsible', () => {
      const data = {
        webinars: [{
          id: 'w1', name: 'X',
          ppt: { done: false, owner: 'Agustina Ball', date: YESTERDAY },        // overdue
          onePager: { done: false, owner: 'Agustina Ball', date: TOMORROW },    // soon
        }],
        campaigns: [], events: [],
        requests: [{
          id: 'r1', name: 'Y', owner: 'Agustina Ball', status: 'pending',
          createdAt: TWO_DAYS_AGO_ISO,                                  // new
        }],
        assignedTasks: [{
          id: 't1', title: 'Z', assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo', done: false, // assigned
        }],
      };
      const notifs = buildNotifications(AGUS, data, opts);
      const types = notifs.map((n) => n.type);
      // Verifico que assigned aparece antes que overdue, overdue antes que soon, etc.
      const idxAssigned = types.indexOf('assigned');
      const idxOverdue = types.indexOf('overdue');
      const idxSoon = types.indexOf('soon');
      const idxNew = types.indexOf('new');
      expect(idxAssigned).toBeLessThan(idxOverdue);
      expect(idxOverdue).toBeLessThan(idxSoon);
      expect(idxSoon).toBeLessThan(idxNew);
    });
  });
});

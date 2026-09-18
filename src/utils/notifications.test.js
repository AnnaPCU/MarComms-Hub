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

  describe('sin seguimiento individual (va por el CRM)', () => {
    it('una sub-tarea de webinar vencida asignada a mí NO genera notificación', () => {
      const webinar = { id: 'w1', name: 'X', mainDate: IN_10_DAYS, ppt: { done: false, owner: 'Agustina Ball', date: YESTERDAY } };
      const notifs = buildNotifications(AGUS, { ...EMPTY_DATA, webinars: [webinar] }, opts);
      expect(notifs.filter((n) => n.id.startsWith('overdue-w-') || n.id.startsWith('soon-w-'))).toHaveLength(0);
    });

    it('una tarea asignada a mí NO genera notificación ni resumen diario', () => {
      const data = { ...EMPTY_DATA, assignedTasks: [{ id: 't1', title: 'Z', assignedTo: 'Agustina Ball', assignedBy: 'Victoria Colombo', done: false, deadline: TOMORROW }] };
      const notifs = buildNotifications(AGUS, data, opts);
      expect(notifs).toHaveLength(0);
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
      const n = notifs.find((x) => x.type === 'responsible' && x.id === 'resp-w-w1');
      expect(n).toBeTruthy();
      expect(n.title).toBe('"Mi Webinar" está al 5% y es mañana');
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

    it('genera notif para el service owner del pilar con pasos atrasados (deadlines.byStep)', () => {
      const campaign = {
        id: 'c1', name: 'Campaña EUDR', type: 'email', serviceOwner: 'Felipe Señorans',
        completedSteps: ['req'],
        deadlines: { finalDelivery: IN_10_DAYS, byStep: { req: LAST_WEEK, num: LAST_WEEK, dates: YESTERDAY, tag: IN_2_DAYS } },
      };
      const notifs = buildNotifications(FELO, { ...EMPTY_DATA, campaigns: [campaign] }, opts);
      const n = notifs.find((x) => x.id === 'team-overdue-c-c1');
      expect(n).toBeTruthy();
      expect(n.title).toBe('Tu campaña "Campaña EUDR" tiene 2 pasos atrasados'); // num + dates (req está done, tag no venció)
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

  describe('5. new — pedido de Social Media creado en últimos 3 días', () => {
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

  describe('dedup + orden', () => {
    it('no duplica notifs con el mismo id', () => {
      const w = {
        id: 'w1', name: 'X', serviceOwner: 'Victoria Colombo', mainDate: IN_10_DAYS,
        ppt: { done: false, owner: 'Agustina Ball', date: YESTERDAY },
      };
      const notifs = buildNotifications(VICKY, { ...EMPTY_DATA, webinars: [w, w] }, opts);
      expect(notifs.filter((n) => n.id === 'team-overdue-w-w1')).toHaveLength(1);
    });

    it('ordena según prioridad del equipo Comunicación: assigned > overdue > soon > new > responsible', () => {
      const data = {
        webinars: [], events: [],
        campaigns: [{
          id: 'c1', name: 'Camp', type: 'email', serviceOwner: 'Victoria Colombo',
          comments: [{ id: 'k1', author: 'Felipe Señorans', text: 'Mirá esto @Agustina Ball', date: TWO_DAYS_AGO_ISO }], // assigned (mención)
        }],
        requests: [
          { id: 'r1', name: 'Vencido', owner: 'Agustina Ball', status: 'pending', createdAt: TEN_DAYS_AGO_ISO, deadline: YESTERDAY }, // overdue
          { id: 'r2', name: 'Pronto',  owner: 'Agustina Ball', status: 'pending', createdAt: TEN_DAYS_AGO_ISO, deadline: TOMORROW },  // soon
          { id: 'r3', name: 'Nuevo',   owner: 'Agustina Ball', status: 'pending', createdAt: TWO_DAYS_AGO_ISO },                      // new
        ],
        assignedTasks: [],
      };
      const notifs = buildNotifications(AGUS, data, opts);
      const types = notifs.map((n) => n.type);
      const idxAssigned = types.indexOf('assigned');
      const idxOverdue = types.indexOf('overdue');
      const idxSoon = types.indexOf('soon');
      const idxNew = types.indexOf('new');
      expect(idxAssigned).toBeGreaterThanOrEqual(0);
      expect(idxAssigned).toBeLessThan(idxOverdue);
      expect(idxOverdue).toBeLessThan(idxSoon);
      expect(idxSoon).toBeLessThan(idxNew);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// 12. world_day — día mundial próximo (aviso a la responsable de Social Media)
// ════════════════════════════════════════════════════════════════════
// NOW = mar 02/06/2026. Día Mundial del Medio Ambiente = vie 05/06
// → aviso 3 hábiles antes = mar 02/06 (hoy). Océanos = lun 08/06 → aviso mié 03/06.
describe('12. world_day — aviso 3 días hábiles antes', () => {
  const DELFI = { name: 'Delfina Palmero', team: 'Comunicación' };

  it('Delfi recibe el aviso del Día del Medio Ambiente el día del aviso', () => {
    const notifs = buildNotifications(DELFI, EMPTY_DATA, opts);
    const n = notifs.find(x => x.id === 'world-day-medio-ambiente-2026-06-05');
    expect(n).toBeTruthy();
    expect(n.type).toBe('world_day');
    expect(n.source).toBe('Social Media');
    expect(n.navTo).toBe('content');
    expect(n.navTab).toBe('calendario');
    expect(n.title).toContain('es en 3 días');
  });

  it('todavía no avisa Océanos (aviso recién el 03/06)', () => {
    const notifs = buildNotifications(DELFI, EMPTY_DATA, opts);
    expect(notifs.find(x => x.id.startsWith('world-day-oceanos'))).toBeUndefined();
  });

  it('el aviso sigue vigente el día mismo y dice "es hoy"', () => {
    const notifs = buildNotifications(DELFI, EMPTY_DATA, { now: new Date('2026-06-05T10:00:00Z') });
    const n = notifs.find(x => x.id === 'world-day-medio-ambiente-2026-06-05');
    expect(n).toBeTruthy();
    expect(n.title).toContain('es hoy');
  });

  it('desaparece una vez pasado el día', () => {
    const notifs = buildNotifications(DELFI, EMPTY_DATA, { now: new Date('2026-06-06T10:00:00Z') });
    expect(notifs.find(x => x.id === 'world-day-medio-ambiente-2026-06-05')).toBeUndefined();
  });

  it('nadie más del equipo recibe el aviso', () => {
    [AGUS, VICKY, FELO].forEach(u => {
      const notifs = buildNotifications(u, EMPTY_DATA, opts);
      expect(notifs.some(x => x.type === 'world_day')).toBe(false);
    });
  });

  it('la persona a avisar se puede sobreescribir por opciones', () => {
    const notifs = buildNotifications(AGUS, EMPTY_DATA, { ...opts, worldDaysNotifyUser: 'Agustina Ball' });
    expect(notifs.some(x => x.type === 'world_day')).toBe(true);
  });
});

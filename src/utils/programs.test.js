// ════════════════════════════════════════════════════════════════════
// Tests para utils/programs — armado de pilares y resumen del programa
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { buildProgramProjects, missingProgramFields, programItems, programSummary, defaultPillarName, matchesProgramScope } from './programs';

const PROGRAM = { id: 'p1', name: 'ISO 27001 España', client: 'Multi-cliente', country: 'España', businessUnit: 'CU Certificaciones', objective: 'Leads ISO 27001' };

describe('programs — armado', () => {
  it('crea un proyecto por pilar tildado, con programId y defaults', () => {
    const form = { pillars: {
      webinars: { enabled: true, date: '2026-11-05', budget: '1200' },
      email:    { enabled: true, name: 'Mailing ISO 27001' },
      paid:     { enabled: true },
      database: { enabled: false },
      eventos:  { enabled: true, date: '2026-11-20' },
    } };
    const out = buildProgramProjects(form, PROGRAM);
    expect(out.webinars).toHaveLength(1);
    expect(out.events).toHaveLength(1);
    expect(out.campaigns.map((c) => c.type).sort()).toEqual(['email', 'paid']);
    expect(out.webinars[0]).toMatchObject({ name: 'ISO 27001 España · Webinars', mainDate: '2026-11-05', pais: 'España', unidadNegocio: 'CU Certificaciones', programId: 'p1', monto: '1200' });
    expect(out.webinars[0].mailPre1).toBeTruthy(); // 21 tareas armadas por makeWebinar
    expect(out.events[0]).toMatchObject({ name: 'ISO 27001 España · Eventos', date: '2026-11-20', country: 'España', programId: 'p1' });
    expect(Object.keys(out.events[0].tasks).length).toBeGreaterThan(0);
    const email = out.campaigns.find((c) => c.type === 'email');
    expect(email).toMatchObject({ name: 'Mailing ISO 27001', businessUnit: 'CU Certificaciones', country: 'España', programId: 'p1', completedSteps: [] });
    expect(email.data.contents).toHaveLength(3);
    const paid = out.campaigns.find((c) => c.type === 'paid');
    expect(paid.objective).toBe('Leads ISO 27001');
    expect(paid.platforms).toEqual([]);
  });

  it('respeta el modo de cobro de cada pilar: USD con monto o cubierto por un plan', () => {
    const form = { pillars: {
      webinars: { enabled: true, date: '2026-11-05', budget: '900', billing: 'plan', planId: 'plan-ar' },
      email:    { enabled: true, budget: '300' },
      paid:     { enabled: true, billing: 'plan', planId: 'plan-ar', budget: '500' },
    } };
    const out = buildProgramProjects(form, PROGRAM);
    expect(out.webinars[0]).toMatchObject({ billing: 'plan', planId: 'plan-ar', monto: '' });
    const email = out.campaigns.find((c) => c.type === 'email');
    expect(email).toMatchObject({ billing: 'usd', planId: null, budget: 300 });
    const paid = out.campaigns.find((c) => c.type === 'paid');
    expect(paid).toMatchObject({ billing: 'plan', planId: 'plan-ar', budget: 0 });
  });

  it('missingProgramFields exige nombre, país, unidad, un pilar y fecha de webinar/evento', () => {
    expect(missingProgramFields({ name: '', country: '', businessUnit: '', pillars: {} })).toEqual(['Nombre del programa', 'País', 'Unidad de negocio', 'Al menos un pilar']);
    expect(missingProgramFields({ name: 'X', country: 'Chile', businessUnit: 'CU Certificaciones', pillars: { webinars: { enabled: true }, paid: { enabled: true } } })).toEqual(['Fecha del webinar']);
    expect(missingProgramFields({ name: 'X', country: 'Chile', businessUnit: 'CU Certificaciones', pillars: { paid: { enabled: true } } })).toEqual([]);
  });

  it('defaultPillarName', () => {
    expect(defaultPillarName('EUDR Chile', 'paid')).toBe('EUDR Chile · Paid Media');
    expect(defaultPillarName('', 'research')).toBe('Investigación');
  });
});

describe('programs — resumen', () => {
  const data = {
    webinars: [{ id: 'w1', programId: 'p1', name: 'W', mainDate: '2026-11-05', teamsGroup: { done: true } }, { id: 'w2', programId: 'otro', name: 'Ajeno' }],
    campaigns: [
      { id: 'c1', programId: 'p1', type: 'paid', name: 'Pauta', completedSteps: ['a', 'b', 'c'] },
      { id: 'c2', programId: 'p1', type: 'email', variant: 'webinar', name: 'Mailings auto', completedSteps: [] }, // no se lista
    ],
    events: [{ id: 'e1', programId: 'p1', name: 'Evento', date: '2026-12-01', tasks: { a: { done: true }, b: { done: false } }, customTasks: [] }],
  };
  it('programItems lista solo los pilares del programa, sin la campaña auto del webinar, ordenados', () => {
    const items = programItems({ id: 'p1' }, data);
    expect(items.map((i) => i.pillar)).toEqual(['webinars', 'eventos', 'paid']);
    expect(items.find((i) => i.pillar === 'paid').completed).toBe(true);
    expect(items.find((i) => i.pillar === 'eventos').progress).toBe(50);
  });
  it('programSummary agrega progreso y estado', () => {
    const s = programSummary(programItems({ id: 'p1' }, data));
    expect(s.total).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.status).toBe('active');
    expect(programSummary([])).toEqual({ total: 0, completed: 0, progress: 0, status: 'planned' });
  });
  it('matchesProgramScope por país y unidad', () => {
    expect(matchesProgramScope(PROGRAM, { countries: ['España'] })).toBe(true);
    expect(matchesProgramScope(PROGRAM, { countries: ['Chile'] })).toBe(false);
    expect(matchesProgramScope(PROGRAM, { countries: ['España'], units: ['Peterson Solutions'] })).toBe(false);
    expect(matchesProgramScope(PROGRAM, null)).toBe(true);
  });
});

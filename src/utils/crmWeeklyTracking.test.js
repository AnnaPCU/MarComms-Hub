// ════════════════════════════════════════════════════════════════════
// Tests para utils/crmWeekly — semáforo, orden, filtros, tags y
// próximas actividades del Weekly check (nov 2026)
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { AMERICA_COUNTRIES } from '@/constants/crmWeekly';
import { activityGroups, countryOptions, checksByEntity, cleanTags, entityActivities, entityProblem, entitySummary, entityTags, filterEntities, sortEntities, trafficLight } from './crmWeekly';

const TODAY = '2026-11-12';
const ITEMS = [{ id: 'a', label: 'A', position: 0 }, { id: 'b', label: 'B', position: 1 }, { id: 'c', label: 'C', position: 2 }, { id: 'd', label: 'D', position: 3 }];
const sum = (done, total = 4) => ({ done, total, pct: Math.round((done / total) * 100), overdue: 0, soon: 0 });

describe('semáforo', () => {
  it('verde al 100 %, amarillo de 50 a 99 %, rojo debajo de 50 %', () => {
    expect(trafficLight(sum(4)).id).toBe('green');
    expect(trafficLight(sum(3)).id).toBe('yellow');
    expect(trafficLight(sum(2)).id).toBe('yellow'); // 50 % justo
    expect(trafficLight(sum(1)).id).toBe('red');
    expect(trafficLight(sum(0)).id).toBe('red');
    expect(trafficLight({ done: 9, total: 10 }).id).toBe('yellow'); // 90 %
    expect(trafficLight({ done: 99, total: 199 }).id).toBe('red'); // 49,7 %: no redondea a 50
    expect(trafficLight({ done: 0, total: 0 })).toBeNull();
    expect(trafficLight(null)).toBeNull();
  });
});

const ENTS = [
  { code: '1', name: 'Uno', brand: 'Control Union', country: 'Perú', priority: 'baja', tags: ['Piloto'], position: 0 },
  { code: '2', name: 'Dos', brand: 'Peterson', country: 'Argentina', priority: 'alta', tags: ['piloto', 'Q1'], position: 1 },
  { code: '3', name: 'Tres', brand: 'Control Union', country: 'Chile', priority: null, tags: [], position: 2 },
  { code: '4', name: 'Cuatro', brand: 'Control Union', country: 'Argentina', priority: 'media', tags: ['Q1'], position: 3 },
];
const SUMS = { 1: sum(4), 2: sum(1), 3: sum(3), 4: sum(0) };

describe('orden y filtros', () => {
  it('por color del semáforo', () => {
    expect(sortEntities(ENTS, 'redFirst', SUMS).map((e) => e.code)).toEqual(['4', '2', '3', '1']);
    expect(sortEntities(ENTS, 'greenFirst', SUMS).map((e) => e.code)).toEqual(['1', '3', '2', '4']);
  });
  it('por importancia, país y orden original', () => {
    expect(sortEntities(ENTS, 'priority', SUMS).map((e) => e.code)).toEqual(['2', '4', '1', '3']);
    expect(sortEntities(ENTS, 'country', SUMS).map((e) => e.code)).toEqual(['2', '4', '3', '1']);
    expect(sortEntities([...ENTS].reverse(), 'manual', SUMS).map((e) => e.code)).toEqual(['1', '2', '3', '4']);
  });
  it('filtra por marca, color, importancia y tag (sin distinguir mayúsculas)', () => {
    expect(filterEntities(ENTS, { brand: 'Peterson' }, SUMS).map((e) => e.code)).toEqual(['2']);
    expect(filterEntities(ENTS, { light: 'red' }, SUMS).map((e) => e.code)).toEqual(['2', '4']);
    expect(filterEntities(ENTS, { priority: 'none' }, SUMS).map((e) => e.code)).toEqual(['3']);
    expect(filterEntities(ENTS, { tag: 'PILOTO' }, SUMS).map((e) => e.code)).toEqual(['1', '2']);
    expect(filterEntities(ENTS, {}, SUMS)).toHaveLength(4);
  });
});

describe('tags y validación', () => {
  it('limpia tags y lista los usados', () => {
    expect(cleanTags([' Piloto ', 'piloto', '', 'Q1', 'Prioridad  alta'])).toEqual(['Piloto', 'Q1', 'Prioridad alta']);
    expect(entityTags(ENTS)).toEqual(['Piloto', 'Q1']);
  });
  it('valida el alta de una entidad', () => {
    expect(entityProblem({ code: '', name: 'X' }, ENTS)).toMatch(/código/);
    expect(entityProblem({ code: '9 9', name: 'X' }, ENTS)).toMatch(/sin espacios/);
    expect(entityProblem({ code: '99', name: ' ' }, ENTS)).toMatch(/nombre/);
    expect(entityProblem({ code: '2', name: 'X' }, ENTS)).toMatch(/Ya hay/);
    expect(entityProblem({ code: '2', name: 'X' }, ENTS, false)).toBeNull(); // edición
    expect(entityProblem({ code: '999', name: 'Nueva' }, ENTS)).toBeNull();
  });
});

describe('próximas actividades', () => {
  const checks = checksByEntity([
    { entityCode: '1', itemId: 'a', done: false, deadline: '2026-11-10' }, // vencida
    { entityCode: '1', itemId: 'b', done: true, deadline: '2026-11-13' },  // tildada: no entra
    { entityCode: '1', itemId: 'c', done: false, deadline: '2026-12-20' }, // lejos
    { entityCode: '1', itemId: 'd', done: false, deadline: '' },           // sin fecha: no es actividad
  ]);
  const steps = [
    { id: 's1', entityCode: '1', title: 'Llamar', dueDate: '2026-11-14', done: false, position: 0 },
    { id: 's2', entityCode: '1', title: 'Sin fecha', dueDate: '', done: false, position: 1 },
    { id: 's3', entityCode: '1', title: 'Hecho', dueDate: '2026-11-13', done: true, position: 2 },
    { id: 's4', entityCode: '2', title: 'Otra entidad', dueDate: '2026-11-13', done: false, position: 0 },
  ];
  it('junta checklist pendiente y steps sin completar, ordenados por fecha', () => {
    const all = entityActivities(ENTS[0], { checks: checks['1'], steps, items: ITEMS, todayIso: TODAY });
    expect(all.items.map((a) => a.id)).toEqual(['check:a', 'step:s1', 'check:c', 'step:s2']);
    expect(all.items[0].days).toBe(-2);
    expect(all.overdue).toBe(1);
    expect(all.undated).toBe(0);
  });
  it('con ventana de días: deja las vencidas y cuenta las sin fecha aparte', () => {
    const week = entityActivities(ENTS[0], { checks: checks['1'], steps, items: ITEMS, todayIso: TODAY, maxDays: 7 });
    expect(week.items.map((a) => a.id)).toEqual(['check:a', 'step:s1']);
    expect(week.undated).toBe(1);
  });
  it('agrupa por entidad o por país', () => {
    expect(activityGroups(ENTS, 'entity')).toHaveLength(4);
    const byCountry = activityGroups([ENTS[1], ENTS[0], ENTS[3], { code: '5', name: 'Cinco' }], 'country');
    expect(byCountry.map((g) => [g.label, g.entities.map((e) => e.code)])).toEqual([['Argentina', ['2', '4']], ['Perú', ['1']], ['Sin país', ['5']]]);
  });
  it('entitySummary sigue igual con los ítems de la base', () => {
    expect(entitySummary(checks['1'], TODAY, ITEMS)).toMatchObject({ done: 1, total: 4, overdue: 1 });
  });
});

describe('países para el alta', () => {
  it('están los 35 de América más los que ya se usan, sin repetir', () => {
    expect(AMERICA_COUNTRIES).toHaveLength(35);
    const list = countryOptions([{ country: 'España' }, { country: 'argentina' }, { country: 'Alemania' }, { country: '' }]);
    expect(list).toHaveLength(37);
    expect(list).toEqual(expect.arrayContaining(['Uruguay', 'Venezuela', 'Canada', 'México', 'España', 'Alemania']));
    expect(list.filter((c) => c.toLowerCase() === 'argentina')).toEqual(['Argentina']);
    expect(list[0]).toBe('Alemania');
  });
});

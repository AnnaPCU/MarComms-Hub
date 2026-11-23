// ════════════════════════════════════════════════════════════════════
// Tests para utils/crmWeekly — semáforo, orden, filtros, tags y
// próximas actividades del Weekly check (nov 2026)
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { AMERICA_COUNTRIES } from '@/constants/crmWeekly';
import { activityGroups, countryCards, countryOptions, itemAppliesTo, itemsFor, itemScopeLabel, itemTargets, onlyInEntity, redDeadlines, checksByEntity, cleanTags, entityActivities, entityProblem, entitySummary, entityTags, filterEntities, sortEntities, sumSummaries, trafficLight } from './crmWeekly';

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
  it('orden doble: el segundo criterio desempata al primero', () => {
    const tie = [
      { code: 'a', priority: 'baja', position: 0 }, { code: 'b', priority: 'alta', position: 1 },
      { code: 'c', priority: 'alta', position: 2 }, { code: 'd', priority: null, position: 3 },
    ];
    const s = { a: sum(1), b: sum(4), c: sum(1), d: sum(1) };
    expect(sortEntities(tie, ['redFirst', 'priority'], s).map((e) => e.code)).toEqual(['c', 'a', 'd', 'b']);
    expect(sortEntities(tie, ['priority', 'redFirst'], s).map((e) => e.code)).toEqual(['c', 'b', 'a', 'd']);
    expect(sortEntities(tie, ['priority', 'manual'], s).map((e) => e.code)).toEqual(['b', 'c', 'a', 'd']);
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
    expect(entityProblem({ code: '', name: 'X' }, ENTS)).toMatch(/code/);
    expect(entityProblem({ code: '9 9', name: 'X' }, ENTS)).toMatch(/no spaces/);
    expect(entityProblem({ code: '99', name: ' ' }, ENTS)).toMatch(/name is missing/);
    expect(entityProblem({ code: '2', name: 'X' }, ENTS)).toMatch(/already an entity/);
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
    expect(byCountry.map((g) => [g.label, g.entities.map((e) => e.code)])).toEqual([['Argentina', ['2', '4']], ['Perú', ['1']], ['No country', ['5']]]);
  });
  it('entitySummary sigue igual con los ítems de la base', () => {
    expect(entitySummary(checks['1'], TODAY, ITEMS)).toMatchObject({ done: 1, total: 4, overdue: 1 });
  });
});

describe('países para el alta', () => {
  it('están los 35 de América más los que ya se usan, sin repetir', () => {
    expect(AMERICA_COUNTRIES).toHaveLength(35);
    const list = countryOptions([{ country: 'Spain' }, { country: 'argentina' }, { country: 'Germany' }, { country: '' }]);
    expect(list).toHaveLength(37);
    expect(list).toEqual(expect.arrayContaining(['Uruguay', 'Venezuela', 'Canada', 'Mexico', 'Spain', 'Germany']));
    expect(list.filter((c) => c.toLowerCase() === 'argentina')).toEqual(['Argentina']);
    expect(list[0]).toBe('Antigua and Barbuda');
  });
});

describe('regiones (Global check)', () => {
  it('filtra por región; sin región cuenta como Americas', () => {
    const ents = [{ code: '1', region: 'EMEA' }, { code: '2', region: 'APAC' }, { code: '3' }];
    expect(filterEntities(ents, { region: 'EMEA' }).map((e) => e.code)).toEqual(['1']);
    expect(filterEntities(ents, { region: 'Americas' }).map((e) => e.code)).toEqual(['3']);
    expect(filterEntities(ents, {})).toHaveLength(3);
  });
  it('agrupa las actividades por región', () => {
    const ents = [{ code: '1', region: 'EMEA' }, { code: '2', region: 'APAC' }, { code: '3', region: 'EMEA' }, { code: '4' }];
    expect(activityGroups(ents, 'region').map((g) => [g.label, g.entities.length])).toEqual([['EMEA', 2], ['APAC', 1], ['Americas', 1]]);
  });
});

describe('countryCards — entidades del mismo país en una tarjeta', () => {
  const list = [
    { code: '592', country: 'Argentina' },
    { code: '583', country: 'Canada' },
    { code: '538', country: ' argentina ' },
    { code: '723', country: '' },
    { code: '879', country: null },
  ];
  it('junta por país sin distinguir mayúsculas y respeta el orden de la primera', () => {
    const cards = countryCards(list);
    expect(cards.map((c) => c.entities.map((e) => e.code))).toEqual([['592', '538'], ['583'], ['723'], ['879']]);
    expect(cards[0].country).toBe('Argentina');
  });
  it('las sin país van solas', () => {
    expect(countryCards(list).filter((c) => !c.country)).toHaveLength(2);
  });
});

describe('sumSummaries — avance de un país', () => {
  it('suma tildados, total, vencidos y próximos', () => {
    const s = sumSummaries([{ done: 9, total: 9, overdue: 0, soon: 0 }, { done: 3, total: 9, overdue: 1, soon: 2 }, null]);
    expect(s).toEqual({ done: 12, total: 18, overdue: 1, soon: 2, pct: 67 });
    expect(trafficLight(s).id).toBe('yellow');
  });
});

describe('alcance de los ítems del checklist (0075)', () => {
  const arg = { code: '538', region: 'Americas' };
  const mx = { code: '598', region: 'Americas' };
  const de = { code: '383', region: 'EMEA' };
  const my = { code: '544', region: 'APAC' };
  const all = { id: 'a', label: 'Para todas' };
  const onlyArg = { id: 'b', label: 'Solo 538', targetCodes: ['538'] };
  const emea = { id: 'c', label: 'EMEA', targetRegions: ['EMEA'] };
  const argEmea = { id: 'd', label: '538 + EMEA', targetCodes: ['538'], targetRegions: ['EMEA'] };
  const allButMx = { id: 'e', label: 'Sin México', excludedCodes: ['598'] };
  const items = [all, onlyArg, emea, argEmea, allButMx];

  it('sin alcance = todas; con códigos o regiones = la unión; excluidas afuera', () => {
    expect(itemsFor(arg, items).map((i) => i.id)).toEqual(['a', 'b', 'd', 'e']);
    expect(itemsFor(mx, items).map((i) => i.id)).toEqual(['a']);
    expect(itemsFor(de, items).map((i) => i.id)).toEqual(['a', 'c', 'd', 'e']);
    expect(itemsFor(my, items).map((i) => i.id)).toEqual(['a', 'e']);
    expect(itemAppliesTo(emea, { code: '999' })).toBe(false); // sin región = Américas
  });

  it('alta: lo tildado → códigos y regiones; las tres regiones = todas', () => {
    expect(itemTargets({ entityCode: '538', thisEntity: true })).toEqual({ targetCodes: ['538'], targetRegions: null });
    expect(itemTargets({ entityCode: '538', thisEntity: false, regions: ['APAC', 'EMEA'] })).toEqual({ targetCodes: null, targetRegions: ['EMEA', 'APAC'] });
    expect(itemTargets({ entityCode: '538', thisEntity: true, regions: ['Americas', 'EMEA', 'APAC'] })).toEqual({ targetCodes: null, targetRegions: null });
  });

  it('etiqueta del alcance y si solo está en esta entidad', () => {
    expect(itemScopeLabel(all, arg)).toBe('');
    expect(itemScopeLabel(onlyArg, arg)).toBe('This entity only');
    expect(itemScopeLabel(argEmea, arg)).toBe('This entity only + EMEA');
    expect(itemScopeLabel(allButMx, arg)).toBe('except 1 entity');
    expect(onlyInEntity(onlyArg, arg)).toBe(true);
    expect(onlyInEntity(argEmea, arg)).toBe(false);
  });

  it('el semáforo y los avisos cuentan solo los ítems de cada entidad', () => {
    const checks = { a: { done: true } };
    expect(entitySummary(checks, TODAY, itemsFor(mx, items))).toMatchObject({ done: 1, total: 1, pct: 100 });
    const red = redDeadlines([{ entityCode: '598', itemId: 'b', done: false, deadline: TODAY }], items, TODAY, [mx]);
    expect(red).toEqual([]); // el ítem «Solo 538» no es de México
  });
});

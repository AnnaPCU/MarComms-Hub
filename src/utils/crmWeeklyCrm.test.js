// Tests de licencias, contactos y empresas por oficina (0079)
import { describe, it, expect } from 'vitest';
import { billingUsers, objectRows } from '../../supabase/functions/hubspot-weekly-deals/crm.js';
import {
  buildUserRows, countObjects, entityLicenses, isSharedUser, matchOwner, mergeLatest, nameTokens,
  objectsAsDeals, ownerCodesFromDeals, personCodes, userStatus, withActivity,
} from './crmWeeklyCrm';

const owners = [
  { ownerId: '1', userId: '11', firstName: 'Saúl', lastName: 'Espinoza', email: 's@x.com', archived: false },
  { ownerId: '2', userId: '22', firstName: 'Martín', lastName: 'Tezanos', email: 'm@x.com', archived: false },
  { ownerId: '3', userId: '33', firstName: 'Ana', lastName: 'Vegas', email: 'a@x.com', archived: true },
  { ownerId: '4', userId: '44', firstName: 'Piotr', lastName: 'Nowak', email: 'p@x.com', archived: false },
  { ownerId: '5', userId: '55', firstName: 'Ana', lastName: 'Lopez', email: 'al@x.com', archived: false },
  { ownerId: '6', userId: '66', firstName: 'Kevin', lastName: 'Gracia', email: 'k@x.com', archived: false },
  { ownerId: '7', userId: '77', firstName: 'Rodrigo', lastName: 'Duret', email: 'r1@x.com', archived: false },
  { ownerId: '8', userId: '88', firstName: 'Rodrigo', lastName: 'Duret', email: 'r2@x.com', archived: false },
];

describe('usuarios de HubSpot por oficina', () => {
  it('normaliza nombres y reconoce el usuario compartido', () => {
    expect(nameTokens('Saúl A. Espinoza')).toEqual(['saul', 'espinoza']);
    expect(isSharedUser('Usuario Compartido')).toBe(true);
    expect(isSharedUser('Ana Vegas')).toBe(false);
  });
  it('empareja por primer nombre + otra palabra, sin ambigüedad', () => {
    expect(matchOwner('Saul A. Espinoza', owners).ownerId).toBe('1');
    expect(matchOwner('Martin Tezanos Pinto', owners).ownerId).toBe('2');
    expect(matchOwner('Ana Vegas', owners).ownerId).toBe('3');
    expect(matchOwner('Ana', owners)).toBe(null);           // una sola palabra
    expect(matchOwner('Lucia Vegas', owners)).toBe(null);   // otro nombre
  });
  it('tolera diferencias chicas de escritura y desempata por los deals', () => {
    expect(matchOwner('Kevin Garcia', owners).ownerId).toBe('6');
    expect(matchOwner('Ana Lope', owners)).toBe(null);       // palabra de 4 letras: tiene que ser exacta
    expect(matchOwner('Rodrigo Duret', owners)).toBe(null);  // dos iguales
    expect(matchOwner('Rodrigo Duret', owners, { code: '598', ownerCodes: { 8: '598' } }).ownerId).toBe('8');
  });
  it('oficina de cada owner por la mayoría de sus deals (solo entidades del Hub)', () => {
    const deals = [
      { owner: '4', pcu: 'pl' }, { owner: '4', pcu: 'pl' }, { owner: '4', pcu: 'ar' },
      { owner: '9', pcu: 'xx' }, { owner: null, pcu: 'pl' },
    ];
    expect(ownerCodesFromDeals(deals, { pl: '555', ar: '538', xx: '999' }, ['555', '538'])).toEqual({ 4: '555' });
  });
  it('arma las filas desde el CRM (entidad por deals); Facturación HubSpot solo da el tipo de licencia', () => {
    const billing = billingUsers([
      { legal_entity: '598 - Control Union de Mexico S.A.', users: [{ name: 'Saul A. Espinoza', license: 'core' }, { name: 'Usuario Compartido', license: 'core' }, { name: 'Nadie Encontrado', license: 'salesPro' }, { name: 'Kevin Garcia', license: 'salesPro' }] },
      { legal_entity: 'Sin código', users: [{ name: 'X Y', license: 'core' }] },
    ]);
    const rows = buildUserRows({ owners, billing, ownerCodes: { 1: '555', 4: '555', 3: '555' }, entityCodes: ['598', '555'], computedAt: 'T' });
    expect(rows.map((r) => [r.id, r.source, r.license])).toEqual([
      ['555:1', 'crm', 'core'],       // el CRM manda: sus deals son de la 555; la licencia, del Excel
      ['555:4', 'crm', null],         // sin licencia conocida
      ['598:6', 'billing', 'salesPro'], // sin deals: entidad del Excel («Gracia» = «Garcia»)
    ]);                               // el 3 está desactivado; compartidos y no encontrados no van
  });
  it('actividad: la más reciente de los tres objetos, activa si es de los últimos 30 días', () => {
    const last = mergeLatest({ 11: '2026-11-01T10:00:00Z' }, { 11: '2026-11-20T10:00:00Z', 44: '2026-09-01T00:00:00Z' });
    expect(last).toEqual({ 11: '2026-11-20T10:00:00Z', 44: '2026-09-01T00:00:00Z' });
    const rows = withActivity([{ user_id: '11' }, { user_id: '44' }, { user_id: null }], last, new Date('2026-11-23T12:00:00Z'));
    expect(rows.map((r) => r.active)).toEqual([true, false, false]);
  });
});

describe('contactos y empresas por oficina', () => {
  it('asigna por owner o, si no tiene, por quien lo creó; cuenta por semana y mes', () => {
    const codes = personCodes([
      { entity_code: '598', owner_id: '1', user_id: '11', source: 'billing' },
      { entity_code: '555', owner_id: '1', user_id: '11', source: 'deals' }, // Facturación manda
      { entity_code: '555', owner_id: '4', user_id: '44', source: 'deals' },
    ]);
    expect(codes.owner).toEqual({ 1: '598', 4: '555' });
    const records = [
      { owner: '1', createdBy: null, source: 'CRM_UI', createdAt: '2026-11-17T15:00:00Z' },
      { owner: null, createdBy: '44', source: 'FORM', createdAt: '2026-11-18T15:00:00Z' },
      { owner: '77', createdBy: '88', source: 'CRM_UI', createdAt: '2026-11-18T15:00:00Z' }, // sin oficina
      { owner: '1', createdBy: null, source: 'IMPORT', createdAt: '2026-11-18T15:00:00Z' },  // no cuenta
      { owner: '4', createdBy: null, source: 'CRM_UI', createdAt: '2026-10-05T15:00:00Z' },
    ];
    const c = countObjects(records, codes, ['2026-11-16'], ['2026-10-01', '2026-11-01']);
    expect(c.weeks).toEqual({ '2026-11-16': { 598: { ui: 1, other: 0 }, 555: { ui: 0, other: 1 } } });
    expect(c.months['2026-10-01']).toEqual({ 555: { ui: 1, other: 0 } });
    expect(c.unassigned).toEqual({ weeks: { '2026-11-16': 1 }, months: { '2026-11-01': 1 } });
    const rows = objectRows([{ code: '598' }, { code: '555' }, { code: '537' }], c, 'contacts', ['2026-11-16'], [], new Set(['598', '555']), 'T');
    expect(rows.map((r) => [r.entity_code, r.created_ui, r.created_other])).toEqual([['598', 1, 0], ['555', 0, 1], ['537', null, null]]);
  });
  it('las filas guardadas se leen con la forma de los deals', () => {
    const rows = [
      { entityCode: '555', objectType: 'contacts', period: 'week', periodStart: '2026-11-16', createdUi: 3, createdOther: 1 },
      { entityCode: '555', objectType: 'companies', period: 'week', periodStart: '2026-11-16', createdUi: 9, createdOther: 0 },
    ];
    expect(objectsAsDeals(rows, 'contacts', 'week')).toEqual([{ entityCode: '555', weekStart: '2026-11-16', dealsUi: 3, dealsOther: 1, dealsImport: null, byOption: {} }]);
  });
});

describe('licencias de una entidad', () => {
  it('agrupa, ordena y resume', () => {
    const users = [
      { entityCode: '598', source: 'billing', name: 'B', license: 'core', matched: true, active: false, lastActivityAt: '2026-09-01' },
      { entityCode: '598', source: 'billing', name: 'A', license: 'salesPro', matched: true, active: true, lastActivityAt: '2026-11-20' },
      { entityCode: '598', source: 'billing', name: 'Usuario Compartido', license: 'core', matched: false, shared: true },
      { entityCode: '598', source: 'billing', name: 'C', license: 'core', matched: false },
      { entityCode: '598', source: 'deals', name: 'D', matched: true, active: true, lastActivityAt: '2026-11-22' },
      { entityCode: '555', source: 'deals', name: 'E', matched: true, active: true },
    ];
    const l = entityLicenses(users, '598');
    expect(l.users.map((u) => u.name)).toEqual(['D', 'A', 'B', 'C', 'Usuario Compartido']);
    expect(l.users.map(userStatus)).toEqual(['active', 'active', 'inactive', 'notFound', 'shared']);
    expect(l.summary).toMatchObject({ total: 5, salesPro: 1, core: 3, noType: 1, active: 2, inactive: 1 });
  });
});

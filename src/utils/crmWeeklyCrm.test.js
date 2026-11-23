// Tests de licencias, contactos y empresas por oficina (0079)
import { describe, it, expect } from 'vitest';
import { billingUsers, crmUsersById, lastActiveByUser, objectRows, ownerOptionsFromDeals } from '../../supabase/functions/hubspot-weekly-deals/crm.js';
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
  it('arma las filas por el MAIN TEAM; seat del objeto Users (o, sin él, del Excel)', () => {
    const team = (o, t) => ({ ...o, primaryTeam: t });
    const os = [
      team(owners[0], '598 - Control Union Mexico S.A de CV'),
      team(owners[3], '555 - Control Union Poland Sp. z o.o.'),
      team(owners[2], '555 - Control Union Poland Sp. z o.o.'),   // desactivado
      team(owners[4], 'CRM Global Team'),                         // equipo sin código
      team(owners[5], '518 - CU WG Spain SA (Textile)'),
      team(owners[6], '999 - Fuera del Hub'),
    ];
    const billing = billingUsers([{ legal_entity: '518 - CU WG Spain S.A.', users: [{ name: 'Kevin Garcia', license: 'core' }] }]);
    const crmUsers = crmUsersById([
      { properties: { hs_internal_user_id: '11', hs_assigned_seats: 'sales-enterprise', hs_last_activity_time: '2026-11-20T10:00:00Z', hs_deactivated: 'false' } },
      { properties: { hs_internal_user_id: '44', hs_assigned_seats: 'view-only', hs_deactivated: 'true' } },
    ]);
    const rows = buildUserRows({ owners: os, crmUsers, billing, entityCodes: ['598', '555', '518'], computedAt: 'T' });
    expect(rows.map((r) => [r.id, r.license, r.pcu_option])).toEqual([
      ['598:1', 'sales-enterprise', '598 - Control Union Mexico S.A de CV'],
      ['518:6', 'core', '518 - CU WG Spain SA (Textile)'],     // sin seat: el del Excel
    ]); // el 4 está desactivado en Users, el 3 archivado, el 5 sin código, el 7 fuera del Hub
    expect(lastActiveByUser(crmUsers)).toEqual({ 11: '2026-11-20T10:00:00Z' });
  });
  it('actividad: la más reciente de los tres objetos, activa si es de los últimos 30 días', () => {
    const last = mergeLatest({ 11: '2026-11-01T10:00:00Z' }, { 11: '2026-11-20T10:00:00Z', 44: '2026-09-01T00:00:00Z' });
    expect(last).toEqual({ 11: '2026-11-20T10:00:00Z', 44: '2026-09-01T00:00:00Z' });
    const rows = withActivity([{ user_id: '11' }, { user_id: '44' }, { user_id: null }], last, new Date('2026-11-23T12:00:00Z'));
    expect(rows.map((r) => r.active)).toEqual([true, false, false]);
  });
});

describe('contactos y empresas por oficina', () => {
  it('asigna por quien lo creó (o el owner) y por unidad de negocio; cuenta por semana y mes', () => {
    const codes = personCodes([
      { entity_code: '538', owner_id: '1', user_id: '11', source: 'crm', pcu_option: '538 - CU Argentina (Certifications)' },
      { entity_code: '555', owner_id: '4', user_id: '44', source: 'crm', pcu_option: '555 - CU Poland' },
      { entity_code: '598', owner_id: '6', user_id: '66', source: 'billing', pcu_option: null },
    ]);
    expect(codes.owner).toEqual({ 1: '538', 4: '555', 6: '598' });
    const records = [
      { owner: '4', createdBy: '11', source: 'CRM_UI', createdAt: '2026-11-17T15:00:00Z' }, // manda quien lo creó: 538
      { owner: '4', createdBy: null, source: 'FORM', createdAt: '2026-11-18T15:00:00Z' },   // sin creador: el owner, 555
      { owner: '77', createdBy: '88', source: 'CRM_UI', createdAt: '2026-11-18T15:00:00Z' }, // sin oficina
      { owner: '1', createdBy: '11', source: 'IMPORT', createdAt: '2026-11-18T15:00:00Z' },  // no cuenta
      { owner: null, createdBy: '66', source: 'CRM_UI', createdAt: '2026-10-05T15:00:00Z' }, // sin unidad de negocio
    ];
    const c = countObjects(records, codes, ['2026-11-16'], ['2026-10-01', '2026-11-01']);
    expect(c.weeks['2026-11-16']).toEqual({
      538: { ui: 1, other: 0, byOption: { '538 - CU Argentina (Certifications)': { ui: 1, other: 0 } } },
      555: { ui: 0, other: 1, byOption: { '555 - CU Poland': { ui: 0, other: 1 } } },
    });
    expect(c.months['2026-10-01']).toEqual({ 598: { ui: 1, other: 0, byOption: {} } });
    expect(c.unassigned).toEqual({ weeks: { '2026-11-16': 1 }, months: { '2026-11-01': 1 } });
    const opts = { 538: { '538 - CU Argentina (Certifications)': { ui: 0, other: 0 }, '538 - CU Argentina (Inspections)': { ui: 0, other: 0 } } };
    const rows = objectRows([{ code: '538' }, { code: '555' }, { code: '537' }], c, 'contacts', ['2026-11-16'], [], new Set(['538', '555']), 'T', opts);
    expect(rows.map((r) => [r.entity_code, r.created_ui, r.created_other])).toEqual([['538', 1, 0], ['555', 0, 1], ['537', null, null]]);
    expect(rows[0].by_option).toEqual({ '538 - CU Argentina (Certifications)': { ui: 1, other: 0 }, '538 - CU Argentina (Inspections)': { ui: 0, other: 0 } });
  });
  it('unidad de negocio de cada owner: la entidad con más deals y, dentro, la opción con más deals', () => {
    const deals = [
      { owner: '4', pcu: 'c' }, { owner: '4', pcu: 'c' }, { owner: '4', pcu: 'i' }, { owner: '4', pcu: 'i' }, { owner: '4', pcu: 'i' },
      { owner: '4', pcu: 'pl' }, { owner: '4', pcu: 'pl' }, { owner: '4', pcu: 'pl' }, { owner: '4', pcu: 'pl' },
    ];
    const v2c = { c: '538', i: '538', pl: '555' };
    const v2l = { c: '538 (Cert)', i: '538 (Insp)', pl: '555 PL' };
    expect(ownerOptionsFromDeals(deals, v2c, ['538', '555'], v2l)).toEqual({ 4: { code: '538', option: '538 (Insp)' } });
  });
  it('las filas guardadas se leen con la forma de los deals', () => {
    const rows = [
      { entityCode: '555', objectType: 'contacts', period: 'week', periodStart: '2026-11-16', createdUi: 3, createdOther: 1 },
      { entityCode: '555', objectType: 'companies', period: 'week', periodStart: '2026-11-16', createdUi: 9, createdOther: 0 },
    ];
    expect(objectsAsDeals(rows, 'contacts', 'week')).toEqual([{ entityCode: '555', weekStart: '2026-11-16', dealsUi: 3, dealsOther: 1, dealsImport: null, byOption: {} }]); // sin by_option: vacío
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
    expect(l.summary).toMatchObject({ total: 5, paid: 4, viewOnly: 0, bySeat: { salesPro: 1, core: 3 }, salesPro: 1, core: 3, noType: 1, active: 2, inactive: 1 });
  });
});

// ════════════════════════════════════════════════════════════════════
// crmWeeklyCrm — Licencias, contactos y empresas por oficina (0079)
// ════════════════════════════════════════════════════════════════════
// La lógica que comparte con la Edge Function vive en
// supabase/functions/hubspot-weekly-deals/crm.js. Acá, lo que usa la ficha:
//   objectsAsDeals(rows, type, period) → filas de crm_weekly_object_counts
//     con la forma de las de deals (para reutilizar DealsPanel)
//   entityLicenses(users, code, now)  → usuarios de una entidad agrupados y
//     el resumen (Sales Pro / Core, activos / inactivos)
//   userStatus(user)                   → 'active' | 'inactive' | 'archived' |
//                                        'notFound' | 'shared'
// ════════════════════════════════════════════════════════════════════

import { optionShortLabel } from '../../supabase/functions/hubspot-weekly-deals/logic.js';
import { ACTIVE_DAYS, matchOwner, nameTokens, isSharedUser, buildUserRows, countObjects, personCodes, ownerCodesFromDeals, withActivity, mergeLatest } from '../../supabase/functions/hubspot-weekly-deals/crm.js';

export { ACTIVE_DAYS, matchOwner, nameTokens, isSharedUser, buildUserRows, countObjects, personCodes, ownerCodesFromDeals, withActivity, mergeLatest };

// crm_weekly_object_counts (ya mapeadas por el servicio) → forma de deals:
// { entityCode, weekStart | monthStart, dealsUi, dealsOther, dealsImport, byOption }
export const objectsAsDeals = (rows = [], type, period) => rows
  .filter((r) => r.objectType === type && r.period === period)
  .map((r) => ({
    entityCode: r.entityCode,
    [period === 'week' ? 'weekStart' : 'monthStart']: r.periodStart,
    dealsUi: r.createdUi,
    dealsOther: r.createdOther,
    dealsImport: null,
    byOption: r.byOption || {},
  }));

export const userStatus = (u) => {
  if (u.shared) return 'shared';
  if (!u.matched) return 'notFound';
  if (u.archived) return 'archived';
  return u.active ? 'active' : 'inactive';
};

// Seats de HubSpot (hs_assigned_seats) y los tipos del Excel
export const LICENSE_LABELS = { salesPro: 'Sales Pro', core: 'Core', 'view-only': 'View-only', 'sales-enterprise': 'Sales Enterprise', 'service-enterprise': 'Service Enterprise', 'sales-professional': 'Sales Pro', 'service-professional': 'Service Pro', partner: 'Partner', developer: 'Developer' };
export const licenseLabel = (seat) => LICENSE_LABELS[seat] || String(seat || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
// Licencia paga = cualquier seat que no sea view-only
export const isPaidSeat = (seat) => !!seat && seat !== 'view-only';

// Días desde la última actividad (null si no hay)
export const daysSince = (iso, now = new Date()) => (iso ? Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000)) : null);

// Usuarios de HubSpot de una entidad (del CRM: por sus deals, nov 2026),
// activos primero y por última actividad. summary: total, activos,
// inactivos y tipo de licencia cuando se conoce (Facturación HubSpot).
// unit (opcional): solo los de esa unidad de negocio (nombre corto del main
// team, «Certifications»); units = las unidades de la entidad.
export const unitOf = (u) => (u.pcuOption ? optionShortLabel(u.pcuOption) : '');
export const entityLicenses = (users = [], code, unit = '') => {
  const ofEntity = users.filter((u) => u.entityCode === code);
  const units = [...new Set(ofEntity.map(unitOf).filter(Boolean))].sort();
  const mine = unit ? ofEntity.filter((u) => unitOf(u) === unit) : ofEntity;
  const order = { active: 0, inactive: 1, archived: 2, notFound: 3, shared: 4 };
  const sort = (a, b) => order[userStatus(a)] - order[userStatus(b)]
    || String(b.lastActivityAt || '').localeCompare(String(a.lastActivityAt || ''))
    || a.name.localeCompare(b.name);
  const list = [...mine].sort(sort);
  const count = (fn) => list.filter(fn).length;
  return {
    users: list,
    units,
    summary: {
      total: list.length,
      paid: count((u) => isPaidSeat(u.license)),
      viewOnly: count((u) => u.license === 'view-only'),
      bySeat: list.reduce((acc, u) => { if (isPaidSeat(u.license)) acc[u.license] = (acc[u.license] || 0) + 1; return acc; }, {}),
      salesPro: count((u) => u.license === 'salesPro'),
      core: count((u) => u.license === 'core'),
      noType: count((u) => !u.license),
      active: count((u) => userStatus(u) === 'active'),
      inactive: count((u) => userStatus(u) === 'inactive' || userStatus(u) === 'archived'),
    },
  };
};

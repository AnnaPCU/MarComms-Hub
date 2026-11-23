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
    byOption: {},
  }));

export const userStatus = (u) => {
  if (u.shared) return 'shared';
  if (!u.matched) return 'notFound';
  if (u.archived) return 'archived';
  return u.active ? 'active' : 'inactive';
};

export const LICENSE_LABELS = { salesPro: 'Sales Pro', core: 'Core' };

// Días desde la última actividad (null si no hay)
export const daysSince = (iso, now = new Date()) => (iso ? Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000)) : null);

// Usuarios de una entidad: con licencia (Facturación HubSpot) y los demás
// (por sus deals), cada grupo ordenado por activos primero y última
// actividad. summary cuenta solo los de Facturación HubSpot.
export const entityLicenses = (users = [], code) => {
  const mine = users.filter((u) => u.entityCode === code);
  const order = { active: 0, inactive: 1, archived: 2, notFound: 3, shared: 4 };
  const sort = (a, b) => order[userStatus(a)] - order[userStatus(b)]
    || String(b.lastActivityAt || '').localeCompare(String(a.lastActivityAt || ''))
    || a.name.localeCompare(b.name);
  const licensed = mine.filter((u) => u.source === 'billing').sort(sort);
  const others = mine.filter((u) => u.source !== 'billing').sort(sort);
  const count = (list, fn) => list.filter(fn).length;
  return {
    licensed,
    others,
    summary: {
      total: licensed.length,
      salesPro: count(licensed, (u) => u.license === 'salesPro'),
      core: count(licensed, (u) => u.license === 'core'),
      noType: count(licensed, (u) => !u.license),
      active: count(licensed, (u) => userStatus(u) === 'active'),
      inactive: count(licensed, (u) => userStatus(u) === 'inactive' || userStatus(u) === 'archived'),
      notFound: count(licensed, (u) => userStatus(u) === 'notFound'),
      shared: count(licensed, (u) => userStatus(u) === 'shared'),
      othersActive: count(others, (u) => userStatus(u) === 'active'),
    },
  };
};

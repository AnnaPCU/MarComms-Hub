// ════════════════════════════════════════════════════════════════════
// hubspot-weekly-deals · contactos, empresas y licencias (lógica pura)
// ════════════════════════════════════════════════════════════════════
// Nov 2026 (migration 0079). Sin Deno, sin red, sin Supabase: la usan la
// Edge Function (index.ts, partes «users» y «objects») y el Hub
// (src/utils/crmWeeklyCrm.js), y se testea con Vitest.
//
// Contactos y empresas no tienen «PCU Entity»: se asignan a una oficina
// por la persona. Owner del registro (hubspot_owner_id) y, si no tiene,
// quien lo creó (hs_created_by_user_id). Cada usuario de HubSpot va a una
// oficina así:
//   1. Si figura en la lista de usuarios de Facturación HubSpot de una
//      entidad (por nombre; «°» = Sales Pro, «-» = Core), esa entidad.
//   2. Si no, la entidad (por PCU Entity) de la mayoría de sus deals desde
//      enero. Así entran también las oficinas de EMEA y APAC, que no están
//      en Facturación HubSpot (sin tipo de licencia).
//
// Licencia activa = el usuario creó o editó un deal, contacto o empresa
// en los últimos 30 días (último que lo modificó, hs_updated_by_user_id).
// ════════════════════════════════════════════════════════════════════

import { SOURCE_IMPORT, SOURCE_UI, codeFromLabel, monthStartAr, normCode, weekStartAr } from './logic.js';

export const ACTIVE_DAYS = 30;
export const OBJECT_TYPES = ['contacts', 'companies'];
// Propiedad de «última modificación» de cada objeto en la Search API
export const LASTMOD_PROPERTY = { deals: 'hs_lastmodifieddate', contacts: 'lastmodifieddate', companies: 'hs_lastmodifieddate' };

// «Saúl A. Espinoza» → ['saul', 'espinoza'] (sin acentos ni iniciales)
export const nameTokens = (name) => String(name || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  .split(' ').filter((t) => t.length > 1);

// «Usuario Compartido» / «Shared user»: una cuenta compartida, no una persona
export const isSharedUser = (name) => /compartid|shared/i.test(String(name || ''));

const ownerName = (o) => `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email || '';

// Owner de HubSpot de un nombre de Facturación HubSpot: mismo primer nombre
// y al menos otra palabra en común («Martin Tezanos Pinto» = «Martín
// Tezanos»). Si hay más de uno, el de más palabras en común; si empatan,
// el activo; si sigue habiendo más de uno, ninguno (ambiguo).
export const matchOwner = (name, owners = []) => {
  const t = nameTokens(name);
  if (t.length < 2) return null;
  const scored = owners.map((o) => {
    const ot = nameTokens(ownerName(o));
    if (!ot.length || ot[0] !== t[0]) return null;
    const common = t.slice(1).filter((x) => ot.slice(1).includes(x)).length;
    return common ? { o, common } : null;
  }).filter(Boolean);
  if (!scored.length) return null;
  const best = Math.max(...scored.map((s) => s.common));
  let top = scored.filter((s) => s.common === best);
  if (top.length > 1) top = top.filter((s) => !s.o.archived);
  return top.length === 1 ? top[0].o : null;
};

// Entidades de Facturación HubSpot → [{ code, users: [{ name, license }] }]
export const billingUsers = (billingEntities = []) => billingEntities
  .map((e) => ({ code: codeFromLabel(e.legal_entity ?? e.legalEntity), users: Array.isArray(e.users) ? e.users : [] }))
  .filter((e) => e.code);

// Deals → la entidad de la mayoría de los deals de cada owner.
// deals: [{ owner, pcu }], valueToCode: PCU Entity (valor → código),
// entityCodes: códigos del Hub → { [ownerId]: code }
export const ownerCodesFromDeals = (deals = [], valueToCode = {}, entityCodes = []) => {
  const known = new Set(entityCodes.map(normCode));
  const tally = {};
  deals.forEach((d) => {
    const code = d.owner && valueToCode[d.pcu];
    if (!code || !known.has(code)) return;
    const t = (tally[d.owner] = tally[d.owner] || {});
    t[code] = (t[code] || 0) + 1;
  });
  /** @type {Record<string, string>} */
  const out = {};
  Object.entries(tally).forEach(([owner, t]) => {
    out[owner] = Object.entries(t).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  });
  return out;
};

const slug = (s) => nameTokens(s).join('-') || 'user';

// Filas de crm_hubspot_users: una por persona y entidad.
//   owners: [{ ownerId, userId, firstName, lastName, email, archived }]
//   billing: billingUsers(...)
//   ownerCodes: ownerCodesFromDeals(...)
//   entityCodes: códigos del Hub (solo se guardan las de esas entidades)
// source = 'billing' (figura en Facturación HubSpot, con licencia) o
// 'deals' (sin licencia conocida: trabaja los deals de esa oficina).
/** @param {{ owners?: any[], billing?: any[], ownerCodes?: Record<string, string>, entityCodes?: string[], computedAt?: string }} args */
export const buildUserRows = ({ owners = [], billing = [], ownerCodes = {}, entityCodes = [], computedAt }) => {
  const known = new Set(entityCodes.map(normCode));
  const rows = [];
  const inBilling = new Set();
  billing.forEach(({ code, users }) => {
    if (!known.has(normCode(code))) return;
    users.forEach((u) => {
      const shared = isSharedUser(u.name);
      const o = shared ? null : matchOwner(u.name, owners);
      if (o) inBilling.add(String(o.ownerId));
      rows.push({
        id: `${code}:${o ? o.ownerId : `billing-${slug(u.name)}`}`,
        entity_code: code,
        source: 'billing',
        name: u.name,
        hubspot_name: o ? ownerName(o) : null,
        email: o?.email || null,
        owner_id: o ? String(o.ownerId) : null,
        user_id: o?.userId ? String(o.userId) : null,
        license: u.license || null,
        matched: !!o,
        shared,
        archived: !!o?.archived,
        computed_at: computedAt,
      });
    });
  });
  owners.forEach((o) => {
    const code = ownerCodes[String(o.ownerId)];
    if (!code || inBilling.has(String(o.ownerId)) || o.archived) return;
    rows.push({
      id: `${code}:${o.ownerId}`,
      entity_code: code,
      source: 'deals',
      name: ownerName(o),
      hubspot_name: ownerName(o),
      email: o.email || null,
      owner_id: String(o.ownerId),
      user_id: o.userId ? String(o.userId) : null,
      license: null,
      matched: true,
      shared: false,
      archived: false,
      computed_at: computedAt,
    });
  });
  // Sin repetir id (la misma persona dos veces en la lista de una entidad)
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.id) ? false : seen.add(r.id)));
};

// Suma la última actividad (ISO, la más reciente de deals / contactos /
// empresas) y si está activa (≤ ACTIVE_DAYS días)
export const withActivity = (rows = [], lastByUser = {}, now = new Date()) => rows.map((r) => {
  const last = r.user_id ? lastByUser[r.user_id] || null : null;
  const active = !!last && now.getTime() - new Date(last).getTime() <= ACTIVE_DAYS * 86400000;
  return { ...r, last_activity_at: last, active };
});

// Junta la última actividad de cada objeto: { userId: iso } × n → la más reciente
export const mergeLatest = (...maps) => {
  const out = {};
  maps.forEach((m) => Object.entries(m || {}).forEach(([u, iso]) => {
    if (iso && (!out[u] || new Date(iso) > new Date(out[u]))) out[u] = iso;
  }));
  return out;
};

// Owner / usuario → entidad, desde las filas de crm_hubspot_users.
// Facturación HubSpot tiene prioridad sobre los deals.
export const personCodes = (userRows = []) => {
  const owner = {};
  const user = {};
  const rank = (r) => (r.source === 'billing' ? 0 : 1);
  [...userRows].sort((a, b) => rank(a) - rank(b)).forEach((r) => {
    if (r.owner_id && !owner[r.owner_id]) owner[r.owner_id] = r.entity_code;
    if (r.user_id && !user[r.user_id]) user[r.user_id] = r.entity_code;
  });
  return { owner, user };
};

// Cuenta contactos o empresas creados por entidad, semana y mes.
// records: [{ owner, createdBy, source, createdAt }]
// → { weeks: { [week]: { [code]: { ui, other } } }, months: {…}, unassigned: { weeks: {…}, months: {…} } }
export const countObjects = (records = [], codes = { owner: {}, user: {} }, weeks = [], months = []) => {
  const wSet = new Set(weeks);
  const mSet = new Set(months);
  const out = { weeks: {}, months: {}, unassigned: { weeks: {}, months: {} } };
  const add = (bucket, key, code, ui) => {
    const c = ((bucket[key] = bucket[key] || {})[code] = bucket[key][code] || { ui: 0, other: 0 });
    if (ui) c.ui += 1; else c.other += 1;
  };
  records.forEach((r) => {
    if (r.source === SOURCE_IMPORT || !r.createdAt) return;
    const code = (r.owner && codes.owner[r.owner]) || (r.createdBy && codes.user[r.createdBy]) || null;
    const week = weekStartAr(r.createdAt);
    const month = monthStartAr(r.createdAt);
    const ui = r.source === SOURCE_UI;
    if (code) {
      if (wSet.has(week)) add(out.weeks, week, code, ui);
      if (mSet.has(month)) add(out.months, month, code, ui);
    } else {
      if (wSet.has(week)) out.unassigned.weeks[week] = (out.unassigned.weeks[week] || 0) + 1;
      if (mSet.has(month)) out.unassigned.months[month] = (out.unassigned.months[month] || 0) + 1;
    }
  });
  return out;
};

// Filas de crm_weekly_object_counts de un tipo (contacts / companies).
// Las entidades sin ninguna persona asignada van con null (no con 0).
export const objectRows = (entities = [], counted = { weeks: {}, months: {} }, objectType, weeks = [], months = [], mappedCodes = new Set(), computedAt) => {
  const rows = [];
  const push = (period, start, bucket) => entities.forEach((e) => {
    const mapped = mappedCodes.has(e.code);
    const c = (bucket[start] || {})[e.code] || { ui: 0, other: 0 };
    rows.push({
      entity_code: e.code, object_type: objectType, period, period_start: start,
      created_ui: mapped ? c.ui : null, created_other: mapped ? c.other : null, computed_at: computedAt,
    });
  });
  weeks.forEach((w) => push('week', w, counted.weeks));
  months.forEach((m) => push('month', m, counted.months));
  return rows;
};

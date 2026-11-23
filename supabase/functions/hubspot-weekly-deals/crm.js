// ════════════════════════════════════════════════════════════════════
// hubspot-weekly-deals · contactos, empresas y licencias (lógica pura)
// ════════════════════════════════════════════════════════════════════
// Nov 2026 (migration 0079). Sin Deno, sin red, sin Supabase: la usan la
// Edge Function (index.ts, partes «users» y «objects») y el Hub
// (src/utils/crmWeeklyCrm.js), y se testea con Vitest.
//
// Contactos y empresas no tienen «PCU Entity»: se asignan a una oficina
// por la persona que los creó (hs_created_by_user_id) y, si no se sabe,
// por el owner (hubspot_owner_id). También se separan por unidad de
// negocio: el main team de esa persona (ej. «538 - … (Certifications)»).
// Cada usuario de
// HubSpot va a una oficina SOLO POR SU MAIN TEAM (nov 2026, a pedido:
// global, sacado del CRM): el código al principio del nombre del equipo
// principal («538 - Control Union Argentina SA (Certifications)» → 538, y
// la unidad de negocio es el nombre del equipo). Los equipos sin código
// («CRM Global Team», «PCU Spain»…) no asignan oficina.
// Licencia = seat del objeto Users de HubSpot (hs_assigned_seats: core,
// sales-enterprise, view-only…; scope crm.objects.users.read). Si no se
// puede leer, el tipo sale de Facturación HubSpot cuando el nombre coincide.
// Activo = «Last Active» de HubSpot (hs_last_activity_time) en los últimos
// 30 días; sin ese dato, el último deal / contacto / empresa que modificó.
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

// Distancia de edición (para «Seijin» / «Sejin», «Garcia» / «Gracia»)
const editDistance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
};
// Dos palabras «iguales»: exactas o, si son largas, con 1–2 letras distintas
const sameWord = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && editDistance(a, b) <= (Math.min(a.length, b.length) >= 6 ? 2 : 1));

// Owner de HubSpot de un nombre de Facturación HubSpot: mismo primer nombre
// y al menos otra palabra en común («Martin Tezanos Pinto» = «Martín
// Tezanos»), exacta o parecida («Echevarria» = «Echeverria»). Si hay más de
// uno, el de más palabras exactas; si empatan, el activo; si siguen
// empatando, el que tiene sus deals en esa entidad (hint: { code,
// ownerCodes }); si no, ninguno (ambiguo).
export const matchOwner = (name, owners = [], hint = {}) => {
  const t = nameTokens(name);
  if (t.length < 2) return null;
  const scored = owners.map((o) => {
    const ot = nameTokens(ownerName(o));
    if (!ot.length || ot[0] !== t[0]) return null;
    const rest = ot.slice(1);
    const exact = t.slice(1).filter((x) => rest.includes(x)).length;
    const near = t.slice(1).filter((x) => rest.some((y) => sameWord(x, y))).length;
    return near ? { o, score: exact * 10 + near } : null;
  }).filter(Boolean);
  if (!scored.length) return null;
  const best = Math.max(...scored.map((s) => s.score));
  let top = scored.filter((s) => s.score === best);
  if (top.length > 1) top = top.filter((s) => !s.o.archived);
  if (top.length > 1 && hint.code && hint.ownerCodes) top = top.filter((s) => hint.ownerCodes[String(s.o.ownerId)] === hint.code);
  return top.length === 1 ? top[0].o : null;
};

// Entidades de Facturación HubSpot → [{ code, users: [{ name, license }] }]
export const billingUsers = (billingEntities = []) => billingEntities
  .map((e) => ({ code: codeFromLabel(e.legal_entity ?? e.legalEntity), users: Array.isArray(e.users) ? e.users : [] }))
  .filter((e) => e.code);

// Deals → la entidad de la mayoría de los deals de cada owner.
// deals: [{ owner, pcu }], valueToCode: PCU Entity (valor → código),
// entityCodes: códigos del Hub → { [ownerId]: code }
const topKey = (t) => Object.entries(t).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
export const ownerCodesFromDeals = (deals = [], valueToCode = {}, entityCodes = []) => {
  /** @type {Record<string, string>} */
  const out = {};
  Object.entries(ownerOptionsFromDeals(deals, valueToCode, entityCodes)).forEach(([o, v]) => { out[o] = v.code; });
  return out;
};
// Lo mismo con la unidad de negocio: { [ownerId]: { code, option } }. La
// entidad es la de más deals (sumando sus opciones); la opción, la de más
// deals dentro de esa entidad (label de PCU Entity, con valueToLabel).
export const ownerOptionsFromDeals = (deals = [], valueToCode = {}, entityCodes = [], valueToLabel = {}) => {
  const known = new Set(entityCodes.map(normCode));
  const byCode = {};
  const byOption = {};
  deals.forEach((d) => {
    const code = d.owner && valueToCode[d.pcu];
    if (!code || !known.has(code)) return;
    const t = (byCode[d.owner] = byCode[d.owner] || {});
    t[code] = (t[code] || 0) + 1;
    const label = valueToLabel[d.pcu] || d.pcu;
    const o = ((byOption[d.owner] = byOption[d.owner] || {})[code] = byOption[d.owner][code] || {});
    o[label] = (o[label] || 0) + 1;
  });
  /** @type {Record<string, { code: string, option: string }>} */
  const out = {};
  Object.entries(byCode).forEach(([owner, t]) => {
    const code = topKey(t);
    out[owner] = { code, option: topKey(byOption[owner][code]) };
  });
  return out;
};

// Filas de crm_hubspot_users: una por usuario de HubSpot (no desactivado)
// cuyo main team tiene código de una entidad del Hub.
//   owners: [{ ownerId, userId, firstName, lastName, email, archived, primaryTeam }]
//   crmUsers: { [userId]: { seat, lastActive, deactivated } } (objeto Users; {} si no hay scope)
//   billing: billingUsers(...) (Facturación HubSpot: tipo de licencia si no hay seat)
//   entityCodes: códigos del Hub
/** @param {{ owners?: any[], crmUsers?: Record<string, any>, billing?: any[], entityCodes?: string[], computedAt?: string }} args */
export const buildUserRows = ({ owners = [], crmUsers = {}, billing = [], entityCodes = [], computedAt }) => {
  const known = new Set(entityCodes.map(normCode));
  const teamCodes = {};
  owners.forEach((o) => { const c = codeFromLabel(o.primaryTeam); if (c) teamCodes[String(o.ownerId)] = c; });
  const licenseOf = {};
  billing.forEach(({ code, users }) => users.forEach((u) => {
    if (isSharedUser(u.name)) return;
    const o = matchOwner(u.name, owners, { code, ownerCodes: teamCodes });
    if (o && !licenseOf[String(o.ownerId)]) licenseOf[String(o.ownerId)] = u.license || null;
  }));
  const rows = [];
  owners.forEach((o) => {
    const id = String(o.ownerId);
    const cu = (o.userId && crmUsers[String(o.userId)]) || null;
    if (o.archived || cu?.deactivated) return;
    const code = teamCodes[id];
    if (!code || !known.has(normCode(code))) return;
    rows.push({
      id: `${code}:${id}`,
      entity_code: code,
      source: 'team',
      name: ownerName(o),
      hubspot_name: ownerName(o),
      email: o.email || null,
      owner_id: id,
      user_id: o.userId ? String(o.userId) : null,
      license: cu?.seat || licenseOf[id] || null,
      pcu_option: String(o.primaryTeam || '').trim() || null,
      matched: true,
      shared: false,
      archived: false,
      computed_at: computedAt,
    });
  });
  return rows;
};

// Objeto Users de HubSpot → { [userId]: { seat, lastActive, deactivated } }
export const crmUsersById = (results = []) => {
  const out = {};
  results.forEach((r) => {
    const p = r.properties || r;
    const id = p.hs_internal_user_id;
    if (!id) return;
    out[String(id)] = { seat: p.hs_assigned_seats || null, lastActive: p.hs_last_activity_time || null, deactivated: String(p.hs_deactivated) === 'true' };
  });
  return out;
};
// Last Active de cada usuario (para withActivity)
export const lastActiveByUser = (crmUsers = {}) => {
  const out = {};
  Object.entries(crmUsers).forEach(([id, u]) => { if (u.lastActive) out[id] = u.lastActive; });
  return out;
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

// Owner / usuario → entidad (y unidad de negocio, pcu_option), desde las
// filas de crm_hubspot_users (una por persona)
export const personCodes = (userRows = []) => {
  const owner = {};
  const user = {};
  const ownerOption = {};
  const userOption = {};
  userRows.forEach((r) => {
    if (r.owner_id && !owner[r.owner_id]) { owner[r.owner_id] = r.entity_code; ownerOption[r.owner_id] = r.pcu_option || null; }
    if (r.user_id && !user[r.user_id]) { user[r.user_id] = r.entity_code; userOption[r.user_id] = r.pcu_option || null; }
  });
  return { owner, user, ownerOption, userOption };
};

// Cuenta contactos o empresas creados por entidad, semana y mes, por quien
// los creó (o, si no se sabe, por el owner), y por unidad de negocio.
// records: [{ owner, createdBy, source, createdAt }]
// → { weeks: { [week]: { [code]: { ui, other, byOption: { [label]: { ui, other } } } } }, months: {…},
//     unassigned: { weeks: {…}, months: {…} } }
export const countObjects = (records = [], codes = { owner: {}, user: {} }, weeks = [], months = []) => {
  const wSet = new Set(weeks);
  const mSet = new Set(months);
  const out = { weeks: {}, months: {}, unassigned: { weeks: {}, months: {} } };
  const add = (bucket, key, code, option, ui) => {
    const c = ((bucket[key] = bucket[key] || {})[code] = bucket[key][code] || { ui: 0, other: 0, byOption: {} });
    const o = option ? (c.byOption[option] = c.byOption[option] || { ui: 0, other: 0 }) : null;
    if (ui) { c.ui += 1; if (o) o.ui += 1; } else { c.other += 1; if (o) o.other += 1; }
  };
  records.forEach((r) => {
    if (r.source === SOURCE_IMPORT || !r.createdAt) return;
    const byCreator = r.createdBy && codes.user[r.createdBy];
    const code = byCreator || (r.owner && codes.owner[r.owner]) || null;
    const option = byCreator ? (codes.userOption || {})[r.createdBy] : code ? (codes.ownerOption || {})[r.owner] : null;
    const week = weekStartAr(r.createdAt);
    const month = monthStartAr(r.createdAt);
    const ui = r.source === SOURCE_UI;
    if (code) {
      if (wSet.has(week)) add(out.weeks, week, code, option, ui);
      if (mSet.has(month)) add(out.months, month, code, option, ui);
    } else {
      if (wSet.has(week)) out.unassigned.weeks[week] = (out.unassigned.weeks[week] || 0) + 1;
      if (mSet.has(month)) out.unassigned.months[month] = (out.unassigned.months[month] || 0) + 1;
    }
  });
  return out;
};

// Filas de crm_weekly_object_counts de un tipo (contacts / companies).
// Las entidades sin ninguna persona asignada van con null (no con 0).
// optionsByCode (opcional): { [code]: { [label]: { ui: 0, other: 0 } } } con
// las unidades de negocio de las personas de cada entidad (aparecen en 0).
export const objectRows = (entities = [], counted = { weeks: {}, months: {} }, objectType, weeks = [], months = [], mappedCodes = new Set(), computedAt, optionsByCode = {}) => {
  const rows = [];
  const push = (period, start, bucket) => entities.forEach((e) => {
    const mapped = mappedCodes.has(e.code);
    const c = (bucket[start] || {})[e.code] || { ui: 0, other: 0, byOption: {} };
    rows.push({
      entity_code: e.code, object_type: objectType, period, period_start: start,
      created_ui: mapped ? c.ui : null, created_other: mapped ? c.other : null,
      by_option: mapped ? { ...(optionsByCode[e.code] || {}), ...c.byOption } : {}, computed_at: computedAt,
    });
  });
  weeks.forEach((w) => push('week', w, counted.weeks));
  months.forEach((m) => push('month', m, counted.months));
  return rows;
};

// Unidades de negocio de cada entidad según sus personas (para que en la
// ficha aparezcan todas, también las que no crearon nada en el período)
export const optionsByCodeFromUsers = (userRows = []) => {
  const out = {};
  userRows.forEach((r) => {
    if (!r.pcu_option) return;
    (out[r.entity_code] = out[r.entity_code] || {})[r.pcu_option] = { ui: 0, other: 0 };
  });
  return out;
};

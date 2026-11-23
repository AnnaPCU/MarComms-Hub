// ════════════════════════════════════════════════════════════════════
// Edge Function hubspot-weekly-deals — CRM HubSpot · Weekly check
// ════════════════════════════════════════════════════════════════════
// Cuenta los deals nuevos de HubSpot por entidad y por semana (lunes a
// domingo, hora de Argentina) y los guarda en crm_weekly_deal_counts
// (migration 0071). Dos conteos: «CRM UI» (cargados a mano en HubSpot) y
// «otros» (workflows, formularios, integraciones…). Las importaciones van
// aparte (deals_import, migration 0079), así el total cierra con HubSpot.
//
// Cada corrida recalcula las últimas 8 semanas y cada mes desde enero del
// año en curso (migration 0078, crm_weekly_deal_months, «Since January» de
// la ficha). Trae todos los deals del período de una vez (tramos de un mes,
// ~140 páginas de 200 con las importaciones) y los reparte acá. Así una
// entidad nueva tiene su historia y se corrigen cambios recientes.
//
// Partes (body.part, nov 2026, migration 0079):
//   (sin part)  deals por semana y por mes (lo de arriba)
//   'users'     usuarios de HubSpot por oficina (Facturación HubSpot o la
//               mayoría de sus deals), licencia y última actividad (30 días)
//               → crm_hubspot_users
//   'objects'   contactos y empresas creados por oficina, por semana y por
//               mes desde enero (por owner / creador) → crm_weekly_object_counts
// Cada parte tiene su freno y su estado en crm_weekly_crm_sync (id = parte).
// Lógica pura de esas dos en crm.js.
//
// La llama: pg_cron todos los días (migration 0072) y el botón «Actualizar»
// del Weekly check. Tiene un freno de 10 minutos entre corridas (1 minuto
// si la anterior falló; crm_weekly_deal_sync.last_run_at), así nadie la
// puede disparar en loop. Ante un 401 el error dice el motivo de HubSpot y
// la forma de la clave (largo, si empieza con «pat-», si tenía espacios),
// nunca la clave.
//
// Secrets (Supabase → Edge Functions → Secrets; NUNCA en el repo):
//   HUBSPOT_TOKEN  — token de la app privada de HubSpot, scopes
//                    crm.objects.deals.read + crm.schemas.deals.read
//                    (+ crm.objects.contacts.read, crm.objects.companies.read
//                    y crm.objects.owners.read para 'users' / 'objects')
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — los pone Supabase solo
//
// Deploy: supabase functions deploy hubspot-weekly-deals --no-verify-jwt
// (sin JWT: el freno de 10 minutos y que solo lee de HubSpot la hacen
// inofensiva; así el cron no necesita guardar ninguna clave).
// ════════════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  PCU_ENTITY_LABEL, SOURCE_IMPORT, SOURCE_PROPERTY, WEEKS_TO_LOAD,
  cooldownFor, countWeek, lastWeeks, monthRangeMs, monthsSinceJanuary, pcuEntityProperty, redactSecrets, toMonthRows, tokenShape, weekRangeMs, weekRows,
} from './logic.js';
import {
  LASTMOD_PROPERTY, OBJECT_TYPES, billingUsers, buildUserRows, countObjects, mergeLatest, objectRows, ownerCodesFromDeals, personCodes, withActivity,
} from './crm.js';

const HUBSPOT = 'https://api.hubapi.com';
const PAUSE_MS = 260; // ~4 llamadas por segundo (el límite de la Search API es 5)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Error de HubSpot con el estado y el motivo que dio (sin la clave)
class HubspotError extends Error {
  status: number;
  constructor(status: number, detail: string) { super(detail); this.status = status; }
}

// Llamada a HubSpot con reintento ante 429 (rate limit) o 5xx
async function hubspot(token: string, path: string, init: RequestInit = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${HUBSPOT}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { await sleep(1000 * (attempt + 1)); continue; }
    // Sin el token en el mensaje: solo el estado y el motivo de HubSpot
    const text = await res.text();
    let detail = text;
    try { const b = JSON.parse(text); detail = [b.category, b.message].filter(Boolean).join(' · ') || text; } catch (_e) { /* texto plano */ }
    throw new HubspotError(res.status, redactSecrets(detail).slice(0, 220));
  }
  throw new Error('HubSpot did not respond after several attempts (rate limit or server error).');
}

// ── Partes 'users' y 'objects' (0079) ──
type Props = Record<string, string | null>;
const DAY = 86400000;

// Todos los registros de un objeto con createdate en [start, end) y filtros
// extra (paginado de a 200; si el rango pasa los 10.000 de la Search API,
// se parte en dos)
async function searchRange(token: string, objectType: string, start: number, end: number, extra: unknown[], properties: string[]): Promise<Props[]> {
  const out: Props[] = [];
  let after: string | undefined;
  do {
    const body = {
      filterGroups: [{ filters: [
        { propertyName: 'createdate', operator: 'GTE', value: String(start) },
        { propertyName: 'createdate', operator: 'LT', value: String(end) },
        ...extra,
      ] }],
      properties, limit: 200, ...(after ? { after } : {}),
    };
    const page = await hubspot(token, `/crm/v3/objects/${objectType}/search`, { method: 'POST', body: JSON.stringify(body) });
    await sleep(PAUSE_MS);
    if (!after && (page.total || 0) > 9800 && end - start > DAY) {
      const mid = start + Math.floor((end - start) / 2);
      return [...await searchRange(token, objectType, start, mid, extra, properties), ...await searchRange(token, objectType, mid, end, extra, properties)];
    }
    (page.results || []).forEach((r: { properties?: Props }) => out.push(r.properties || {}));
    after = page.paging?.next?.after;
  } while (after);
  return out;
}

// [start, end) partido en tramos de ~31 días
const chunks = (start: number, end: number, size = 31 * DAY) => {
  const out: { start: number; end: number }[] = [];
  for (let s = start; s < end; s += size) out.push({ start: s, end: Math.min(end, s + size) });
  return out;
};

// Owners de HubSpot (activos y desactivados)
async function listOwners(token: string) {
  const out: { ownerId: string; userId: string | null; firstName: string; lastName: string; email: string; archived: boolean }[] = [];
  for (const archived of [false, true]) {
    let after: string | undefined;
    do {
      const page = await hubspot(token, `/crm/v3/owners?limit=100&archived=${archived}${after ? `&after=${after}` : ''}`);
      (page.results || []).forEach((o: Record<string, unknown>) => out.push({
        ownerId: String(o.id), userId: o.userId ? String(o.userId) : null,
        firstName: String(o.firstName || ''), lastName: String(o.lastName || ''), email: String(o.email || ''), archived,
      }));
      after = page.paging?.next?.after;
      await sleep(PAUSE_MS);
    } while (after);
  }
  return out;
}

// Última modificación de cada usuario en un objeto, en los últimos `days`
// días. Busca los registros modificados por cualquiera de los usuarios
// pendientes, del más nuevo al más viejo: el primero de cada usuario es su
// última actividad; los encontrados salen de la lista y se repite. Los que
// no aparecen en una página incompleta no tuvieron actividad.
async function lastActivity(token: string, objectType: string, userIds: string[], since: number) {
  const prop = LASTMOD_PROPERTY[objectType as keyof typeof LASTMOD_PROPERTY];
  const found: Record<string, string> = {};
  let pending = [...new Set(userIds)];
  for (let round = 0; pending.length && round < 80; round++) {
    const chunk = pending.slice(0, 100);
    const body = {
      filterGroups: [{ filters: [
        { propertyName: 'hs_updated_by_user_id', operator: 'IN', values: chunk },
        { propertyName: prop, operator: 'GTE', value: String(since) },
      ] }],
      sorts: [{ propertyName: prop, direction: 'DESCENDING' }],
      properties: ['hs_updated_by_user_id', prop], limit: 200,
    };
    const page = await hubspot(token, `/crm/v3/objects/${objectType}/search`, { method: 'POST', body: JSON.stringify(body) });
    await sleep(PAUSE_MS);
    const results = page.results || [];
    results.forEach((r: { properties?: Props }) => {
      const u = r.properties?.hs_updated_by_user_id;
      const at = r.properties?.[prop];
      if (u && at && !found[u]) found[u] = at;
    });
    pending = pending.filter((u) => !found[u]);
    if (results.length < 200) pending = pending.filter((u) => !chunk.includes(u));
  }
  return found;
}

async function runUsers(token: string, db: ReturnType<typeof createClient>, startedAt: string) {
  const owners = await listOwners(token);
  const { data: entities, error: eErr } = await db.from('crm_weekly_entities').select('code');
  if (eErr) throw new Error(`Could not read the entities: ${eErr.message}`);
  const codes = (entities || []).map((e: { code: string }) => e.code);
  const { data: billing, error: bErr } = await db.from('hubspot_billing_entities').select('legal_entity, users');
  if (bErr) throw new Error(`Could not read the HubSpot billing users: ${bErr.message}`);

  // Oficina de cada owner por sus deals de los últimos 180 días
  const props = await hubspot(token, '/crm/v3/properties/deals');
  const pcu = pcuEntityProperty(props.results || []);
  if (!pcu) throw new Error(`Could not find the deal property «${PCU_ENTITY_LABEL}» in HubSpot.`);
  await sleep(PAUSE_MS);
  const now = Date.now();
  const deals: { owner: string | null; pcu: string | null }[] = [];
  for (const r of chunks(now - 180 * DAY, now)) {
    const rows = await searchRange(token, 'deals', r.start, r.end, [
      { propertyName: 'hubspot_owner_id', operator: 'HAS_PROPERTY' },
      { propertyName: pcu.name, operator: 'HAS_PROPERTY' },
    ], ['hubspot_owner_id', pcu.name]);
    rows.forEach((p) => deals.push({ owner: p.hubspot_owner_id, pcu: p[pcu.name] }));
  }
  const ownerCodes = ownerCodesFromDeals(deals, pcu.valueToCode, codes);
  const rows = buildUserRows({ owners, billing: billingUsers(billing || []), ownerCodes, entityCodes: codes, computedAt: startedAt });

  // Última actividad (deals, contactos y empresas, últimos 30 días)
  const ids = rows.map((r) => r.user_id).filter(Boolean) as string[];
  const since = now - 30 * DAY;
  const last = mergeLatest(
    await lastActivity(token, 'deals', ids, since),
    await lastActivity(token, 'contacts', ids, since),
    await lastActivity(token, 'companies', ids, since),
  );
  const final = withActivity(rows, last, new Date(now));

  const { error: uErr } = await db.from('crm_hubspot_users').upsert(final, { onConflict: 'id' });
  if (uErr) throw new Error(`Could not save the users: ${uErr.message}`);
  await db.from('crm_hubspot_users').delete().lt('computed_at', startedAt);
  const billingRows = final.filter((r) => r.source === 'billing');
  return {
    users: final.length,
    billing: billingRows.length,
    notFound: billingRows.filter((r) => !r.matched && !r.shared).length,
    active: final.filter((r) => r.active).length,
  };
}

async function runObjects(token: string, db: ReturnType<typeof createClient>, startedAt: string) {
  const { data: entities, error: eErr } = await db.from('crm_weekly_entities').select('code');
  if (eErr) throw new Error(`Could not read the entities: ${eErr.message}`);
  const { data: users, error: uErr } = await db.from('crm_hubspot_users').select('entity_code, owner_id, user_id, source');
  if (uErr) throw new Error(`Could not read the HubSpot users: ${uErr.message}`);
  if (!users?.length) throw new Error('There are no HubSpot users per office yet: run the «users» update first.');
  const codes = personCodes(users);
  const mapped = new Set(users.filter((u: { owner_id: string | null; user_id: string | null }) => u.owner_id || u.user_id).map((u: { entity_code: string }) => u.entity_code));

  const weeks = lastWeeks(WEEKS_TO_LOAD);
  const months = monthsSinceJanuary();
  const start = Math.min(weekRangeMs(weeks[0]).start, monthRangeMs(months[0]).start);
  const end = Date.now();
  const info: Record<string, unknown> = {};
  for (const type of OBJECT_TYPES) {
    const records: { owner: string | null; createdBy: string | null; source: string | null; createdAt: string | null }[] = [];
    for (const r of chunks(start, end)) {
      const rows = await searchRange(token, type, r.start, r.end, [
        { propertyName: SOURCE_PROPERTY, operator: 'NEQ', value: SOURCE_IMPORT },
      ], ['hubspot_owner_id', 'hs_created_by_user_id', SOURCE_PROPERTY, 'createdate']);
      rows.forEach((p) => records.push({ owner: p.hubspot_owner_id, createdBy: p.hs_created_by_user_id, source: p[SOURCE_PROPERTY], createdAt: p.createdate }));
    }
    const counted = countObjects(records, codes, weeks, months);
    const out = objectRows(entities || [], counted, type, weeks, months, mapped, startedAt);
    const { error } = await db.from('crm_weekly_object_counts').upsert(out, { onConflict: 'entity_code,object_type,period,period_start' });
    if (error) throw new Error(`Could not save the ${type} counts: ${error.message}`);
    info[type] = { records: records.length, unassigned: counted.unassigned };
  }
  return info;
}

const PART_SCOPES: Record<string, string> = {
  users: 'crm.objects.owners.read, crm.objects.deals.read, crm.objects.contacts.read and crm.objects.companies.read',
  objects: 'crm.objects.contacts.read and crm.objects.companies.read',
};

// Corre la parte 'users' u 'objects' con su freno y su fila en crm_weekly_crm_sync
async function runPart(part: 'users' | 'objects', token: string, shape: ReturnType<typeof tokenShape>, db: ReturnType<typeof createClient>, trigger: string) {
  const { data: sync } = await db.from('crm_weekly_crm_sync').select('*').eq('id', part).maybeSingle();
  const wait = cooldownFor(sync);
  if (wait > 0) return json({ ok: true, skipped: true, message: `Updated recently. Try again in ${wait} min.` });
  const startedAt = new Date().toISOString();
  await db.from('crm_weekly_crm_sync').upsert({ id: part, last_run_at: startedAt, trigger });
  try {
    if (!token) throw new Error('The HUBSPOT_TOKEN secret is missing in Supabase.');
    const info = part === 'users' ? await runUsers(token, db, startedAt) : await runObjects(token, db, startedAt);
    await db.from('crm_weekly_crm_sync').upsert({ id: part, last_run_at: startedAt, last_ok_at: new Date().toISOString(), ok: true, error: null, info, trigger });
    return json({ ok: true, part, ...info });
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof HubspotError) {
      const keyInfo = `Stored key: ${shape.length} characters, ${shape.pat ? 'starts with «pat-»' : 'does NOT start with «pat-»'}${shape.hadSpaces ? ', had spaces or line breaks' : ''}.`;
      if (err.status === 401) message = `HubSpot rejected the token (401): ${err.message}. ${keyInfo} Check the HUBSPOT_TOKEN secret.`;
      else if (err.status === 403) message = `The HubSpot token lacks permission (403): ${err.message}. It needs ${PART_SCOPES[part]}.`;
      else message = `HubSpot responded ${err.status}: ${err.message}`;
    }
    await db.from('crm_weekly_crm_sync').upsert({ id: part, last_run_at: startedAt, ok: false, error: message, trigger });
    return json({ ok: false, error: message }, 500);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405);

  const shape = tokenShape(Deno.env.get('HUBSPOT_TOKEN'));
  const token = shape.clean; // sin espacios ni saltos de línea al pegar
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let trigger = 'manual';
  let part = '';
  try {
    const body = await req.json();
    trigger = body?.trigger === 'cron' ? 'cron' : 'manual';
    part = body?.part === 'users' || body?.part === 'objects' ? body.part : '';
  } catch (_e) { /* sin body */ }
  if (part) return runPart(part as 'users' | 'objects', token, shape, db, trigger);

  // Freno: una corrida cada 10 minutos como mucho
  const { data: sync } = await db.from('crm_weekly_deal_sync').select('*').eq('id', 1).maybeSingle();
  const wait = cooldownFor(sync);
  if (wait > 0) return json({ ok: true, skipped: true, message: `Updated recently. Try again in ${wait} min.` });

  const startedAt = new Date().toISOString();
  await db.from('crm_weekly_deal_sync').upsert({ id: 1, last_run_at: startedAt, trigger });

  try {
    if (!token) throw new Error('The HUBSPOT_TOKEN secret is missing in Supabase.');

    // 1) Propiedad «PCU Entity» y sus opciones (código ← label)
    const props = await hubspot(token, '/crm/v3/properties/deals');
    const pcu = pcuEntityProperty(props.results || []);
    if (!pcu) throw new Error(`Could not find the deal property «${PCU_ENTITY_LABEL}» in HubSpot.`);
    await sleep(PAUSE_MS);

    // 2) Entidades del Hub
    const { data: entities, error: eErr } = await db.from('crm_weekly_entities').select('code');
    if (eErr) throw new Error(`Could not read the entities: ${eErr.message}`);
    const codes = (entities || []).map((e) => e.code);

    // 3) Todos los deals desde la semana más vieja o el 1 de enero (lo
    //    que sea antes), importados incluidos (van aparte, 0079), en tramos
    //    de un mes; después se reparten por semana y por mes acá
    const weeks = lastWeeks(WEEKS_TO_LOAD);
    const months = monthsSinceJanuary();
    const from = Math.min(weekRangeMs(weeks[0]).start, monthRangeMs(months[0]).start);
    const deals: { pcu: string | null; source: string | null; at: number }[] = [];
    for (const r of chunks(from, Date.now())) {
      const found = await searchRange(token, 'deals', r.start, r.end, [], [pcu.name, SOURCE_PROPERTY, 'createdate']);
      found.forEach((p) => deals.push({ pcu: p[pcu.name] || null, source: p[SOURCE_PROPERTY] || null, at: p.createdate ? Date.parse(p.createdate) : 0 }));
    }
    const inRange = ({ start, end }: { start: number; end: number }) => deals.filter((d) => d.at >= start && d.at < end);

    const rows: ReturnType<typeof weekRows> = [];
    const unassigned: Record<string, number> = {};
    for (const week of weeks) {
      const counted = countWeek(inRange(weekRangeMs(week)), pcu.valueToCode, codes, pcu.valueToLabel);
      unassigned[week] = counted.unassigned;
      rows.push(...weekRows(entities || [], pcu.codes, counted, week, startedAt, pcu.optionsByCode));
    }

    // 4) Guardar
    const { error: uErr } = await db.from('crm_weekly_deal_counts').upsert(rows, { onConflict: 'entity_code,week_start' });
    if (uErr) throw new Error(`Could not save the counts: ${uErr.message}`);

    // 5) Meses desde enero (0078), con los mismos deals
    const monthRows: ReturnType<typeof toMonthRows> = [];
    for (const month of months) {
      const counted = countWeek(inRange(monthRangeMs(month)), pcu.valueToCode, codes, pcu.valueToLabel);
      monthRows.push(...toMonthRows(weekRows(entities || [], pcu.codes, counted, month, startedAt, pcu.optionsByCode)));
    }
    const { error: mErr } = await db.from('crm_weekly_deal_months').upsert(monthRows, { onConflict: 'entity_code,month_start' });
    if (mErr) throw new Error(`Could not save the monthly counts: ${mErr.message}`);

    await db.from('crm_weekly_deal_sync').upsert({ id: 1, last_run_at: startedAt, last_ok_at: new Date().toISOString(), ok: true, error: null, unassigned, trigger });

    return json({ ok: true, weeks: weeks.length, rows: rows.length, months: months.length, monthRows: monthRows.length });
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof HubspotError) {
      const keyInfo = `Stored key: ${shape.length} characters, ${shape.pat ? 'starts with «pat-»' : 'does NOT start with «pat-»'}${shape.hadSpaces ? ', had spaces or line breaks' : ''}.`;
      if (err.status === 401) message = `HubSpot rejected the token (401): ${err.message}. ${keyInfo} Check the HUBSPOT_TOKEN secret.`;
      else if (err.status === 403) message = `The HubSpot token lacks permission (403): ${err.message}. It needs crm.objects.deals.read and crm.schemas.deals.read.`;
      else message = `HubSpot responded ${err.status}: ${err.message}`;
    }
    await db.from('crm_weekly_deal_sync').upsert({ id: 1, last_run_at: startedAt, ok: false, error: message, trigger });
    return json({ ok: false, error: message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════
// Edge Function hubspot-weekly-deals — CRM HubSpot · Weekly check
// ════════════════════════════════════════════════════════════════════
// Cuenta los deals nuevos de HubSpot por entidad y por semana (lunes a
// domingo, hora de Argentina) y los guarda en crm_weekly_deal_counts
// (migration 0071). Dos conteos: «CRM UI» (cargados a mano en HubSpot) y
// «otros» (workflows, formularios, integraciones…). No se cuentan las
// importaciones.
//
// Cada corrida recalcula las últimas 8 semanas: es una búsqueda por semana
// (todas las entidades juntas), unas 8–10 llamadas a HubSpot en total.
// Así una entidad nueva tiene su historia y se corrigen cambios recientes.
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
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — los pone Supabase solo
//
// Deploy: supabase functions deploy hubspot-weekly-deals --no-verify-jwt
// (sin JWT: el freno de 10 minutos y que solo lee de HubSpot la hacen
// inofensiva; así el cron no necesita guardar ninguna clave).
// ════════════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  PCU_ENTITY_LABEL, SOURCE_IMPORT, SOURCE_PROPERTY, WEEKS_TO_LOAD,
  cooldownFor, countWeek, lastWeeks, pcuEntityProperty, redactSecrets, tokenShape, weekRangeMs, weekRows,
} from './logic.js';

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
  throw new Error('HubSpot no respondió después de varios intentos (rate limit o error del servidor).');
}

// Todos los deals no importados de una semana (paginado de a 200)
async function dealsOfWeek(token: string, pcuName: string, weekStart: string) {
  const { start, end } = weekRangeMs(weekStart);
  const out: { pcu: string | null; source: string | null }[] = [];
  let after: string | undefined;
  do {
    const body = {
      filterGroups: [{ filters: [
        { propertyName: 'createdate', operator: 'GTE', value: String(start) },
        { propertyName: 'createdate', operator: 'LT', value: String(end) },
        { propertyName: SOURCE_PROPERTY, operator: 'NEQ', value: SOURCE_IMPORT },
      ] }],
      properties: [pcuName, SOURCE_PROPERTY],
      limit: 200,
      ...(after ? { after } : {}),
    };
    const page = await hubspot(token, '/crm/v3/objects/deals/search', { method: 'POST', body: JSON.stringify(body) });
    (page.results || []).forEach((r: { properties?: Record<string, string | null> }) => {
      out.push({ pcu: r.properties?.[pcuName] || null, source: r.properties?.[SOURCE_PROPERTY] || null });
    });
    after = page.paging?.next?.after;
    await sleep(PAUSE_MS);
  } while (after);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Usá POST.' }, 405);

  const shape = tokenShape(Deno.env.get('HUBSPOT_TOKEN'));
  const token = shape.clean; // sin espacios ni saltos de línea al pegar
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let trigger = 'manual';
  try { trigger = (await req.json())?.trigger === 'cron' ? 'cron' : 'manual'; } catch (_e) { /* sin body */ }

  // Freno: una corrida cada 10 minutos como mucho
  const { data: sync } = await db.from('crm_weekly_deal_sync').select('*').eq('id', 1).maybeSingle();
  const wait = cooldownFor(sync);
  if (wait > 0) return json({ ok: true, skipped: true, message: `Se actualizó hace poco. Probá de nuevo en ${wait} min.` });

  const startedAt = new Date().toISOString();
  await db.from('crm_weekly_deal_sync').upsert({ id: 1, last_run_at: startedAt, trigger });

  try {
    if (!token) throw new Error('Falta el secret HUBSPOT_TOKEN en Supabase.');

    // 1) Propiedad «PCU Entity» y sus opciones (código ← label)
    const props = await hubspot(token, '/crm/v3/properties/deals');
    const pcu = pcuEntityProperty(props.results || []);
    if (!pcu) throw new Error(`No encontré la propiedad de deals «${PCU_ENTITY_LABEL}» en HubSpot.`);
    await sleep(PAUSE_MS);

    // 2) Entidades del Hub
    const { data: entities, error: eErr } = await db.from('crm_weekly_entities').select('code');
    if (eErr) throw new Error(`No se pudieron leer las entidades: ${eErr.message}`);
    const codes = (entities || []).map((e) => e.code);

    // 3) Una búsqueda por semana; se cuenta acá
    const weeks = lastWeeks(WEEKS_TO_LOAD);
    const rows: ReturnType<typeof weekRows> = [];
    const unassigned: Record<string, number> = {};
    for (const week of weeks) {
      const deals = await dealsOfWeek(token, pcu.name, week);
      const counted = countWeek(deals, pcu.valueToCode, codes);
      unassigned[week] = counted.unassigned;
      rows.push(...weekRows(entities || [], pcu.codes, counted, week, startedAt));
    }

    // 4) Guardar
    const { error: uErr } = await db.from('crm_weekly_deal_counts').upsert(rows, { onConflict: 'entity_code,week_start' });
    if (uErr) throw new Error(`No se pudieron guardar los conteos: ${uErr.message}`);
    await db.from('crm_weekly_deal_sync').upsert({ id: 1, last_run_at: startedAt, last_ok_at: new Date().toISOString(), ok: true, error: null, unassigned, trigger });

    return json({ ok: true, weeks: weeks.length, rows: rows.length });
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof HubspotError) {
      const keyInfo = `Clave cargada: ${shape.length} caracteres, ${shape.pat ? 'empieza con «pat-»' : 'NO empieza con «pat-»'}${shape.hadSpaces ? ', tenía espacios o saltos de línea' : ''}.`;
      if (err.status === 401) message = `HubSpot rechazó el token (401): ${err.message}. ${keyInfo} Revisá el secret HUBSPOT_TOKEN.`;
      else if (err.status === 403) message = `El token de HubSpot no tiene permiso (403): ${err.message}. Hacen falta crm.objects.deals.read y crm.schemas.deals.read.`;
      else message = `HubSpot respondió ${err.status}: ${err.message}`;
    }
    await db.from('crm_weekly_deal_sync').upsert({ id: 1, last_run_at: startedAt, ok: false, error: message, trigger });
    return json({ ok: false, error: message }, 500);
  }
});

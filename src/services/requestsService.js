// ════════════════════════════════════════════════════════════════════
// REQUESTS SERVICE — Pedidos internos / Standalone Requests
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase (tabla `public.requests`).
// La UI sigue usando shape camelCase. Los mappers traducen DB↔UI.
//
// Campos en Supabase:
//   id, title, type, category, status, priority,
//   requester_name, owner_name, country, business_unit,
//   budget, details, deadline,
//   created_at, updated_at, completed_at
//
// ⚠️ NO existe todavía columna `content` (comments / files).
//    Los comments/files se mantienen sólo en memoria de runtime.
//    TODO: agregar columna `content jsonb` o tabla `comments`/`files`.
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'requests';

// ════════════════════════════════════════════════════════════════════
// Mappers — DB (snake_case + nombres oficiales) ↔ UI (camelCase histórico)
// ════════════════════════════════════════════════════════════════════
//
// El shape que recibe la UI es el HISTÓRICO de la app (`name`, `owner`,
// `requester`, `detail`, `businessUnit`, `content`, ...). Así no hay
// que tocar componentes que filtran o renderizan por esos nombres.
//
// Mapping completo:
//   DB                ↔ UI
//   id                ↔ id
//   title             ↔ name
//   type              ↔ type
//   category          ↔ category
//   status            ↔ status
//   priority          ↔ priority
//   requester_name    ↔ requester
//   owner_name        ↔ owner
//   country           ↔ country
//   business_unit     ↔ businessUnit
//   budget            ↔ budget
//   details           ↔ detail
//   deadline          ↔ deadline
//   created_at        ↔ createdAt
//   updated_at        ↔ updatedAt
//   completed_at      ↔ completedAt
// ════════════════════════════════════════════════════════════════════

export const fromRow = (row) => {
  if (!row) return null;
  return {
    id:           row.id,
    name:         row.title || '',
    type:         row.type || null,
    category:     row.category || null,
    status:       row.status || 'pending',
    priority:     row.priority || null,
    requester:    row.requester_name || '',
    owner:        row.owner_name || '',
    country:      row.country || '',
    businessUnit: row.business_unit || '',
    budget:       row.budget == null ? 0 : Number(row.budget),
    detail:       row.details || '',
    deadline:     row.deadline || '',
    createdAt:    row.created_at || null,
    updatedAt:    row.updated_at || null,
    completedAt:  row.completed_at || null,
    // Links externos (migration 0012) — solo si la columna ya existe en la DB
    ...(row.planner_link !== undefined ? { plannerLink: row.planner_link || '' } : {}),
    ...(row.hubspot_link !== undefined ? { hubspotLink: row.hubspot_link || '' } : {}),
    // Stub local — todavía no hay columna content en la DB
    content:      { comments: [], files: [] },
  };
};

export const toRow = (obj) => {
  const row = {};
  if (obj.name         !== undefined) row.title = obj.name;
  if (obj.title        !== undefined) row.title = obj.title;
  if (obj.type         !== undefined) row.type = obj.type;
  if (obj.category     !== undefined) row.category = obj.category;
  if (obj.status       !== undefined) row.status = obj.status;
  if (obj.priority     !== undefined) row.priority = obj.priority;
  if (obj.requester    !== undefined) row.requester_name = obj.requester;
  if (obj.owner        !== undefined) row.owner_name = obj.owner;
  if (obj.country      !== undefined) row.country = obj.country;
  if (obj.businessUnit !== undefined) row.business_unit = obj.businessUnit;
  if (obj.budget       !== undefined) row.budget = obj.budget;
  if (obj.detail       !== undefined) row.details = obj.detail;
  if (obj.deadline     !== undefined) row.deadline = obj.deadline || null;
  if (obj.completedAt  !== undefined) row.completed_at = obj.completedAt;
  if (obj.plannerLink  !== undefined) row.planner_link = obj.plannerLink || null;
  if (obj.hubspotLink  !== undefined) row.hubspot_link = obj.hubspotLink || null;
  return row;
};

// ════════════════════════════════════════════════════════════════════
// READS
// ════════════════════════════════════════════════════════════════════

/**
 * Lista todos los pedidos, ordenados por created_at desc.
 * Filtros opcionales: { status, owner, country, businessUnit, category }
 */
export const listRequests = async (filters = {}) => {
  let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (filters.status)       q = q.eq('status', filters.status);
  if (filters.owner)        q = q.eq('owner_name', filters.owner);
  if (filters.country)      q = q.eq('country', filters.country);
  if (filters.businessUnit) q = q.eq('business_unit', filters.businessUnit);
  if (filters.category)     q = q.eq('category', filters.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(fromRow);
};

export const getRequestById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return fromRow(data);
};

// ════════════════════════════════════════════════════════════════════
// WRITES
// ════════════════════════════════════════════════════════════════════

/**
 * Crea un pedido. Recibe shape UI (camelCase).
 * Defaults: status='pending'.
 */
export const createRequest = async (data) => {
  const row = toRow({
    status: 'pending',
    ...data,
  });
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(inserted);
};

/**
 * Actualiza un pedido. Recibe shape UI (camelCase) parcial.
 */
export const updateRequest = async (id, patch) => {
  const row = toRow(patch);
  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
};

export const deleteRequest = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ════════════════════════════════════════════════════════════════════
// REALTIME
// ════════════════════════════════════════════════════════════════════

/**
 * Subscribe a postgres_changes sobre la tabla `requests`.
 * Devuelve la función para limpiar el channel (usar en cleanup de useEffect).
 *
 * onChange recibe el payload crudo de Supabase:
 *   { eventType: 'INSERT' | 'UPDATE' | 'DELETE', new, old, ... }
 */
export const subscribeRequests = (onChange) => {
  const channel = supabase
    .channel('requests-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => onChange(payload),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ════════════════════════════════════════════════════════════════════
// WEBINARS SERVICE — Conectado a Supabase (tabla `public.webinars`)
// ════════════════════════════════════════════════════════════════════
// Las 21 sub-tareas (teamsGroup, testDay, ppt, mailPre1, etc.) viven
// como TOP-LEVEL en el shape de la app, pero en la DB están dentro
// del jsonb `tasks` para no inflar la tabla.
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'webinars';

// Keys de sub-tareas que viven a nivel top-level en el shape de la app.
// Se mueven a/desde `tasks` jsonb al persistir.
const TASK_KEYS = [
  'teamsGroup', 'testDay', 'bbdd', 'hubspot',
  'landingLivestorm', 'ppt', 'onePager',
  'lknAnuncio', 'lknReminder', 'lknHoy', 'lknPost',
  'mailPre1', 'mailPre2', 'mailPre3', 'mailPostAttended', 'mailPostNoShow',
  'bannerInv1', 'bannerInv2', 'bannerInv3', 'bannerPost',
  'reporte',
];

// ── Mappers ──
export const fromRow = (row) => {
  if (!row) return null;
  const tasksJson = row.tasks || {};
  return {
    id:               row.id,
    name:             row.name || '',
    mainDate:         row.main_date || '',
    client:           row.client || '',
    clientPassword:   row.client_password || '',
    monto:            row.monto == null ? '' : Number(row.monto),
    pais:             row.pais || '',
    unidadNegocio:    row.unidad_negocio || '',
    serviceOwner:     row.service_owner || '',
    linkedCampaignId: row.linked_campaign_id || null,
    asistentes:       row.asistentes || '',
    dealsCreated:     row.deals_created || 0,
    completedAt:      row.completed_at || null,
    createdAt:        row.created_at || null,
    updatedAt:        row.updated_at || null,
    // Sub-tareas top-level (vienen de tasks jsonb)
    ...TASK_KEYS.reduce((acc, k) => {
      acc[k] = tasksJson[k] || { done: false };
      return acc;
    }, {}),
  };
};

export const toRow = (obj) => {
  const row = {};
  if (obj.id !== undefined)               row.id = obj.id;
  if (obj.name !== undefined)             row.name = obj.name;
  if (obj.mainDate !== undefined)         row.main_date = obj.mainDate || null;
  if (obj.client !== undefined)           row.client = obj.client;
  if (obj.clientPassword !== undefined)   row.client_password = obj.clientPassword;
  if (obj.monto !== undefined)            row.monto = obj.monto === '' ? 0 : Number(obj.monto);
  if (obj.pais !== undefined)             row.pais = obj.pais;
  if (obj.unidadNegocio !== undefined)    row.unidad_negocio = obj.unidadNegocio;
  if (obj.serviceOwner !== undefined)     row.service_owner = obj.serviceOwner;
  if (obj.linkedCampaignId !== undefined) row.linked_campaign_id = obj.linkedCampaignId;
  if (obj.asistentes !== undefined)       row.asistentes = obj.asistentes;
  if (obj.dealsCreated !== undefined)     row.deals_created = Number(obj.dealsCreated) || 0;
  if (obj.completedAt !== undefined)      row.completed_at = obj.completedAt;

  // Pack sub-tareas en tasks jsonb (solo las que vengan en el obj)
  const hasAnyTask = TASK_KEYS.some((k) => obj[k] !== undefined);
  if (hasAnyTask) {
    const tasks = {};
    TASK_KEYS.forEach((k) => {
      if (obj[k] !== undefined) tasks[k] = obj[k];
    });
    row.tasks = tasks;
  }
  return row;
};

// ── CRUD ──
export const listWebinars = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('main_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
};

export const createWebinar = async (data) => {
  const row = toRow(data);
  // Para INSERT, packear TODAS las sub-tareas (no solo las cambiadas)
  if (!row.tasks) {
    row.tasks = TASK_KEYS.reduce((acc, k) => {
      acc[k] = data[k] || { done: false };
      return acc;
    }, {});
  }
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(inserted);
};

export const updateWebinar = async (id, patch) => {
  // Para UPDATE: si tocamos sub-tareas, hay que mergear con las existentes
  // (no podemos hacer patch parcial de jsonb sin SQL custom).
  const row = toRow(patch);
  if (row.tasks) {
    // Leer fila actual y mergear
    const { data: current, error: readErr } = await supabase
      .from(TABLE)
      .select('tasks')
      .eq('id', id)
      .single();
    if (readErr) throw readErr;
    row.tasks = { ...(current?.tasks || {}), ...row.tasks };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
};

export const deleteWebinar = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime ──
export const subscribeWebinars = (onChange) => {
  const channel = supabase
    .channel('webinars-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
};

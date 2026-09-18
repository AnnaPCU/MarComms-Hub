// ════════════════════════════════════════════════════════════════════
// SOCIAL POSTS SERVICE — Cuentas y posteos de LinkedIn (Social Media)
// ════════════════════════════════════════════════════════════════════
// Conectado a Supabase: tablas `social_accounts` y `social_posts`
// (migration 0017). Mappers DB (snake_case) ↔ UI (camelCase).
//
// Cuenta (UI):  { id, key, group, name, plan, sortOrder, active }
// Posteo (UI):  { id, accountId, weekStart, monthKey, title, theme,
//                 status, publishDate, link, notes, createdBy, createdAt, updatedAt }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';
import { monthKeyOfWeek } from '@/utils/socialPosts';

const ACCOUNTS = 'social_accounts';
const POSTS = 'social_posts';

// ── Mappers ──
export const accountFromRow = (row) => (row ? {
  id:        row.id,
  key:       row.key || null,
  group:     row.group_name || '',
  name:      row.name || '',
  plan:      row.plan || 'none',
  sortOrder: row.sort_order ?? 0,
  active:    row.active !== false,
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
} : null);

export const accountToRow = (obj) => {
  const row = {};
  if (obj.key       !== undefined) row.key = obj.key || null;
  if (obj.group     !== undefined) row.group_name = obj.group;
  if (obj.name      !== undefined) row.name = obj.name;
  if (obj.plan      !== undefined) row.plan = obj.plan || 'none';
  if (obj.sortOrder !== undefined) row.sort_order = obj.sortOrder;
  if (obj.active    !== undefined) row.active = !!obj.active;
  return row;
};

export const postFromRow = (row) => (row ? {
  id:        row.id,
  accountId: row.account_id,
  weekStart: row.week_start || '',
  monthKey:  row.month_key || (row.week_start ? monthKeyOfWeek(row.week_start) : ''),
  title:     row.title || '',
  theme:     row.theme || '',
  status:    row.status || 'en_proceso',
  publishDate: row.publish_date || '',
  link:      row.link || '',
  notes:     row.notes || '',
  createdBy: row.created_by || '',
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
} : null);

export const postToRow = (obj) => {
  const row = {};
  if (obj.accountId !== undefined) row.account_id = obj.accountId;
  if (obj.weekStart !== undefined) {
    row.week_start = obj.weekStart;
    row.month_key = obj.monthKey || monthKeyOfWeek(obj.weekStart);
  }
  if (obj.title     !== undefined) row.title = obj.title || '';
  if (obj.theme     !== undefined) row.theme = obj.theme || null;
  if (obj.status    !== undefined) row.status = obj.status || 'en_proceso';
  if (obj.publishDate !== undefined) row.publish_date = obj.publishDate || null;
  if (obj.link      !== undefined) row.link = obj.link || null;
  if (obj.notes     !== undefined) row.notes = obj.notes || null;
  if (obj.createdBy !== undefined) row.created_by = obj.createdBy || null;
  return row;
};

// ── Cuentas ──
export const listAccounts = async () => {
  const { data, error } = await supabase.from(ACCOUNTS).select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(accountFromRow);
};
export const createAccount = async (obj) => {
  const { data, error } = await supabase.from(ACCOUNTS).insert(accountToRow(obj)).select('*').single();
  if (error) throw error;
  return accountFromRow(data);
};
export const updateAccount = async (id, patch) => {
  const { data, error } = await supabase.from(ACCOUNTS).update(accountToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return accountFromRow(data);
};
export const deleteAccount = async (id) => {
  const { error } = await supabase.from(ACCOUNTS).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Posteos ──
// Se traen todos (son pocos por mes, y las alertas miran mes actual y anterior).
export const listPosts = async () => {
  const { data, error } = await supabase.from(POSTS).select('*').order('week_start', { ascending: true });
  if (error) throw error;
  return (data || []).map(postFromRow);
};
export const createPost = async (obj) => {
  const { data, error } = await supabase.from(POSTS).insert(postToRow(obj)).select('*').single();
  if (error) throw error;
  return postFromRow(data);
};
export const updatePost = async (id, patch) => {
  const { data, error } = await supabase.from(POSTS).update(postToRow(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return postFromRow(data);
};
export const deletePost = async (id) => {
  const { error } = await supabase.from(POSTS).delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ── Realtime (ambas tablas en un canal) ──
export const subscribeSocial = (onChange) => {
  const channel = supabase
    .channel('social-posts-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: ACCOUNTS }, (p) => onChange({ table: ACCOUNTS, ...p }))
    .on('postgres_changes', { event: '*', schema: 'public', table: POSTS },    (p) => onChange({ table: POSTS, ...p }))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

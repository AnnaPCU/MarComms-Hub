// ════════════════════════════════════════════════════════════════════
// HUBSPOT BILLING SERVICE — Facturación de licencias HubSpot (CRM)
// ════════════════════════════════════════════════════════════════════
// Tablas `hubspot_billing_entities` y `hubspot_billing_imports`
// (migration 0028). El Excel es la fuente de verdad: importBilling() hace
// upsert de las entidades por `key`, borra las que ya no están y registra
// la importación con la meta del archivo (tarifas, TOTAL del Excel…).
//
// Entidad (UI): { id, key, position, legalEntity, manager,
//                 users[{ name, license }], months[{ month, index, price, detail }],
//                 importedAt, importedBy, sourceFile }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'hubspot_billing_entities';
const IMPORTS = 'hubspot_billing_imports';

export const entityFromRow = (row) => ({
  id: row.id,
  key: row.key || '',
  position: row.position ?? 0,
  legalEntity: row.legal_entity || '',
  manager: row.manager || '',
  users: row.users || [],
  months: row.months || [],
  importedAt: row.imported_at || null,
  importedBy: row.imported_by || '',
  sourceFile: row.source_file || '',
});

const entityToRow = (e, { fileName, importedBy, importedAt }) => ({
  key: e.key,
  position: e.position ?? 0,
  legal_entity: e.legalEntity || null,
  manager: e.manager || null,
  users: e.users || [],
  months: e.months || [],
  imported_at: importedAt,
  imported_by: importedBy || null,
  source_file: fileName || null,
});

const importFromRow = (row) => ({
  id: row.id, fileName: row.file_name || '', importedBy: row.imported_by || '',
  importedAt: row.imported_at, summary: row.summary || {}, meta: row.meta || null,
});

export const listBillingEntities = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map(entityFromRow);
};

export const listBillingImports = async (limit = 5) => {
  const { data, error } = await supabase.from(IMPORTS).select('*').order('imported_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map(importFromRow);
};

export const importBilling = async (entities, meta, { fileName, importedBy }) => {
  const importedAt = new Date().toISOString();
  const rows = entities.map((e) => entityToRow(e, { fileName, importedBy, importedAt }));
  if (rows.length) {
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'key' });
    if (error) throw error;
  }
  const { data: existing, error: listError } = await supabase.from(TABLE).select('key');
  if (listError) throw listError;
  const keep = new Set(entities.map((e) => e.key));
  const toDelete = (existing || []).map((r) => r.key).filter((k) => !keep.has(k));
  if (toDelete.length) {
    const { error } = await supabase.from(TABLE).delete().in('key', toDelete);
    if (error) throw error;
  }
  const summary = { entities: entities.length, deleted: toDelete.length };
  // La meta (tarifas, TOTAL del Excel) se lee de la última importación
  const { error: logError } = await supabase.from(IMPORTS).insert({ file_name: fileName || null, imported_by: importedBy || null, summary, meta });
  if (logError) throw logError;
  return summary;
};

export const subscribeBilling = (onChange) => {
  const channel = supabase
    .channel('hubspot-billing-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: IMPORTS }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

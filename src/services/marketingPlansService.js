// ════════════════════════════════════════════════════════════════════
// MARKETING PLANS SERVICE — Planes de Marketing (réplica del Excel)
// ════════════════════════════════════════════════════════════════════
// Tablas `marketing_plans` y `marketing_plan_imports` (migration 0027).
// El Excel es la fuente de verdad: importMarketingPlans() hace upsert de
// todos los planes por nombre, borra los que ya no están en el Excel y
// registra la importación. Realtime: todos ven la importación al instante.
//
// Plan (UI): { id, name, position, brand, country, owner, cc,
//              followUpMeeting, nextMeeting, startMonth, period, note,
//              objectives[], monthly[], tasks[], sheetStats,
//              importedAt, importedBy, sourceFile }
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';

const TABLE = 'marketing_plans';
const IMPORTS = 'marketing_plan_imports';

export const planFromRow = (row) => ({
  id:              row.id,
  name:            row.name || '',
  position:        row.position ?? 0,
  brand:           row.brand || '',
  country:         row.country || '',
  owner:           row.owner || '',
  cc:              row.cc || '',
  followUpMeeting: row.follow_up_meeting || '',
  nextMeeting:     row.next_meeting || '',
  startMonth:      row.start_month || '',
  period:          row.period || '',
  note:            row.note || '',
  objectives:      row.objectives || [],
  monthly:         row.monthly || [],
  tasks:           row.tasks || [],
  sheetStats:      row.sheet_stats || null,
  importedAt:      row.imported_at || null,
  importedBy:      row.imported_by || '',
  sourceFile:      row.source_file || '',
});

export const planToRow = (p, { fileName, importedBy, importedAt }) => ({
  name:              p.name,
  position:          p.position ?? 0,
  brand:             p.brand || null,
  country:           p.country || null,
  owner:             p.owner || null,
  cc:                p.cc || null,
  follow_up_meeting: p.followUpMeeting || null,
  next_meeting:      p.nextMeeting || null,
  start_month:       p.startMonth || null,
  period:            p.period || null,
  note:              p.note || null,
  objectives:        p.objectives || [],
  monthly:           p.monthly || [],
  tasks:             p.tasks || [],
  sheet_stats:       p.sheetStats || null,
  imported_at:       importedAt,
  imported_by:       importedBy || null,
  source_file:       fileName || null,
});

const importFromRow = (row) => ({
  id: row.id, fileName: row.file_name || '', importedBy: row.imported_by || '', importedAt: row.imported_at, summary: row.summary || {},
});

export const listMarketingPlans = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map(planFromRow);
};

export const listPlanImports = async (limit = 5) => {
  const { data, error } = await supabase.from(IMPORTS).select('*').order('imported_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map(importFromRow);
};

// Reemplaza los planes del Hub por los del Excel
export const importMarketingPlans = async (plans, { fileName, importedBy }) => {
  const importedAt = new Date().toISOString();
  const rows = plans.map((p) => planToRow(p, { fileName, importedBy, importedAt }));
  if (rows.length) {
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'name' });
    if (error) throw error;
  }
  // Los que ya no están en el Excel se borran
  const { data: existing, error: listError } = await supabase.from(TABLE).select('name');
  if (listError) throw listError;
  const keep = new Set(plans.map((p) => p.name));
  const toDelete = (existing || []).map((r) => r.name).filter((n) => !keep.has(n));
  if (toDelete.length) {
    const { error } = await supabase.from(TABLE).delete().in('name', toDelete);
    if (error) throw error;
  }
  const summary = { plans: plans.length, deleted: toDelete.length, tasks: plans.reduce((n, p) => n + (p.tasks || []).length, 0) };
  const { error: logError } = await supabase.from(IMPORTS).insert({ file_name: fileName || null, imported_by: importedBy || null, summary });
  if (logError) console.error('[marketingPlans] no se pudo registrar la importación:', logError);
  return summary;
};

export const subscribeMarketingPlans = (onChange) => {
  const channel = supabase
    .channel('marketing-plans-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => onChange(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: IMPORTS }, (p) => onChange(p))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

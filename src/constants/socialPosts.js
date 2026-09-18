// ════════════════════════════════════════════════════════════════════
// SOCIAL POSTS — Hoja de seguimiento de posteos de LinkedIn
// ════════════════════════════════════════════════════════════════════
// Reemplaza el Excel "Revision_PODs_<mes>" de Delfi. Una fila por
// cuenta (cliente), una columna por semana del mes, y se espera un
// posteo por semana en las cuentas con plan ACTIVE.
//
// Las cuentas y los posteos viven en Supabase (migration 0017). Esta
// lista de cuentas es el seed inicial y el fallback si la tabla está
// vacía; se editan desde la app.
// ════════════════════════════════════════════════════════════════════

// Quién hace el seguimiento y recibe los avisos de esta hoja
export const SOCIAL_MEDIA_OWNER = 'Delfina Palmero';

// Margen después de que cierra la semana (domingo) para avisar que faltó
// un posteo: 3 días hábiles → pasan lunes y martes, el aviso sale el
// miércoles siguiente.
export const MISSING_POST_GRACE_BUSINESS_DAYS = 3;

// Bloque semanal de análisis de posteos de la competencia. Aparece en el
// calendario como zona reservada y dispara el aviso el día anterior y el
// día mismo. weekday: 0 = domingo … 6 = sábado.
export const COMPETITION_REVIEW = {
  weekday: 2,            // martes
  start: '16:00',
  end: '17:00',
  label: 'Análisis de posteos de la competencia',
  short: 'Competencia',
};
export const COMPETITION_REVIEW_WEEKDAY = COMPETITION_REVIEW.weekday;

// ── Identidad de colores del conteo por cuenta ──
//   complete = cumplió el plan · partial = falta · over = se pasó · none = sin plan
export const COUNTER_TONES = {
  complete: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  partial:  'bg-amber-100 text-amber-700 border-amber-200',
  over:     'bg-red-100 text-red-700 border-red-200',
  none:     'bg-slate-100 text-slate-500 border-slate-200',
};

// ── Estados de un posteo (los cuatro que pidió el equipo) ──
// Clases completas (no dinámicas) para que Tailwind las detecte.
export const POST_STATUSES = [
  { id: 'en_proceso', label: 'En proceso', short: 'Proceso',    color: 'bg-amber-50 text-amber-700 border-amber-200',       solid: 'bg-amber-500 text-white',   dot: 'bg-amber-500' },
  { id: 'listo',      label: 'Listo',      short: 'Listo',      color: 'bg-sky-50 text-sky-700 border-sky-200',             solid: 'bg-sky-500 text-white',     dot: 'bg-sky-500' },
  { id: 'aprobado',   label: 'Aprobado',   short: 'Aprobado',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', solid: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  { id: 'programado', label: 'Programado', short: 'Programado', color: 'bg-violet-50 text-violet-700 border-violet-200',    solid: 'bg-violet-600 text-white',  dot: 'bg-violet-600' },
];
export const POST_STATUS_BY_ID = POST_STATUSES.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
export const DEFAULT_POST_STATUS = 'en_proceso';

// Estado siguiente al cliquear el chip (en proceso → listo → aprobado → programado → en proceso)
export const nextPostStatus = (id) => {
  const idx = POST_STATUSES.findIndex((s) => s.id === id);
  return POST_STATUSES[(idx + 1) % POST_STATUSES.length].id;
};

// ── Planes por cuenta (hoja "CANT. POSTEOS" del Excel) ──
// postsPerMonth = cuántos posteos se esperan por mes. 0 = sin seguimiento
// automático (no genera avisos de posteo faltante).
export const ACCOUNT_PLANS = [
  { id: 'active',      label: 'Active',      postsPerMonth: 4, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'semi_active', label: 'Semi active', postsPerMonth: 2, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'none',        label: 'Sin plan',    postsPerMonth: 0, color: 'bg-slate-50 text-slate-500 border-slate-200' },
];
export const ACCOUNT_PLAN_BY_ID = ACCOUNT_PLANS.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
export const postsPerMonthFor = (plan) => ACCOUNT_PLAN_BY_ID[plan]?.postsPerMonth ?? 0;

// ── Grupos (cuentas de LinkedIn) en el orden del Excel ──
export const ACCOUNT_GROUPS = [
  'CU Latinoamérica',
  'CU Norte',
  'CU NorthAmerica',
  'CU España',
  'CU Portugal',
  'PS Iberia & America',
  'PS Global',
];

// ── Cuentas por defecto (seed) ──
// `key` es estable para que el seed sea idempotente y para mapear datos
// importados del Excel. Delfi puede agregar, renombrar o desactivar
// cuentas desde la app.
export const DEFAULT_SOCIAL_ACCOUNTS = [
  { key: 'cu-latam-chile',          group: 'CU Latinoamérica',    name: 'Chile',            plan: 'semi_active' },
  { key: 'cu-latam-peru',           group: 'CU Latinoamérica',    name: 'Peru',             plan: 'active' },
  { key: 'cu-latam-mexico',         group: 'CU Latinoamérica',    name: 'Mexico',           plan: 'semi_active' },
  { key: 'cu-latam-ecuador',        group: 'CU Latinoamérica',    name: 'Ecuador',          plan: 'semi_active' },
  { key: 'cu-latam-certificaciones',group: 'CU Latinoamérica',    name: 'Certificaciones',  plan: 'active' },
  { key: 'cu-latam-warrant-barcos', group: 'CU Latinoamérica',    name: 'Warrant & Barcos', plan: 'active' },
  { key: 'cu-latam-brasil',         group: 'CU Latinoamérica',    name: 'Brasil',           plan: 'none' },
  { key: 'cu-norte-norte',          group: 'CU Norte',            name: 'Norte',            plan: 'active' },
  { key: 'cu-na-usa',               group: 'CU NorthAmerica',     name: 'USA',              plan: 'active' },
  { key: 'cu-na-canada',            group: 'CU NorthAmerica',     name: 'Canada',           plan: 'active' },
  { key: 'cu-es-espana',            group: 'CU España',           name: 'España',           plan: 'active' },
  { key: 'cu-pt-portugal',          group: 'CU Portugal',         name: 'Portugal',         plan: 'active' },
  { key: 'ps-iberam-argentina',     group: 'PS Iberia & America', name: 'Argentina',        plan: 'none' },
  { key: 'ps-iberam-espana',        group: 'PS Iberia & America', name: 'España',           plan: 'none' },
  { key: 'ps-iberam-usa',           group: 'PS Iberia & America', name: 'USA',              plan: 'none' },
  { key: 'ps-iberam-brasil',        group: 'PS Iberia & America', name: 'Brasil',           plan: 'none' },
  { key: 'ps-global-ptech',         group: 'PS Global',           name: 'PTech',            plan: 'none' },
  { key: 'ps-global-academy',       group: 'PS Global',           name: 'Academy',          plan: 'none' },
].map((a, i) => ({ ...a, sortOrder: (i + 1) * 10, active: true }));

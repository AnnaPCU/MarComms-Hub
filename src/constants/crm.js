// ════════════════════════════════════════════════════════════════════
// CRM — Entrenamientos y adopción del CRM HubSpot por entidad
// ════════════════════════════════════════════════════════════════════
// El equipo de MarComms implementa y entrena en el uso del CRM (HubSpot)
// a los "clientes internos" del grupo: cada entidad (CU Peru, PS España,
// PTech Global…) paga licencias y entrenamientos. Este módulo trackea
// los entrenamientos (planificados, realizados, cobrados) y el estado de
// adopción de cada entidad.
//
// Origen de los datos por defecto: Excel "CRM Peterson & Control Union
// HubSpot Users - Seats" (hojas "Reglas Facturacion" y "Status").
//
// Persistencia: tablas crm_entities y crm_trainings (migration 0018).
// Si la tabla de entidades está vacía, la UI cae a DEFAULT_CRM_ENTITIES.
// ════════════════════════════════════════════════════════════════════

// ── Unidades (a qué marca pertenece la entidad) ──
export const CRM_UNITS = [
  { id: 'cu',    label: 'Control Union',         short: 'CU',    color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'ps',    label: 'Peterson Solutions',    short: 'PS',    color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'ptech', label: 'Peterson Technologies', short: 'PTech', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];
export const CRM_UNIT_BY_ID = CRM_UNITS.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

// ── Medio por el que se factura ──
export const BILLING_MEDIA = [
  { id: 'smartsheet', label: 'Smartsheet' },
  { id: 'mail',       label: 'Mail' },
];
export const BILLING_MEDIUM_BY_ID = BILLING_MEDIA.reduce((acc, m) => { acc[m.id] = m; return acc; }, {});

// ── Tipos de entrenamiento ──
export const TRAINING_TYPES = [
  { id: 'comercial',      label: 'Entrenamiento comercial', short: 'Comercial',   color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'super_admin',    label: 'Entrenamiento Super Admin', short: 'Super Admin', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'implementacion', label: 'Implementación',          short: 'Implementación', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'refuerzo',       label: 'Refuerzo / consulta',     short: 'Refuerzo',    color: 'bg-slate-100 text-slate-600 border-slate-200' },
];
export const TRAINING_TYPE_BY_ID = TRAINING_TYPES.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
export const DEFAULT_TRAINING_TYPE = 'comercial';

// ── Estados de un entrenamiento ──
// planificado → realizado → cobrado. "bonificado" = se hizo y no se cobra.
export const TRAINING_STATUSES = [
  { id: 'planificado', label: 'Planificado', color: 'bg-slate-100 text-slate-600 border-slate-200',    solid: 'bg-slate-500 text-white',   dot: 'bg-slate-400' },
  { id: 'realizado',   label: 'Realizado',   color: 'bg-blue-50 text-blue-700 border-blue-200',        solid: 'bg-blue-600 text-white',    dot: 'bg-blue-500' },
  { id: 'cobrado',     label: 'Cobrado',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', solid: 'bg-emerald-600 text-white', dot: 'bg-emerald-500' },
  { id: 'bonificado',  label: 'Bonificado',  color: 'bg-amber-50 text-amber-700 border-amber-200',     solid: 'bg-amber-500 text-white',   dot: 'bg-amber-500' },
];
export const TRAINING_STATUS_BY_ID = TRAINING_STATUSES.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
export const DEFAULT_TRAINING_STATUS = 'planificado';

// Días después de "realizado" sin pasar a "cobrado" para marcarlo como pendiente de cobro
export const BILLING_PENDING_DAYS = 30;

// ── Checklist de adopción por entidad (hoja "Status" del Excel) ──
export const ADOPTION_CHECKS = [
  { id: 'pipeline',             label: 'Pipeline activo y vista',    short: 'Pipeline' },
  { id: 'deals_imported',       label: 'Deals importados',           short: 'Deals' },
  { id: 'integrations',         label: 'Integraciones CRM',          short: 'Integraciones' },
  { id: 'outlook',              label: 'Outlook integrado',          short: 'Outlook' },
  { id: 'reports',              label: 'Reportes activos',           short: 'Reportes' },
  { id: 'training_commercial',  label: 'Entrenamiento comercial',    short: 'Entren. comercial' },
  { id: 'training_super_admin', label: 'Entrenamiento Super Admin',  short: 'Super Admin' },
  { id: 'playlists',            label: 'Playlists completas',        short: 'Playlists' },
  { id: 'email_sequences',      label: 'Secuencias de email',        short: 'Secuencias' },
];
export const ADOPTION_CHECK_IDS = ADOPTION_CHECKS.map((c) => c.id);

// Checks que se marcan solos al pasar un entrenamiento a realizado/cobrado
export const TRAINING_TYPE_TO_CHECK = {
  comercial:   'training_commercial',
  super_admin: 'training_super_admin',
};

// ── Entidades por defecto (clientes internos) ──
// checks: [pipeline, deals_imported, integrations, outlook, reports,
//          training_commercial, training_super_admin, playlists, email_sequences]
const checks = (...flags) => ADOPTION_CHECK_IDS.reduce((acc, id, i) => { acc[id] = !!flags[i]; return acc; }, {});
const T = true, F = false;

export const DEFAULT_CRM_ENTITIES = [
  // Con reglas de facturación (hoja "Reglas Facturacion")
  { key: 'cu-espana',         name: 'CU España',          unit: 'cu',    legalEntity: '518 - CU WG Spain S.A.',                           billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Adelaida Alarcon',     progress: 0.2,  checks: checks(T, F, T, F, F, T, T, F, F) },
  { key: 'cu-portugal',       name: 'CU Portugal',        unit: 'cu',    legalEntity: '522 - Control Union Portugal, Unipessoal, Lda.',    billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Carina Goncalves',     progress: 0.2,  checks: checks(T, T, T, F, F, T, T, F, F) },
  { key: 'cu-peru',           name: 'CU Peru',            unit: 'cu',    legalEntity: '536 - Control Union Services Peru S.A.C.',          billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Yemil Zarzar',         progress: 0.8,  checks: checks(T, T, T, F, F, T, T, T, F) },
  { key: 'cu-usa',            name: 'CU USA',             unit: 'cu',    legalEntity: '537 - Control Union (United States) Inc.',           billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Robert Demaniew',      progress: 0.3,  checks: checks(T, F, T, F, F, T, T, F, F) },
  { key: 'cu-canada',         name: 'CU Canada',          unit: 'cu',    legalEntity: '583 - Control Union Canada Inc.',                   billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Carlos Rainero',       progress: 0.6,  checks: checks(T, F, T, T, F, T, T, F, T) },
  { key: 'cu-mexico',         name: 'CU Mexico',          unit: 'cu',    legalEntity: '598 - Control Union de Mexico S.A.',                billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Rodrigo Duret',        progress: 0.9,  checks: checks(T, F, T, T, F, T, T, T, F) },
  { key: 'ps-espana',         name: 'PS España',          unit: 'ps',    legalEntity: '765 - Peterson Iberoamerica SL',                    billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Martin Tezanos Pinto', progress: 0.8,  checks: checks(T, T, T, T, F, T, T, T, T) },
  { key: 'ps-usa',            name: 'PS USA',             unit: 'ps',    legalEntity: '767 - Peterson USA',                                billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Robert Demaniew',      progress: 0.5,  checks: checks(T, T, T, T, F, T, T, F, F) },
  { key: 'cu-chile',          name: 'CU Chile',           unit: 'cu',    legalEntity: '848 - Control Union Chile SpA',                     billingMedium: 'smartsheet', currency: 'USD', responsible: 'Tino',    approver: 'Jorge Rios',           progress: 0.05, checks: checks(T, F, F, F, F, F, F, F, F) },
  { key: 'cu-cert-argentina', name: 'CU Cert Argentina',  unit: 'cu',    legalEntity: '538 - Control Union Argentina S.A.',                billingMedium: 'mail',       currency: 'USD', responsible: 'Tino',    approver: 'Juan Gebbie',          progress: 1,    checks: checks(T, T, T, T, T, T, T, T, T) },
  { key: 'ps-argentina',      name: 'PS Argentina',       unit: 'ps',    legalEntity: '592 - Peterson Consultancy S.A.',                   billingMedium: 'mail',       currency: 'USD', responsible: 'Tino',    approver: 'Martin Dacharry',      progress: 1,    checks: checks(T, T, T, F, T, T, T, T, T) },
  { key: 'ps-switzerland',    name: 'PS Switzerland',     unit: 'ps',    legalEntity: '700 - PSO BEHEER B.V.',                             billingMedium: 'mail',       currency: 'USD', responsible: 'Agus B.', approver: 'Andrea Ferrazzo',      progress: 0.6,  checks: checks(T, T, T, F, F, T, T, F, F) },
  { key: 'ptech-global',      name: 'PTech Global',       unit: 'ptech', legalEntity: '752 - Peterson Technologies GmbH',                  billingMedium: 'mail',       currency: 'USD', responsible: 'Tino',    approver: 'Luis Correia',         progress: 1,    checks: checks(T, T, T, T, T, T, T, T, T) },
  { key: 'ps-textile',        name: 'PS Textile',         unit: 'ps',    legalEntity: '771 - Peterson Solutions B.V.',                     billingMedium: 'mail',       currency: 'USD', responsible: 'Agus B.', approver: 'Elizabeth Keegan',     progress: null, checks: checks() },
  // Solo en la hoja "Status" (todavía sin reglas de facturación)
  { key: 'ps-mexico',         name: 'PS Mexico',          unit: 'ps',    legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0.05, checks: checks() },
  { key: 'ps-brazil',         name: 'PS Brazil',          unit: 'ps',    legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0,    checks: checks() },
  { key: 'cu-brazil',         name: 'CU Brazil',          unit: 'cu',    legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0,    checks: checks() },
  { key: 'cu-colombia',       name: 'CU Colombia',        unit: 'cu',    legalEntity: '520 - Control Union Colombia Ltd.', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0, checks: checks() },
  { key: 'cu-guatemala',      name: 'CU Guatemala',       unit: 'cu',    legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0,    checks: checks() },
  { key: 'pcu-paraguay',      name: 'PCU Paraguay',       unit: 'cu',    legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0,    checks: checks() },
  { key: 'cu-ecuador',        name: 'CU Ecuador',         unit: 'cu',    legalEntity: '566 - Control Union Ecuador (branch office)', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0, checks: checks() },
  { key: 'pcu-uruguay',       name: 'PCU Uruguay',        unit: 'cu',    legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0,    checks: checks() },
  { key: 'cu-norte',          name: 'CU Norte (Argentina)', unit: 'cu',  legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0,    checks: checks() },
  { key: 'ps-ecuador',        name: 'PS Ecuador',         unit: 'ps',    legalEntity: '', billingMedium: '', currency: 'USD', responsible: '', approver: '', progress: 0,    checks: checks() },
].map((e, i) => ({ ...e, sortOrder: (i + 1) * 10, active: true }));

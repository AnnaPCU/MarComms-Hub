// ════════════════════════════════════════════════════════════════════
// CRM WEEKLY — «Weekly check» de CRM HubSpot (oct 2026)
// ════════════════════════════════════════════════════════════════════
// Seguimiento de la implementación de HubSpot en cada entidad: un
// checklist con deadline por ítem y los próximos steps (como las
// iniciativas de los planes). Se guarda en crm_weekly_checks y
// crm_next_steps (migration 0043). Arranca todo sin tildar.
//
//   CRM_ENTITIES:    código de la entidad en HubSpot + nombre legal +
//                    país. brand: para el filtro (Peterson Technologies va
//                    con Peterson). Desde nov 2026 las entidades viven en
//                    crm_weekly_entities (migration 0070) y se suman /
//                    editan / borran desde el Hub; esta lista es el
//                    respaldo si la tabla no está.
//   CRM_CHECK_ITEMS: lo que debería tener cada entidad, de lo más básico
//                    a lo más avanzado. El id es lo que se guarda en la
//                    base: no cambiarlo (el label sí se puede cambiar).
// ════════════════════════════════════════════════════════════════════

// Nov 2026: la sección CRM HubSpot está en inglés (UI y datos: países,
// regiones, ítems del checklist; migration 0076).
export const CRM_ENTITIES = [
  { code: '538', name: 'Control Union Argentina S.A.', brand: 'Control Union', country: 'Argentina' },
  { code: '592', name: 'Peterson Consultancy S.A.', brand: 'Peterson', country: 'Argentina' },
  { code: '583', name: 'Control Union Canada Inc.', brand: 'Control Union', country: 'Canada' },
  { code: '518', name: 'CU WG Spain S.A.', brand: 'Control Union', country: 'Spain' },
  { code: '765', name: 'Peterson Iberoamerica SL', brand: 'Peterson', country: 'Spain' },
  { code: '598', name: 'Control Union de Mexico S.A.', brand: 'Control Union', country: 'Mexico' },
  { code: '536', name: 'Control Union Services Peru S.A.C.', brand: 'Control Union', country: 'Peru' },
  { code: '522', name: 'Control Union Portugal, Unipessoal, Lda.', brand: 'Control Union', country: 'Portugal' },
  { code: '767', name: 'Peterson USA', brand: 'Peterson', country: 'United States' },
  { code: '537', name: 'Control Union (United States) Inc.', brand: 'Control Union', country: 'United States' },
  { code: '848', name: 'Control Union Chile SpA', brand: 'Control Union', country: 'Chile' },
  { code: '752', name: 'Peterson Technologies GmbH', brand: 'Peterson', country: 'Germany' },
  { code: '566', name: 'Control Union Ecuador (branch office)', brand: 'Control Union', country: 'Ecuador' },
  { code: '520', name: 'Control Union Colombia Ltd.', brand: 'Control Union', country: 'Colombia' },
  { code: '442', name: 'Peterson Consultoria e Logistica', brand: 'Peterson', country: 'Brazil' },
  { code: '880', name: 'Peterson Projects & Solution México S.A. de C.V.', brand: 'Peterson', country: 'Mexico' },
];

export const CRM_BRANDS = ['Control Union', 'Peterson', 'Other'];

// Regiones (nov 2026, migration 0073): el «Global check» muestra las tres
// con filtro por región; el Weekly check muestra solo las de Americas
// (España y Portugal van en Americas). Hasta la 0076 se guardaba
// «Américas»: normRegion lo pasa a «Americas» al leer.
export const CRM_REGIONS = ['Americas', 'EMEA', 'APAC'];
export const WEEKLY_REGION = 'Americas';
export const normRegion = (r) => (!r || r === 'Américas' ? 'Americas' : r);
export const normBrand = (b) => (b === 'Otra' ? 'Other' : b);

// Países de América (los 35), en inglés, para sugerir al sumar o editar
// una entidad. El campo Country acepta igual cualquier otro (Spain,
// Portugal, Germany…).
export const AMERICA_COUNTRIES = [
  'Antigua and Barbuda', 'Argentina', 'Bahamas', 'Barbados', 'Belize', 'Bolivia', 'Brazil', 'Canada',
  'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Dominica', 'Dominican Republic', 'Ecuador', 'El Salvador',
  'Grenada', 'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama',
  'Paraguay', 'Peru', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Suriname', 'Trinidad and Tobago', 'United States', 'Uruguay', 'Venezuela',
];

export const CRM_CHECK_ITEMS = [
  { id: 'outlook', label: 'Outlook & calendar connected' },
  { id: 'deals', label: 'New deals logged', hint: 'And renewals, in certification entities' },
  { id: 'meetings', label: 'Meeting scheduler in use' },
  { id: 'documents', label: 'Documents in use' },
  { id: 'adoption', label: 'Adoption reports in use' },
  { id: 'claude', label: 'Claude connection' },
  { id: 'trainingSales', label: 'Sales trainings' },
  { id: 'trainingAdmin', label: 'SuperAdmin trainings' },
  { id: 'commercialTool', label: 'Commercial Tool deals imported', targetRegions: ['EMEA', 'APAC'] },
];

// Deadline: con DEADLINE_CALM_DAYS días (o más) por delante se ve en
// verde; a medida que se acerca pasa por amarillo y naranja hasta el rojo,
// que arranca con DEADLINE_RED_DAYS días o menos (y sigue si se venció).
export const DEADLINE_CALM_DAYS = 21;
export const DEADLINE_RED_DAYS = 3;

// Quién recibe el aviso cuando un deadline del Weekly check se pone en rojo
// (sin tildar y con DEADLINE_RED_DAYS días o menos, o vencido)
export const CRM_WEEKLY_NOTIFY_USER = 'Valentino Redín';

// Semáforo del avance del checklist de cada entidad (nov 2026):
// verde = 100 %, amarillo = de TRAFFIC_YELLOW_PCT % a 99 %, rojo = menos.
export const TRAFFIC_YELLOW_PCT = 50;
export const TRAFFIC_LIGHTS = {
  green:  { id: 'green',  label: 'Complete',     range: '100 %',   rank: 2, dot: 'bg-emerald-500', bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  yellow: { id: 'yellow', label: 'In progress',  range: '50–99 %', rank: 1, dot: 'bg-amber-400',   bar: 'bg-amber-400',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  red:    { id: 'red',    label: 'Behind',       range: '< 50 %',  rank: 0, dot: 'bg-red-500',     bar: 'bg-red-500',     chip: 'bg-red-50 text-red-700 border-red-200' },
};

// Importancia de cada entidad (crm_weekly_entities.priority)
export const CRM_PRIORITIES = [
  { id: 'alta',  label: 'High',  rank: 0, chip: 'bg-slate-900 text-white border-slate-900' },
  { id: 'media', label: 'Medium', rank: 1, chip: 'bg-slate-200 text-slate-700 border-slate-300' },
  { id: 'baja',  label: 'Low',  rank: 2, chip: 'bg-white text-slate-500 border-slate-300' },
];

// Orden de la lista de entidades: «Ordenar por» + «y después por» (el
// segundo desempata al primero; 'manual' = sin segundo criterio)
export const CRM_SORTS = [
  { id: 'manual',   label: 'Original order' },
  { id: 'redFirst', label: 'Status: red first' },
  { id: 'greenFirst', label: 'Status: green first' },
  { id: 'priority', label: 'Priority' },
  { id: 'country',  label: 'Country (A–Z)' },
];

// Vista «Próximas actividades»: ventana de días hacia adelante (null = todas)
export const ACTIVITY_RANGES = [
  { id: '7', label: '7 days', days: 7 },
  { id: '14', label: '14 days', days: 14 },
  { id: '30', label: '30 days', days: 30 },
  { id: 'all', label: 'All', days: null },
];

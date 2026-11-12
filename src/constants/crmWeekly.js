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

export const CRM_ENTITIES = [
  { code: '538', name: 'Control Union Argentina S.A.', brand: 'Control Union', country: 'Argentina' },
  { code: '592', name: 'Peterson Consultancy S.A.', brand: 'Peterson', country: 'Argentina' },
  { code: '583', name: 'Control Union Canada Inc.', brand: 'Control Union', country: 'Canada' },
  { code: '518', name: 'CU WG Spain S.A.', brand: 'Control Union', country: 'España' },
  { code: '765', name: 'Peterson Iberoamerica SL', brand: 'Peterson', country: 'España' },
  { code: '598', name: 'Control Union de Mexico S.A.', brand: 'Control Union', country: 'México' },
  { code: '536', name: 'Control Union Services Peru S.A.C.', brand: 'Control Union', country: 'Perú' },
  { code: '522', name: 'Control Union Portugal, Unipessoal, Lda.', brand: 'Control Union', country: 'Portugal' },
  { code: '767', name: 'Peterson USA', brand: 'Peterson', country: 'Estados Unidos' },
  { code: '537', name: 'Control Union (United States) Inc.', brand: 'Control Union', country: 'Estados Unidos' },
  { code: '848', name: 'Control Union Chile SpA', brand: 'Control Union', country: 'Chile' },
  { code: '752', name: 'Peterson Technologies GmbH', brand: 'Peterson', country: 'Alemania' },
  { code: '566', name: 'Control Union Ecuador (branch office)', brand: 'Control Union', country: 'Ecuador' },
  { code: '520', name: 'Control Union Colombia Ltd.', brand: 'Control Union', country: 'Colombia' },
  { code: '442', name: 'Peterson Consultoria e Logistica', brand: 'Peterson', country: 'Brasil' },
  { code: '880', name: 'Peterson Projects & Solution México S.A. de C.V.', brand: 'Peterson', country: 'México' },
];

export const CRM_BRANDS = ['Control Union', 'Peterson'];

// Países de América (los 35), para sugerir al sumar o editar una entidad.
// Se escriben como en el resto del Hub («Canada», «Estados Unidos»). El
// campo País acepta igual cualquier otro (España, Portugal, Alemania…).
export const AMERICA_COUNTRIES = [
  'Antigua y Barbuda', 'Argentina', 'Bahamas', 'Barbados', 'Belice', 'Bolivia', 'Brasil', 'Canada',
  'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Dominica', 'Ecuador', 'El Salvador', 'Estados Unidos',
  'Granada', 'Guatemala', 'Guyana', 'Haití', 'Honduras', 'Jamaica', 'México', 'Nicaragua', 'Panamá',
  'Paraguay', 'Perú', 'República Dominicana', 'San Cristóbal y Nieves', 'San Vicente y las Granadinas',
  'Santa Lucía', 'Surinam', 'Trinidad y Tobago', 'Uruguay', 'Venezuela',
];

export const CRM_CHECK_ITEMS = [
  { id: 'outlook', label: 'Outlook y calendario conectados' },
  { id: 'deals', label: 'Deals nuevos cargados', hint: 'Y las renovaciones, en las entidades de certificación' },
  { id: 'meetings', label: 'Meeting scheduler en uso' },
  { id: 'documents', label: 'Documents en uso' },
  { id: 'adoption', label: 'Reportes de adopción en uso' },
  { id: 'claude', label: 'Conexión con Claude' },
  { id: 'trainingSales', label: 'Entrenamientos comerciales' },
  { id: 'trainingAdmin', label: 'Entrenamientos SuperAdmin' },
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
  green:  { id: 'green',  label: 'Completo',     range: '100 %',   rank: 2, dot: 'bg-emerald-500', bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  yellow: { id: 'yellow', label: 'En curso',     range: '50–99 %', rank: 1, dot: 'bg-amber-400',   bar: 'bg-amber-400',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  red:    { id: 'red',    label: 'Atrasado',     range: '< 50 %',  rank: 0, dot: 'bg-red-500',     bar: 'bg-red-500',     chip: 'bg-red-50 text-red-700 border-red-200' },
};

// Importancia de cada entidad (crm_weekly_entities.priority)
export const CRM_PRIORITIES = [
  { id: 'alta',  label: 'Alta',  rank: 0, chip: 'bg-slate-900 text-white border-slate-900' },
  { id: 'media', label: 'Media', rank: 1, chip: 'bg-slate-200 text-slate-700 border-slate-300' },
  { id: 'baja',  label: 'Baja',  rank: 2, chip: 'bg-white text-slate-500 border-slate-300' },
];

// Orden de la lista de entidades
export const CRM_SORTS = [
  { id: 'manual',   label: 'Orden original' },
  { id: 'redFirst', label: 'Semáforo: rojo primero' },
  { id: 'greenFirst', label: 'Semáforo: verde primero' },
  { id: 'priority', label: 'Importancia' },
  { id: 'country',  label: 'País (A–Z)' },
];

// Vista «Próximas actividades»: ventana de días hacia adelante (null = todas)
export const ACTIVITY_RANGES = [
  { id: '7', label: '7 días', days: 7 },
  { id: '14', label: '14 días', days: 14 },
  { id: '30', label: '30 días', days: 30 },
  { id: 'all', label: 'Todas', days: null },
];

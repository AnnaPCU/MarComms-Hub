// ════════════════════════════════════════════════════════════════════
// CRM WEEKLY — «Weekly check» de CRM HubSpot (oct 2026)
// ════════════════════════════════════════════════════════════════════
// Seguimiento de la implementación de HubSpot en cada entidad: un
// checklist con deadline por ítem y los próximos steps (como las
// iniciativas de los planes). Se guarda en crm_weekly_checks y
// crm_next_steps (migration 0043). Arranca todo sin tildar.
//
//   CRM_ENTITIES:    código de la entidad en HubSpot + nombre legal.
//                    brand: para el filtro (Peterson Technologies va con
//                    Peterson).
//   CRM_CHECK_ITEMS: lo que debería tener cada entidad, de lo más básico
//                    a lo más avanzado. El id es lo que se guarda en la
//                    base: no cambiarlo (el label sí se puede cambiar).
// ════════════════════════════════════════════════════════════════════

export const CRM_ENTITIES = [
  { code: '538', name: 'Control Union Argentina S.A.', brand: 'Control Union' },
  { code: '592', name: 'Peterson Consultancy S.A.', brand: 'Peterson' },
  { code: '583', name: 'Control Union Canada Inc.', brand: 'Control Union' },
  { code: '518', name: 'CU WG Spain S.A.', brand: 'Control Union' },
  { code: '765', name: 'Peterson Iberoamerica SL', brand: 'Peterson' },
  { code: '598', name: 'Control Union de Mexico S.A.', brand: 'Control Union' },
  { code: '536', name: 'Control Union Services Peru S.A.C.', brand: 'Control Union' },
  { code: '522', name: 'Control Union Portugal, Unipessoal, Lda.', brand: 'Control Union' },
  { code: '767', name: 'Peterson USA', brand: 'Peterson' },
  { code: '537', name: 'Control Union (United States) Inc.', brand: 'Control Union' },
  { code: '848', name: 'Control Union Chile SpA', brand: 'Control Union' },
  { code: '752', name: 'Peterson Technologies GmbH', brand: 'Peterson' },
  { code: '566', name: 'Control Union Ecuador (branch office)', brand: 'Control Union' },
  { code: '520', name: 'Control Union Colombia Ltd.', brand: 'Control Union' },
  { code: '442', name: 'Peterson Consultoria e Logistica', brand: 'Peterson' },
  { code: '880', name: 'Peterson Projects & Solution México S.A. de C.V.', brand: 'Peterson' },
];

export const CRM_BRANDS = ['Control Union', 'Peterson'];

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

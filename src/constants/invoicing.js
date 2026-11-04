// ════════════════════════════════════════════════════════════════════
// INVOICING — Facturación MarComms (réplica del Excel mensual)
// ════════════════════════════════════════════════════════════════════
// Nov 2026: reemplaza al Excel «Facturacion_MarComms_<Mes>». Una vista por
// hoja, con el mismo nombre que en el Excel, y una por mes (las hojas de
// cada mes se guardan aparte). «Entidades» no depende del mes.
//
// Cada fila guarda sus celdas en `data` (tabla invoicing_rows, migration
// 0048). Los números se guardan como se escribieron ("450",
// "=350/4*3", "=grupo/3"); el valor lo calcula utils/invoicing.
//
// Columnas: { key, label, type, width, mono, merge, sum, country, sticky }
//   type: 'text' (default) | 'number' | 'total' (calculado, se puede pisar
//   escribiendo un valor; vacío vuelve a la fórmula) | 'status' (estado
//   del cobro, chip)
//   merge: los valores repetidos seguidos se ven atenuados (como las
//   celdas combinadas del Excel)
//   sum: suma la columna en la fila de totales
//   country: al guardar, el país queda como en el Hub ("USA" → "Estados
//   Unidos", "Brazil" → "Brasil", "RD" → "Rep. Dominicana")
//   sticky: queda fija a la izquierda en la vista compacta
// ════════════════════════════════════════════════════════════════════

// Vistas (pestañas), con el nombre de cada hoja del Excel
export const INVOICING_TABS = [
  { id: 'fijo', label: 'Fijo y facturas -CARGA ADMIN' },
  { id: 'variables', label: 'Variables (todos)' },
  { id: 'mkt', label: 'MKT Plan (Felo)' },
  { id: 'crm', label: 'CRM (Ale)' },
  { id: 'entidades', label: 'Entidades' },
  { id: 'resumen', label: 'Mes a mes' },
  { id: 'historial', label: 'Historial' },
];

// Hojas guardadas por mes (sheet de invoicing_rows)
export const MONTHLY_SHEETS = ['fijo', 'variables', 'mkt', 'mkt_libre', 'crm', 'crm_extra', 'notas'];
export const SHEET_LABELS = {
  fijo: 'Fijo y facturas',
  variables: 'Variables',
  mkt: 'MKT Plan',
  mkt_libre: 'MKT Plan · notas y cuentas',
  crm: 'CRM · licencias',
  crm_extra: 'CRM · conceptos y totales',
  notas: 'Notas del mes',
  entidades: 'Entidades',
};

// Países que en Facturación se escriben distinto de la clave del Hub
// (la clave de MARKETS es "RD"; acá se prefiere el nombre completo)
export const INVOICING_COUNTRY_NAMES = { RD: 'Rep. Dominicana' };

// Estado de cada cobro (Fijo, Variables y CRM). Arranca en pendiente y en
// un mes nuevo vuelve a pendiente.
export const INVOICE_STATUSES = [
  { id: 'pendiente', label: 'Pendiente', dot: 'bg-slate-300', chip: 'bg-slate-100 text-slate-500 border-slate-200', bar: 'bg-slate-300' },
  { id: 'facturado', label: 'Facturado', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200', bar: 'bg-sky-500' },
  { id: 'cobrado', label: 'Cobrado', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
];
export const INVOICE_STATUS_IDS = INVOICE_STATUSES.map((s) => s.id);
export const INVOICE_STATUS_BY_ID = Object.fromEntries(INVOICE_STATUSES.map((s) => [s.id, s]));
export const PENDING_STATUS = 'pendiente';

// Filtro de marca (según empresa / país / entidad de cada fila)
export const BRAND_FILTERS = [
  { id: '', label: 'Todas' },
  { id: 'cu', label: 'Control Union' },
  { id: 'peterson', label: 'Peterson Solutions' },
  { id: 'otras', label: 'Bel y otras' },
];

// Fijo y facturas: una fila por entidad. Las filas de grupo (ej.
// «Argentina · Control Union · Activo · 450») muestran el valor que se
// reparte entre las de abajo y no suman al total; las de abajo pueden
// seguirlas con "=grupo/3".
export const FIJO_ROW_KINDS = { row: 'fila', group: 'grupo' };

export const FIJO_COLUMNS = [
  { key: 'pais', label: 'País', width: 104, country: true, sticky: true },
  { key: 'empresa', label: 'Empresa/Sector', width: 138, sticky: true },
  { key: 'cuenta', label: 'Entidades', width: 118, mono: true },
  { key: 'cc', label: 'CC', width: 64 },
  { key: 'codigo', label: 'Código Smartsheet', width: 92, mono: true },
  { key: 'plan', label: 'Plan', width: 104 },
  { key: 'valor', label: 'Valor', type: 'number', width: 86 },
  { key: 'website', label: 'Country Website', type: 'number', width: 92 },
  { key: 'descripcion', label: 'Descripción', width: 300 },
  { key: 'planMkt', label: 'Valor Plan MKT', type: 'number', width: 92 },
  { key: 'planMktDescripcion', label: 'Descripción', width: 220 },
  { key: 'total', label: 'Total a cobrar', type: 'total', width: 110, sum: true },
  { key: 'estado', label: 'Estado', type: 'status', width: 104 },
];
// Encabezado combinado de arriba (F1:H1 del Excel)
export const FIJO_HEADER_GROUPS = [{ from: 'plan', span: 3, label: 'CC: Fee fijo' }];

// Variables: seis bloques de Detalle · CC · Precio (y en la vista de
// lista, un chip de color por categoría). `color` es el de cada categoría
// en el gráfico de «Mes a mes» (paleta validada para daltonismo, con Fijo
// en teal #0d9488)
export const VARIABLE_CATEGORIES = [
  { id: 'campanas', label: 'CC: Campañas', short: 'Campañas', cc: 'campañas', chip: 'bg-violet-100 text-violet-800 border-violet-200', color: '#7c3aed' },
  { id: 'bbdd', label: 'CC: Campañas (BBDD)', short: 'BBDD', cc: 'campañas', chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', color: '#16a34a' },
  { id: 'eventos', label: 'CC: Eventos', short: 'Eventos', cc: 'events', chip: 'bg-pink-100 text-pink-800 border-pink-200', color: '#db2777' },
  { id: 'content', label: 'CC: Content', short: 'Content', cc: 'content', tint: 'bg-pink-50', chip: 'bg-amber-100 text-amber-800 border-amber-200', color: '#d97706' },
  { id: 'website', label: 'CC: Website', short: 'Website', cc: 'website', tint: 'bg-yellow-50', chip: 'bg-blue-100 text-blue-800 border-blue-200', color: '#2563eb' },
  { id: 'otros', label: 'CC: Otros', short: 'Otros', cc: 'otros', chip: 'bg-yellow-100 text-yellow-900 border-yellow-200', color: '#a16207' },
];
export const VARIABLE_CATEGORY_BY_ID = Object.fromEntries(VARIABLE_CATEGORIES.map((c) => [c.id, c]));

export const VARIABLES_BASE_COLUMNS = [
  { key: 'pais', label: 'País', width: 150, merge: true, country: true, sticky: true },
  { key: 'cuenta', label: 'Entidad', width: 112, mono: true },
  { key: 'codigo', label: 'Código Smartsheet', width: 86, mono: true },
  { key: 'empresa', label: 'Empresa/Sector', width: 120, sticky: true },
];

export const variablesColumns = () => [
  ...VARIABLES_BASE_COLUMNS,
  ...VARIABLE_CATEGORIES.flatMap((c) => [
    { key: `${c.id}Detalle`, label: 'Detalle', width: 200, tint: c.tint, cat: c.id },
    { key: `${c.id}Cc`, label: 'CC', width: 84, tint: c.tint, cat: c.id },
    { key: `${c.id}Precio`, label: 'Precio', type: 'number', width: 80, sum: true, tint: c.tint, cat: c.id },
  ]),
  { key: 'total', label: 'Total', type: 'total', width: 96, sum: true },
  { key: 'estado', label: 'Estado', type: 'status', width: 104 },
];

export const variablesHeaderGroups = () => VARIABLE_CATEGORIES.map((c) => ({ from: `${c.id}Detalle`, span: 3, label: c.label, tint: c.tint }));

// MKT Plan (Felo): tabla de planes + zona libre de abajo
export const MKT_COLUMNS = [
  { key: 'cliente', label: 'País', width: 130, sticky: true },
  { key: 'bbdd', label: 'BBDD', type: 'number', width: 80, sum: true },
  { key: 'email', label: 'Email MKT', type: 'number', width: 86, sum: true },
  { key: 'paid', label: 'Paid Media', type: 'number', width: 86, sum: true },
  { key: 'descripcion', label: 'Descripción del servicio', width: 420 },
  { key: 'total', label: 'Valor total', type: 'total', width: 96, sum: true },
  { key: 'renovacion', label: 'Fecha renovación', width: 110 },
];
export const FREE_GRID_MIN_ROWS = 20;
export const FREE_GRID_MIN_COLS = 6;

// CRM (Ale): licencias por entidad + conceptos y totales de abajo
export const CRM_COLUMNS = [
  { key: 'entidad', label: 'Entidad', width: 330, sticky: true },
  { key: 'autoriza', label: 'Autoriza', width: 250 },
  { key: 'monto', label: 'Monto del mes (USD)', type: 'number', width: 130, sum: true },
  { key: 'estado', label: 'Estado', type: 'status', width: 104 },
];
export const CRM_CURRENCIES = ['USD', 'EUR'];
// Conceptos: { concepto, monto, moneda } · totales: { kind: 'total',
// concepto, moneda, sumOf: ['licencias' | id de otro concepto…] }
export const CRM_LICENSES_REF = 'licencias';

// Entidades (no depende del mes)
export const OFFICES_COLUMNS = [
  { key: 'oficina', label: 'Oficina', width: 280, sticky: true },
  { key: 'cuenta', label: 'Cuenta', width: 150, mono: true },
  { key: 'responsables', label: 'Responsables', width: 240 },
];

// Hojas con notas del mes (fila «notas»: una clave por hoja). En la misma
// fila, `revisado` guarda los avisos de «Para revisar» que se borraron.
export const NOTES_SHEETS = ['fijo', 'variables', 'crm'];
export const DISMISSED_KEY = 'revisado';

// Nombre de los archivos exportados (como el Excel original)
export const EXPORT_BASENAME = 'Facturacion_MarComms';

// ════════════════════════════════════════════════════════════════════
// INVOICING — Facturación MarComms (réplica del Excel mensual)
// ════════════════════════════════════════════════════════════════════
// Nov 2026: reemplaza al Excel «Facturacion_MarComms_<Mes>». Una vista por
// hoja, con el mismo nombre que en el Excel, y una por mes (las hojas de
// cada mes se guardan aparte). «Entidades» no depende del mes.
//
// Cada fila guarda sus celdas en `data` (tabla invoicing_rows, migration
// 0048). Los números se guardan como se escribieron ("450",
// "=350/4*3"); el valor lo calcula utils/invoicing.
//
// Columnas: { key, label, type, width, mono, merge, sum }
//   type: 'text' (default) | 'number' | 'total' (calculado, se puede pisar
//   escribiendo un valor; vacío vuelve a la fórmula) | 'currency'
//   merge: los valores repetidos seguidos se ven atenuados (como las
//   celdas combinadas del Excel)
//   sum: suma la columna en la fila de totales
// ════════════════════════════════════════════════════════════════════

// Vistas (pestañas), con el nombre de cada hoja del Excel
export const INVOICING_TABS = [
  { id: 'fijo', label: 'Fijo y facturas -CARGA ADMIN' },
  { id: 'variables', label: 'Variables (todos)' },
  { id: 'mkt', label: 'MKT Plan (Felo)' },
  { id: 'crm', label: 'CRM (Ale)' },
  { id: 'entidades', label: 'Entidades' },
  { id: 'resumen', label: 'Mes a mes' },
];

// Hojas guardadas por mes (sheet de invoicing_rows)
export const MONTHLY_SHEETS = ['fijo', 'variables', 'mkt', 'mkt_libre', 'crm', 'crm_extra', 'notas'];

// Fijo y facturas: una fila por entidad. Las filas de grupo (ej.
// «Argentina · Control Union · Activo · 450») muestran el valor que se
// reparte entre las de abajo y no suman al total.
export const FIJO_ROW_KINDS = { row: 'fila', group: 'grupo' };

export const FIJO_COLUMNS = [
  { key: 'pais', label: 'País', width: 104 },
  { key: 'empresa', label: 'Empresa/Sector', width: 138 },
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
];
// Encabezado combinado de arriba (F1:H1 del Excel)
export const FIJO_HEADER_GROUPS = [{ from: 'plan', span: 3, label: 'CC: Fee fijo' }];

// Variables: seis bloques de Detalle · CC · Precio
export const VARIABLE_CATEGORIES = [
  { id: 'campanas', label: 'CC: Campañas', cc: 'campañas' },
  { id: 'bbdd', label: 'CC: Campañas (BBDD)', cc: 'campañas' },
  { id: 'eventos', label: 'CC: Eventos', cc: 'events' },
  { id: 'content', label: 'CC: Content', cc: 'content', tint: 'bg-pink-50' },
  { id: 'website', label: 'CC: Website', cc: 'website', tint: 'bg-yellow-50' },
  { id: 'otros', label: 'CC: Otros', cc: 'otros' },
];

export const VARIABLES_BASE_COLUMNS = [
  { key: 'pais', label: 'País', width: 150, merge: true },
  { key: 'cuenta', label: 'Entidad', width: 112, mono: true },
  { key: 'codigo', label: 'Código Smartsheet', width: 86, mono: true },
  { key: 'empresa', label: 'Empresa/Sector', width: 120 },
];

export const variablesColumns = () => [
  ...VARIABLES_BASE_COLUMNS,
  ...VARIABLE_CATEGORIES.flatMap((c) => [
    { key: `${c.id}Detalle`, label: 'Detalle', width: 200, tint: c.tint },
    { key: `${c.id}Cc`, label: 'CC', width: 84, tint: c.tint },
    { key: `${c.id}Precio`, label: 'Precio', type: 'number', width: 80, sum: true, tint: c.tint },
  ]),
  { key: 'total', label: 'Total', type: 'total', width: 96, sum: true },
];

export const variablesHeaderGroups = () => VARIABLE_CATEGORIES.map((c) => ({ from: `${c.id}Detalle`, span: 3, label: c.label, tint: c.tint }));

// MKT Plan (Felo): tabla de planes + zona libre de abajo
export const MKT_COLUMNS = [
  { key: 'cliente', label: 'País', width: 130 },
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
  { key: 'entidad', label: 'Entidad', width: 330 },
  { key: 'autoriza', label: 'Autoriza', width: 250 },
  { key: 'monto', label: 'Monto del mes (USD)', type: 'number', width: 130, sum: true },
];
export const CRM_CURRENCIES = ['USD', 'EUR'];
// Conceptos: { concepto, monto, moneda } · totales: { kind: 'total',
// concepto, moneda, sumOf: ['licencias' | id de otro concepto…] }
export const CRM_LICENSES_REF = 'licencias';

// Entidades (no depende del mes)
export const OFFICES_COLUMNS = [
  { key: 'oficina', label: 'Oficina', width: 280 },
  { key: 'cuenta', label: 'Cuenta', width: 150, mono: true },
  { key: 'responsables', label: 'Responsables', width: 240 },
];

// Hojas con notas del mes (fila «notas»: una clave por hoja)
export const NOTES_SHEETS = ['fijo', 'variables', 'crm'];

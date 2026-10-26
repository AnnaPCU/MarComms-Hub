// ════════════════════════════════════════════════════════════════════
// PLAN KPIS — KPIs del mes e iniciativas de cada plan (sección Planes)
// ════════════════════════════════════════════════════════════════════
// Replica el bloque "KPIs del mes" del reporte mensual que se entrega al
// cliente (ej. "Control Union Estados Unidos — Reporte Plan Septiembre
// 2026"): Operativos y Performance, y desde oct 2026 Investment (Plan
// MarComms + Activation · Paid Media Always On / One Shot, en dólares).
//
//   auto     — se calcula solo desde las tareas del mes (se puede
//              corregir a mano). Ver src/utils/planKpis.js.
//   money    — admite moneda (USD, EUR…); defaultCurrency: la que se
//              propone (Investment: USD).
//   tag      — admite etiqueta (ej. "8 MQLs").
//   carry    — si el mes no tiene valor, toma el último cargado en un mes
//              anterior (Plan MarComms: USD 1.500 todos los meses hasta
//              que se cambie).
//   kicker   — texto chico arriba del nombre (ej. "Activation").
//
// Un KPI vacío o en 0 no se muestra en el link externo. Los de
// performance muestran la variación contra el mes anterior.
// Se guardan en la tabla `plan_kpis` (migration 0038).
// ════════════════════════════════════════════════════════════════════

export const PLAN_KPI_GROUPS = [
  { id: 'ops', label: 'Operativos' },
  { id: 'performance', label: 'Performance' },
  { id: 'investment', label: 'Investment' },
];

export const PLAN_KPIS = [
  { id: 'deliverables', group: 'ops', label: 'Entregables completados', auto: true },
  { id: 'meetings', group: 'ops', label: 'Reuniones internas', auto: true },
  { id: 'contacts', group: 'ops', label: 'Contactos generados por BBDD' },
  { id: 'deals', group: 'performance', label: 'Deals generados', money: true, tag: true },
  { id: 'mqls', group: 'performance', label: 'MQLs generados', money: true, tag: true },
  { id: 'sales', group: 'performance', label: 'Ventas generadas', money: true, tag: true },
  { id: 'planFee', group: 'investment', label: 'Plan MarComms', money: true, defaultCurrency: 'USD', carry: true },
  { id: 'paidAlwaysOn', group: 'investment', kicker: 'Activation', label: 'Paid Media · Always On', money: true, defaultCurrency: 'USD', hint: 'Campañas recurrentes, que no se apagan' },
  { id: 'paidOneShot', group: 'investment', kicker: 'Activation', label: 'Paid Media · One Shot', money: true, defaultCurrency: 'USD', hint: 'Acciones puntuales (ej. el evento IFPA)' },
];

// Moneda de los KPIs con monto (performance: opcional; investment: USD)
export const KPI_CURRENCIES = ['USD', 'EUR', 'ARS', 'CAD', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU'];

// Tipo que se propone para una iniciativa nueva (se puede escribir otro)
export const DEFAULT_INITIATIVE_CATEGORY = 'Generación de demanda';

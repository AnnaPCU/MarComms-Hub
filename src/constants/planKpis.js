// ════════════════════════════════════════════════════════════════════
// PLAN KPIS — KPIs del mes e iniciativas de cada plan (sección Planes)
// ════════════════════════════════════════════════════════════════════
// Replica el bloque "KPIs del mes" del reporte mensual que se entrega al
// cliente (ej. "Control Union Estados Unidos — Reporte Plan Septiembre
// 2026"): dos grupos, Operativos y Performance, 6 KPIs.
//
//   auto     — se calcula solo desde las tareas del mes (se puede
//              corregir a mano). Ver src/utils/planKpis.js.
//   money    — admite moneda opcional (USD, EUR…) y etiqueta (ej. "8 MQLs").
//
// Un KPI vacío o en 0 no se muestra en el link externo. Los de
// performance muestran la variación contra el mes anterior.
// Se guardan en la tabla `plan_kpis` (migration 0038).
// ════════════════════════════════════════════════════════════════════

export const PLAN_KPI_GROUPS = [
  { id: 'ops', label: 'Operativos' },
  { id: 'performance', label: 'Performance' },
];

export const PLAN_KPIS = [
  { id: 'deliverables', group: 'ops', label: 'Entregables completados', auto: true },
  { id: 'meetings', group: 'ops', label: 'Reuniones internas', auto: true },
  { id: 'contacts', group: 'ops', label: 'Contactos generados por BBDD' },
  { id: 'deals', group: 'performance', label: 'Deals generados', money: true },
  { id: 'mqls', group: 'performance', label: 'MQLs generados', money: true },
  { id: 'sales', group: 'performance', label: 'Ventas generadas', money: true },
];

// Moneda opcional de los KPIs de performance (vacío = solo el número)
export const KPI_CURRENCIES = ['USD', 'EUR', 'ARS', 'CAD', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU'];

// Tipo que se propone para una iniciativa nueva (se puede escribir otro)
export const DEFAULT_INITIATIVE_CATEGORY = 'Generación de demanda';

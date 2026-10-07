// ════════════════════════════════════════════════════════════════════
// HUBSPOT BILLING — Constantes de la facturación de licencias HubSpot
// ════════════════════════════════════════════════════════════════════
// Réplica del Excel "Facturacion_HUBSPOT" (sección CRM HubSpot).
// ════════════════════════════════════════════════════════════════════

export const BILLING_SHEET = 'Facturacion HUBSPOT';
export const SUMMARY_SHEET = 'Summary';

// Tarifas por licencia si el Excel no trae la hoja Summary
export const DEFAULT_UNIT_PRICES = { salesPro: 145, core: 120 };

export const LICENSE_TYPES = {
  salesPro: { label: 'Sales Pro', short: 'SP', chip: 'bg-blue-50 text-blue-700 border-blue-200', prefix: '°' },
  core:     { label: 'Core',      short: 'Core', chip: 'bg-sky-50 text-sky-700 border-sky-200',  prefix: '-' },
};

// Etiquetas de la columna "Detalle" del Excel
export const ROW_LABELS = { entidad: 'legalEntity', manager: 'manager', usuarios: 'users' };

export const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Marca según el prefijo del nombre de la entidad (CU / PCU → Control Union, PS → Peterson Solutions)
export const brandOfEntity = (key) => (/^ps\b/i.test(String(key || '').trim()) ? 'Peterson Solutions' : 'Control Union');

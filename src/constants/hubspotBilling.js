// ════════════════════════════════════════════════════════════════════
// HUBSPOT BILLING — Constantes de la facturación de licencias HubSpot
// ════════════════════════════════════════════════════════════════════
// Réplica del Excel "Facturacion_HUBSPOT" (sección CRM HubSpot).
// ════════════════════════════════════════════════════════════════════

export const BILLING_SHEET = 'Facturacion HUBSPOT';
export const SUMMARY_SHEET = 'Summary';

// Tarifas por licencia si el Excel no trae la hoja Summary
export const DEFAULT_UNIT_PRICES = { salesPro: 145, core: 120 };

// Desde qué mes las licencias tienen precio fijo (tarifa del Summary). Antes
// de junio 2026 cada licencia se cobraba a un precio distinto: esos meses no
// se comparan con licencias × tarifa ni avisan en «Para revisar».
export const FIXED_PRICES_FROM = 'Junio';
export const VARIABLE_PRICE_NOTE = 'Variable price (no fixed rate before June)';

// Tarifas especiales por entidad (nov 2026): a PS Technology (752) se le
// cobran las licencias más baratas desde octubre 2026; septiembre fue un
// precio especial acordado sin tarifa por licencia (agreed: ese mes no se
// compara con licencias × tarifa). Se reconoce por
// la columna del Excel (entityKey) o por el código al principio de la
// entidad legal («752 - Peterson Technologies GmbH»). from = primer mes
// con esa tarifa (los anteriores van con la del Summary). Los chequeos de
// «licencias × tarifa» usan estas tarifas; el Summary del Excel no las trae.
export const SPECIAL_UNIT_PRICES = [
  { entityKey: 'PS Technology', code: '752', from: 'Octubre', salesPro: 100, core: 80, agreed: { Septiembre: 'Special agreed price (no per-license rate)' } },
];

export const LICENSE_TYPES = {
  salesPro: { label: 'Sales Pro', short: 'SP', chip: 'bg-blue-50 text-blue-700 border-blue-200', prefix: '°' },
  core:     { label: 'Core',      short: 'Core', chip: 'bg-sky-50 text-sky-700 border-sky-200',  prefix: '-' },
};

// Etiquetas de la columna "Detalle" del Excel
export const ROW_LABELS = { entidad: 'legalEntity', manager: 'manager', usuarios: 'users' };

// Los meses vienen del Excel en español (son las claves de los datos); en
// pantalla se muestran en inglés (sección CRM HubSpot en inglés, nov 2026)
export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Marca según el prefijo del nombre de la entidad (CU / PCU → Control Union, PS → Peterson Solutions)
export const brandOfEntity = (key) => (/^ps\b/i.test(String(key || '').trim()) ? 'Peterson Solutions' : 'Control Union');

// 'Octubre' → 'October' (para mostrar; las claves siguen en español)
export const monthEn = (m) => { const i = MONTHS_ES.indexOf(m); return i >= 0 ? MONTHS_EN[i] : (m || ''); };

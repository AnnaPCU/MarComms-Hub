// ════════════════════════════════════════════════════════════════════
// MARKETS — Países, unidades de negocio, mapping para webinars
// ════════════════════════════════════════════════════════════════════
// 17 países × 7 unidades de negocio
// El mapping define qué UN está activa en cada país para WEBINARS.
// MARKETS es el mapping general (campañas, eventos, etc.)
// ════════════════════════════════════════════════════════════════════

// Mapping general de países → unidades de negocio disponibles
export const MARKETS = {
  Argentina:  ['Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'CU Norte', 'Peterson'],
  Brasil:     ['Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'Peterson'],
  Canada:     ['Control Union'],
  Chile:      ['CU Certificaciones', 'Peterson'],
  Colombia:   ['Control Union'],
  Ecuador:    ['Control Union'],
  España:     ['Control Union'],
  Guatemala:  ['Control Union'],
  Iberia:     ['Peterson'],
  Mexico:     ['Control Union', 'Peterson'],
  Paraguay:   ['Control Union', 'Peterson'],
  Peru:       ['Control Union'],
  Portugal:   ['Control Union'],
  Ptech:      ['Peterson'],
  RD:         ['Control Union'],
  Uruguay:    ['Control Union', 'Peterson'],
  USA:        ['Control Union', 'Peterson', 'BELE'],
};

// Mapping específico para webinars (usa el mismo set por ahora)
export const COUNTRY_BU_MAPPING_WEBINAR = {
  Argentina:  ['Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'CU Norte', 'Peterson'],
  Brasil:     ['Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'Peterson'],
  Chile:      ['CU Certificaciones', 'Peterson'],
  Uruguay:    ['Control Union', 'Peterson'],
  Paraguay:   ['Control Union', 'Peterson'],
  Peru:       ['Control Union'],
  Canada:     ['Control Union'],
  Colombia:   ['Control Union'],
  USA:        ['Control Union', 'Peterson', 'BELE'],
  Ecuador:    ['Control Union'],
  Guatemala:  ['Control Union'],
  Mexico:     ['Control Union', 'Peterson'],
  España:     ['Control Union'],
  Portugal:   ['Control Union'],
  Iberia:     ['Peterson'],
  RD:         ['Control Union'],
  Ptech:      ['Peterson'],
};

// Lista plana de países (orden alfabético)
export const COUNTRIES = Object.keys(MARKETS).sort();

// Unidades de negocio para Marcomms (usadas en UTM builder y formularios)
export const MARCOMMS_BUSINESS_UNITS = [
  'MARCOMMS',
  'Control Union',
  'CU Barcos',
  'CU Warrants',
  'CU Certificaciones',
  'CU Norte',
  'Peterson',
  'BELE',
];

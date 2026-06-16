// ════════════════════════════════════════════════════════════════════
// MARKETS — Países, unidades de negocio
// ════════════════════════════════════════════════════════════════════
// 17 países × varias unidades de negocio.
// Fuente única de verdad — antes había también un PAISES_DATA en
// constants/countries.js con shape distinto. Consolidado acá.
// ════════════════════════════════════════════════════════════════════

// Mapping general: país → unidades de negocio disponibles
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

// Mapping específico para webinars (subset que usa el módulo webinar)
export const COUNTRY_BU_MAPPING_WEBINAR = { ...MARKETS };

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

// Organización macro (columna "Peterson o Control Union" del Excel de UTMs).
// Es un dato de clasificación del UTM — NO va dentro del string utm_campaign.
export const ORGANIZATIONS = [
  'Control Union',
  'Peterson',
];

// ── Display names para países con nombres "raros" (RD, Ptech, etc.) ──
const COUNTRY_DISPLAY = {
  RD:    'Rep. Dominicana',
  Ptech: 'Peterson Tech',
};

// ── Color asociado a cada país (clases Tailwind) ──
// Si querés cambiar la paleta o agregar países, editás acá.
const COUNTRY_COLORS = {
  Argentina: 'blue',
  Brasil:    'green',
  Canada:    'red',
  Chile:     'cyan',
  Colombia:  'orange',
  Ecuador:   'emerald',
  España:    'rose',
  Guatemala: 'indigo',
  Iberia:    'fuchsia',
  Mexico:    'amber',
  Paraguay:  'lime',
  Peru:      'sky',
  Portugal:  'teal',
  Ptech:     'violet',
  RD:        'blue',
  Uruguay:   'violet',
  USA:       'slate',
};

/**
 * MARKETS_LIST — versión array de MARKETS, con `id`, display name y color.
 * Para usar en grids de "directorio de países".
 *
 *   [{ id: 'argentina', pais: 'Argentina', empresas: [...], color: 'blue' }, ...]
 */
export const MARKETS_LIST = Object.keys(MARKETS)
  .sort()
  .map((key) => ({
    id:       key.toLowerCase(),
    pais:     COUNTRY_DISPLAY[key] || key,
    key,                                      // clave canónica (para lookups en MARKETS)
    empresas: MARKETS[key],
    color:    COUNTRY_COLORS[key] || 'slate',
  }));

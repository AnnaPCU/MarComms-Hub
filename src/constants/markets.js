// ════════════════════════════════════════════════════════════════════
// MARKETS — Países, unidades de negocio
// ════════════════════════════════════════════════════════════════════
// 17 países × varias unidades de negocio.
// Fuente única de verdad — antes había también un PAISES_DATA en
// constants/countries.js con shape distinto. Consolidado acá.
// ════════════════════════════════════════════════════════════════════

// Mapping general: país → unidades de negocio disponibles
export const MARKETS = {
  Argentina:  ['Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'CU Norte', 'Peterson Solutions'],
  Brasil:     ['Control Union', 'CU Barcos', 'CU Warrants', 'CU Certificaciones', 'Peterson Solutions'],
  Canada:     ['Control Union'],
  Chile:      ['CU Certificaciones', 'Peterson Solutions'],
  Colombia:   ['Control Union'],
  Ecuador:    ['Control Union'],
  España:     ['Control Union'],
  Guatemala:  ['Control Union'],
  Iberia:     ['Peterson Solutions'],
  Mexico:     ['Control Union', 'Peterson Solutions'],
  Paraguay:   ['Control Union', 'Peterson Solutions'],
  Peru:       ['Control Union'],
  Portugal:   ['Control Union'],
  Ptech:      ['Peterson Solutions'],
  RD:         ['Control Union'],
  Uruguay:    ['Control Union', 'Peterson Solutions'],
  USA:        ['Control Union', 'Peterson Solutions', 'BELE'],
};

// Mapping específico para webinars (subset que usa el módulo webinar)
export const COUNTRY_BU_MAPPING_WEBINAR = { ...MARKETS };

// ── Unidades para selects de proyectos/pedidos ──
// Regla (jul 2026): "Control Union" y "Peterson Solutions" aparecen SIEMPRE
// como opciones de Unidad, sin importar el país elegido. Las unidades
// específicas del país (CU Barcos, BELE, etc.) se suman después.
// "Peterson" (alias legacy de Peterson Solutions en MARKETS) se filtra
// para no mostrar un duplicado.
export const BASE_UNITS = ['Control Union', 'Peterson Solutions'];
export const unitsForCountry = (country) => {
  // Excepción: Ptech es sí o sí Peterson Solutions (no opera Control Union)
  if (country === 'Ptech') return ['Peterson Solutions'];
  const extras = (MARKETS[country] || []).filter(
    (u) => u !== 'Control Union' && u !== 'Peterson' && u !== 'Peterson Solutions',
  );
  return [...BASE_UNITS, ...extras];
};

// Lista plana de países (orden alfabético)
export const COUNTRIES = Object.keys(MARKETS).sort();

// Unidades de negocio para Marcomms (usadas en UTM builder y formularios)
export const MARCOMMS_BUSINESS_UNITS = [
  'Control Union',
  'CU Barcos',
  'CU Warrants',
  'CU Certificaciones',
  'CU Norte',
  'Peterson Solutions',
];

// Organización macro (columna "Peterson o Control Union" del Excel de UTMs).
// Es un dato de clasificación del UTM — NO va dentro del string utm_campaign.
// PCU = Peterson Control Union (piezas del grupo, sin marca puntual).
export const ORGANIZATIONS = [
  'Control Union',
  'Peterson Solutions',
  'PCU',
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

// ════════════════════════════════════════════════════════════════════
// PORTAL CLIENTE — Unidades activas y sus alcances (sep 2026)
// ════════════════════════════════════════════════════════════════════
// El portal se organiza por unidad, no por país suelto:
//   · Control Union Certificaciones → un dashboard por país
//   · Peterson Solutions            → Iberoamérica, Global o un país puntual
// Un "alcance" (scope) es { id, label, kind, countries } y se usa para
// filtrar los servicios: país dentro de `countries` y unidad de negocio
// dentro de `units` de la unidad.
// ════════════════════════════════════════════════════════════════════

const CU_UNITS = ['Control Union', 'CU Certificaciones', 'CU Barcos', 'CU Warrants', 'CU Norte', 'BELE'];
const PS_UNITS = ['Peterson Solutions', 'Peterson'];

const countriesWithAnyUnit = (units) =>
  Object.keys(MARKETS).filter((c) => (MARKETS[c] || []).some((u) => units.includes(u))).sort();

const CU_COUNTRIES = countriesWithAnyUnit(CU_UNITS);
const PS_COUNTRIES = countriesWithAnyUnit(PS_UNITS);
// Iberoamérica = Latinoamérica + Iberia (todo lo de Peterson salvo USA)
const PS_IBEROAMERICA = PS_COUNTRIES.filter((c) => c !== 'USA');

const countryScope = (prefix, c) => ({
  id: `${prefix}-${c.toLowerCase()}`, label: COUNTRY_DISPLAY[c] || c, kind: 'country', countries: [c],
});

export const PORTAL_UNITS = [
  {
    id: 'cu_cert',
    label: 'Control Union Certificaciones',
    description: 'Un dashboard por país.',
    units: CU_UNITS,
    scopeNoun: 'países',
    scopesTitle: 'Países',
    activeCls: 'bg-cyan-600 border-cyan-600',
    softCls: 'bg-cyan-50 text-cyan-600',
    scopes: CU_COUNTRIES.map((c) => countryScope('cu', c)),
  },
  {
    id: 'ps',
    label: 'Peterson Solutions',
    description: 'Iberoamérica, un país puntual o global.',
    units: PS_UNITS,
    scopeNoun: 'alcances',
    scopesTitle: 'Alcances',
    activeCls: 'bg-teal-600 border-teal-600',
    softCls: 'bg-teal-50 text-teal-600',
    scopes: [
      { id: 'ps-iberoamerica', label: 'Iberoamérica', kind: 'region', countries: PS_IBEROAMERICA, hint: `${PS_IBEROAMERICA.length} países` },
      { id: 'ps-global',       label: 'Global',       kind: 'global', countries: PS_COUNTRIES,     hint: 'Todos los mercados' },
      ...PS_COUNTRIES.map((c) => countryScope('ps', c)),
    ],
  },
];

// ¿Un servicio (país + unidad de negocio) entra en el alcance?
export const scopeMatches = (scope, country, businessUnit) => {
  if (!scope) return false;
  if (!scope.countries.includes(country)) return false;
  const units = scope.units;
  if (!units || units.length === 0) return true;
  return units.includes(businessUnit);
};

// Alcance por país para el buscador global: primero CU, si no PS.
export const portalScopeForCountry = (country) => {
  for (const u of PORTAL_UNITS) {
    const s = u.scopes.find((sc) => sc.kind === 'country' && sc.countries[0] === country);
    if (s) return { ...s, unitId: u.id, unitLabel: u.label, units: u.units };
  }
  return null;
};

// ════════════════════════════════════════════════════════════════════
// BRANDS — Identidad de cada marca para las piezas que ve el cliente
// ════════════════════════════════════════════════════════════════════
// Control Union y Peterson Solutions son marcas SEPARADAS: nunca se
// mezclan logos, colores, tono ni piezas. Hoy lo usa el link externo de
// cada plan (sección Planes).
//
//   Control Union — organismo certificador. Tono formal, técnico,
//     institucional. Tagline al pie (nunca junto al logo).
//   Peterson Solutions — consultora. Tono personal, positivo, activo;
//     "nosotros" y el cliente como protagonista.
//
// colors: modo claro (el de siempre para el cliente). darkColors: modo
// oscuro, si la persona lo activó en el Hub (useTheme). Las superficies
// (fondos, bordes) las oscurece el remapeo de src/index.css; acá van los
// colores que se aplican por style. `label` (textos chicos) usa el Dark
// Grey de la marca para que se lea sobre blanco.
//
// emptyMonth / goTo: textos del link cuando el mes elegido no tiene
// acciones ({mes} se reemplaza), en el tono de cada marca.
// ════════════════════════════════════════════════════════════════════

export const BRAND_THEMES = {
  'Control Union': {
    name: 'Control Union',
    logo: '/logos/control-union.png',
    tagline: 'The proof to your promise',
    site: 'controlunion.com',
    title: 'Seguimiento del plan de marketing',
    intro: 'Estado de las acciones del plan, actualizado de forma continua.',
    emptyMonth: 'No hay acciones registradas en {mes}.',
    goTo: 'Ver {mes}',
    colors: { primary: '#3eb2ed', dark: '#1b1e42', grey: '#799495', label: '#4f6566', text: '#4f6566', soft: '#eef8fe', link: '#1b1e42' },
    darkColors: { primary: '#3eb2ed', dark: '#f1f5f9', grey: '#9fb4b5', label: '#9fb4b5', text: '#cbd5e1', soft: 'rgba(62,178,237,0.10)', link: '#3eb2ed' },
  },
  'Peterson Solutions': {
    name: 'Peterson Solutions',
    logo: '/logos/peterson-solutions.png',
    tagline: 'For the world, for ourselves, for our families',
    site: 'peterson-solutions.com',
    title: 'Tu plan de marketing, paso a paso',
    intro: 'Acá ves cómo avanzamos juntos con cada acción del plan.',
    emptyMonth: 'Todavía no hay acciones cargadas para {mes}.',
    goTo: 'Ver {mes}',
    colors: { primary: '#44cbce', dark: '#1b1e42', grey: '#799495', label: '#4f6566', text: '#4f6566', soft: '#eefafa', link: '#1b1e42', accent: '#f1e747' },
    darkColors: { primary: '#44cbce', dark: '#f1f5f9', grey: '#9fb4b5', label: '#9fb4b5', text: '#cbd5e1', soft: 'rgba(68,203,206,0.10)', link: '#44cbce', accent: '#f1e747' },
  },
};

// Planes que no son de ninguna de las dos marcas: sin logo ni tagline
export const NEUTRAL_THEME = {
  name: '',
  logo: null,
  tagline: '',
  site: '',
  title: 'Seguimiento del plan de marketing',
  intro: 'Estado de las acciones del plan.',
  emptyMonth: 'No hay acciones registradas en {mes}.',
  goTo: 'Ver {mes}',
  colors: { primary: '#475569', dark: '#0f172a', grey: '#64748b', label: '#475569', text: '#334155', soft: '#f1f5f9', link: '#0f172a' },
  darkColors: { primary: '#94a3b8', dark: '#f1f5f9', grey: '#94a3b8', label: '#94a3b8', text: '#cbd5e1', soft: 'rgba(148,163,184,0.10)', link: '#cbd5e1' },
};

export const brandTheme = (brand) => BRAND_THEMES[brand] || NEUTRAL_THEME;

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
// ════════════════════════════════════════════════════════════════════

export const BRAND_THEMES = {
  'Control Union': {
    name: 'Control Union',
    logo: '/logos/control-union.png',
    tagline: 'The proof to your promise',
    site: 'controlunion.com',
    title: 'Seguimiento del plan de marketing',
    intro: 'Estado de las acciones del plan, actualizado de forma continua.',
    colors: { primary: '#3eb2ed', dark: '#1b1e42', grey: '#799495', text: '#4f6566', soft: '#eef8fe' },
  },
  'Peterson Solutions': {
    name: 'Peterson Solutions',
    logo: '/logos/peterson-solutions.png',
    tagline: 'For the world, for ourselves, for our families',
    site: 'peterson-solutions.com',
    title: 'Tu plan de marketing, paso a paso',
    intro: 'Acá ves cómo avanzamos juntos con cada acción del plan.',
    colors: { primary: '#44cbce', dark: '#1b1e42', grey: '#799495', text: '#4f6566', soft: '#eefafa', accent: '#f1e747' },
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
  colors: { primary: '#475569', dark: '#0f172a', grey: '#64748b', text: '#334155', soft: '#f1f5f9' },
};

export const brandTheme = (brand) => BRAND_THEMES[brand] || NEUTRAL_THEME;

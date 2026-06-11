// ════════════════════════════════════════════════════════════════════
// STANDALONE CATEGORIES — Pedidos del Content Hub
// ════════════════════════════════════════════════════════════════════
// Categorías de pedidos standalone (independientes de webinar/evento/campaña).
// Cada categoría define su owner default y su paleta de colores.
//
// IMPORTANTE: cuando se crea un pedido, se asigna automáticamente
// al `defaultOwner` de la categoría (que puede luego cambiarse).
// ════════════════════════════════════════════════════════════════════

export const STANDALONE_CATEGORIES = [
  {
    id: 'one_pager',
    label: 'One pager',
    defaultOwner: 'Agustina Ball',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    kind: 'design',
  },
  {
    id: 'ppt',
    label: 'PPT',
    defaultOwner: 'Agustina Ball',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    kind: 'design',
  },
  {
    id: 'formulario',
    label: 'Formulario',
    defaultOwner: 'Victoria Colombo',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    kind: 'design',
  },
  {
    id: 'branding',
    label: 'Branding',
    defaultOwner: 'Fatima Lacroze',
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    dot: 'bg-pink-500',
    kind: 'design',
  },
  {
    id: 'landing',
    label: 'Landing page',
    defaultOwner: 'Victoria Colombo',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    kind: 'design',
  },
  {
    id: 'video',
    label: 'Video',
    defaultOwner: 'Delfina Palmero',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    kind: 'design',
  },
];

// ── Mapping de categoría → grupo de facturación ──
// Para el módulo de Facturación que agrupa pedidos en 6 categorías.
export const STANDALONE_TO_CATEGORY = {
  one_pager:  'content',
  ppt:        'content',
  landing:    'content',
  video:      'content',
  formulario: 'otros',
  branding:   'otros',
};

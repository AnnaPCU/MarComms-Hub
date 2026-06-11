// ════════════════════════════════════════════════════════════════════
// EVENT PHASES — 5 fases de gestión de eventos
// ════════════════════════════════════════════════════════════════════
// Cada fase tiene tareas con offset (días respecto a la fecha del evento).
// Las fechas de difusión están alineadas con las del Webinar Hub.
//
// Estructura de cada tarea:
//   { id, label, offset, hasParticipants?, linkable? }
//
//   - offset: días respecto a la fecha del evento (negativos = antes)
//   - hasParticipants: true si la tarea acepta lista de personas (LinkedIn)
//   - linkable: 'campaign' si puede linkearse a una campaña de email
// ════════════════════════════════════════════════════════════════════

export const EVENT_PHASES = [
  {
    id: 'setup',
    label: 'Setup',
    color: 'blue',
    icon: 'Settings',
    tasks: [
      { id: 'session_estrategica',  label: 'Sesión estratégica',     offset: -60 },
      { id: 'landing',              label: 'Landing',                offset: -45 },
      { id: 'formulario',           label: 'Formulario',             offset: -45 },
      { id: 'lista_participantes',  label: 'Lista de participantes', offset: -30 },
      { id: 'logo_evento',          label: 'Logo del evento',        offset: -45 },
    ],
  },
  {
    id: 'diseno',
    label: 'Diseño',
    color: 'indigo',
    icon: 'FileText',
    tasks: [
      { id: 'presentacion', label: 'PPT',       offset: -20 },
      { id: 'one_pager',    label: 'One pager', offset: -20 },
      { id: 'stand',        label: 'Stand',     offset: -25 },
      { id: 'qrs',          label: 'QRs',       offset: -10 },
    ],
  },
  {
    id: 'difusion',
    label: 'Difusión',
    color: 'purple',
    icon: 'Share2',
    tasks: [
      { id: 'lkn_anuncio',     label: 'LKN post "anuncio"',                offset: -15 },
      { id: 'lkn_personales',  label: 'LKN post a cuentas personales',     offset: -7,  hasParticipants: true },
      { id: 'email_pre',       label: 'Campaña Email Pre-evento',          offset: -15, linkable: 'campaign' },
      { id: 'bbdd_generacion', label: 'Generación de BBDD',                offset: -30 },
    ],
  },
  {
    id: 'in_event',
    label: 'Durante el Evento',
    color: 'amber',
    icon: 'Target',
    tasks: [
      { id: 'geo_paid',        label: 'Paid media PMAX (imagen)',  offset: 0 },
      { id: 'marcomms_onsite', label: 'Marcomms person on site',   offset: 0 },
      { id: 'fotos',           label: 'Fotos del evento',          offset: 0 },
    ],
  },
  {
    id: 'post_event',
    label: 'Post Evento',
    color: 'emerald',
    icon: 'BarChart3',
    tasks: [
      { id: 'email_post',     label: 'Campaña Email Post-evento',    offset: 1, linkable: 'campaign' },
      { id: 'leads_crm',      label: 'Carga de leads a CRM',         offset: 3 },
      { id: 'reunion_cierre', label: 'Reunión de cierre',            offset: 7 },
      { id: 'lkn_post',       label: 'LKN post "recap del evento"',  offset: 5 },
    ],
  },
];

// ── Piezas de contenido del evento (Content Hub) ──
export const EVENT_CONTENT_PIECES = [
  { key: 'landing',         label: 'Landing',                       defaultOwner: 'Victoria Colombo', syncTaskId: 'landing',         kind: 'design' },
  { key: 'formulario',      label: 'Formulario',                    defaultOwner: 'Victoria Colombo', syncTaskId: 'formulario',      kind: 'mixed' },
  { key: 'ppt',             label: 'PPT',                           defaultOwner: 'Agustina Ball',  syncTaskId: 'presentacion',    kind: 'mixed' },
  { key: 'one_pager',       label: 'One pager',                     defaultOwner: 'Agustina Ball',  syncTaskId: 'one_pager',       kind: 'mixed' },
  { key: 'stand',           label: 'Stand',                         defaultOwner: 'Victoria Colombo', syncTaskId: 'stand',           kind: 'design' },
  { key: 'qrs',             label: 'QRs',                           defaultOwner: 'Victoria Colombo', syncTaskId: 'qrs',             kind: 'design' },
  { key: 'lkn_anuncio',     label: 'LKN post "anuncio"',            defaultOwner: 'Fatima Lacroze',  syncTaskId: 'lkn_anuncio',     kind: 'design' },
  { key: 'lkn_personales',  label: 'LKN post a cuentas personales', defaultOwner: 'Fatima Lacroze',  syncTaskId: 'lkn_personales',  kind: 'design' },
  { key: 'paid_pmax',       label: 'Paid media PMAX (imagen)',      defaultOwner: 'Delfina Palmero', syncTaskId: 'geo_paid',        kind: 'design' },
  { key: 'fotos_evento',    label: 'Fotos del evento',              defaultOwner: 'Delfina Palmero', syncTaskId: 'fotos',           kind: 'design' },
  { key: 'lkn_recap',       label: 'LKN post "recap del evento"',   defaultOwner: 'Fatima Lacroze',  syncTaskId: 'lkn_post',        kind: 'design' },
];

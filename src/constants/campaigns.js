// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS — Constantes específicas del módulo
// ════════════════════════════════════════════════════════════════════
// Piezas de contenido de las campañas + opciones de UTMs.
// ════════════════════════════════════════════════════════════════════

// ── Piezas de contenido para CAMPAÑA email (manual, no la del webinar) ──
export const CAMPAIGN_CONTENT_PIECES = [
  { key: 'banner_emails', label: 'Banner emails', defaultOwner: 'Victoria Colombo', kind: 'design' },
  { key: 'formulario',    label: 'Formulario',    defaultOwner: 'Victoria Colombo', kind: 'design' },
  { key: 'one_pager',     label: 'One pager',     defaultOwner: 'Agustina Ball',  kind: 'design' },
  { key: 'landing',       label: 'Landing',       defaultOwner: 'Victoria Colombo', kind: 'design' },
];

// ── Opciones de UTMs ──
// Estos valores van en el utm_source / utm_medium de las URLs generadas
// por el UTM Builder.

// ── Pilares (sep 2026) ──
// Un pilar agrupa servicios del mismo tipo. Los webinars y eventos son
// colecciones propias; email, paid, database y research son `type` de la
// tabla campaigns. Se usa en Pilares (tabs) y en el Portal Cliente (filtro).
export const PILLARS = [
  { id: 'webinars', label: 'Webinars' },
  { id: 'eventos',  label: 'Eventos' },
  { id: 'email',    label: 'Email Mkt' },
  { id: 'paid',     label: 'Paid Media' },
  { id: 'database', label: 'Creación BBDD' },
  { id: 'research', label: 'Investigación' },
];
export const PILLAR_BY_ID = PILLARS.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
// type de una campaña → id de pilar (las campañas auto de webinar son 'email' por variant)
export const pillarOfCampaign = (campaign) => (campaign?.variant === 'webinar' ? 'email' : (PILLAR_BY_ID[campaign?.type] ? campaign.type : 'email'));

// Fuentes y medios del UTM Generator (sep 2026: listas cerradas, son las
// únicas disponibles). Los valores viejos que quedaron en el repositorio
// (contenido, paid_media, email_mkt…) se muestran con LEGACY_UTM_LABELS y
// se traducen al cargar un UTM guardado con LEGACY_UTM_VALUE_MAP.
export const UTM_SOURCES = [
  { value: 'content',   label: 'Content' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'meta',      label: 'Meta (Instagram o Facebook)' },
  { value: 'google',    label: 'Google' },
  { value: 'mailchimp', label: 'Mailchimp' },
  { value: 'apollo',    label: 'Apollo' },
  { value: 'hubspot',   label: 'HubSpot' },
];

export const UTM_MEDIUMS = [
  { value: 'email_marketing', label: 'Email Marketing' },
  { value: 'social',          label: 'Social' },
  { value: 'paid_media',      label: 'Paid Media' },
  { value: 'webinar',         label: 'Webinar' },
];

// Etiquetas para valores históricos que ya no están en las listas
export const LEGACY_UTM_LABELS = {
  contenido:      'Contenido (viejo)',
  email_mkt:      'Email Marketing (viejo)',
  Linkedin:       'LinkedIn (viejo)',
  'Social Media': 'Social (viejo)',
};

// Traducción de valores viejos al cargar un UTM guardado en el formulario
export const LEGACY_UTM_VALUE_MAP = {
  source: { contenido: 'content', Linkedin: 'linkedin', LinkedIn: 'linkedin' },
  medium: { email_mkt: 'email_marketing', 'Social Media': 'social', 'social_media': 'social' },
};

// ── Estados de las campañas de Paid Media ──
// Estado de cada campaña dentro de una tarjeta de Paid Media (oct 2026): se
// edita desde la ficha. Clases completas para que Tailwind las detecte.
export const PAID_CAMPAIGN_STATUSES = [
  { id: 'Activa',       label: 'Activa',       chip: 'bg-emerald-50 text-emerald-800 border-emerald-100', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'Pausada',      label: 'Pausada',      chip: 'bg-amber-50 text-amber-800 border-amber-100',       badge: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  { id: 'Inhabilitada', label: 'Inhabilitada', chip: 'bg-slate-50 text-slate-400 border-slate-200 line-through', badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-300' },
];
export const PAID_CAMPAIGN_STATUS_BY_ID = Object.fromEntries(PAID_CAMPAIGN_STATUSES.map((s) => [s.id, s]));
// Estado desconocido (ej. otro que traiga Google Ads): se muestra como pausada
export const paidCampaignStatus = (estado) => PAID_CAMPAIGN_STATUS_BY_ID[estado] || { ...PAID_CAMPAIGN_STATUS_BY_ID.Pausada, id: estado || 'Pausada', label: estado || 'Pausada' };

// ── Pasos (steps) de cada tipo de campaña ──
// IDs deben coincidir con los que se guardan en campaign.completedSteps.
// Usado para mostrar el desglose/checklist de una campaña (read-only en
// las completadas, editable en las activas).
export const CAMPAIGN_STEPS = {
  email: [
    { id: 'req',           label: '1. Pedido de la campaña confirmado' },
    { id: 'num',           label: '2. Cantidad de envíos definida' },
    { id: 'dates',         label: '3. Fechas de envío establecidas' },
    { id: 'tag',           label: '4. Etiqueta BBDD cargada' },
    { id: 'contents',      label: '5. Contenidos listos (asuntos, mensajes, CTAs, links)' },
    { id: 'banners',       label: '6. Banners preparados' },
    { id: 'sender',        label: '7. Dirección de remitente validada' },
    { id: 'test',          label: '8. Emails de prueba enviados y revisados' },
    { id: 'prog',          label: '9. Envíos programados en Mailchimp' },
    { id: 'hs_deals',      label: '10. Deals cargados en HubSpot' },
    { id: 'bbdd_del',      label: '11. BBDD borrada de Mailchimp' },
    { id: 'client_report', label: '12. Reporte enviado al cliente' },
    { id: 'smartsheet',    label: '13. Cargado en Smartsheet (facturación)' },
  ],
  // Paid Media (oct 2026): una campaña lanzada sigue «en proceso» mientras
  // esté activa (always on); pasa a Completadas recién cuando se pausa o
  // termina (paso «finished»).
  paid: [
    { id: 'brief',        label: 'Brief y creatividades aprobadas' },
    { id: 'creativities', label: 'Piezas subidas a plataforma' },
    { id: 'launch',       label: 'Campaña lanzada' },
    { id: 'finished',     label: 'Campaña finalizada (pausada o terminada)' },
  ],
  database: [
    { id: 'brief_db',    label: 'Brief y criterios aprobados' },
    { id: 'extraction',  label: 'Datos extraídos / importados' },
    { id: 'delivery_db', label: 'BBDD entregada al solicitante' },
  ],
  research: [
    { id: 'brief_research', label: 'Brief y metodología aprobados' },
    { id: 'fieldwork',      label: 'Trabajo de campo finalizado' },
    { id: 'delivery_rs',    label: 'Informe final entregado' },
  ],
};

/**
 * Devuelve [{ label, done }] para una campaña (su desglose de pasos).
 */
export const getCampaignChecklist = (campaign) => {
  if (!campaign) return [];
  const completed = new Set(campaign.completedSteps || []);
  const steps = CAMPAIGN_STEPS[campaign.type] || CAMPAIGN_STEPS.email;
  return steps.map((s) => ({ label: s.label, done: completed.has(s.id) }));
};

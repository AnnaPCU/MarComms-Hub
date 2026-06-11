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

export const UTM_SOURCES = [
  { value: 'paid_media', label: 'Paid Media' },
  { value: 'contenido',  label: 'Contenido' },
];

export const UTM_MEDIUMS = [
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'google',    label: 'Google' },
  { value: 'meta',      label: 'Meta (Facebook/Instagram)' },
  { value: 'email_mkt', label: 'Email Marketing' },
  { value: 'content',   label: 'Content' },
  { value: 'webinar',   label: 'Webinar' },
];

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
  paid: [
    { id: 'brief',        label: 'Brief y creatividades aprobadas' },
    { id: 'creativities', label: 'Piezas subidas a plataforma' },
    { id: 'launch',       label: 'Campaña lanzada' },
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

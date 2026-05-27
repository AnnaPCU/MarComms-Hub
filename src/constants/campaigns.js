// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS — Constantes específicas del módulo
// ════════════════════════════════════════════════════════════════════
// Piezas de contenido de las campañas + opciones de UTMs.
// ════════════════════════════════════════════════════════════════════

// ── Piezas de contenido para CAMPAÑA email (manual, no la del webinar) ──
export const CAMPAIGN_CONTENT_PIECES = [
  { key: 'banner_emails', label: 'Banner emails', defaultOwner: 'Vicky', kind: 'design' },
  { key: 'formulario',    label: 'Formulario',    defaultOwner: 'Vicky', kind: 'design' },
  { key: 'one_pager',     label: 'One pager',     defaultOwner: 'Agus',  kind: 'design' },
  { key: 'landing',       label: 'Landing',       defaultOwner: 'Vicky', kind: 'design' },
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

// ════════════════════════════════════════════════════════════════════
// WEBINAR — Constantes específicas del módulo
// ════════════════════════════════════════════════════════════════════
// Mappings para sync bidireccional Webinar ↔ Campaign linkeada.
// Piezas de contenido que aparecen en el Content Hub.
// ════════════════════════════════════════════════════════════════════

// ── Mappings webinar ↔ campaign ──
// Cuando una tarea de mail se tilda en el webinar, automáticamente
// se tilda el step correspondiente en la campaña linkeada (y viceversa).
export const WEBINAR_MAIL_TO_STEP = {
  mailPre1:         'mail1_pre',
  mailPre2:         'mail2_teaser',
  mailPre3:         'mail3_h24',
  mailPostAttended: 'mailpost_attended',
  mailPostNoShow:   'mailpost_noshow',
};

// Mapping inverso (auto-generado)
export const STEP_TO_WEBINAR_MAIL = Object.fromEntries(
  Object.entries(WEBINAR_MAIL_TO_STEP).map(([k, v]) => [v, k])
);

// ── Piezas de contenido del webinar (Content Hub) ──
// kind='mixed' = pieza con copy + diseño / 'design' = solo diseño
export const WEBINAR_CONTENT_PIECES = [
  { key: 'landingLivestorm', label: 'Landing Livestorm',            defaultOwner: 'Victoria Colombo', syncTask: 'landingLivestorm', kind: 'mixed' },
  { key: 'lknAnuncio',       label: 'LKN post "anuncio"',           defaultOwner: 'Agustina Ball',  syncTask: 'lknAnuncio',       kind: 'design' },
  { key: 'lknReminder',      label: 'LKN post "1 day to go"',       defaultOwner: 'Agustina Ball',  syncTask: 'lknReminder',      kind: 'design' },
  { key: 'lknHoy',           label: 'LKN post "es hoy"',            defaultOwner: 'Agustina Ball',  syncTask: 'lknHoy',           kind: 'design' },
  { key: 'lknPost',          label: 'LKN post "recap del webinar"', defaultOwner: 'Agustina Ball',  syncTask: 'lknPost',          kind: 'design' },
  { key: 'ppt',              label: 'PPT',                          defaultOwner: 'Agustina Ball',  syncTask: 'ppt',              kind: 'mixed' },
  { key: 'onePager',         label: 'One pager',                    defaultOwner: 'Agustina Ball',  syncTask: 'onePager',         kind: 'mixed' },
  { key: 'bannerInv1',       label: 'Banner email invitación 1',    defaultOwner: 'Victoria Colombo', syncTask: 'bannerInv1',       kind: 'design' },
  { key: 'bannerInv2',       label: 'Banner email invitación 2',    defaultOwner: 'Victoria Colombo', syncTask: 'bannerInv2',       kind: 'design' },
  { key: 'bannerInv3',       label: 'Banner email invitación 3',    defaultOwner: 'Victoria Colombo', syncTask: 'bannerInv3',       kind: 'design' },
  { key: 'bannerPost',       label: 'Banner email post webinar',    defaultOwner: 'Victoria Colombo', syncTask: 'bannerPost',       kind: 'design' },
  { key: 'reporte',          label: 'Reporte final',                defaultOwner: 'Delfina Palmero', syncTask: 'reporte',          kind: 'mixed' },
];

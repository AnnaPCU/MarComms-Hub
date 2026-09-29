// ════════════════════════════════════════════════════════════════════
// WEBINAR — Constantes específicas del módulo
// ════════════════════════════════════════════════════════════════════
// Mappings para sync bidireccional Webinar ↔ Campaign linkeada.
// Piezas de contenido que aparecen en Social Media.
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

// ── Tareas opcionales ("si aplica") ──
// No todos los webinars llevan PPT ni one pager. Estas tareas NO suman al
// porcentaje de avance salvo que en ese webinar se marquen como "aplica"
// (task.applies = true). Se usa en calcProgress, el PDF y el Portal Cliente.
// (sep 2026) Se quitaron las tareas de banner: el banner es parte del email.
export const OPTIONAL_WEBINAR_TASKS = ['ppt', 'onePager'];
export const webinarTaskApplies = (webinar, key) =>
  !OPTIONAL_WEBINAR_TASKS.includes(key) || !!(webinar && webinar[key] && webinar[key].applies);

// ── Piezas de contenido del webinar (Social Media) ──
// kind='mixed' = pieza con copy + diseño / 'design' = solo diseño
export const WEBINAR_CONTENT_PIECES = [
  { key: 'landingLivestorm', label: 'Landing de registro',            defaultOwner: 'Victoria Colombo', syncTask: 'landingLivestorm', kind: 'mixed' },
  { key: 'lknAnuncio',       label: 'LKN post "anuncio"',           defaultOwner: 'Agustina Ball',  syncTask: 'lknAnuncio',       kind: 'design' },
  { key: 'lknReminder',      label: 'LKN post "1 day to go"',       defaultOwner: 'Agustina Ball',  syncTask: 'lknReminder',      kind: 'design' },
  { key: 'lknHoy',           label: 'LKN post "es hoy"',            defaultOwner: 'Agustina Ball',  syncTask: 'lknHoy',           kind: 'design' },
  { key: 'lknPost',          label: 'LKN post "recap del webinar"', defaultOwner: 'Agustina Ball',  syncTask: 'lknPost',          kind: 'design' },
  { key: 'ppt',              label: 'PPT (si aplica)',                       defaultOwner: 'Agustina Ball',  syncTask: 'ppt',              kind: 'mixed' },
  { key: 'onePager',         label: 'One pager (si aplica)',                 defaultOwner: 'Agustina Ball',  syncTask: 'onePager',         kind: 'mixed' },
  { key: 'mailPre1',          label: 'Email invitación 1',           defaultOwner: 'Francisco Capoulat', syncTask: 'mailPre1',          kind: 'mixed' },
  { key: 'mailPre2',          label: 'Email invitación 2',           defaultOwner: 'Francisco Capoulat', syncTask: 'mailPre2',          kind: 'mixed' },
  { key: 'mailPre3',          label: 'Email invitación 3',           defaultOwner: 'Francisco Capoulat', syncTask: 'mailPre3',          kind: 'mixed' },
  { key: 'mailPostAttended',  label: 'Email post — Asistentes',      defaultOwner: 'Francisco Capoulat', syncTask: 'mailPostAttended',  kind: 'mixed' },
  { key: 'mailPostNoShow',    label: 'Email post — No asistidos',    defaultOwner: 'Francisco Capoulat', syncTask: 'mailPostNoShow',    kind: 'mixed' },
  { key: 'reporte',          label: 'Reporte final',                defaultOwner: 'Delfina Palmero', syncTask: 'reporte',          kind: 'mixed' },
];

// ════════════════════════════════════════════════════════════════════
// NOTIFICATION ALERTS — Helpers puros para la capa de avisos
// ════════════════════════════════════════════════════════════════════
// Las notificaciones (utils/notifications.js) son un cálculo derivado de
// los datos. Esta capa se encarga de que LLEGUEN: detecta cuáles son
// nuevas respecto de lo que la persona ya vio, arma el título de la
// pestaña y el texto de los avisos del navegador.
//
// Sin React ni DOM → testeable con vitest.
// ════════════════════════════════════════════════════════════════════

export const APP_TITLE = 'Marcomms Hub';
export const SEEN_STORAGE_PREFIX = 'marcomms_hub_seen_notifs_v1';
export const WELCOME_SESSION_PREFIX = 'marcomms_hub_welcome_shown_v1';
export const MAX_SEEN_IDS = 500;

// Clave de storage por usuario (dos personas en la misma compu no se pisan)
export const seenStorageKey = (userName) => `${SEEN_STORAGE_PREFIX}:${(userName || '').trim().toLowerCase()}`;
export const welcomeSessionKey = (userName) => `${WELCOME_SESSION_PREFIX}:${(userName || '').trim().toLowerCase()}`;

// Notificaciones cuyo id no está en el set de vistas → son nuevas
export const diffNewNotifications = (notifications, seenIds) => {
  const seen = seenIds instanceof Set ? seenIds : new Set(seenIds || []);
  return (notifications || []).filter((n) => n && n.id && !seen.has(n.id));
};

// Agrega ids al set de vistas, acotando el tamaño (los más viejos se van)
export const mergeSeenIds = (seenIds, notifications, max = MAX_SEEN_IDS) => {
  const merged = [...(seenIds instanceof Set ? seenIds : seenIds || [])];
  (notifications || []).forEach((n) => {
    if (n && n.id && !merged.includes(n.id)) merged.push(n.id);
  });
  return new Set(merged.slice(-max));
};

// Título de la pestaña: "(3) Marcomms Hub" cuando hay sin leer
export const buildTabTitle = (unreadCount, base = APP_TITLE) =>
  unreadCount > 0 ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${base}` : base;

// Texto para el aviso del navegador (Notification API)
export const buildBrowserNotification = (notif) => ({
  title: notif.shortTitle || notif.title || 'Nueva notificación',
  body: [notif.project, notif.source].filter(Boolean).join(' · '),
  tag: notif.id, // mismo tag → el navegador reemplaza en vez de apilar
});

// Resumen corto para el modal de bienvenida: "3 sin leer: 1 atrasada, 2 próximas"
export const summarizeUnread = (notifications) => {
  const counts = {};
  (notifications || []).forEach((n) => { counts[n.type] = (counts[n.type] || 0) + 1; });
  const LABELS = {
    overdue: 'atrasada', soon: 'próxima a vencer', assigned: 'asignada', new: 'nueva',
    responsible: 'de tu equipo', world_day: 'día mundial',
  };
  const PLURAL = {
    overdue: 'atrasadas', soon: 'próximas a vencer', assigned: 'asignadas', new: 'nuevas',
    responsible: 'de tu equipo', world_day: 'días mundiales',
  };
  return Object.entries(counts)
    .map(([type, c]) => `${c} ${c === 1 ? (LABELS[type] || type) : (PLURAL[type] || type)}`)
    .join(', ');
};

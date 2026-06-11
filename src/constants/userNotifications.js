// ════════════════════════════════════════════════════════════════════
// USER NOTIFICATIONS TEMPLATES — Mensajes personalizados por usuario
// ════════════════════════════════════════════════════════════════════
// Cada usuario ve notificaciones contextuales según su equipo y rol.
// Comunicación (diseñadores) → enfoque en piezas, contenido, deadlines visuales
// Marketing → enfoque en estrategia, campañas, métricas
// ════════════════════════════════════════════════════════════════════

export const NOTIFICATION_TEMPLATES = {
  // ── EQUIPO COMUNICACIÓN (Diseño & Contenido) ──
  comunicacion: {
    overdue_task: (label, projectName) => ({
      title_short: `🚨 ${label} atrasado`,
      title_long: `Esta pieza de contenido está atrasada: ${label}`,
      emoji: '🚨',
      tone: 'urgent'
    }),
    soon_task: (label, projectName) => ({
      title_short: `⏰ ${label} próximo`,
      title_long: `Vence pronto: ${label} para ${projectName}`,
      emoji: '⏰',
      tone: 'warning'
    }),
    new_request: (projectName) => ({
      title_short: `✨ Nuevo pedido de contenido`,
      title_long: `Te asignaron un pedido: ${projectName}`,
      emoji: '✨',
      tone: 'info'
    }),
    responsible: (progress, projectName) => ({
      title_short: `👁️ Supervisás este proyecto (${progress}%)`,
      title_long: `Como encargada: revisa el progreso de ${projectName} (${progress}%)`,
      emoji: '👁️',
      tone: 'info'
    }),
    assigned_task: (assignedBy, taskName) => ({
      title_short: `📌 ${assignedBy} te asignó una tarea`,
      title_long: `${assignedBy} te asignó: ${taskName}`,
      emoji: '📌',
      tone: 'neutral'
    }),
  },

  // ── EQUIPO MARKETING ──
  marketing: {
    overdue_task: (label, projectName) => ({
      title_short: `🔴 ${label} atrasado`,
      title_long: `Falta completar: ${label}`,
      emoji: '🔴',
      tone: 'urgent'
    }),
    soon_task: (label, projectName) => ({
      title_short: `🟡 ${label} próximo a cerrar`,
      title_long: `Cierra pronto: ${label} de ${projectName}`,
      emoji: '🟡',
      tone: 'warning'
    }),
    new_request: (projectName) => ({
      title_short: `📊 Nuevo pedido en el Hub`,
      title_long: `Se creó un pedido: ${projectName}`,
      emoji: '📊',
      tone: 'info'
    }),
    responsible: (progress, projectName) => ({
      title_short: `📈 Sos responsable de ${projectName} (${progress}%)`,
      title_long: `Checkeá el progreso: ${projectName} va ${progress}%`,
      emoji: '📈',
      tone: 'info'
    }),
    assigned_task: (assignedBy, taskName) => ({
      title_short: `📋 ${assignedBy} te pasó una tarea`,
      title_long: `Nueva tarea de ${assignedBy}: ${taskName}`,
      emoji: '📋',
      tone: 'neutral'
    }),
  },

  // ── NOTIFICACIONES UNIVERSALES (aplican a todos) ──
  universal: {
    overdue: '🚨 ATRASADO',
    soon: '⏰ PRÓXIMO A VENCER',
    assigned: '📌 TE ASIGNARON',
    responsible: '👁️ ERES RESPONSABLE',
    new: '✨ NUEVO',
  },
};

// ── Mensajes context específicos por usuario (key = nombre completo) ──
export const USER_GREETINGS = {
  'Agustina Ball':              '¡Hola Agustina! 👋 Acá están tus piezas de contenido',
  'Victoria Colombo':          '¡Hola Victoria! 👋 Mirá los webinars y eventos del día',
  'Delfina Palmero':           '¡Hola Delfina! 👋 Tus diseños están aquí',
  'Fatima Lacroze':            '¡Hola Fátima! 👋 Que siga la creatividad',
  'Alejandro Juan Sanguinetti':'¡Hola Alejandro! 📊 Mirá el pipeline de campañas',
  'Felipe Señorans':           '¡Hola Felipe! 📈 Acá están tus responsabilidades',
  'Francisco Capoulat':        '¡Hola Francisco! 🎯 Venga con las estrategias',
  'Tomas Misrahi':             '¡Hola Tomás! 🚀 Mirá qué hay para hoy',
  'Eugenio Marotta':           '¡Hola Eugenio! 💡 Tus tareas están listas',
};

// ── Acentos personalizados para notificaciones (key = nombre completo) ──
export const USER_NOTIFICATION_ACCENT = {
  // Comunicación
  'Agustina Ball':    { color: 'pink', emoji: '🎨', vibe: 'creativa' },
  'Victoria Colombo': { color: 'purple', emoji: '✨', vibe: 'lideresa' },
  'Delfina Palmero':  { color: 'fuchsia', emoji: '🖌️', vibe: 'metódica' },
  'Fatima Lacroze':   { color: 'rose', emoji: '💫', vibe: 'energética' },

  // Marketing
  'Alejandro Juan Sanguinetti': { color: 'blue', emoji: '📊', vibe: 'analítica' },
  'Felipe Señorans':            { color: 'cyan', emoji: '📈', vibe: 'estratégica' },
  'Francisco Capoulat':         { color: 'indigo', emoji: '🎯', vibe: 'ejecutora' },
  'Tomas Misrahi':              { color: 'sky', emoji: '🚀', vibe: 'innovadora' },
  'Eugenio Marotta':            { color: 'teal', emoji: '🌿', vibe: 'equilibrada' },
};

// ── Orden de prioridad de notificaciones por equipo ──
export const NOTIFICATION_PRIORITY = {
  comunicacion: ['assigned', 'overdue', 'soon', 'new', 'responsible'],
  marketing: ['assigned', 'overdue', 'soon', 'responsible', 'new'],
};

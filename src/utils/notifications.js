// ════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — Lógica pura de generación de notificaciones
// ════════════════════════════════════════════════════════════════════
// Función pura (sin React) que produce el array de notificaciones
// para un usuario dado, a partir del estado actual de las colecciones.
//
// Pura → fácil de testear con vitest (ver notifications.test.js).
//
// Enfoque (sep 2026): el Hub es la herramienta de quien COORDINA. El
// seguimiento persona por persona vive en el CRM, así que acá no hay
// notificaciones de "tu tarea individual". Lo que sí se avisa:
//
//   Nivel proyecto (service owner del webinar / evento / pilar):
//   3. responsible                — el proyecto está al X% y es en ≤ 3 días
//   4. team_overdue               — el proyecto tiene tareas / pasos atrasados
//   9. project_created_for_owner  — se creó un proyecto bajo tu responsabilidad (3 días)
//  10. new_comment                — comentario nuevo en tu pilar (3 días, no escrito por vos)
//  10b. mention                   — te etiquetaron con @ en un comentario (pilar o pedido)
//
//   Social Media:
//   5. new                        — pedido creado ≤ 3 días + sos owner (+ deadline vencido / próximo)
//   8. request_done_for_owner     — tu pedido fue marcado done (3 días)
//  12. world_day                  — día mundial próximo: aviso a la responsable de Social Media
//                                   desde 3 días hábiles antes hasta el día mismo
//
//   Eliminados (sep 2026, van por el CRM): subtareas individuales de
//   webinar/evento, tareas asignadas entre usuarios y el resumen diario.
// ════════════════════════════════════════════════════════════════════

import { AlertCircle, Clock, MessageCircle, Sparkles, User, CheckCircle2, Calendar } from 'lucide-react';
import { SERVICE_OWNERS as DEFAULT_SERVICE_OWNERS, PEOPLE } from '@/constants/team';
import { EVENT_PHASES } from '@/constants/events';
import { NOTIFICATION_TEMPLATES, NOTIFICATION_PRIORITY } from '@/constants/userNotifications';
import { calcProgress } from './progress';
import { WORLD_DAYS_NOTIFY_USER } from '@/constants/worldDays';
import { activeWorldDayNotices } from './worldDays';
import { formatDate, toIsoDate } from './date';

// Keys de las 21 sub-tareas del webinar (para contar atrasadas por proyecto)
const WEBINAR_TASK_KEYS = [
  'teamsGroup', 'testDay', 'bbdd', 'hubspot',
  'landingLivestorm', 'ppt', 'onePager',
  'lknAnuncio', 'lknReminder', 'lknHoy', 'lknPost',
  'mailPre1', 'mailPre2', 'mailPre3', 'mailPostAttended', 'mailPostNoShow',
  'bannerInv1', 'bannerInv2', 'bannerInv3', 'bannerPost', 'reporte',
];

/**
 * Construye las notificaciones para `currentUser` dado el estado de las colecciones.
 *
 * @param {Object|null} currentUser  team member del LoginScreen ({ name, team, ... })
 * @param {Object} data              { webinars, campaigns, events, requests, assignedTasks }
 * @param {Object} options           { now?: Date, peopleList?: string[] }
 *                                   - now: para tests (default: new Date())
 *                                   - peopleList: lista de nombres válidos (default: PEOPLE
 *                                     hardcodeado). Pasar la lista LIVE de team_members
 *                                     cuando se quiere validar contra Supabase.
 * @returns {Array} notifications ordenadas por prioridad del equipo
 */
export const buildNotifications = (currentUser, data, options = {}) => {
  if (!currentUser) return [];
  const peopleList = options.peopleList || PEOPLE;
  const SERVICE_OWNERS = options.serviceOwners || DEFAULT_SERVICE_OWNERS;
  if (!peopleList.includes(currentUser.name)) {
    // Usuario no es uno del equipo → nadie le matchea como owner → 0 notifs.
    return [];
  }

  const {
    webinars = [],
    campaigns = [],
    events = [],
    requests = [],
    // assignedTasks: ya no genera notificaciones (seguimiento individual → CRM)
  } = data || {};

  const now = options.now instanceof Date ? options.now : new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const in3Days = new Date(today); in3Days.setDate(in3Days.getDate() + 3);
  const last3Days = new Date(today); last3Days.setDate(last3Days.getDate() - 3);

  const userName = (currentUser.name || '').toUpperCase();
  const matchOwner = (o) => (o || '').toString().trim().toUpperCase() === userName;
  const sameName = (n) => (n || '').toString().trim().toLowerCase() === currentUser.name.toLowerCase();

  const userTeam = currentUser.team?.toLowerCase() === 'marketing' ? 'marketing' : 'comunicacion';
  const templates = NOTIFICATION_TEMPLATES[userTeam] || NOTIFICATION_TEMPLATES.comunicacion;
  const priority = NOTIFICATION_PRIORITY[userTeam] || NOTIFICATION_PRIORITY.comunicacion;

  const notifs = [];

  // ────────────────────────────────────────────────────────────────
  // 3. RESPONSIBLE — service owner con deadline cercano + progreso bajo
  //    "X está al 40% y es en 2 días"
  // ────────────────────────────────────────────────────────────────
  const whenLabel = (d) => {
    const diff = Math.round((d - today) / 86400000);
    if (diff <= 0) return 'es hoy';
    if (diff === 1) return 'es mañana';
    return `es en ${diff} días`;
  };
  webinars.forEach((w) => {
    const owner = w.serviceOwner || SERVICE_OWNERS.webinar;
    if (!matchOwner(owner)) return;
    const prog = calcProgress(w);
    if (prog >= 100) return;
    if (!w.mainDate) return;
    const d = new Date(w.mainDate + 'T00:00:00');
    if (d >= today && d <= in3Days && prog < 80) {
      const m = templates.responsible(prog, w.name, whenLabel(d));
      notifs.push({
        id: `resp-w-${w.id}`, type: 'responsible', icon: User, color: 'purple',
        title: m.title_long, shortTitle: m.title_short, emoji: m.emoji,
        project: w.name, source: 'Webinar', date: w.mainDate, navTo: 'campaigns',
      });
    }
  });
  events.forEach((ev) => {
    const owner = ev.serviceOwner || SERVICE_OWNERS.event;
    if (!matchOwner(owner)) return;
    if (!ev.date) return;
    const d = new Date(ev.date + 'T00:00:00');
    const all = [...Object.values(ev.tasks || {}), ...(ev.customTasks || [])];
    const prog = all.length ? Math.round(all.filter((t) => t.done).length / all.length * 100) : 0;
    if (prog >= 100) return;
    if (d >= today && d <= in3Days && prog < 80) {
      const m = templates.responsible(prog, ev.name, whenLabel(d));
      notifs.push({
        id: `resp-e-${ev.id}`, type: 'responsible', icon: User, color: 'purple',
        title: m.title_long, shortTitle: m.title_short, emoji: m.emoji,
        project: ev.name, source: 'Evento', date: ev.date, navTo: 'campaigns',
      });
    }
  });
  campaigns.forEach((c) => {
    if (c.variant === 'webinar') return;
    const owner = c.serviceOwner || SERVICE_OWNERS.campaign;
    if (!matchOwner(owner)) return;
    let total = 3;
    if (c.type === 'email') total = 13;
    const prog = total > 0 ? Math.round(((c.completedSteps || []).length / total) * 100) : 0;
    if (prog >= 100) return;
    const final = c.deadlines?.finalDelivery;
    if (!final) return;
    const d = new Date(final + 'T00:00:00');
    if (d >= today && d <= in3Days && prog < 80) {
      const m = templates.responsible(prog, c.name, whenLabel(d));
      notifs.push({
        id: `resp-c-${c.id}`, type: 'responsible', icon: User, color: 'purple',
        title: m.title_long, shortTitle: m.title_short, emoji: m.emoji,
        project: c.name, source: 'Campaña', date: final, navTo: 'campaigns',
      });
    }
  });

  // ────────────────────────────────────────────────────────────────
  // 4. TEAM_OVERDUE — sos service owner y tu proyecto tiene tareas atrasadas
  //    (asignadas a vos o a otros, no importa)
  // ────────────────────────────────────────────────────────────────
  const countOverdue = (taskList) => {
    let c = 0;
    taskList.forEach((t) => {
      if (!t || t.done || !t.date) return;
      const dd = new Date(t.date + 'T00:00:00');
      if (dd < today) c++;
    });
    return c;
  };
  webinars.forEach((w) => {
    const owner = w.serviceOwner || SERVICE_OWNERS.webinar;
    if (!matchOwner(owner)) return;
    if (calcProgress(w) >= 100) return;
    const sub = WEBINAR_TASK_KEYS.map((k) => w[k]);
    const n = countOverdue(sub);
    if (n > 0) {
      notifs.push({
        id: `team-overdue-w-${w.id}`, type: 'responsible', icon: AlertCircle, color: 'purple',
        title: `Tu proyecto "${w.name}" tiene ${n} tarea${n > 1 ? 's' : ''} atrasada${n > 1 ? 's' : ''}`,
        shortTitle: `⚠️ ${n} atrasada${n > 1 ? 's' : ''} en ${w.name}`,
        emoji: '⚠️', project: w.name, source: 'Webinar', date: w.mainDate, navTo: 'campaigns',
      });
    }
  });
  events.forEach((ev) => {
    const owner = ev.serviceOwner || SERVICE_OWNERS.event;
    if (!matchOwner(owner)) return;
    const all = [...Object.values(ev.tasks || {}), ...(ev.customTasks || [])];
    const n = countOverdue(all);
    if (n > 0) {
      notifs.push({
        id: `team-overdue-e-${ev.id}`, type: 'responsible', icon: AlertCircle, color: 'purple',
        title: `Tu evento "${ev.name}" tiene ${n} tarea${n > 1 ? 's' : ''} atrasada${n > 1 ? 's' : ''}`,
        shortTitle: `⚠️ ${n} atrasada${n > 1 ? 's' : ''} en ${ev.name}`,
        emoji: '⚠️', project: ev.name, source: 'Evento', date: ev.date, navTo: 'campaigns',
      });
    }
  });

  campaigns.forEach((c) => {
    if (c.variant === 'webinar') return;
    const owner = c.serviceOwner || SERVICE_OWNERS.campaign;
    if (!matchOwner(owner)) return;
    const byStep = c.deadlines?.byStep || {};
    const done = new Set(c.completedSteps || []);
    let n = 0;
    Object.entries(byStep).forEach(([stepId, iso]) => {
      if (!iso || done.has(stepId)) return;
      const dd = new Date(iso + 'T00:00:00');
      if (!isNaN(dd.getTime()) && dd < today) n++;
    });
    if (n > 0) {
      notifs.push({
        id: `team-overdue-c-${c.id}`, type: 'responsible', icon: AlertCircle, color: 'purple',
        title: `Tu campaña "${c.name}" tiene ${n} paso${n > 1 ? 's' : ''} atrasado${n > 1 ? 's' : ''}`,
        shortTitle: `⚠️ ${n} atrasado${n > 1 ? 's' : ''} en ${c.name}`,
        emoji: '⚠️', project: c.name, source: 'Campaña', date: c.deadlines?.finalDelivery || '', navTo: 'campaigns',
      });
    }
  });

  // ────────────────────────────────────────────────────────────────
  // 5. NEW — Pedido de Social Media asignado, creado en últimos 3 días
  //    + overdue/soon de deadline del pedido
  // ────────────────────────────────────────────────────────────────
  requests.forEach((r) => {
    if (r.status === 'done') return;
    if (!matchOwner(r.owner)) return;
    const created = r.createdAt ? new Date(r.createdAt) : null;
    if (created && created >= last3Days) {
      const m = templates.new_request(r.name);
      notifs.push({
        id: `new-s-${r.id}`, type: 'new', icon: Sparkles, color: 'pink',
        title: m.title_long, shortTitle: m.title_short, emoji: m.emoji,
        project: r.name, source: 'Social Media', date: r.deadline || '', navTo: 'content',
      });
    }
    if (r.deadline) {
      const d = new Date(r.deadline + 'T00:00:00');
      if (d < today) {
        const m = templates.overdue_task('Pedido', r.name);
        notifs.push({
          id: `overdue-s-${r.id}`, type: 'overdue', icon: AlertCircle, color: 'red',
          title: m.title_long, shortTitle: m.title_short, emoji: m.emoji,
          project: r.name, source: 'Social Media', date: r.deadline, navTo: 'content',
        });
      } else if (d <= in3Days) {
        const m = templates.soon_task('Pedido', r.name);
        notifs.push({
          id: `soon-s-${r.id}`, type: 'soon', icon: Clock, color: 'amber',
          title: m.title_long, shortTitle: m.title_short, emoji: m.emoji,
          project: r.name, source: 'Social Media', date: r.deadline, navTo: 'content',
        });
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // 8. NUEVO — Tu pedido de Social Media fue marcado como done (3 días)
  // ────────────────────────────────────────────────────────────────
  requests.forEach((r) => {
    if (r.status !== 'done') return;
    if (!matchOwner(r.owner)) return;
    const c = r.completedAt ? new Date(r.completedAt) : null;
    if (!c || c < last3Days) return;
    notifs.push({
      id: `request-done-${r.id}`, type: 'new', icon: CheckCircle2, color: 'emerald',
      title: `Pedido entregado: "${r.name}"`,
      shortTitle: `✅ "${r.name}" listo`,
      emoji: '✅', project: r.name, source: 'Social Media', date: r.completedAt, navTo: 'content',
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 9. NUEVO — Proyecto recién creado bajo tu responsabilidad (3 días)
  // ────────────────────────────────────────────────────────────────
  const isFresh = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= last3Days;
  };
  webinars.forEach((w) => {
    const owner = w.serviceOwner || SERVICE_OWNERS.webinar;
    if (!matchOwner(owner)) return;
    if (!isFresh(w.createdAt)) return;
    notifs.push({
      id: `new-project-w-${w.id}`, type: 'new', icon: Calendar, color: 'pink',
      title: `Nuevo webinar bajo tu responsabilidad: "${w.name}"`,
      shortTitle: `📅 Nuevo: ${w.name}`,
      emoji: '📅', project: w.name, source: 'Webinar', date: w.createdAt, navTo: 'campaigns',
    });
  });
  events.forEach((ev) => {
    const owner = ev.serviceOwner || SERVICE_OWNERS.event;
    if (!matchOwner(owner)) return;
    if (!isFresh(ev.createdAt)) return;
    notifs.push({
      id: `new-project-e-${ev.id}`, type: 'new', icon: Calendar, color: 'pink',
      title: `Nuevo evento bajo tu responsabilidad: "${ev.name}"`,
      shortTitle: `📅 Nuevo: ${ev.name}`,
      emoji: '📅', project: ev.name, source: 'Evento', date: ev.createdAt, navTo: 'campaigns',
    });
  });
  campaigns.forEach((c) => {
    if (c.variant === 'webinar') return; // estas se crean junto al webinar — evitar doble notif
    const owner = c.serviceOwner || SERVICE_OWNERS.campaign;
    if (!matchOwner(owner)) return;
    if (!isFresh(c.createdAt)) return;
    notifs.push({
      id: `new-project-c-${c.id}`, type: 'new', icon: Calendar, color: 'pink',
      title: `Nueva campaña bajo tu responsabilidad: "${c.name}"`,
      shortTitle: `📅 Nuevo: ${c.name}`,
      emoji: '📅', project: c.name, source: 'Campaña', date: c.createdAt, navTo: 'campaigns',
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 10. NUEVO — Comentarios nuevos en tu campaña (3 días, no escritos por vos)
  // ────────────────────────────────────────────────────────────────
  campaigns.forEach((c) => {
    const owner = c.serviceOwner || SERVICE_OWNERS.campaign;
    if (!matchOwner(owner)) return;
    const comments = c.comments || [];
    if (comments.length === 0) return;
    // El último comentario
    const last = comments[comments.length - 1];
    if (!last || !last.date) return;
    if (sameName(last.author)) return; // No notificar mis propios comentarios
    const d = new Date(last.date);
    if (d < last3Days) return;
    notifs.push({
      id: `comment-c-${c.id}-${last.id || last.date}`, type: 'new', icon: MessageCircle, color: 'blue',
      title: `${last.author || 'Alguien'} comentó en "${c.name}"`,
      shortTitle: `💬 Comentario en ${c.name}`,
      emoji: '💬', project: c.name, source: 'Campaña', date: last.date, navTo: 'campaigns',
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 10.b NUEVO — @menciones en comentarios (campañas + pedidos)
  //   Si alguien te etiquetó con "@Tu Nombre" en un comentario reciente
  //   (últimos 3 días) y no lo escribiste vos → notificación.
  // ────────────────────────────────────────────────────────────────
  const mentionTag = `@${currentUser.name}`.toLowerCase();
  const isMentioned = (text) => (text || '').toLowerCase().includes(mentionTag);
  const recentEnough = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= last3Days;
  };

  campaigns.forEach((c) => {
    (c.comments || []).forEach((cm) => {
      if (!isMentioned(cm.text)) return;
      if (sameName(cm.author)) return;
      if (!recentEnough(cm.date)) return;
      notifs.push({
        id: `mention-c-${c.id}-${cm.id || cm.date}`, type: 'assigned', icon: MessageCircle, color: 'cyan',
        title: `${cm.author || 'Alguien'} te etiquetó en "${c.name}"`,
        shortTitle: `💬 Te etiquetaron en ${c.name}`,
        emoji: '💬', project: c.name, source: 'Campaña', date: cm.date, navTo: 'campaigns',
      });
    });
  });

  requests.forEach((r) => {
    const comments = (r.content && r.content.comments) || [];
    comments.forEach((cm) => {
      if (!isMentioned(cm.text)) return;
      if (sameName(cm.author)) return;
      if (!recentEnough(cm.timestamp || cm.date)) return;
      notifs.push({
        id: `mention-r-${r.id}-${cm.id || cm.timestamp || cm.date}`, type: 'assigned', icon: MessageCircle, color: 'cyan',
        title: `${cm.author || 'Alguien'} te etiquetó en "${r.name}"`,
        shortTitle: `💬 Te etiquetaron en ${r.name}`,
        emoji: '💬', project: r.name, source: 'Social Media', date: cm.timestamp || cm.date, navTo: 'content',
      });
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 12. WORLD_DAY — día mundial próximo (calendario de Social Media)
  //     Solo para la responsable configurada en WORLD_DAYS_NOTIFY_USER.
  //     Aparece desde 3 días hábiles antes hasta el día mismo.
  // ────────────────────────────────────────────────────────────────
  const notifyUser = options.worldDaysNotifyUser || WORLD_DAYS_NOTIFY_USER;
  if (sameName(notifyUser)) {
    const todayIso = toIsoDate(today);
    activeWorldDayNotices(todayIso, options.worldDays).forEach((d) => {
      const when = d.daysLeft === 0 ? 'es hoy' : d.daysLeft === 1 ? 'es mañana' : `es en ${d.daysLeft} días`;
      const themeLabel = d.themeInfo?.label || d.theme;
      notifs.push({
        id: `world-day-${d.id}-${d.date}`, type: 'world_day', icon: Calendar, color: 'pink',
        title: `${d.name} ${when} (${formatDate(d.date)}). Preparar contenido para redes.`,
        shortTitle: `📅 ${d.name}`,
        emoji: '📅', project: `Temática: ${themeLabel}`, source: 'Social Media', date: d.date,
        navTo: 'content', navTab: 'calendario',
      });
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Dedup + ordenar por prioridad de equipo
  // ────────────────────────────────────────────────────────────────
  const seen = new Set();
  const orderMap = {};
  priority.forEach((type, idx) => { orderMap[type] = idx; });

  return notifs.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  }).sort((a, b) => {
    const ao = orderMap[a.type] !== undefined ? orderMap[a.type] : 99;
    const bo = orderMap[b.type] !== undefined ? orderMap[b.type] : 99;
    return ao - bo;
  });
};

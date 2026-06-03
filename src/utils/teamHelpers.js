// ════════════════════════════════════════════════════════════════════
// TEAM HELPERS — Derivar service owners, greetings y acentos
// ════════════════════════════════════════════════════════════════════
// Dado un array de team members (live, viene de useTeam), produce las
// estructuras que antes vivían hardcodeadas en constants/team.js y
// constants/userNotifications.js.
//
// Si el dato no está en la DB (campo NULL o columna no existe), cae
// a los defaults estáticos. Así la app sigue funcionando aunque la
// tabla esté vacía o no tenga columnas extra.
// ════════════════════════════════════════════════════════════════════

import { SERVICE_OWNERS as DEFAULT_SERVICE_OWNERS } from '@/constants/team';
import {
  USER_GREETINGS as DEFAULT_GREETINGS,
  USER_NOTIFICATION_ACCENT as DEFAULT_ACCENTS,
} from '@/constants/userNotifications';

/**
 * Deriva un mapping {webinar, event, campaign, standalone} → nombre del owner.
 * Toma de team_members.service_owner_for. Si nadie tiene un servicio
 * asignado, cae al default de constants.
 *
 * @param {Array} team  output de useTeam().team
 * @returns {{ webinar: string, event: string, campaign: string, standalone: string }}
 */
export const deriveServiceOwners = (team) => {
  const result = { ...DEFAULT_SERVICE_OWNERS };
  if (!Array.isArray(team)) return result;

  // Por cada tipo de servicio, encontrar el primer miembro que lo lidere
  const types = ['webinar', 'event', 'campaign', 'standalone'];
  types.forEach((t) => {
    const member = team.find(
      (m) => Array.isArray(m.serviceOwnerFor) && m.serviceOwnerFor.includes(t),
    );
    if (member) result[t] = member.name;
  });
  return result;
};

/**
 * Devuelve el saludo personalizado para un usuario.
 * Cae al default de USER_GREETINGS si no está en la DB.
 */
export const getGreeting = (team, userName) => {
  if (!userName) return '';
  if (Array.isArray(team)) {
    const member = team.find((m) => m.name === userName);
    if (member && member.greeting) return member.greeting;
  }
  return DEFAULT_GREETINGS[userName] || `¡Hola ${userName}!`;
};

/**
 * Devuelve el acento { color, emoji, vibe } para un usuario.
 * Cae al default de USER_NOTIFICATION_ACCENT si no está en la DB.
 */
export const getAccent = (team, userName) => {
  if (!userName) return null;
  if (Array.isArray(team)) {
    const member = team.find((m) => m.name === userName);
    if (member && (member.accentColor || member.accentEmoji || member.accentVibe)) {
      return {
        color: member.accentColor || DEFAULT_ACCENTS[userName]?.color || 'slate',
        emoji: member.accentEmoji || DEFAULT_ACCENTS[userName]?.emoji || '🌟',
        vibe:  member.accentVibe  || DEFAULT_ACCENTS[userName]?.vibe  || 'profesional',
      };
    }
  }
  return DEFAULT_ACCENTS[userName] || null;
};

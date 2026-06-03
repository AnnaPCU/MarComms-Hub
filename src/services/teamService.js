// ════════════════════════════════════════════════════════════════════
// TEAM SERVICE — Miembros del equipo (tabla `public.team_members`)
// ════════════════════════════════════════════════════════════════════
// Lee desde Supabase. Si la tabla está vacía o falla (no existe,
// problema de red, etc.), devuelve los defaults de constants/team.js.
//
// Esto permite que la app SIEMPRE funcione, y que Anna pueda
// gestionar el equipo desde el Dashboard de Supabase sin redeploy.
//
// Columnas esperadas (defensivo: usa lo que esté disponible):
//   - name              : text  (obligatorio — clave de matching con defaults)
//   - team              : text  ('Comunicación' | 'Marketing')
//   - area              : text  ('comunicacion' | 'marketing')
//   - role              : text
//   - color             : text  (clases Tailwind para el gradient avatar)
//   - email             : text
//   - greeting          : text   (futuro: saludo personalizado)
//   - accent_color      : text   (futuro: USER_NOTIFICATION_ACCENT.color)
//   - accent_emoji      : text
//   - accent_vibe       : text
//   - service_owner_for : text[] (futuro: ['webinar', 'event', ...] o tabla aparte)
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';
import { TEAM_MEMBERS as DEFAULTS } from '@/constants/team';

const TABLE = 'team_members';

// Mapeo defensivo: si una columna no viene de la DB, usa el default
// del miembro homónimo en constants/team.js. Permite incrementar el
// schema de Supabase de a poco sin romper la app.
export const fromRow = (row) => {
  if (!row || !row.name) return null;
  const fallback = DEFAULTS.find((m) => m.name === row.name) || {};
  const team = row.team || fallback.team || 'Marketing';
  return {
    name:  row.name,
    team,
    role:  row.role || fallback.role || '',
    color: row.color || fallback.color || 'from-slate-500 to-slate-600',
    area:  row.area || (team === 'Comunicación' ? 'comunicacion' : 'marketing'),
    email: row.email || null,
    // Campos opcionales (sólo se exponen si existen en la DB)
    greeting:        row.greeting        ?? null,
    accentColor:     row.accent_color    ?? null,
    accentEmoji:     row.accent_emoji    ?? null,
    accentVibe:      row.accent_vibe     ?? null,
    serviceOwnerFor: row.service_owner_for ?? null,
  };
};

/**
 * Lista los miembros del equipo.
 * Devuelve `DEFAULTS` si la tabla está vacía o falla.
 */
export const listTeamMembers = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      // Tabla vacía → defaults
      return DEFAULTS;
    }
    return data.map(fromRow).filter(Boolean);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[teamService] usando defaults — Supabase team_members no accesible:', e.message);
    return DEFAULTS;
  }
};

/**
 * Subscribe a cambios. Devuelve unsubscribe. No-op si falla.
 */
export const subscribeTeamMembers = (onChange) => {
  try {
    const channel = supabase
      .channel('team-members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        (payload) => onChange(payload),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  } catch (_e) {
    return () => {};
  }
};

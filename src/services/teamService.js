// ════════════════════════════════════════════════════════════════════
// TEAM SERVICE — Miembros del equipo (tabla `public.team_members`)
// ════════════════════════════════════════════════════════════════════
// Lee desde Supabase. Si la tabla está vacía o falla (no existe,
// problema de red, etc.), devuelve los defaults de constants/team.js.
//
// Esto permite que la app SIEMPRE funcione, y que Anna pueda
// gestionar el equipo desde el Dashboard de Supabase sin redeploy.
//
// Columnas que esta service entiende (todas opcionales — usa lo disponible):
//   - name              : text  (obligatorio — clave de matching con defaults)
//   - profile_key       : text  (slug, ej. 'agus')
//   - initials          : text  (1-2 letras para avatar)
//   - role              : text  ← código de equipo: 'Comms' | 'MKT' (o
//                                  literal 'Comunicación' | 'Marketing' por
//                                  compatibilidad)
//   - team              : text  (opcional, si en el futuro se agrega esta columna)
//   - area              : text  (opcional)
//   - color             : text  (clases Tailwind del gradient avatar)
//   - active            : bool  (rows con active=false se filtran)
//   - email             : text
//   - greeting          : text
//   - accent_color      : text
//   - accent_emoji      : text
//   - accent_vibe       : text
//   - service_owner_for : text[]
//
// Mapping de role (DB) → team (UI):
//   'Comms'        → 'Comunicación'
//   'MKT'          → 'Marketing'
//   'Comunicación' → 'Comunicación' (literal, por compat)
//   'Marketing'    → 'Marketing' (literal, por compat)
// ════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabaseClient';
import { TEAM_MEMBERS as DEFAULTS } from '@/constants/team';

const TABLE = 'team_members';

// Traduce el role code de la DB ('Comms'/'MKT') al nombre completo del team.
// Acepta también el nombre completo por compatibilidad.
const teamFromRole = (role) => {
  if (!role) return null;
  const r = role.toString().trim().toLowerCase();
  if (r === 'comms' || r === 'comunicación' || r === 'comunicacion') return 'Comunicación';
  if (r === 'mkt' || r === 'marketing') return 'Marketing';
  return null;
};

// Mapeo defensivo: si una columna no viene de la DB, usa el default
// del miembro homónimo en constants/team.js. Permite incrementar el
// schema de Supabase de a poco sin romper la app.
export const fromRow = (row) => {
  if (!row || !row.name) return null;
  // Filtrar inactivos (si la columna existe y es false)
  if (row.active === false) return null;

  const fallback = DEFAULTS.find((m) => m.name === row.name) || {};

  // Derivar team: prioridad row.team → role code → fallback constants
  const team = row.team || teamFromRole(row.role) || fallback.team || 'Marketing';
  const area = row.area || (team === 'Comunicación' ? 'comunicacion' : 'marketing');

  return {
    name:       row.name,
    team,
    area,
    // role en el shape de la app es el job title — siempre del fallback.
    // El "role code" original de la DB se expone aparte como teamCode.
    role:       fallback.role || (team === 'Comunicación' ? 'Content & Design' : 'Marketing'),
    teamCode:   row.role || (team === 'Comunicación' ? 'Comms' : 'MKT'),
    color:      row.color || fallback.color || 'from-slate-500 to-slate-600',
    profileKey: row.profile_key || row.name.toLowerCase(),
    initials:   row.initials || row.name.charAt(0).toUpperCase(),
    email:      row.email || null,
    active:     row.active !== false,
    // Campos opcionales
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

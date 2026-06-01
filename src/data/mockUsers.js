// ════════════════════════════════════════════════════════════════════
// MOCK USERS — Usuarios del equipo (mock, futuro tabla team_members)
// ════════════════════════════════════════════════════════════════════
// Esta data hoy vive en src/constants/team.js para uso UI/constantes.
// Acá la re-exponemos en un shape de "tabla" — pensado para que
// el día que migremos a Supabase, el contrato del servicio no cambie.
//
// Cada user tiene:
//   - id        : string estable (slug del name en minúsculas)
//   - name      : "Agus", "Vicky", ...
//   - team      : "Comunicación" | "Marketing"
//   - area      : "comunicacion" | "marketing"  (clave para notifications)
//   - role      : "Content & Design" | "Marketing"
//   - email     : <name>@controlunion.com (placeholder hasta auth real)
//   - color     : gradiente Tailwind para avatars/cards
// ════════════════════════════════════════════════════════════════════

import { TEAM_MEMBERS } from '@/constants/team';

const areaFromTeam = (team) =>
  team === 'Comunicación' ? 'comunicacion' : 'marketing';

const slug = (name) => name.toLowerCase().replace(/\s+/g, '-');

export const MOCK_USERS = TEAM_MEMBERS.map((m) => ({
  id: slug(m.name),
  name: m.name,
  team: m.team,
  area: areaFromTeam(m.team),
  role: m.role,
  email: `${slug(m.name)}@controlunion.com`,
  color: m.color,
}));

// ── Helpers ──
export const getUserByName = (name) => MOCK_USERS.find((u) => u.name === name) || null;
export const getUserById = (id) => MOCK_USERS.find((u) => u.id === id) || null;
export const getUsersByArea = (area) => MOCK_USERS.filter((u) => u.area === area);

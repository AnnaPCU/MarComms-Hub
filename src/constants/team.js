// ════════════════════════════════════════════════════════════════════
// TEAM MEMBERS — Equipo de Marketing & Comunicaciones
// ════════════════════════════════════════════════════════════════════
// 9 miembros totales: 4 Comunicación + 5 Marketing
// Cada uno tiene un gradient único para sus avatars/cards.
// ════════════════════════════════════════════════════════════════════

export const TEAM_MEMBERS = [
  // ── Comunicación (DESIGNERS) ──
  { name: 'Agus',  team: 'Comunicación', role: 'Content & Design', color: 'from-pink-500 to-rose-500' },
  { name: 'Vicky', team: 'Comunicación', role: 'Content & Design', color: 'from-purple-500 to-pink-500' },
  { name: 'Delfi', team: 'Comunicación', role: 'Content & Design', color: 'from-fuchsia-500 to-purple-500' },
  { name: 'Fati',  team: 'Comunicación', role: 'Content & Design', color: 'from-rose-500 to-orange-500' },
  // ── Marketing (MARCOMMS) ──
  { name: 'Ale',   team: 'Marketing',    role: 'Marketing',        color: 'from-blue-500 to-cyan-500' },
  { name: 'Felo',  team: 'Marketing',    role: 'Marketing',        color: 'from-cyan-500 to-teal-500' },
  { name: 'Fran',  team: 'Marketing',    role: 'Marketing',        color: 'from-indigo-500 to-blue-500' },
  { name: 'Tomi',  team: 'Marketing',    role: 'Marketing',        color: 'from-sky-500 to-blue-500' },
  { name: 'Boli',  team: 'Marketing',    role: 'Marketing',        color: 'from-teal-500 to-emerald-500' },
];

// ── Derivados ──
// DESIGNERS: los 4 de Comunicación (asignan/diseñan piezas de contenido)
export const DESIGNERS = TEAM_MEMBERS.filter(m => m.team === 'Comunicación').map(m => m.name);

// MARCOMMS: los 5 de Marketing
export const MARCOMMS = TEAM_MEMBERS.filter(m => m.team === 'Marketing').map(m => m.name);

// PEOPLE: todos los miembros (lista plana de nombres)
export const PEOPLE = TEAM_MEMBERS.map(m => m.name);

// ── Service owners (líder del servicio, no de cada tarea) ──
export const SERVICE_OWNERS = {
  webinar: 'Vicky',
  event: 'Vicky',
  campaign: 'Felo',
  standalone: 'Agus', // pedidos del Content Hub
};

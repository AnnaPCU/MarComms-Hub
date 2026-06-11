// ════════════════════════════════════════════════════════════════════
// TEAM MEMBERS — Equipo de Marketing & Comunicaciones
// ════════════════════════════════════════════════════════════════════
// 9 miembros totales: 4 Comunicación + 5 Marketing
// Cada uno tiene un gradient único para sus avatars/cards.
// ════════════════════════════════════════════════════════════════════

// IMPORTANTE: `name` es el identificador interno (owner de tareas,
// responsables, matching de notificaciones). Desde junio 2026 se usa
// el nombre y apellido completo. `short` queda como referencia del
// alias histórico (para migración de datos viejos en Supabase).
export const TEAM_MEMBERS = [
  // ── Comunicación (DESIGNERS) ──
  { name: 'Agustina Ball',              short: 'Agus',  team: 'Comunicación', role: 'Content & Design', color: 'from-pink-500 to-rose-500' },
  { name: 'Victoria Colombo',           short: 'Vicky', team: 'Comunicación', role: 'Content & Design', color: 'from-purple-500 to-pink-500' },
  { name: 'Delfina Palmero',            short: 'Delfi', team: 'Comunicación', role: 'Content & Design', color: 'from-fuchsia-500 to-purple-500' },
  { name: 'Fatima Lacroze',             short: 'Fati',  team: 'Comunicación', role: 'Content & Design', color: 'from-rose-500 to-orange-500' },
  // ── Marketing (MARCOMMS) ──
  { name: 'Alejandro Juan Sanguinetti', short: 'Ale',   team: 'Marketing',    role: 'Marketing',        color: 'from-blue-500 to-cyan-500' },
  { name: 'Felipe Señorans',            short: 'Felo',  team: 'Marketing',    role: 'Marketing',        color: 'from-cyan-500 to-teal-500' },
  { name: 'Francisco Capoulat',         short: 'Fran',  team: 'Marketing',    role: 'Marketing',        color: 'from-indigo-500 to-blue-500' },
  { name: 'Tomas Misrahi',              short: 'Tomi',  team: 'Marketing',    role: 'Marketing',        color: 'from-sky-500 to-blue-500' },
  { name: 'Eugenio Marotta',            short: 'Boli',  team: 'Marketing',    role: 'Marketing',        color: 'from-teal-500 to-emerald-500' },
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
  webinar: 'Victoria Colombo',
  event: 'Victoria Colombo',
  campaign: 'Felipe Señorans',
  standalone: 'Agustina Ball', // pedidos del Content Hub
};

// ── Mapeo alias histórico (corto) → nombre completo ──
// Para migrar datos viejos y reconocer owners cargados antes del cambio.
export const SHORT_TO_FULL = TEAM_MEMBERS.reduce((acc, m) => {
  if (m.short) {
    acc[m.short] = m.name;
    acc[m.short.toUpperCase()] = m.name;
  }
  return acc;
}, {});

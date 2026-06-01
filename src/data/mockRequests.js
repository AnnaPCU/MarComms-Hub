// ════════════════════════════════════════════════════════════════════
// MOCK REQUESTS — Pedidos del Content Hub (mock, futuro standalone_requests)
// ════════════════════════════════════════════════════════════════════
// Re-export de DEMO_STANDALONES con el nombre "Request" alineado al
// shape que usará Supabase. Se mantiene back-compat: cualquier import
// de DEMO_STANDALONES sigue funcionando — este archivo es el nuevo
// punto de entrada "oficial" para la capa de servicios.
// ════════════════════════════════════════════════════════════════════

import { DEMO_STANDALONES } from './demoStandalones';

export const MOCK_REQUESTS = DEMO_STANDALONES;

// ── Re-export compat ──
export { DEMO_STANDALONES };

// ════════════════════════════════════════════════════════════════════
// SEED — Punto único de entrada de la data inicial mockeada
// ════════════════════════════════════════════════════════════════════
// Centraliza todos los MOCK_* exports para que la capa de servicios
// y los hooks tengan un único origen.
//
// Cuando migremos a Supabase:
//   - este archivo se vuelve opcional (solo para `npm run seed`)
//   - los servicios apuntan a la DB en lugar de a estos arrays
// ════════════════════════════════════════════════════════════════════

import { MOCK_USERS } from './mockUsers';
import { MOCK_REQUESTS } from './mockRequests';
import { MOCK_TASKS } from './mockTasks';
import { MOCK_CAMPAIGNS } from './mockCampaigns';
import { MOCK_WEBINARS } from './mockWebinars';
import { MOCK_EVENTS } from './mockEvents';
import { MOCK_COMMENTS } from './mockComments';
import { MOCK_FILES } from './mockFiles';

export const SEED = {
  users:     MOCK_USERS,
  requests:  MOCK_REQUESTS,
  tasks:     MOCK_TASKS,
  campaigns: MOCK_CAMPAIGNS,
  webinars:  MOCK_WEBINARS,
  events:    MOCK_EVENTS,
  comments:  MOCK_COMMENTS,
  files:     MOCK_FILES,
};

// Re-exports individuales por conveniencia
export {
  MOCK_USERS,
  MOCK_REQUESTS,
  MOCK_TASKS,
  MOCK_CAMPAIGNS,
  MOCK_WEBINARS,
  MOCK_EVENTS,
  MOCK_COMMENTS,
  MOCK_FILES,
};

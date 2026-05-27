// ════════════════════════════════════════════════════════════════════
// DEMO WEBINARS — Data inicial (mock, futuro seed Supabase)
// ════════════════════════════════════════════════════════════════════
// 2 webinars activos:
//   1001 - ISO 9001 ESPAÑA (CU Certificaciones)
//   1002 - ISO 27001 LATAM (Control Union Argentina)
//
// Ambos están linkeados a sus campañas correspondientes:
//   1001 → campaign 2101
//   1002 → campaign 2102
//
// Estructura de cada webinar: 21 tareas distribuidas en:
//   - Operativas (4): teamsGroup, testDay, bbdd, hubspot
//   - Contenido (12): landing, ppt, onePager, 4 LinkedIn posts, 4 banners
//   - Mailings (5): Pre-1, Pre-2, Pre-3, Post Attended, Post No-Show
// ════════════════════════════════════════════════════════════════════

import { makeWebinar } from '@/utils/webinar';

export const DEMO_WEBINARS = [
  {
    ...makeWebinar('ISO 9001 ESPAÑA', '2026-05-18', 'Control Union', '0', 'España', 'CU Certificaciones'),
    id: 1001,
    linkedCampaignId: 2101,
    serviceOwner: 'Vicky',
  },
  {
    ...makeWebinar('ISO 27001 LATAM', '2026-05-18', 'Control Union', '0', 'Argentina', 'CU Certificaciones'),
    id: 1002,
    linkedCampaignId: 2102,
    serviceOwner: 'Vicky',
  },
];

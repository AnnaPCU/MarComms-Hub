// ════════════════════════════════════════════════════════════════════
// DEMO CAMPAIGNS — Data inicial (mock, futuro seed Supabase)
// ════════════════════════════════════════════════════════════════════
// 4 campañas:
//   - 2001 FORESTRY (email standalone)
//   - 2002 TURISMO (email standalone)
//   - 2101 Linkeada a webinar 1001 (ISO 9001 ESPAÑA)
//   - 2102 Linkeada a webinar 1002 (ISO 27001 LATAM)
//
// IMPORTANTE: las campañas linkeadas a webinars tienen `variant: 'webinar'`
// y se sincronizan automáticamente con su webinar via mappings en
// constants/webinar.js (WEBINAR_MAIL_TO_STEP)
// ════════════════════════════════════════════════════════════════════

export const DEMO_CAMPAIGNS = [
  // ── Campañas standalone (email) ──
  {
    id: 2001,
    type: 'email',
    name: 'FORESTRY',
    budget: 0,
    businessUnit: 'CU Certificaciones',
    country: 'Canada',
    serviceOwner: 'Felo',
    numEmails: 3,
    data: {
      requester: 'Control Union Canada',
      senderEmail: '',
      tag: 'FORESTRY-2026',
      dates: ['', '', ''],
      contents: [
        { subject: '', message: '', cta: '', link: '', banner: '' },
        { subject: '', message: '', cta: '', link: '', banner: '' },
        { subject: '', message: '', cta: '', link: '', banner: '' },
      ],
    },
    completedSteps: ['req', 'num'],
    dealsCreated: 0,
    comments: [],
    report: null,
  },
  {
    id: 2002,
    type: 'email',
    name: 'TURISMO',
    budget: 0,
    businessUnit: 'CU Certificaciones',
    country: 'Mexico',
    serviceOwner: 'Felo',
    numEmails: 3,
    data: {
      requester: 'Control Union Mexico',
      senderEmail: '',
      tag: 'TURISMO-2026',
      dates: ['', '', ''],
      contents: [
        { subject: '', message: '', cta: '', link: '', banner: '' },
        { subject: '', message: '', cta: '', link: '', banner: '' },
        { subject: '', message: '', cta: '', link: '', banner: '' },
      ],
    },
    completedSteps: ['req', 'num'],
    dealsCreated: 0,
    comments: [],
    report: null,
  },

  // ── Campañas linkeadas a webinars (auto-creadas) ──
  {
    id: 2101,
    type: 'email',
    variant: 'webinar',
    linkedWebinarId: 1001,
    name: 'WEBINAR - ISO 9001 ESPAÑA',
    budget: 0,
    businessUnit: 'CU Certificaciones',
    country: 'España',
    numEmails: 5,
    completedSteps: [],
    completedAt: null,
    comments: [],
    data: {
      requester: 'Control Union',
      tag: '',
      senderEmail: '',
      contents: [],
      dates: ['2026-05-04', '2026-05-11', '2026-05-17', '2026-05-19', '2026-05-19'],
      extras: [],
    },
  },
  {
    id: 2102,
    type: 'email',
    variant: 'webinar',
    linkedWebinarId: 1002,
    name: 'WEBINAR - ISO 27001 LATAM',
    budget: 0,
    businessUnit: 'CU Certificaciones',
    country: 'Argentina',
    numEmails: 5,
    completedSteps: [],
    completedAt: null,
    comments: [],
    data: {
      requester: 'Control Union',
      tag: '',
      senderEmail: '',
      contents: [],
      dates: ['2026-05-04', '2026-05-11', '2026-05-17', '2026-05-19', '2026-05-19'],
      extras: [],
    },
  },
];

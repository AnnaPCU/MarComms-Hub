// ════════════════════════════════════════════════════════════════════
// DEMO STANDALONES — Pedidos del Content Hub (data inicial)
// ════════════════════════════════════════════════════════════════════
// 4 pedidos:
//   9001 - One Pager (Argentina, CU Certificaciones, Agus, in_progress)
//   9002 - Branding kit (Argentina, Control Union, Fati, pending)
//   9003 - Video institucional (USA, Peterson, Delfi, DONE)
//   9004 - Landing Brasil (Brasil, CU Certificaciones, Vicky, DONE)
//
// Los DONE se incluyen para demo de Facturación / Países (totales del mes).
// ════════════════════════════════════════════════════════════════════

export const DEMO_STANDALONES = [
  {
    id: 9001,
    name: 'One Pager — Producto Sostenibilidad Premium',
    category: 'one_pager',
    country: 'Argentina',
    businessUnit: 'CU Certificaciones',
    requester: 'Comercial LATAM',
    budget: 800,
    detail: 'One pager de 1 carilla A4 para presentar el producto a nuevos prospects en feria.',
    owner: 'Agus',
    status: 'in_progress',
    content: { comments: [], files: [] },
    createdAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 9002,
    name: 'Branding kit — Oficina Buenos Aires',
    category: 'branding',
    country: 'Argentina',
    businessUnit: 'Control Union',
    requester: 'RRHH',
    budget: 2400,
    detail: 'Tazas, cuadernos y carteles para la nueva oficina. Aplicar paleta CU 2026.',
    owner: 'Fati',
    status: 'pending',
    content: { comments: [], files: [] },
    createdAt: '2026-04-15T10:00:00.000Z',
  },
  // ── Pedidos cobrados del mes (demo facturación / países) ──
  {
    id: 9003,
    name: 'Video institucional — Cliente Top USA',
    category: 'video',
    country: 'USA',
    businessUnit: 'Peterson',
    requester: 'Marketing USA',
    budget: 3500,
    detail: 'Video corporativo de 60 segundos con resultados, testimonio y data del cliente.',
    owner: 'Delfi',
    status: 'done',
    completedAt: new Date().toISOString(),
    content: { comments: [], files: [] },
    createdAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 9004,
    name: 'Landing — Lanzamiento Programa Brasil',
    category: 'landing',
    country: 'Brasil',
    businessUnit: 'CU Certificaciones',
    requester: 'Comercial Brasil',
    budget: 1800,
    detail: 'Landing en portugués con formulario de leads para campaña Q2.',
    owner: 'Vicky',
    status: 'done',
    completedAt: new Date().toISOString(),
    content: { comments: [], files: [] },
    createdAt: '2026-04-12T10:00:00.000Z',
  },
];

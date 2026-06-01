// ════════════════════════════════════════════════════════════════════
// MOCK FILES — Archivos adjuntos (mock, futuro Supabase Storage)
// ════════════════════════════════════════════════════════════════════
// Hoy los files viven embebidos como base64 dentro de cada entity
// (campaign.files, request.content.files). El futuro Supabase Storage
// va a externalizarlos. Por ahora este store está vacío.
// ════════════════════════════════════════════════════════════════════

export const MOCK_FILES = [];

/**
 * Shape esperado de un file:
 * {
 *   id: string,
 *   parentType: 'campaign' | 'request' | 'webinar' | 'event',
 *   parentId: string | number,
 *   name: string,
 *   mimeType: string,
 *   size: number,            // bytes
 *   storagePath: string,     // path en Supabase Storage, hoy null
 *   dataBase64?: string,     // contenido inline mientras no hay backend
 *   uploadedBy: string,      // user.name
 *   uploadedAt: ISOString,
 * }
 */

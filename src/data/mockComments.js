// ════════════════════════════════════════════════════════════════════
// MOCK COMMENTS — Comentarios (mock, futuro tabla comments)
// ════════════════════════════════════════════════════════════════════
// Hoy los comments viven dentro de cada entity (campaign.comments,
// request.content.comments, etc). Cuando migremos a Supabase, los
// vamos a normalizar en su propia tabla con FK a la entity padre.
// Por ahora este store está vacío y existe solo para que el servicio
// tenga un punto de partida.
// ════════════════════════════════════════════════════════════════════

export const MOCK_COMMENTS = [];

/**
 * Shape esperado de un comment:
 * {
 *   id: string,
 *   parentType: 'campaign' | 'request' | 'webinar' | 'event' | 'task',
 *   parentId: string | number,
 *   author: string,           // user.name
 *   text: string,
 *   createdAt: ISOString,
 * }
 */

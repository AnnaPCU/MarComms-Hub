// ════════════════════════════════════════════════════════════════════
// PDF SERVICE — Wrapper de generación de PDFs
// ════════════════════════════════════════════════════════════════════
// Re-exporta las funciones de utils/pdf.js bajo un namespace de servicio.
// Esto deja la puerta abierta para agregar funcionalidades futuras
// (por ejemplo: guardar el PDF generado en Supabase Storage).
// ════════════════════════════════════════════════════════════════════

export {
  generateProjectPDF,
  getProjectChecklist,
  getProjectMeta,
} from '@/utils/pdf';

/**
 * 🚧 PLACEHOLDER — Guardar un PDF generado en Supabase Storage.
 * Útil para mantener un histórico de reportes enviados al cliente.
 */
export const archivePdf = async (_project, _type, _pdfBlob) => {
  // TODO: subir a Supabase Storage bucket 'reports'
  console.warn('archivePdf no implementado todavía');
};

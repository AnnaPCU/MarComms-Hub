// ════════════════════════════════════════════════════════════════════
// SLUGIFY — Convertir texto a slug seguro para URLs y UTMs
// ════════════════════════════════════════════════════════════════════

/**
 * Convierte un texto a slug seguro para UTM (sin tildes, espacios, especiales).
 * Ejemplo: "Campaña de Forestería" → "campana_de_foresteria"
 *
 * Reglas:
 *   1. Lowercase
 *   2. Remover tildes/acentos (NFD)
 *   3. Solo alfanumérico, espacios, guiones, underscore
 *   4. Espacios y guiones → underscore
 *   5. Colapsar múltiples underscores en uno
 */
export const slugifyUtm = (s) => {
  if (!s) return '';
  return s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remueve tildes
    .replace(/[^a-z0-9\s\-_]/g, '')  // solo alfanumérico, espacios, guiones, underscore
    .trim()
    .replace(/\s+/g, '_')            // espacios → underscore
    .replace(/-+/g, '_')             // guiones → underscore
    .replace(/_+/g, '_');            // colapsar múltiples
};

/**
 * Variante más estricta para nombres de archivo (PDF, etc.).
 * Solo alfanumérico y guiones medios.
 */
export const slugifyFilename = (s) => {
  if (!s) return '';
  return s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

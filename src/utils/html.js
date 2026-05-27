// ════════════════════════════════════════════════════════════════════
// HTML UTILS — Escape de texto para inyección segura en HTML
// ════════════════════════════════════════════════════════════════════

/**
 * Escapa caracteres especiales para insertar texto en HTML sin riesgo XSS.
 * Usado al generar el HTML del reporte cliente (Mailchimp report).
 */
export const escapeHtml = (text) => {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

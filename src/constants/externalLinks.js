// ════════════════════════════════════════════════════════════════════
// EXTERNAL LINKS — URLs configurables vía env vars
// ════════════════════════════════════════════════════════════════════
// Vienen de .env.local / Vercel Environment Variables.
// Si no están definidas, caen a un fallback hardcodeado (las del
// HubSpot actual). El fallback es comodidad para dev local — en prod
// vale la pena definir las env vars para no depender del bundle.
// ════════════════════════════════════════════════════════════════════

// Form de HubSpot — "Marcomms Request" (pedido al equipo de marketing)
export const HS_FORM_MARCOMMS_URL =
  import.meta.env.VITE_HS_FORM_MARCOMMS_URL ||
  'https://share.hsforms.com/17nzrYb3HSta0xiURkq9lqAs14mk';

// Form de HubSpot — "HS Request" (data / inteligencia de HubSpot)
export const HS_FORM_HSREQUEST_URL =
  import.meta.env.VITE_HS_FORM_HSREQUEST_URL ||
  'https://share.hsforms.com/1Ta-R_BYsTXe2ylGLrjWahgs14mk';

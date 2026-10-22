// ════════════════════════════════════════════════════════════════════
// googleAds — Campañas de Google Ads dentro de una tarjeta de Paid Media
// ════════════════════════════════════════════════════════════════════
// Desde oct 2026 hay una tarjeta por unidad y país (CU Argentina, PS
// Argentina, PCU España…) y adentro la lista de sus campañas de Google Ads
// en `data.google_ads.campanas` (ver supabase/seed/0037_*). Se muestra solo
// el nombre y si está activa o no.
// Las filas viejas (una campaña por tarjeta, seed 0036) traen la campaña
// suelta en `data.google_ads`: se tratan como una lista de una.
// ════════════════════════════════════════════════════════════════════

export const isAdsCampaignActive = (c) => c?.estado === 'Activa';

// [{ clave, nombre, nombre_corto, estado }], activas primero y por nombre
export const adsCampaignsOf = (ads, fallbackName = '') => {
  if (!ads) return [];
  const list = Array.isArray(ads.campanas)
    ? ads.campanas
    : [{ clave: ads.clave_externa, nombre: fallbackName, nombre_corto: fallbackName, estado: ads.estado }];
  return [...list].sort((a, b) => (Number(isAdsCampaignActive(b)) - Number(isAdsCampaignActive(a)))
    || String(a.nombre_corto || a.nombre).localeCompare(String(b.nombre_corto || b.nombre), 'es'));
};

export const adsSummary = (list) => {
  const active = list.filter(isAdsCampaignActive).length;
  return { total: list.length, active, inactive: list.length - active };
};

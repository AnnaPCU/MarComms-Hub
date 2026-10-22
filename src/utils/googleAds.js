// ════════════════════════════════════════════════════════════════════
// googleAds — Campañas dentro de una tarjeta de Paid Media
// ════════════════════════════════════════════════════════════════════
// Desde oct 2026 hay una tarjeta por unidad y país (CU Argentina, PS
// Argentina, PCU España…) y adentro la lista de sus campañas en
// `data.google_ads.campanas`: { clave, nombre, nombre_corto, estado, … }.
// El equipo las agrega, renombra (nombre_corto) y les cambia el estado
// (Activa / Pausada / Inhabilitada) desde la ficha; las agregadas a mano
// tienen clave `manual:<id>`. Las que vienen de Google Ads conservan
// `nombre` (el nombre exacto en Google Ads) y `clave` (gads:…).
// Las filas viejas (una campaña por tarjeta, seed 0036) traen la campaña
// suelta en `data.google_ads`: se tratan como una lista de una.
// ════════════════════════════════════════════════════════════════════

import { PAID_CAMPAIGN_STATUSES } from '@/constants/campaigns';

export const isAdsCampaignActive = (c) => c?.estado === 'Activa';
export const isManualAdsCampaign = (c) => String(c?.clave || '').startsWith('manual:');
export const adsCampaignName = (c) => c?.nombre_corto || c?.nombre || '';

const STATUS_ORDER = Object.fromEntries(PAID_CAMPAIGN_STATUSES.map((s, i) => [s.id, i]));
const statusRank = (c) => STATUS_ORDER[c?.estado] ?? 1; // desconocido → como pausada

// Lista tal cual está guardada (para editar)
export const adsCampaignList = (ads, fallbackName = '') => {
  if (!ads) return [];
  if (Array.isArray(ads.campanas)) return ads.campanas;
  if (!ads.clave_externa && !ads.estado) return [];
  return [{ clave: ads.clave_externa, nombre: fallbackName, nombre_corto: fallbackName, estado: ads.estado }];
};

// Para mostrar: activas, después pausadas, después inhabilitadas; por nombre
export const adsCampaignsOf = (ads, fallbackName = '') => [...adsCampaignList(ads, fallbackName)]
  .sort((a, b) => (statusRank(a) - statusRank(b)) || adsCampaignName(a).localeCompare(adsCampaignName(b), 'es'));

export const adsSummary = (list) => {
  const active = list.filter(isAdsCampaignActive).length;
  const disabled = list.filter((c) => c.estado === 'Inhabilitada').length;
  return { total: list.length, active, paused: list.length - active - disabled, disabled, inactive: list.length - active };
};

// ── Edición (puras: devuelven una lista nueva) ──
const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');
const sameName = (a, b) => norm(a).toLocaleLowerCase('es') === norm(b).toLocaleLowerCase('es');

// '' si el nombre sirve; si no, el motivo
export const adsNameError = (list, name, exceptClave = null) => {
  if (!norm(name)) return 'Escribí un nombre.';
  if (list.some((c) => c.clave !== exceptClave && sameName(adsCampaignName(c), name))) return 'Ya hay una campaña con ese nombre en esta tarjeta.';
  return '';
};

export const addAdsCampaign = (list, { id, name, estado = 'Activa' }) => [
  ...list,
  { clave: `manual:${id}`, nombre: norm(name), nombre_corto: norm(name), estado },
];

export const renameAdsCampaign = (list, clave, name) => list.map((c) => (c.clave === clave
  ? { ...c, nombre_corto: norm(name), ...(isManualAdsCampaign(c) ? { nombre: norm(name) } : {}) }
  : c));

// En las de Google Ads guarda `estado_ads` (el estado en Google Ads antes
// del primer cambio a mano): así el seed 0037, si se vuelve a correr, sabe
// que el estado lo cambió el equipo y no lo pisa
export const setAdsCampaignStatus = (list, clave, estado) => list.map((c) => {
  if (c.clave !== clave) return c;
  if (isManualAdsCampaign(c)) return { ...c, estado };
  return { ...c, estado, estado_ads: c.estado_ads ?? c.estado };
});

// Solo se borran las agregadas a mano; las de Google Ads se inhabilitan
export const removeAdsCampaign = (list, clave) => list.filter((c) => !(c.clave === clave && isManualAdsCampaign(c)));

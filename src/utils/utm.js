// ════════════════════════════════════════════════════════════════════
// UTM UTILS — Armado de UTMs y filtros del repositorio (lógica pura)
// ════════════════════════════════════════════════════════════════════
// Estructura del utm_campaign (sep 2026, sin "servicio"):
//   [unidad_negocio]_[país]_marcomms_[nombre_campaña]
//
// - buildUtmCampaign(form)            → string del utm_campaign
// - buildUtmUrl(form)                 → URL final (con lo que haya cargado)
// - missingUtmFields(form)            → etiquetas de los campos que faltan
// - utmValueLabel(kind, value)        → etiqueta para mostrar (incluye viejos)
// - normalizeLegacyUtmValue(kind, v)  → valor viejo → valor actual (al cargar)
// - utmFilterOptions(links, key)      → [{ value, label, count }] para un filtro
// - filterUtmLinks(links, filters, q) → links que cumplen filtros + búsqueda
// ════════════════════════════════════════════════════════════════════

import { slugifyUtm } from './slugify';
import { UTM_SOURCES, UTM_MEDIUMS, LEGACY_UTM_LABELS, LEGACY_UTM_VALUE_MAP } from '@/constants/campaigns';

export const UTM_IDENTIFIER = 'MarComms'; // fijo: identifica que el lead viene del equipo

export const buildUtmCampaign = ({ businessUnit, country, campaignName }) =>
  [businessUnit, country, UTM_IDENTIFIER, campaignName].map((p) => slugifyUtm(p)).filter(Boolean).join('_');

// Identificador y unidad vienen con default: el utm_campaign "existe" recién
// cuando hay país o nombre de campaña (dato propio de esta pieza)
export const hasUtmCampaignParts = (form) => [form.country, form.campaignName].some((p) => (p || '').toString().trim());

export const cleanBaseUrl = (url) => {
  const u = (url || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

// URL final con lo que esté cargado (sirve para la preview en vivo).
// Devuelve '' si no hay URL base.
export const buildUtmUrl = (form) => {
  const base = cleanBaseUrl(form.url);
  if (!base) return '';
  const params = new URLSearchParams();
  if (form.source) params.append('utm_source', slugifyUtm(form.source));
  if (form.medium) params.append('utm_medium', slugifyUtm(form.medium));
  if (hasUtmCampaignParts(form)) params.append('utm_campaign', buildUtmCampaign(form));
  const qs = params.toString();
  if (!qs) return base;
  return `${base}${base.includes('?') ? '&' : '?'}${qs}`;
};

const REQUIRED = [
  ['url', 'URL del sitio web'],
  ['source', 'Fuente UTM'],
  ['medium', 'UTM Medio'],
  ['businessUnit', 'Unidad de Negocio'],
  ['country', 'País'],
  ['campaignName', 'Nombre de la Campaña'],
];
export const missingUtmFields = (form) => REQUIRED.filter(([k]) => !(form[k] || '').toString().trim()).map(([, label]) => label);
export const isUtmFormComplete = (form) => missingUtmFields(form).length === 0;

const LISTS = { source: UTM_SOURCES, medium: UTM_MEDIUMS };

export const utmValueLabel = (kind, value) => {
  if (!value) return '';
  const hit = (LISTS[kind] || []).find((o) => o.value === value);
  if (hit) return hit.label;
  return LEGACY_UTM_LABELS[value] || value;
};

// Valor viejo → valor actual; si no hay traducción y no está en la lista,
// devuelve '' para que la persona lo elija de nuevo.
export const normalizeLegacyUtmValue = (kind, value) => {
  if (!value) return '';
  if ((LISTS[kind] || []).some((o) => o.value === value)) return value;
  return (LEGACY_UTM_VALUE_MAP[kind] || {})[value] || '';
};

// Opciones de un filtro a partir de lo que hay guardado, con conteo
export const utmFilterOptions = (links, key) => {
  const counts = {};
  (links || []).forEach((l) => { const v = l[key]; if (v) counts[v] = (counts[v] || 0) + 1; });
  const kind = key === 'source' || key === 'medium' ? key : null;
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count, label: kind ? utmValueLabel(kind, value) : value }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export const EMPTY_UTM_FILTERS = { source: 'all', medium: 'all', organization: 'all', businessUnit: 'all', country: 'all' };

export const filterUtmLinks = (links, filters = EMPTY_UTM_FILTERS, query = '') => {
  const q = (query || '').trim().toLowerCase();
  return (links || []).filter((l) => {
    for (const key of Object.keys(EMPTY_UTM_FILTERS)) {
      const f = filters[key];
      if (f && f !== 'all' && (l[key] || '') !== f) return false;
    }
    if (!q) return true;
    return [l.label, l.url, l.campaignName, l.country, l.businessUnit, l.organization, l.medium, l.source, l.utmCampaign, l.createdBy]
      .some((v) => (v || '').toLowerCase().includes(q));
  });
};

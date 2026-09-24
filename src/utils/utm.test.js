// ════════════════════════════════════════════════════════════════════
// Tests para utils/utm — armado de UTMs y filtros del repositorio
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  buildUtmCampaign, buildUtmUrl, missingUtmFields, utmValueLabel, normalizeLegacyUtmValue,
  utmFilterOptions, filterUtmLinks, EMPTY_UTM_FILTERS,
} from './utm';
import { UTM_SOURCES, UTM_MEDIUMS } from '@/constants/campaigns';
import { ORGANIZATIONS, MARCOMMS_BUSINESS_UNITS } from '@/constants/markets';

const FORM = { url: 'argentina.controlunion.com/warrants', source: 'linkedin', medium: 'social', organization: 'Control Union', businessUnit: 'CU Warrants', country: 'Argentina', campaignName: 'Warrants Mayo 2026' };

describe('utm — armado', () => {
  it('utm_campaign sin servicio: unidad_pais_marcomms_campaña', () => {
    expect(buildUtmCampaign(FORM)).toBe('cu_warrants_argentina_marcomms_warrants_mayo_2026');
  });

  it('URL final agrega https y los tres parámetros', () => {
    expect(buildUtmUrl(FORM)).toBe('https://argentina.controlunion.com/warrants?utm_source=linkedin&utm_medium=social&utm_campaign=cu_warrants_argentina_marcomms_warrants_mayo_2026');
  });

  it('preview en vivo: con solo la URL y la fuente ya arma algo; sin URL no arma nada', () => {
    expect(buildUtmUrl({ url: 'https://x.com/?a=1', source: 'google' })).toBe('https://x.com/?a=1&utm_source=google');
    expect(buildUtmUrl({ source: 'google' })).toBe('');
  });

  it('missingUtmFields lista lo que falta, en orden', () => {
    expect(missingUtmFields(FORM)).toEqual([]);
    expect(missingUtmFields({ ...FORM, url: ' ', country: '' })).toEqual(['URL del sitio web', 'País']);
  });
});

describe('utm — listas cerradas', () => {
  it('fuentes y medios son exactamente los pedidos', () => {
    expect(UTM_SOURCES.map((s) => s.value)).toEqual(['content', 'linkedin', 'meta', 'google', 'mailchimp', 'apollo', 'hubspot']);
    expect(UTM_MEDIUMS.map((m) => m.value)).toEqual(['email_marketing', 'social', 'paid_media', 'webinar']);
  });
  it('organizaciones y unidades: Peterson Solutions, PCU, sin BELE', () => {
    expect(ORGANIZATIONS).toEqual(['Control Union', 'Peterson Solutions', 'PCU']);
    expect(MARCOMMS_BUSINESS_UNITS).toContain('Peterson Solutions');
    expect(MARCOMMS_BUSINESS_UNITS).not.toContain('BELE');
    expect(MARCOMMS_BUSINESS_UNITS).not.toContain('Peterson');
  });
  it('valores viejos: etiqueta y traducción', () => {
    expect(utmValueLabel('source', 'contenido')).toBe('Contenido (viejo)');
    expect(utmValueLabel('medium', 'linkedin')).toBe('linkedin');
    expect(utmValueLabel('source', 'meta')).toBe('Meta (Instagram o Facebook)');
    expect(normalizeLegacyUtmValue('source', 'contenido')).toBe('content');
    expect(normalizeLegacyUtmValue('medium', 'email_mkt')).toBe('email_marketing');
    expect(normalizeLegacyUtmValue('medium', 'linkedin')).toBe(''); // ambiguo → que lo elija de nuevo
    expect(normalizeLegacyUtmValue('medium', 'social')).toBe('social');
  });
});

describe('utm — repositorio', () => {
  const L = [
    { id: '1', label: 'Webinar Cannabis', source: 'contenido', medium: 'email_mkt', organization: 'Control Union', businessUnit: 'Control Union', country: 'Canada', url: 'https://a', campaignName: 'cannabis' },
    { id: '2', label: 'ISO 27001', source: 'contenido', medium: 'linkedin', organization: 'Control Union', businessUnit: 'Control Union', country: 'Brasil', url: 'https://b', campaignName: 'iso' },
    { id: '3', label: 'Energy forum', source: 'linkedin', medium: 'social', organization: 'Peterson Solutions', businessUnit: 'Peterson Solutions', country: 'Mexico', url: 'https://c', campaignName: 'energy' },
  ];
  it('opciones con conteo, ordenadas por cantidad', () => {
    expect(utmFilterOptions(L, 'source')).toEqual([
      { value: 'contenido', count: 2, label: 'Contenido (viejo)' },
      { value: 'linkedin', count: 1, label: 'LinkedIn' },
    ]);
    expect(utmFilterOptions(L, 'country').map((o) => o.value)).toEqual(['Brasil', 'Canada', 'Mexico']);
  });
  it('filtra por varios criterios y por texto', () => {
    expect(filterUtmLinks(L, { ...EMPTY_UTM_FILTERS, source: 'contenido' }).map((l) => l.id)).toEqual(['1', '2']);
    expect(filterUtmLinks(L, { ...EMPTY_UTM_FILTERS, source: 'contenido', medium: 'linkedin' }).map((l) => l.id)).toEqual(['2']);
    expect(filterUtmLinks(L, EMPTY_UTM_FILTERS, 'energy').map((l) => l.id)).toEqual(['3']);
    expect(filterUtmLinks(L, { ...EMPTY_UTM_FILTERS, organization: 'PCU' })).toEqual([]);
  });
});

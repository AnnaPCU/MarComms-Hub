// ════════════════════════════════════════════════════════════════════
// Tests para utils/googleAds — campañas dentro de una tarjeta de Paid Media
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { adsCampaignsOf, adsSummary } from './googleAds';

describe('adsCampaignsOf', () => {
  it('tarjeta agrupada: activas primero y por nombre', () => {
    const ads = { campanas: [
      { clave: '1', nombre_corto: 'Car', estado: 'Pausada' },
      { clave: '2', nombre_corto: 'IFS', estado: 'Activa' },
      { clave: '3', nombre_corto: 'GMP+', estado: 'Activa' },
    ] };
    expect(adsCampaignsOf(ads).map((c) => c.nombre_corto)).toEqual(['GMP+', 'IFS', 'Car']);
    expect(adsSummary(adsCampaignsOf(ads))).toEqual({ total: 3, active: 2, inactive: 1 });
  });

  it('fila vieja de una sola campaña: lista de una con el nombre de la tarjeta', () => {
    const list = adsCampaignsOf({ clave_externa: 'gads:1:2', estado: 'Activa' }, 'CU España - IFS - SEARCH');
    expect(list).toEqual([{ clave: 'gads:1:2', nombre: 'CU España - IFS - SEARCH', nombre_corto: 'CU España - IFS - SEARCH', estado: 'Activa' }]);
  });

  it('sin datos de Google Ads: lista vacía', () => {
    expect(adsCampaignsOf(undefined)).toEqual([]);
  });
});

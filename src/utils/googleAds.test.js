// ════════════════════════════════════════════════════════════════════
// Tests para utils/googleAds — campañas dentro de una tarjeta de Paid Media
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  adsCampaignsOf, adsCampaignList, adsSummary, adsNameError,
  addAdsCampaign, renameAdsCampaign, setAdsCampaignStatus, removeAdsCampaign,
} from './googleAds';

const ads = { campanas: [
  { clave: 'gads:1', nombre: 'CU España - Car - Search', nombre_corto: 'Car', estado: 'Pausada' },
  { clave: 'gads:2', nombre: 'CU España - IFS - SEARCH', nombre_corto: 'IFS', estado: 'Activa' },
  { clave: 'gads:3', nombre: 'CU España - GMP+ - Search', nombre_corto: 'GMP+', estado: 'Activa' },
  { clave: 'gads:4', nombre: 'CU España - Viejo - Search', nombre_corto: 'Viejo', estado: 'Inhabilitada' },
] };

describe('lista de campañas', () => {
  it('activas, después pausadas, después inhabilitadas; por nombre', () => {
    expect(adsCampaignsOf(ads).map((c) => c.nombre_corto)).toEqual(['GMP+', 'IFS', 'Car', 'Viejo']);
    expect(adsSummary(adsCampaignsOf(ads))).toEqual({ total: 4, active: 2, paused: 1, disabled: 1, inactive: 2 });
  });

  it('fila vieja de una sola campaña: lista de una; sin datos: vacía', () => {
    expect(adsCampaignList({ clave_externa: 'gads:9', estado: 'Activa' }, 'CU España - IFS - SEARCH'))
      .toEqual([{ clave: 'gads:9', nombre: 'CU España - IFS - SEARCH', nombre_corto: 'CU España - IFS - SEARCH', estado: 'Activa' }]);
    expect(adsCampaignsOf(undefined)).toEqual([]);
    expect(adsCampaignList({})).toEqual([]);
  });
});

describe('edición', () => {
  const list = ads.campanas;

  it('agregar: clave manual, nombre limpio y estado elegido', () => {
    const next = addAdsCampaign(list, { id: 'x1', name: '  Textile   nuevo ', estado: 'Pausada' });
    expect(next.at(-1)).toEqual({ clave: 'manual:x1', nombre: 'Textile nuevo', nombre_corto: 'Textile nuevo', estado: 'Pausada' });
    expect(next).toHaveLength(5);
  });

  it('nombre vacío o repetido (sin importar mayúsculas) no sirve', () => {
    expect(adsNameError(list, '   ')).toBe('Escribí un nombre.');
    expect(adsNameError(list, 'ifs')).toBe('Ya hay una campaña con ese nombre en esta tarjeta.');
    expect(adsNameError(list, 'IFS', 'gads:2')).toBe('');
    expect(adsNameError(list, 'Textile')).toBe('');
  });

  it('renombrar cambia el nombre que se ve y conserva el de Google Ads', () => {
    const next = renameAdsCampaign(list, 'gads:2', 'IFS Food');
    expect(next[1]).toEqual({ ...list[1], nombre_corto: 'IFS Food' });
    const manual = renameAdsCampaign(addAdsCampaign(list, { id: 'x2', name: 'Tmp' }), 'manual:x2', 'Nueva');
    expect(manual.at(-1)).toMatchObject({ nombre: 'Nueva', nombre_corto: 'Nueva' });
  });

  it('cambiar estado guarda el de Google Ads antes del primer cambio a mano', () => {
    const once = setAdsCampaignStatus(list, 'gads:1', 'Inhabilitada');
    expect(once[0]).toMatchObject({ estado: 'Inhabilitada', estado_ads: 'Pausada' });
    expect(setAdsCampaignStatus(once, 'gads:1', 'Activa')[0]).toMatchObject({ estado: 'Activa', estado_ads: 'Pausada' });
    const manual = setAdsCampaignStatus(addAdsCampaign(list, { id: 'x4', name: 'A mano' }), 'manual:x4', 'Pausada');
    expect(manual.at(-1)).toEqual({ clave: 'manual:x4', nombre: 'A mano', nombre_corto: 'A mano', estado: 'Pausada' });
    expect(once.slice(1)).toEqual(list.slice(1));
  });

  it('borrar: solo las agregadas a mano', () => {
    expect(removeAdsCampaign(list, 'gads:1')).toHaveLength(4);
    const withManual = addAdsCampaign(list, { id: 'x3', name: 'Error' });
    expect(removeAdsCampaign(withManual, 'manual:x3')).toHaveLength(4);
  });
});

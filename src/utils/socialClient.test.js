// Tests del link de cada cuenta de Social Media (pedidos del cliente)
import { describe, it, expect } from 'vitest';
import {
  socialAccountBrand, clientRequestTitle, clientRequestMissing, mediaProblems, safeFileName, mediaPath,
  clientRequestPayload, clientRequestsToNotice,
  copyLength, copyTooLong, canClientEdit, clientRequestForm, clientEditTitle, clientEditsToNotice,
} from './socialClient';

const OK = { requestedBy: 'Ana Pérez', networks: ['linkedin'], postType: 'webinar', publishDate: '2026-12-03', copy: 'Hola' };

describe('socialAccountBrand', () => {
  it('CU → Control Union, PS → Peterson Solutions, el resto sin marca', () => {
    expect(socialAccountBrand('CU Latinoamérica')).toBe('Control Union');
    expect(socialAccountBrand('CU NorthAmerica')).toBe('Control Union');
    expect(socialAccountBrand('PS Iberia & America')).toBe('Peterson Solutions');
    expect(socialAccountBrand('PS Global')).toBe('Peterson Solutions');
    expect(socialAccountBrand('Bel')).toBe('');
    expect(socialAccountBrand('')).toBe('');
  });
});

describe('clientRequestTitle', () => {
  it('tipo + comienzo del copy, cortado en palabra', () => {
    expect(clientRequestTitle({ postType: 'evento', copy: 'Te esperamos en la feria' })).toBe('Evento · Te esperamos en la feria');
    const long = clientRequestTitle({ postType: 'webinar', copy: 'palabra '.repeat(20) });
    expect(long.startsWith('Webinar · palabra')).toBe(true);
    expect(long.endsWith('…')).toBe(true);
    expect(long.length).toBeLessThanOrEqual(72);
  });
  it('sin copy', () => {
    expect(clientRequestTitle({ postType: 'otros' })).toBe('Pedido · Otros');
  });
});

describe('clientRequestMissing', () => {
  it('completo no falta nada', () => {
    expect(clientRequestMissing(OK, '2026-11-24')).toEqual([]);
  });
  it('lista lo que falta en orden', () => {
    expect(clientRequestMissing({}, '2026-11-24')).toEqual(['nombre y apellido', 'red social', 'tipo de posteo', 'fecha de publicación', 'copy']);
  });
  it('fecha pasada', () => {
    expect(clientRequestMissing({ ...OK, publishDate: '2026-11-20' }, '2026-11-24')).toEqual(['una fecha de publicación de hoy en adelante']);
    expect(clientRequestMissing({ ...OK, publishDate: '2026-11-24' }, '2026-11-24')).toEqual([]);
  });
});

describe('mediaProblems', () => {
  it('acepta imágenes y videos hasta 50 MB', () => {
    expect(mediaProblems([{ name: 'a.png', type: 'image/png', size: 1000 }, { name: 'b.mp4', type: 'video/mp4', size: 49 * 1024 * 1024 }])).toEqual([]);
  });
  it('rechaza otros tipos, archivos pesados y más de 10', () => {
    expect(mediaProblems([{ name: 'a.pdf', type: 'application/pdf', size: 10 }])[0]).toMatch(/no es una imagen/);
    expect(mediaProblems([{ name: 'b.mov', type: 'video/quicktime', size: 51 * 1024 * 1024 }])[0]).toMatch(/50 MB/);
    expect(mediaProblems(Array.from({ length: 11 }, (_, i) => ({ name: `${i}.png`, type: 'image/png', size: 1 })))[0]).toMatch(/hasta 10/);
  });
});

describe('rutas de archivos', () => {
  it('nombre seguro y dentro de la carpeta del token', () => {
    expect(safeFileName('Foto del Día (1).JPG')).toBe('Foto-del-Dia-1.JPG');
    expect(mediaPath('tok', 'Mi video.mp4', 'abc')).toBe('tok/abc-Mi-video.mp4');
  });
});

describe('clientRequestPayload', () => {
  it('limpia y arma el título', () => {
    const p = clientRequestPayload({ ...OK, requestedBy: '  Ana   Pérez ', networks: ['linkedin', 'linkedin'], link: ' https://x ' }, [{ path: 'tok/a.png' }]);
    expect(p).toMatchObject({ requestedBy: 'Ana Pérez', networks: ['linkedin'], link: 'https://x', title: 'Webinar · Hola', media: [{ path: 'tok/a.png' }] });
  });
});

describe('clientRequestsToNotice', () => {
  it('uno por cada pedido reciente, en cualquier estado', () => {
    const now = new Date('2026-11-24T12:00:00Z');
    const posts = [
      { id: 1, source: 'cliente', status: 'en_proceso', requestedAt: '2026-11-23T10:00:00Z' },
      { id: 2, source: 'cliente', status: 'listo', requestedAt: '2026-11-23T10:00:00Z' },
      { id: 3, source: 'cliente', status: 'en_proceso', requestedAt: '2026-10-01T10:00:00Z' },
      { id: 4, source: null, status: 'en_proceso', requestedAt: null },
    ];
    expect(clientRequestsToNotice(posts, now).map((p) => p.id)).toEqual([1, 2]);
  });
});

describe('copy de hasta 3.000 caracteres', () => {
  it('cuenta los emojis como un carácter, como la base', () => {
    expect(copyLength('Hola 👋')).toBe(6);
    expect(copyLength('  hola  ')).toBe(4);
  });
  it('avisa recién al pasar de 3.000', () => {
    expect(copyTooLong('a'.repeat(3000))).toBe(false);
    expect(copyTooLong('a'.repeat(3001))).toBe(true);
  });
});

describe('Artículo LinkedIn', () => {
  it('es un tipo válido y titula el posteo', () => {
    expect(clientRequestMissing({ ...OK, postType: 'articulo_linkedin' }, '2026-11-24')).toEqual([]);
    expect(clientRequestTitle({ postType: 'articulo_linkedin', copy: 'Novedades EUDR' })).toBe('Artículo LinkedIn · Novedades EUDR');
  });
});

describe('edición del pedido por el cliente', () => {
  const pedido = { id: 'p1', source: 'cliente', status: 'en_proceso', postType: 'webinar', copy: 'Hola', networks: ['linkedin'], publishDate: '2026-12-03', theme: 'agua', link: '', requestNotes: 'n', media: [{ path: 't/a.png' }] };
  it('solo pedidos del cliente en «En proceso»', () => {
    expect(canClientEdit(pedido)).toBe(true);
    ['listo', 'aprobado', 'programado'].forEach((status) => expect(canClientEdit({ ...pedido, status })).toBe(false));
    expect(canClientEdit({ ...pedido, source: null })).toBe(false);
  });
  it('arma el formulario con los datos del pedido', () => {
    expect(clientRequestForm(pedido)).toEqual({ networks: ['linkedin'], postType: 'webinar', publishDate: '2026-12-03', theme: 'agua', copy: 'Hola', link: '', requestNotes: 'n' });
  });
  it('rearma el título automático pero respeta uno puesto en el Hub', () => {
    const nuevo = { postType: 'evento', copy: 'Chau' };
    expect(clientEditTitle({ ...pedido, title: 'Webinar · Hola' }, nuevo)).toBe('Evento · Chau');
    expect(clientEditTitle({ ...pedido, title: 'Webinar EUDR (Delfi)' }, nuevo)).toBe('Webinar EUDR (Delfi)');
  });
  it('avisa las ediciones de los últimos días', () => {
    const now = new Date('2026-11-24T12:00:00Z');
    const posts = [
      { ...pedido, clientEditedAt: '2026-11-24T10:00:00Z' },
      { ...pedido, id: 'p2', clientEditedAt: null },
      { ...pedido, id: 'p3', clientEditedAt: '2026-10-01T10:00:00Z' },
    ];
    expect(clientEditsToNotice(posts, now).map((p) => p.id)).toEqual(['p1']);
  });
});

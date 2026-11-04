// ════════════════════════════════════════════════════════════════════
// Tests para utils/mentions — etiquetar con @
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { extractMentions, filterPeople, insertMention, mentionQuery, mentionSnippet, mentionsName, textHash } from './mentions';

const TEAM = ['Victoria Colombo', 'Felipe Señorans', 'Agustina Rey', 'Valentino Redín'];

describe('escribir una @', () => {
  it('detecta lo que se escribe después de la @ (hasta un espacio)', () => {
    expect(mentionQuery('Revisar con @Vic', 16)).toEqual({ start: 12, query: 'Vic' });
    expect(mentionQuery('Revisar con @Victoria C', 23)).toEqual({ start: 12, query: 'Victoria C' });
    expect(mentionQuery('Revisar con @Victoria Colombo hoy', 33)).toBeNull(); // dos espacios: ya no es una etiqueta a medias
    expect(mentionQuery('mail: anna@peterson.com', 23)).toBeNull(); // un mail
    expect(mentionQuery('sin arroba', 10)).toBeNull();
    expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' });
  });
  it('filtra al equipo por nombre o apellido, sin tildes', () => {
    expect(filterPeople(TEAM, 'vic')).toEqual(['Victoria Colombo']);
    expect(filterPeople(TEAM, 'senor')).toEqual(['Felipe Señorans']);
    expect(filterPeople(TEAM, 'redin')).toEqual(['Valentino Redín']);
    expect(filterPeople(TEAM, '')).toEqual(TEAM);
    expect(filterPeople(TEAM, 'zzz')).toEqual([]);
  });
  it('inserta «@Nombre Apellido » y deja el cursor después', () => {
    expect(insertMention('Revisar con @Vic hoy', 12, 16, 'Victoria Colombo')).toEqual({ text: 'Revisar con @Victoria Colombo  hoy', caret: 30 });
    expect(insertMention('@', 0, 1, 'Agustina Rey')).toEqual({ text: '@Agustina Rey ', caret: 14 });
  });
});

describe('etiquetas en un texto', () => {
  it('reconoce los nombres del equipo (sin importar mayúsculas ni tildes)', () => {
    expect(extractMentions('Revisar con @Victoria Colombo y @valentino redin', TEAM)).toEqual(['Victoria Colombo', 'Valentino Redín']);
    expect(extractMentions('@Victoria Colombos no es ella', TEAM)).toEqual([]);
    expect(extractMentions('anna@peterson.com', TEAM)).toEqual([]);
    expect(mentionsName('ok @Felipe Señorans', 'Felipe Señorans')).toBe(true);
    expect(mentionsName('ok Felipe Señorans', 'Felipe Señorans')).toBe(false);
  });
  it('trozo del texto y hash', () => {
    const long = `${'a'.repeat(200)} @Victoria Colombo revisá ${'b'.repeat(200)}`;
    const s = mentionSnippet(long, 'Victoria Colombo', 60);
    expect(s.length).toBeLessThanOrEqual(62);
    expect(s).toContain('@Victoria Colombo');
    expect(mentionSnippet('corto @Agustina Rey', 'Agustina Rey')).toBe('corto @Agustina Rey');
    expect(textHash('hola')).toBe(textHash('hola'));
    expect(textHash('hola')).not.toBe(textHash('hola!'));
  });
});

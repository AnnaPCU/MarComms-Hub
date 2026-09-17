import { describe, it, expect } from 'vitest';
import {
  diffNewNotifications,
  mergeSeenIds,
  buildTabTitle,
  buildBrowserNotification,
  summarizeUnread,
  seenStorageKey,
} from './notificationAlerts';

const N = (id, extra = {}) => ({ id, type: 'soon', title: `T ${id}`, project: 'P', source: 'S', ...extra });

describe('notificationAlerts', () => {
  it('diffNewNotifications devuelve solo las que no fueron vistas', () => {
    const notifs = [N('a'), N('b'), N('c')];
    expect(diffNewNotifications(notifs, new Set(['a'])).map((n) => n.id)).toEqual(['b', 'c']);
    expect(diffNewNotifications(notifs, ['a', 'b', 'c'])).toEqual([]);
    expect(diffNewNotifications([], new Set())).toEqual([]);
  });

  it('mergeSeenIds agrega sin duplicar y acota el tamaño', () => {
    const seen = mergeSeenIds(new Set(['a']), [N('a'), N('b')]);
    expect([...seen]).toEqual(['a', 'b']);
    const capped = mergeSeenIds(new Set(['x1', 'x2', 'x3']), [N('x4')], 2);
    expect([...capped]).toEqual(['x3', 'x4']);
  });

  it('buildTabTitle muestra el conteo solo cuando hay sin leer', () => {
    expect(buildTabTitle(0)).toBe('Marcomms Hub');
    expect(buildTabTitle(3)).toBe('(3) Marcomms Hub');
    expect(buildTabTitle(150)).toBe('(99+) Marcomms Hub');
  });

  it('buildBrowserNotification usa shortTitle y arma el cuerpo', () => {
    const b = buildBrowserNotification({ id: 'k', shortTitle: '⏰ PPT próximo', title: 'largo', project: 'Webinar X', source: 'Webinar' });
    expect(b).toEqual({ title: '⏰ PPT próximo', body: 'Webinar X · Webinar', tag: 'k' });
  });

  it('summarizeUnread agrupa por tipo con singular/plural', () => {
    const s = summarizeUnread([N('1', { type: 'overdue' }), N('2', { type: 'soon' }), N('3', { type: 'soon' })]);
    expect(s).toBe('1 atrasada, 2 próximas a vencer');
  });

  it('seenStorageKey es por usuario y no distingue mayúsculas', () => {
    expect(seenStorageKey('Delfina Palmero')).toBe(seenStorageKey('delfina palmero '));
    expect(seenStorageKey('A')).not.toBe(seenStorageKey('B'));
  });
});

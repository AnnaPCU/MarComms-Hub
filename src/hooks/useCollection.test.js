// ════════════════════════════════════════════════════════════════════
// Tests para la guarda de useCollection contra listas viejas
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { recentArrivalsMissing, recentlyDeletedReappearing, RECENT_ARRIVAL_MS } from './useCollection';

describe('recentArrivalsMissing', () => {
  const now = 1_000_000;
  const prev = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('conserva lo que llegó por realtime hace poco y falta en la lista vieja', () => {
    const arrived = new Map([['c', now - 2000]]);
    expect(recentArrivalsMissing(prev, [{ id: 'a' }, { id: 'b' }], arrived, now)).toEqual([{ id: 'c' }]);
  });

  it('un borrado real (ítem viejo) no se conserva', () => {
    const arrived = new Map([['c', now - RECENT_ARRIVAL_MS - 1]]);
    expect(recentArrivalsMissing(prev, [{ id: 'a' }, { id: 'c' }], arrived, now)).toEqual([]);
    expect(recentArrivalsMissing(prev, [{ id: 'a' }, { id: 'b' }], arrived, now)).toEqual([]);
  });
});

describe('recentlyDeletedReappearing', () => {
  const now = 1_000_000;
  const prev = [{ id: 'a' }];

  it('no vuelve a crear lo que otro cliente borró hace poco', () => {
    const deleted = new Map([['b', now - 3000]]);
    expect(recentlyDeletedReappearing(prev, [{ id: 'a' }, { id: 'b' }], deleted, now)).toEqual([{ id: 'b' }]);
  });

  it('un alta nueva o un borrado viejo no se tocan', () => {
    const deleted = new Map([['b', now - RECENT_ARRIVAL_MS - 1]]);
    expect(recentlyDeletedReappearing(prev, [{ id: 'a' }, { id: 'b' }, { id: 'c' }], deleted, now)).toEqual([]);
  });
});

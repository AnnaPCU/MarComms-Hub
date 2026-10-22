// ════════════════════════════════════════════════════════════════════
// Tests para la guarda de useCollection contra listas viejas
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { recentArrivalsMissing, RECENT_ARRIVAL_MS } from './useCollection';

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

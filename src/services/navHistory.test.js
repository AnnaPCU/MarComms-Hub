// Tests del historial de navegación del Hub («atrás» del navegador)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNavHistory, NAV_STATE_KEY } from './navHistory';

// Ventana falsa: una pila de entradas como la del navegador
const fakeWindow = (initialState = null) => {
  const handlers = [];
  const stack = [initialState];
  let index = 0;
  const history = {
    get state() { return stack[index]; },
    get length() { return stack.length; },
    pushState(state) { stack.splice(index + 1); stack.push(state); index += 1; },
    replaceState(state) { stack[index] = state; },
  };
  return {
    history,
    stack,
    addEventListener: (type, fn) => { if (type === 'popstate') handlers.push(fn); },
    back() { index -= 1; handlers.forEach((fn) => fn({ state: stack[index] })); },
    forward() { index += 1; handlers.forEach((fn) => fn({ state: stack[index] })); },
  };
};

describe('navHistory', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('junta los cambios de una misma acción en una sola entrada', () => {
    const win = fakeWindow();
    const nav = createNavHistory(win);
    nav.startEntry({ section: 'client_portal' });
    nav.set('portalScope', { id: 'cu-argentina' });
    vi.runAllTimers();
    expect(win.history.length).toBe(2);
    expect(win.history.state[NAV_STATE_KEY]).toEqual({ section: 'client_portal', portalScope: { id: 'cu-argentina' } });
  });

  it('atrás vuelve al estado anterior y avisa a los suscriptos', () => {
    const win = fakeWindow();
    const nav = createNavHistory(win);
    const seen = [];
    nav.subscribe(() => seen.push(nav.read('portalScope') ?? null));
    nav.startEntry({ section: 'client_portal' });
    vi.runAllTimers();
    nav.set('portalScope', { id: 'cu-argentina' });
    vi.runAllTimers();
    expect(win.history.length).toBe(3);
    win.back();
    expect(nav.read('section')).toBe('client_portal');
    expect(nav.read('portalScope')).toBeUndefined();
    win.back();
    expect(nav.read('section')).toBeUndefined(); // la entrada inicial → valores por defecto
    win.forward();
    win.forward();
    expect(nav.read('portalScope')).toEqual({ id: 'cu-argentina' });
    expect(seen.at(-1)).toEqual({ id: 'cu-argentina' });
  });

  it('replace no suma una entrada', () => {
    const win = fakeWindow();
    const nav = createNavHistory(win);
    nav.set('invoicing.month', '2026-11', { replace: true });
    vi.runAllTimers();
    expect(win.history.length).toBe(1);
    expect(win.history.state[NAV_STATE_KEY]).toEqual({ 'invoicing.month': '2026-11' });
  });

  it('un replace dentro de la misma acción queda en la entrada nueva', () => {
    const win = fakeWindow();
    const nav = createNavHistory(win);
    nav.set('section', 'invoicing', { reset: true });
    nav.set('invoicing.month', '2026-11', { replace: true });
    vi.runAllTimers();
    expect(win.history.length).toBe(2);
    expect(win.history.state[NAV_STATE_KEY]).toEqual({ section: 'invoicing', 'invoicing.month': '2026-11' });
  });

  it('sin cambios reales no suma entradas', () => {
    const win = fakeWindow({ [NAV_STATE_KEY]: { section: 'main' } });
    const nav = createNavHistory(win);
    nav.startEntry({ section: 'main' });
    vi.runAllTimers();
    expect(win.history.length).toBe(1);
  });

  it('reset borra las claves de la sección anterior', () => {
    const win = fakeWindow();
    const nav = createNavHistory(win);
    nav.startEntry({ section: 'campaigns' });
    nav.set('pilares.tab', 'email');
    vi.runAllTimers();
    nav.set('section', 'main', { reset: true });
    vi.runAllTimers();
    expect(nav.read('pilares.tab')).toBeUndefined();
    expect(win.history.state[NAV_STATE_KEY]).toEqual({ section: 'main' });
  });

  it('al recargar arranca desde lo guardado en la entrada', () => {
    const win = fakeWindow({ [NAV_STATE_KEY]: { section: 'plans', 'plans.open': 7 } });
    const nav = createNavHistory(win);
    expect(nav.read('section')).toBe('plans');
    expect(nav.read('plans.open')).toBe(7);
  });

  it('un cambio sin grabar se descarta si llega un atrás', () => {
    const win = fakeWindow();
    const nav = createNavHistory(win);
    nav.startEntry({ section: 'plans' });
    vi.runAllTimers();
    nav.set('plans.open', 3);
    win.back();
    vi.runAllTimers();
    expect(win.history.length).toBe(2);
    expect(nav.read('section')).toBeUndefined();
  });
});

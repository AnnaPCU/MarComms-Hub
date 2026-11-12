// ════════════════════════════════════════════════════════════════════
// navHistory — «Atrás» y «Adelante» del navegador dentro del Hub
// ════════════════════════════════════════════════════════════════════
// El Hub navega por estado de React (sin rutas), así que el navegador no
// se enteraba de nada: «atrás» salía del Hub. Acá se guarda el estado de
// navegación (sección, pestaña, detalle abierto…) en history.state, una
// entrada por acción, y al ir atrás o adelante se avisa a cada parte del
// Hub para que vuelva a ese estado. La URL no cambia.
//
// - set(key, value): cambia una clave. Los cambios de una misma acción
//   (varios setState en un clic, más los efectos que disparan) se juntan
//   en una sola entrada: se graban un instante después (setTimeout 0).
// - { replace: true }: el cambio no es una acción de la persona (ej. el mes
//   que se elige solo al cargar): pisa la entrada actual, no suma una.
// - startEntry(base): arranca una entrada nueva desde cero (cambio de
//   sección desde el menú): las claves de la sección anterior se borran y
//   cada parte vuelve a su valor inicial.
// - Al recargar la página se vuelve al mismo lugar (history.state queda).
//
// Uso en componentes: hooks useNavState / useNavSync (src/hooks/useNavState.js).
// ════════════════════════════════════════════════════════════════════

export const NAV_STATE_KEY = 'hubNav';

// Comparación estable (el orden de las claves no importa)
const stable = (obj) => JSON.stringify(Object.keys(obj).sort().map((k) => [k, obj[k]]));

export function createNavHistory(win) {
  const listeners = new Set();
  let current = null; // estado vigente (incluye lo que todavía no se grabó)
  let entry = null;   // lo que tiene grabado la entrada actual del historial
  let pending = null; // 'push' | 'replace' | null
  let timer = null;

  const readEntry = (state) => {
    const s = state && state[NAV_STATE_KEY];
    return s && typeof s === 'object' ? { ...s } : {};
  };

  const notify = () => { listeners.forEach((fn) => fn()); };

  const onPop = (e) => {
    if (timer) { clearTimeout(timer); timer = null; }
    pending = null;
    current = readEntry(e.state);
    entry = { ...current };
    notify();
  };

  const init = () => {
    if (current) return;
    current = readEntry(win?.history?.state);
    entry = { ...current };
    win?.addEventListener?.('popstate', onPop);
  };

  const flush = () => {
    timer = null;
    const mode = pending;
    pending = null;
    if (!win?.history || stable(current) === stable(entry)) return;
    entry = { ...current };
    if (mode === 'push') {
      win.history.pushState({ [NAV_STATE_KEY]: entry }, '');
    } else {
      win.history.replaceState({ ...(win.history.state || {}), [NAV_STATE_KEY]: entry }, '');
    }
  };

  const schedule = (mode) => {
    if (mode === 'push' || !pending) pending = mode;
    if (!timer) timer = setTimeout(flush, 0);
  };

  return {
    read(key) {
      init();
      return current[key];
    },
    set(key, value, { replace = false, reset = false } = {}) {
      init();
      if (reset) {
        current = { [key]: value };
        notify();
      } else {
        current = { ...current, [key]: value };
      }
      schedule(replace ? 'replace' : 'push');
    },
    startEntry(base = {}) {
      init();
      current = { ...base };
      notify();
      schedule('push');
    },
    subscribe(fn) {
      init();
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const navHistory = createNavHistory(typeof window !== 'undefined' ? window : null);

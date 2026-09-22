// ════════════════════════════════════════════════════════════════════
// useTheme — Modo claro / oscuro para todo el Hub
// ════════════════════════════════════════════════════════════════════
// Aplica la clase `dark` en <html> (Tailwind darkMode: 'class'). El
// tema oscuro remapea las utilidades claras desde src/index.css, así
// que no hace falta duplicar clases con dark: en cada componente.
//
// Preferencia guardada en localStorage: 'light' | 'dark' | 'system'.
// Por defecto sigue al sistema operativo.
//
// Devuelve { theme, resolved, setTheme, toggle }
//   theme    — la preferencia ('light' | 'dark' | 'system')
//   resolved — lo que se está mostrando ('light' | 'dark')
//   toggle() — alterna entre claro y oscuro (fija la preferencia)
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'marcomms_hub_theme_v1';

const readStored = () => {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch (_e) { return 'system'; }
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useTheme = () => {
  const [theme, setThemeState] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Seguir cambios del sistema mientras la preferencia sea 'system'
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange); };
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      if (next === 'system') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch (_e) { /* storage deshabilitado */ }
  }, []);

  const toggle = useCallback(() => setTheme(resolved === 'dark' ? 'light' : 'dark'), [resolved, setTheme]);

  return { theme, resolved, setTheme, toggle };
};

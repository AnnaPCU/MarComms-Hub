// ════════════════════════════════════════════════════════════════════
// useTheme — Modo claro / oscuro para todo el Hub
// ════════════════════════════════════════════════════════════════════
// Aplica la clase `dark` en <html> (Tailwind darkMode: 'class'). El
// tema oscuro remapea las utilidades claras desde src/index.css, así
// que no hace falta duplicar clases con dark: en cada componente.
//
// Preferencia guardada en localStorage: 'light' | 'dark'.
// Por defecto es CLARO para todos: el modo oscuro solo se activa si la
// persona lo elige (no se sigue la preferencia del sistema operativo).
//
// Devuelve { theme, resolved, setTheme, toggle }
//   theme    — la preferencia ('light' | 'dark')
//   resolved — igual a theme (se mantiene por compatibilidad)
//   toggle() — alterna entre claro y oscuro (fija la preferencia)
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'marcomms_hub_theme_v1';

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch (_e) { return 'light'; }
};

export const useTheme = () => {
  const [theme, setThemeState] = useState(readStored);
  const resolved = theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = useCallback((next) => {
    const value = next === 'dark' ? 'dark' : 'light';
    setThemeState(value);
    try {
      if (value === 'light') window.localStorage.removeItem(STORAGE_KEY); // claro = default, no hace falta guardarlo
      else window.localStorage.setItem(STORAGE_KEY, value);
    } catch (_e) { /* storage deshabilitado */ }
  }, []);

  const toggle = useCallback(() => setTheme(resolved === 'dark' ? 'light' : 'dark'), [resolved, setTheme]);

  return { theme, resolved, setTheme, toggle };
};

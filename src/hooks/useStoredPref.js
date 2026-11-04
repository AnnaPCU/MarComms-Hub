// ════════════════════════════════════════════════════════════════════
// useStoredPref — Preferencia de vista guardada por navegador
// ════════════════════════════════════════════════════════════════════
// Para cosas como «vista compacta» o «lista / tabla»: se recuerdan en
// localStorage (por navegador, no por usuario en la base). Si el
// navegador no deja guardar (modo privado), funciona igual sin recordar.
//
// Uso: const [compact, setCompact] = useStoredPref('marcomms_hub_fact_compact', false);
// ════════════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';

const read = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_e) {
    return fallback;
  }
};

export const useStoredPref = (key, fallback) => {
  const [value, setValue] = useState(() => read(key, fallback));
  const set = useCallback((next) => {
    setValue((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (_e) { /* sin memoria: sigue igual */ }
      return v;
    });
  }, [key]);
  return [value, set];
};

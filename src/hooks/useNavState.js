// ════════════════════════════════════════════════════════════════════
// useNavState / useNavSync — estado que sigue al «atrás» del navegador
// ════════════════════════════════════════════════════════════════════
// useNavState(key, initial, { reset }) — como useState, pero cada cambio
//   es una acción del historial del navegador (ver src/services/navHistory.js).
//   Para pestañas, sección, plan abierto… (valores simples: texto, número,
//   null u objetos planos). El setter acepta { replace: true } para los
//   cambios automáticos (efectos), que no tienen que sumar un «atrás».
//   reset: true = al cambiar, arranca una entrada nueva (la sección).
//
// useNavSync(key, value, apply, deps) — para lo que ya tiene su propio
//   estado (ej. el webinar abierto guarda el objeto): `value` es lo que se
//   guarda en el historial (el id o null) y `apply(navValue)` lo vuelve a
//   abrir al ir atrás / adelante. Si apply devuelve false (todavía no
//   cargó la lista), se reintenta cuando cambian `deps`.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { navHistory } from '@/services/navHistory';

export function useNavState(key, initial, { reset = false } = {}) {
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const read = () => {
    const v = navHistory.read(key);
    return v === undefined ? initialRef.current : v;
  };
  const [value, setValue] = useState(read);
  const valueRef = useRef(value);

  useEffect(() => navHistory.subscribe(() => {
    const v = read();
    if (Object.is(v, valueRef.current)) return;
    valueRef.current = v;
    setValue(v);
  }), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback((next, { replace = false } = {}) => {
    const v = typeof next === 'function' ? next(valueRef.current) : next;
    if (Object.is(v, valueRef.current)) return;
    valueRef.current = v;
    setValue(v);
    navHistory.set(key, v, { replace, reset });
  }, [key, reset]);

  return [value, set];
}

export function useNavSync(key, value, apply, deps = []) {
  const [navValue, setNavValue] = useNavState(key, null);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const prev = useRef({ value, navValue, pending: navValue !== null && !Object.is(navValue, value) });

  useEffect(() => {
    const p = prev.current;
    if (!Object.is(navValue, p.navValue)) {
      // Vino del historial (atrás / adelante) o es el eco de nuestro propio cambio
      p.navValue = navValue;
      p.pending = !Object.is(navValue, value) && applyRef.current(navValue) === false;
    } else if (!Object.is(value, p.value)) {
      // La persona abrió / cerró algo en el Hub → acción nueva del historial
      p.pending = false;
      if (!Object.is(value, navValue)) setNavValue(value);
    } else if (p.pending) {
      p.pending = applyRef.current(navValue) === false;
    }
    p.value = value;
  }, [navValue, value, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Cambio de sección desde el menú: entrada nueva, sin lo de la sección anterior
export const startNavEntry = (base) => navHistory.startEntry(base);
// Graba un valor en la entrada actual sin sumar un «atrás» (ej. al arrancar)
export const seedNav = (key, value) => navHistory.set(key, value, { replace: true });

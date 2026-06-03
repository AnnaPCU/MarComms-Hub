// ════════════════════════════════════════════════════════════════════
// useOnClickOutside — Cierra UI cuando se hace mousedown fuera del ref
// ════════════════════════════════════════════════════════════════════
// Más confiable que un overlay con z-index, porque escucha el evento
// a nivel `document` sin depender del stacking context.
//
// Soporta uno o varios refs (útil cuando el botón que abre el menú está
// fuera del contenedor del dropdown — clicks sobre el botón no deben
// disparar el cierre, porque ya hace toggle).
//
// Uso:
//   const ref = useRef(null);
//   useOnClickOutside(ref, () => setOpen(false), open);
//   // o múltiples refs:
//   useOnClickOutside([ref, triggerRef], () => setOpen(false), open);
// ════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';

export const useOnClickOutside = (refOrRefs, handler, enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined;
    const refs = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs];

    const listener = (event) => {
      const target = event.target;
      const inside = refs.some(
        (r) => r && r.current && r.current.contains(target),
      );
      if (!inside) handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refOrRefs, handler, enabled]);
};

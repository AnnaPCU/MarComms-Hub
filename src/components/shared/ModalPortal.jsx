// ════════════════════════════════════════════════════════════════════
// ModalPortal — Renderiza children directamente en document.body
// ════════════════════════════════════════════════════════════════════
// Saca el modal de cualquier stacking context / ancestro con transform
// (como los wrappers con animate-in), garantizando que el `fixed inset-0`
// se posicione respecto al viewport y quede centrado y por encima de todo.
// ════════════════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';

export default function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

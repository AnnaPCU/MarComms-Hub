// ════════════════════════════════════════════════════════════════════
// StatusChip — Estado del cobro de una fila (Pendiente → Facturado → Cobrado)
// ════════════════════════════════════════════════════════════════════
// Cliquear pasa al estado siguiente (y de Cobrado vuelve a Pendiente).
// Props: status (id), onChange(nextId), disabled, size ('xs' | 'sm')
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { INVOICE_STATUSES, INVOICE_STATUS_BY_ID, INVOICE_STATUS_IDS, PENDING_STATUS } from '@/constants/invoicing';

export const nextStatus = (id) => INVOICE_STATUS_IDS[(Math.max(0, INVOICE_STATUS_IDS.indexOf(id)) + 1) % INVOICE_STATUS_IDS.length];

export default function StatusChip({ status = PENDING_STATUS, onChange, disabled = false, size = 'xs' }) {
  const s = INVOICE_STATUS_BY_ID[status] || INVOICE_STATUS_BY_ID[PENDING_STATUS];
  const next = INVOICE_STATUS_BY_ID[nextStatus(s.id)];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(next.id)}
      title={disabled ? s.label : `${s.label} · cliqueá para pasar a ${next.label}`}
      aria-label={`Estado: ${s.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-black uppercase tracking-wider transition-colors disabled:cursor-default ${size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-2 py-0.5 text-[9px]'} ${s.chip} ${disabled ? '' : 'hover:brightness-95'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </button>
  );
}

export { INVOICE_STATUSES };

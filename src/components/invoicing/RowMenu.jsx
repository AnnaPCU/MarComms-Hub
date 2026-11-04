// ════════════════════════════════════════════════════════════════════
// RowMenu — Menú de una fila de Facturación (⋯ al lado del número)
// ════════════════════════════════════════════════════════════════════
// Props: actions ([{ label, onClick, danger?, disabled? }]), onClose
// ════════════════════════════════════════════════════════════════════

import React from 'react';

export default function RowMenu({ actions = [], onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="hub-popover absolute left-full top-0 ml-1 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1" role="menu">
        {actions.map((a) => (
          <button
            key={a.label}
            role="menuitem"
            disabled={a.disabled}
            onClick={() => { onClose(); a.onClick(); }}
            className={`w-full text-left px-3 py-2 text-xs font-bold disabled:opacity-40 ${a.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </>
  );
}

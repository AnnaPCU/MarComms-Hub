// ════════════════════════════════════════════════════════════════════
// useConfirm — Confirmación reutilizable basada en promesas
// ════════════════════════════════════════════════════════════════════
// Reemplaza los window.confirm() y los modales ad-hoc de confirmación.
//
// Uso:
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: '¿Eliminar webinar?',
//     message: 'Esta acción no se puede deshacer.',
//     confirmText: 'Eliminar',
//     tone: 'danger',          // 'danger' | 'warning' | 'info'
//   });
//   if (ok) { ...borrar... }
//
// Requiere que <ConfirmProvider> envuelva la app (ver main.jsx / App).
// ════════════════════════════════════════════════════════════════════

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ConfirmContext = createContext(null);

const TONES = {
  danger: {
    icon: AlertTriangle,
    iconWrap: 'bg-red-100 text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
    ring: 'focus:ring-red-400',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-100 text-amber-600',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
    ring: 'focus:ring-amber-400',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-indigo-100 text-indigo-600',
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    ring: 'focus:ring-indigo-400',
  },
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-100 text-emerald-600',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    ring: 'focus:ring-emerald-400',
  },
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { opts } | null
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title:       opts.title || '¿Estás seguro?',
        message:     opts.message || '',
        confirmText: opts.confirmText || 'Confirmar',
        cancelText:  opts.cancelText || 'Cancelar',
        tone:        opts.tone || 'danger',
      });
    });
  }, []);

  const close = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setState(null);
  }, []);

  const tone = state ? (TONES[state.tone] || TONES.danger) : TONES.danger;
  const ToneIcon = tone.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => close(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tone.iconWrap}`}>
                <ToneIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 leading-tight">{state.title}</h3>
                {state.message && (
                  <p className="text-sm text-slate-500 mt-1.5 font-medium leading-relaxed">{state.message}</p>
                )}
              </div>
              <button
                onClick={() => close(false)}
                className="text-slate-300 hover:text-slate-600 transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => close(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                {state.cancelText}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all outline-none focus:ring-2 ${tone.confirmBtn} ${tone.ring}`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Devuelve la función confirm(opts) => Promise<boolean>.
 * Si no hay provider (ej. en tests), devuelve un fallback a window.confirm.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback defensivo — no debería pasar si el provider está montado
    return ({ message, title } = {}) =>
      Promise.resolve(typeof window !== 'undefined'
        ? window.confirm(`${title || ''}\n${message || ''}`.trim())
        : true);
  }
  return ctx;
}

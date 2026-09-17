// ════════════════════════════════════════════════════════════════════
// NotificationToasts — Pop-ups de notificaciones nuevas (abajo a la derecha)
// ════════════════════════════════════════════════════════════════════
// Aparecen cuando llega una notificación nueva mientras la persona está
// en la app. Cliquear el toast abre el módulo correspondiente; la X lo
// cierra. Se van solos a los 9 segundos (ver useNotificationAlerts).
//
// Props:
//   toasts     — [{ id, title, shortTitle, project, source, color, icon, navTo }]
//   onOpen(n)  — abrir la notificación (navega + marca leída)
//   onDismiss(id)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Bell, X } from 'lucide-react';
import ModalPortal from './ModalPortal';

const COLOR = {
  red:    'border-red-200 bg-red-50 text-red-600',
  amber:  'border-amber-200 bg-amber-50 text-amber-600',
  purple: 'border-purple-200 bg-purple-50 text-purple-600',
  pink:   'border-pink-200 bg-pink-50 text-pink-600',
  cyan:   'border-cyan-200 bg-cyan-50 text-cyan-600',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-600',
};

export default function NotificationToasts({ toasts, onOpen, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <ModalPortal>
      <div className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]" aria-live="polite">
        {toasts.map((n) => {
          const Icon = n.icon || Bell;
          const cls = COLOR[n.color] || COLOR.indigo;
          return (
            <div
              key={n.id}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 flex items-start gap-3 animate-fade-in"
              role="status"
            >
              <button
                onClick={() => onOpen && onOpen(n)}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cls}`}
                title="Abrir"
              >
                <Icon className="w-4 h-4" />
              </button>
              <button onClick={() => onOpen && onOpen(n)} className="flex-1 min-w-0 text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nueva notificación · {n.source}</p>
                <p className="text-xs font-black text-slate-800 leading-snug mt-0.5">{n.title}</p>
                {n.project && <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">{n.project}</p>}
              </button>
              <button
                onClick={() => onDismiss && onDismiss(n.id)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          );
        })}
      </div>
    </ModalPortal>
  );
}

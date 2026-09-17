// ════════════════════════════════════════════════════════════════════
// NotificationsWelcomeModal — "Tenés N notificaciones sin leer"
// ════════════════════════════════════════════════════════════════════
// Se muestra al loguearse (o al abrir la app en una pestaña nueva) si hay
// notificaciones sin leer. Lista las pendientes, permite ir a cada una,
// marcar todas como leídas y activar los avisos del navegador.
//
// Props:
//   open, onClose
//   userName
//   notifications      — solo las sin leer
//   onOpen(n)          — navega + marca leída
//   onMarkAllRead()
//   browserPermission  — 'default' | 'granted' | 'denied' | 'unsupported'
//   onEnableBrowser()  — pide permiso (necesita gesto del usuario)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Bell, BellRing, ChevronRight, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { summarizeUnread } from '@/utils/notificationAlerts';

const COLOR = {
  red:    'bg-red-50 text-red-600 border-red-100',
  amber:  'bg-amber-50 text-amber-600 border-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  pink:   'bg-pink-50 text-pink-600 border-pink-100',
  cyan:   'bg-cyan-50 text-cyan-600 border-cyan-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
};

export default function NotificationsWelcomeModal({
  open, onClose, userName, notifications, onOpen, onMarkAllRead, browserPermission, onEnableBrowser,
}) {
  if (!open) return null;
  const list = notifications || [];
  const firstName = (userName || '').split(' ')[0];

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  {firstName ? `Hola ${firstName}, ` : ''}tenés {list.length} {list.length === 1 ? 'notificación' : 'notificaciones'} sin leer
                </h2>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">{summarizeUnread(list)}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar">
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {list.map((n) => {
              const Icon = n.icon || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => onOpen && onOpen(n)}
                  className="w-full p-3 hover:bg-slate-50 text-left flex items-start gap-3 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${COLOR[n.color] || COLOR.indigo}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 leading-snug">{n.title}</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                      {n.project}{n.source ? ` · ${n.source}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-2">
            {browserPermission === 'default' && (
              <button
                onClick={onEnableBrowser}
                className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-2 rounded-lg flex items-center gap-1.5"
                title="Recibir avisos aunque la pestaña esté en segundo plano"
              >
                <Bell className="w-3.5 h-3.5" /> Activar avisos del navegador
              </button>
            )}
            {browserPermission === 'granted' && (
              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1"><Bell className="w-3 h-3" /> Avisos del navegador activos</span>
            )}
            {browserPermission === 'denied' && (
              <span className="text-[10px] font-bold text-slate-400">Avisos del navegador bloqueados (se habilitan desde el candado de la barra de direcciones)</span>
            )}
            <div className="flex-1" />
            <button onClick={onMarkAllRead} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">
              Marcar todas como leídas
            </button>
            <button onClick={onClose} className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-700 px-4 py-2 rounded-lg">
              Entendido
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

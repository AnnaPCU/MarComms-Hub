// ════════════════════════════════════════════════════════════════════
// ClientRequestInfo — Datos del pedido del cliente (vista del Hub)
// ════════════════════════════════════════════════════════════════════
// Caja de solo lectura con lo que cargó el cliente desde el link de la
// cuenta (/?social=<token>): quién lo pidió y cuándo, redes, tipo, copy
// (con un botón grande «Copiar copy» para pegarlo tal cual en LinkedIn /
// Instagram / HubSpot), notas, link y archivos. Se usa en el editor
// del posteo (PostEditor) y en el panel del calendario.
//
// Si el cliente lo editó desde el link (migration 0080), lo avisa arriba
// con la fecha y la hora de la última edición.
//
// Props: post, compact (sin el copy completo, para el panel del calendario)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, Copy, Download, Inbox } from 'lucide-react';
import { SOCIAL_NETWORK_BY_ID, CLIENT_POST_TYPE_BY_ID } from '@/constants/socialPosts';
import { mediaUrl } from '@/services/socialPostsService';
import { formatDate } from '@/utils/date';

const labelCls = 'text-[9px] font-black uppercase tracking-widest text-sky-700';

export default function ClientRequestInfo({ post, compact = false }) {
  const [copied, setCopied] = useState(false);
  const networks = (post.networks || []).map((n) => SOCIAL_NETWORK_BY_ID[n]?.label).filter(Boolean).join(' + ');
  const type = CLIENT_POST_TYPE_BY_ID[post.postType]?.label;
  // Copia el texto exacto (saltos de línea, hashtags y emojis incluidos).
  // Si el navegador no deja usar el portapapeles moderno, usa el método viejo.
  const copyText = async () => {
    const text = post.copy || '';
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_e) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { ok = document.execCommand('copy'); } catch (_e2) { ok = false; }
      area.remove();
    }
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-sky-800 flex items-center gap-1.5">
        <Inbox className="w-3.5 h-3.5" /> Pedido del cliente
      </p>
      <p className="text-[11px] font-bold text-slate-700">
        {post.requestedBy || 'Sin nombre'}{post.requestedAt ? ` · ${formatDate(String(post.requestedAt).slice(0, 10))}` : ''}
        {networks ? ` · ${networks}` : ''}{type ? ` · ${type}` : ''}
      </p>
      {post.clientEditedAt && (
        <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
          ✏️ El cliente editó el pedido el {formatDate(String(post.clientEditedAt).slice(0, 10))} a las {new Date(post.clientEditedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </p>
      )}
      {post.copy && (
        <div>
          <p className={labelCls}>Copy</p>
          <p className={`text-xs text-slate-700 leading-snug whitespace-pre-line mt-0.5 bg-white border border-sky-100 rounded-lg p-2 ${compact ? 'line-clamp-4' : 'max-h-48 overflow-y-auto'}`}>{post.copy}</p>
          <button
            type="button"
            onClick={copyText}
            title="Copia el texto tal cual lo mandó el cliente, para pegarlo al publicar"
            className={`mt-1.5 w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors ${copied ? 'bg-emerald-600' : 'bg-pink-600 hover:bg-pink-700'}`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copy copiado' : 'Copiar copy'}
          </button>
        </div>
      )}
      {post.requestNotes && (
        <div>
          <p className={labelCls}>Notas del cliente</p>
          <p className="text-xs text-slate-700 leading-snug whitespace-pre-line">{post.requestNotes}</p>
        </div>
      )}
      {(post.media || []).length > 0 && (
        <div>
          <p className={labelCls}>Archivos ({post.media.length})</p>
          <ul className="mt-0.5 space-y-0.5">
            {post.media.map((m) => (
              <li key={m.path}>
                <a href={mediaUrl(m.path)} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1 min-w-0">
                  <Download className="w-3 h-3 shrink-0" /><span className="truncate">{m.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

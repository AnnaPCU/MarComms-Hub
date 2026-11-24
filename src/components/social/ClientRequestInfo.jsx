// ════════════════════════════════════════════════════════════════════
// ClientRequestInfo — Datos del pedido del cliente (vista del Hub)
// ════════════════════════════════════════════════════════════════════
// Caja de solo lectura con lo que cargó el cliente desde el link de la
// cuenta (/?social=<token>): quién lo pidió y cuándo, redes, tipo, copy
// (con botón para copiarlo), notas, link y archivos. Se usa en el editor
// del posteo (PostEditor) y en el panel del calendario.
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
  const copyText = async () => {
    try { await navigator.clipboard.writeText(post.copy || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_e) { /* sin permiso */ }
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
      {post.copy && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className={labelCls}>Copy</p>
            <button type="button" onClick={copyText} className="text-[9px] font-black uppercase tracking-wider text-sky-700 hover:text-sky-900 flex items-center gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className={`text-xs text-slate-700 leading-snug whitespace-pre-line mt-0.5 bg-white border border-sky-100 rounded-lg p-2 ${compact ? 'line-clamp-4' : 'max-h-48 overflow-y-auto'}`}>{post.copy}</p>
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

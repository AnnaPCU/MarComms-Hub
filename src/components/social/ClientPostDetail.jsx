// ════════════════════════════════════════════════════════════════════
// ClientPostDetail — Detalle de un posteo en el link del cliente
// ════════════════════════════════════════════════════════════════════
// Panel lateral de SocialPublicPage al cliquear un posteo del calendario:
// estado, fecha, redes, tipo, temática y, si lo pidió el cliente, el copy,
// sus notas, el link y los archivos. Nunca las notas internas del equipo
// (get_public_social_account no las devuelve).
//
// Si es un pedido del cliente, abajo va «Editar pedido»: abre el formulario
// en modo edición (onEdit) si sigue «En proceso»; si ya pasó a Listo,
// Aprobado o Programado, muestra el aviso de escribirle a la responsable
// (texts.locked) y no deja cambiar nada (migration 0080).
//
// Props: post, onClose(), c (colores de la marca), texts (socialClientTexts),
//   onEdit(post)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Film, Lock, Pencil, X } from 'lucide-react';
import { POST_STATUS_BY_ID, SOCIAL_NETWORK_BY_ID, CLIENT_POST_TYPE_BY_ID, SCHEDULE_PLATFORM_BY_ID } from '@/constants/socialPosts';
import { WORLD_DAY_THEME_BY_ID } from '@/constants/worldDays';
import { isClientRequest, canClientEdit } from '@/utils/socialClient';
import { mediaUrl } from '@/services/socialPostsService';
import { formatDate } from '@/utils/date';

const labelCls = 'text-[10px] font-bold uppercase tracking-widest';

export default function ClientPostDetail({ post, onClose, c, texts, onEdit }) {
  const [showLocked, setShowLocked] = useState(false);
  const st = POST_STATUS_BY_ID[post.status];
  const theme = WORLD_DAY_THEME_BY_ID[post.theme];
  const networks = (post.networks || []).map((n) => SOCIAL_NETWORK_BY_ID[n]?.label).filter(Boolean);
  const type = CLIENT_POST_TYPE_BY_ID[post.postType]?.label;
  const when = [post.publishDate ? formatDate(post.publishDate) : 'Sin fecha', post.publishTime ? `${post.publishTime} h` : '', SCHEDULE_PLATFORM_BY_ID[post.scheduledOn]?.label || ''].filter(Boolean).join(' · ');

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={labelCls} style={{ color: c.label }}>Posteo · {when}</p>
          <h3 className="text-sm font-bold leading-snug mt-0.5" style={{ color: c.dark }}>{post.title}</h3>
          {isClientRequest(post) && post.requestedBy && <p className="text-[11px] mt-0.5">Pedido por {post.requestedBy}</p>}
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-3.5 h-3.5 text-slate-500" /></button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {st && <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${st.solid}`}>{st.label}</span>}
        {type && <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200 bg-slate-50 text-slate-600">{type}</span>}
        {networks.map((n) => <span key={n} className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200 bg-white text-slate-600">{n}</span>)}
        {theme && <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${theme.color}`}>{theme.label}</span>}
      </div>

      {post.copy && (
        <div>
          <p className={labelCls} style={{ color: c.label }}>Copy</p>
          <p className="text-xs leading-relaxed whitespace-pre-line mt-1 rounded-xl border border-slate-100 bg-slate-50 p-2.5">{post.copy}</p>
        </div>
      )}
      {post.requestNotes && (
        <div>
          <p className={labelCls} style={{ color: c.label }}>Notas del pedido</p>
          <p className="text-xs leading-relaxed whitespace-pre-line mt-1">{post.requestNotes}</p>
        </div>
      )}
      {post.link && <a href={post.link} target="_blank" rel="noreferrer" className="text-xs hover:underline break-all block" style={{ color: c.link }}>{post.link}</a>}
      {(post.media || []).length > 0 && (
        <div>
          <p className={labelCls} style={{ color: c.label }}>Archivos</p>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {post.media.map((m) => (
              <a key={m.path} href={mediaUrl(m.path)} target="_blank" rel="noreferrer" title={m.name} className="block rounded-lg border border-slate-200 overflow-hidden bg-slate-50 aspect-square">
                {String(m.type || '').startsWith('image/')
                  ? <img src={mediaUrl(m.path)} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                  : <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-[9px] font-bold text-slate-500 p-1 text-center"><Film className="w-4 h-4" /><span className="truncate w-full">{m.name}</span></span>}
              </a>
            ))}
          </div>
        </div>
      )}
      {isClientRequest(post) && onEdit && texts && (
        <div className="space-y-2">
          <button
            onClick={() => (canClientEdit(post) ? onEdit(post) : setShowLocked(true))}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest rounded-xl px-3 py-2 shadow-sm"
            style={{ background: c.primary, color: c.onPrimary }}
          >
            {canClientEdit(post) ? <Pencil className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {texts.edit}
          </button>
          {showLocked && !canClientEdit(post) && (
            <p role="alert" className="text-[11px] font-bold rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">{texts.locked(st?.label || '')}</p>
          )}
        </div>
      )}
      <button onClick={onClose} className="w-full text-[11px] font-bold uppercase tracking-widest rounded-xl px-3 py-2 border border-slate-200 hover:bg-slate-50" style={{ color: c.dark }}>
        Volver al pedido de posteo
      </button>
    </div>
  );
}

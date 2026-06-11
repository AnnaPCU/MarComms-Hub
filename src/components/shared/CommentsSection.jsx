// ════════════════════════════════════════════════════════════════════
// CommentsSection — Bloque de comentarios reusable
// ════════════════════════════════════════════════════════════════════
// Muestra una lista de comentarios + un textarea para agregar uno nuevo.
// Soporta distintos accent colors según el módulo donde se usa.
//
// Props:
//   campaignId      — id del proyecto al que pertenecen los comentarios
//   comments        — array de { id, date, text }
//   newComment      — state global { [campaignId]: textoActual }
//   setNewComment   — setter del state global
//   addComment      — (campaignId, text) => void
//   removeComment   — (campaignId, commentId) => void
//   accent          — 'blue' | 'amber' | 'emerald' | 'purple'
//   title           — header
//   placeholder     — placeholder del textarea
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { FileText, Trash2, Plus } from 'lucide-react';
import { PEOPLE } from '@/constants/team';
import MentionTextarea from './MentionTextarea';

const ACCENT_MAP = {
  blue:    { ring: 'focus:ring-blue-400',    btn: 'bg-blue-600 hover:bg-blue-700',       icon: 'text-blue-500',    chip: 'bg-blue-50 border-blue-100' },
  amber:   { ring: 'focus:ring-amber-400',   btn: 'bg-amber-600 hover:bg-amber-700',     icon: 'text-amber-500',   chip: 'bg-amber-50 border-amber-100' },
  emerald: { ring: 'focus:ring-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700', icon: 'text-emerald-500', chip: 'bg-emerald-50 border-emerald-100' },
  purple:  { ring: 'focus:ring-purple-400',  btn: 'bg-purple-600 hover:bg-purple-700',   icon: 'text-purple-500',  chip: 'bg-purple-50 border-purple-100' },
};

const formatCommentDate = (iso) => {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return '';
  }
};

export default function CommentsSection({
  campaignId,
  comments,
  newComment,
  setNewComment,
  addComment,
  removeComment,
  accent = 'blue',
  title = 'Comentarios',
  placeholder = 'Escribe un comentario...',
}) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.blue;
  const value = newComment[campaignId] || '';

  return (
    <div className={`p-5 rounded-2xl border-2 ${a.chip}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-black text-xs uppercase flex items-center gap-2 text-slate-700">
          <FileText className={`w-4 h-4 ${a.icon}`} /> {title}
        </h4>
        <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
          {(comments || []).length}
        </span>
      </div>

      {(comments || []).length > 0 ? (
        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto pr-1">
          {comments.map((cm) => (
            <div key={cm.id} className="bg-white p-3 rounded-xl border border-slate-100 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {formatCommentDate(cm.date)}
                </p>
                <button
                  onClick={() => removeComment(campaignId, cm.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                </button>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                {cm.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 font-medium italic mb-3">Sin comentarios aún.</p>
      )}

      <div className="space-y-2">
        <MentionTextarea
          value={value}
          onChange={(text) => setNewComment({ ...newComment, [campaignId]: text })}
          placeholder={`${placeholder} — usá @ para etiquetar`}
          people={PEOPLE}
          ringClass={a.ring}
        />
        <button
          onClick={() => addComment(campaignId, value)}
          disabled={!value.trim()}
          className={`w-full p-2.5 rounded-lg ${a.btn} disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2`}
        >
          <Plus className="w-3 h-3" /> Agregar Comentario
        </button>
      </div>
    </div>
  );
}

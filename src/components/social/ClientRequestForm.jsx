// ════════════════════════════════════════════════════════════════════
// ClientRequestForm — Pedido de posteo desde el link del cliente
// ════════════════════════════════════════════════════════════════════
// Va en el panel lateral de SocialPublicPage (donde en el Hub están las
// «Próximas fechas»). Orden: quién lo pide → red social → tipo → fecha →
// temática → copy → archivos → link → notas. Unidad de negocio y país no se
// piden: salen de la cuenta del link.
//
// Al enviar: sube los archivos al bucket (carpeta del token) y después
// crea el posteo con submit_public_social_post (estado «En proceso»,
// marcado como pedido del cliente). Se ve enseguida en el calendario del
// link y en Posteos y Calendario del Hub. El nombre de quien pide queda
// recordado en el navegador (useStoredPref).
//
// Props: token, texts (socialClientTexts), c (colores de la marca),
//   todayIso, prefill ({ publishDate, theme, label, nonce } de un día
//   mundial), onSubmitted() — relee el calendario
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Paperclip, Trash2 } from 'lucide-react';
import DateFieldEs from '@/components/shared/DateFieldEs';
import { useStoredPref } from '@/hooks/useStoredPref';
import { SOCIAL_NETWORKS, CLIENT_POST_TYPES, CLIENT_MEDIA_MAX_FILES, CLIENT_MEDIA_MAX_MB } from '@/constants/socialPosts';
import { WORLD_DAY_THEMES } from '@/constants/worldDays';
import { clientRequestMissing, clientRequestPayload, mediaPath, mediaProblems } from '@/utils/socialClient';
import { submitClientRequest, uploadClientMedia } from '@/services/socialPostsService';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest';
const EMPTY = { networks: [], postType: '', publishDate: '', theme: '', copy: '', link: '', requestNotes: '' };
const COPY_MAX = 5000;

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const sizeLabel = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
// Mensajes de la base → texto para el cliente
const friendlyError = (e) => {
  const msg = String(e?.message || '');
  if (/ya pasó/.test(msg)) return 'La fecha de publicación tiene que ser de hoy en adelante.';
  if (/link inválido/.test(msg)) return 'Este link ya no está activo. Es necesario pedir el link actualizado.';
  if (/mime|type/i.test(msg)) return 'Alguno de los archivos no es una imagen o un video.';
  if (/size|large|exceed/i.test(msg)) return `Alguno de los archivos pesa más de ${CLIENT_MEDIA_MAX_MB} MB.`;
  return 'No se pudo enviar el pedido. Se puede volver a intentar en unos minutos.';
};

export default function ClientRequestForm({ token, texts, c, todayIso, prefill, onSubmitted }) {
  const [name, setName] = useStoredPref('marcomms_social_request_name', '');
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState('');   // texto del progreso mientras se envía
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [fromDay, setFromDay] = useState('');
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Día mundial cliqueado en el calendario → fecha y temática
  useEffect(() => {
    if (!prefill) return;
    setDone(false);
    setForm((f) => ({ ...f, publishDate: prefill.publishDate || f.publishDate, theme: prefill.theme || f.theme }));
    setFromDay(prefill.publishDate ? prefill.label : '');
  }, [prefill?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = { ...form, requestedBy: name };
  const missing = clientRequestMissing(data, todayIso);
  const fileIssues = mediaProblems(files);
  const toggleNetwork = (id) => set('networks', form.networks.includes(id) ? form.networks.filter((n) => n !== id) : [...form.networks, id]);
  // La lista del input es «viva»: se copia antes de limpiar el campo (si no, llega vacía)
  const addFiles = (list) => {
    const picked = Array.from(list || []);
    setFiles((prev) => [...prev, ...picked]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    setTried(true);
    setError('');
    if (missing.length || fileIssues.length || busy) return;
    try {
      const media = [];
      for (let i = 0; i < files.length; i += 1) {
        setBusy(`Subiendo archivo ${i + 1} de ${files.length}…`);
        media.push(await uploadClientMedia(mediaPath(token, files[i].name, newId()), files[i]));
      }
      setBusy('Enviando…');
      await submitClientRequest(token, clientRequestPayload(data, media));
      setForm(EMPTY); setFiles([]); setTried(false); setFromDay(''); setDone(true);
      onSubmitted?.();
    } catch (e) {
      console.error('[ClientRequestForm] no se pudo enviar:', e);
      setError(friendlyError(e));
    } finally {
      setBusy('');
    }
  };

  const chip = (active) => ({
    className: `px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${active ? 'border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`,
    style: active ? { background: c.primary, color: c.onPrimary } : undefined,
  });
  const err = (cond) => (tried && cond ? 'border-red-300 bg-red-50/40' : '');

  if (done) {
    return (
      <div className="space-y-3 text-center py-6">
        <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: c.primary }} />
        <p className="text-sm font-bold" style={{ color: c.dark }}>{texts.success}</p>
        <button onClick={() => setDone(false)} className="text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-2" style={{ background: c.primary, color: c.onPrimary }}>{texts.another}</button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div>
        <h3 className="text-base font-bold leading-tight" style={{ color: c.dark }}>{texts.formTitle}</h3>
        <p className="text-xs mt-0.5">{texts.formIntro}</p>
      </div>

      <div className="space-y-1">
        <label className={labelCls} style={{ color: c.label }} htmlFor="req-name">Nombre y apellido</label>
        <input id="req-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Quién pide el posteo" className={`${inputCls} ${err(!name.trim())}`} />
      </div>

      <div className="space-y-1">
        <p className={labelCls} style={{ color: c.label }}>Red social</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Red social">
          {SOCIAL_NETWORKS.map((n) => <button key={n.id} type="button" aria-pressed={form.networks.includes(n.id)} onClick={() => toggleNetwork(n.id)} {...chip(form.networks.includes(n.id))}>{n.label}</button>)}
        </div>
        <p className="text-[10px] opacity-70">Se pueden elegir las dos.</p>
      </div>

      <div className="space-y-1">
        <p className={labelCls} style={{ color: c.label }}>Tipo de posteo</p>
        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Tipo de posteo">
          {CLIENT_POST_TYPES.map((t) => <button key={t.id} type="button" aria-pressed={form.postType === t.id} onClick={() => set('postType', t.id)} {...chip(form.postType === t.id)}>{t.label}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls} style={{ color: c.label }} htmlFor="req-date">Fecha de publicación</label>
          <DateFieldEs id="req-date" value={form.publishDate} onChange={(v) => { set('publishDate', v); setFromDay(''); }} ariaLabel="Fecha de publicación" className={`!py-1 bg-slate-50 ${err(!form.publishDate || form.publishDate < todayIso)}`} />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: c.label }} htmlFor="req-theme">Temática</label>
          <select id="req-theme" value={form.theme} onChange={(e) => set('theme', e.target.value)} className={inputCls}>
            <option value="">Sin temática</option>
            {WORLD_DAY_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>
      {fromDay && <p className="text-[10px] -mt-2 opacity-80">Fecha y temática tomadas de «{fromDay}».</p>}

      <div className="space-y-1">
        <label className={labelCls} style={{ color: c.label }} htmlFor="req-copy">Copy</label>
        <textarea id="req-copy" rows={6} value={form.copy} maxLength={COPY_MAX} onChange={(e) => set('copy', e.target.value)} placeholder="Texto exacto a publicar, tal cual tiene que salir (con hashtags, menciones y emojis si van)" className={`${inputCls} resize-y leading-snug ${err(!form.copy.trim())}`} />
        <p className="text-[10px] text-right opacity-60 font-mono">{form.copy.length} / {COPY_MAX}</p>
      </div>

      <div className="space-y-1">
        <p className={labelCls} style={{ color: c.label }}>Imágenes o videos (opcional)</p>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={files.length >= CLIENT_MEDIA_MAX_FILES}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 px-3 py-3 text-[11px] font-bold text-slate-600 disabled:opacity-40">
          <Paperclip className="w-3.5 h-3.5" /> Adjuntar o arrastrar archivos
        </button>
        <p className="text-[10px] opacity-70">Hasta {CLIENT_MEDIA_MAX_FILES} archivos de hasta {CLIENT_MEDIA_MAX_MB} MB cada uno.</p>
        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                <span className="truncate flex-1">{f.name}</span>
                <span className="font-mono opacity-60 shrink-0">{sizeLabel(f.size || 0)}</span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 shrink-0" title="Quitar"><Trash2 className="w-3 h-3" /></button>
              </li>
            ))}
          </ul>
        )}
        {fileIssues.map((m) => <p key={m} className="text-[11px] font-bold text-red-600">{m}</p>)}
      </div>

      <div className="space-y-1">
        <label className={labelCls} style={{ color: c.label }} htmlFor="req-link">Link (opcional)</label>
        <input id="req-link" value={form.link} onChange={(e) => set('link', e.target.value)} maxLength={1000} placeholder="Landing, inscripción, Drive…" className={inputCls} />
      </div>

      <div className="space-y-1">
        <label className={labelCls} style={{ color: c.label }} htmlFor="req-notes">Notas (opcional)</label>
        <textarea id="req-notes" rows={3} value={form.requestNotes} maxLength={3000} onChange={(e) => set('requestNotes', e.target.value)} placeholder="Aclaraciones, referencias, a quién etiquetar…" className={`${inputCls} resize-y leading-snug`} />
      </div>

      {tried && missing.length > 0 && <p className="text-[11px] font-bold text-red-600">Falta: {missing.join(', ')}.</p>}
      {error && <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <button onClick={submit} disabled={!!busy} className="w-full text-xs font-bold uppercase tracking-widest rounded-xl px-4 py-3 shadow-sm disabled:opacity-60" style={{ background: c.primary, color: c.onPrimary }}>
        {busy || texts.submit}
      </button>
    </div>
  );
}

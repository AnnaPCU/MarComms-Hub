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
// Edición (nov 2026, migration 0080): con `editing` (un pedido del cliente
// «En proceso») arranca con sus datos, conserva sus archivos (se pueden
// quitar o sumar) y guarda con update_public_social_post. Quién lo pidió no
// cambia. Si mientras tanto el pedido pasó a otro estado, la base lo rechaza
// y se muestra el aviso de escribirle a la responsable (texts.locked).
//
// Copy: hasta CLIENT_COPY_MAX caracteres. Se puede escribir o pegar más
// (para no cortar el texto sin avisar), pero se marca en rojo y no se envía.
//
// Props: token, texts (socialClientTexts), c (colores de la marca),
//   todayIso, onSubmitted() — relee el calendario, editing (pedido a
//   editar), onCancel() y onDone() — salir de la edición
// ════════════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import { CheckCircle2, Paperclip, Trash2 } from 'lucide-react';
import DateFieldEs from '@/components/shared/DateFieldEs';
import { useStoredPref } from '@/hooks/useStoredPref';
import { SOCIAL_NETWORKS, CLIENT_POST_TYPES, CLIENT_MEDIA_MAX_FILES, CLIENT_MEDIA_MAX_MB, CLIENT_COPY_MAX } from '@/constants/socialPosts';
import { WORLD_DAY_THEMES } from '@/constants/worldDays';
import { clientRequestMissing, clientRequestPayload, mediaPath, mediaProblems, copyLength, clientRequestForm, clientEditTitle } from '@/utils/socialClient';
import { submitClientRequest, updateClientRequest, uploadClientMedia } from '@/services/socialPostsService';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest';
const EMPTY = { networks: [], postType: '', publishDate: '', theme: '', copy: '', link: '', requestNotes: '' };
const fmtNum = (n) => n.toLocaleString('es-AR');

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const sizeLabel = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
// Mensajes de la base → texto para el cliente
const friendlyError = (e) => {
  const msg = String(e?.message || '');
  if (/copy demasiado largo/.test(msg)) return `El copy supera los ${fmtNum(CLIENT_COPY_MAX)} caracteres permitidos en redes sociales.`;
  if (/ya pasó/.test(msg)) return 'La fecha de publicación tiene que ser de hoy en adelante.';
  if (/link inválido/.test(msg)) return 'Este link ya no está activo. Es necesario pedir el link actualizado.';
  if (/mime|type/i.test(msg)) return 'Alguno de los archivos no es una imagen o un video.';
  if (/size|large|exceed/i.test(msg)) return `Alguno de los archivos pesa más de ${CLIENT_MEDIA_MAX_MB} MB.`;
  return 'No se pudo enviar el pedido. Se puede volver a intentar en unos minutos.';
};

export default function ClientRequestForm({ token, texts, c, todayIso, onSubmitted, editing = null, onCancel, onDone }) {
  const [storedName, setName] = useStoredPref('marcomms_social_request_name', '');
  const name = editing ? editing.requestedBy : storedName;
  const [form, setForm] = useState(() => (editing ? clientRequestForm(editing) : EMPTY));
  const [kept, setKept] = useState(() => (editing ? [...(editing.media || [])] : [])); // archivos que ya tenía el pedido
  const [files, setFiles] = useState([]);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState('');   // texto del progreso mientras se envía
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false); // el pedido cambió de estado mientras se editaba
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const data = { ...form, requestedBy: name };
  // Al editar, la fecha que ya tenía se puede dejar aunque haya pasado (la base hace lo mismo)
  const keepsOldDate = editing && form.publishDate === editing.publishDate;
  const missing = clientRequestMissing(data, keepsOldDate ? '' : todayIso);
  const fileIssues = mediaProblems(files);
  if (kept.length + files.length > CLIENT_MEDIA_MAX_FILES && !fileIssues.length) fileIssues.push(`Se pueden adjuntar hasta ${CLIENT_MEDIA_MAX_FILES} archivos.`);
  const copyLen = copyLength(form.copy);
  const copyOver = copyLen > CLIENT_COPY_MAX;
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
    if (missing.length || fileIssues.length || copyOver || busy) return;
    try {
      const media = [...kept];
      for (let i = 0; i < files.length; i += 1) {
        setBusy(`Subiendo archivo ${i + 1} de ${files.length}…`);
        media.push(await uploadClientMedia(mediaPath(token, files[i].name, newId()), files[i]));
      }
      if (editing) {
        setBusy('Guardando…');
        const payload = clientRequestPayload(data, media);
        await updateClientRequest(token, editing.id, { ...payload, title: clientEditTitle(editing, form) });
        setFiles([]); setTried(false); setDone(true);
      } else {
        setBusy('Enviando…');
        await submitClientRequest(token, clientRequestPayload(data, media));
        setForm(EMPTY); setFiles([]); setTried(false); setDone(true);
      }
      onSubmitted?.();
    } catch (e) {
      console.error('[ClientRequestForm] no se pudo enviar:', e);
      if (/pedido no editable/.test(String(e?.message || ''))) {
        setLocked(true);
        onSubmitted?.();
      } else setError(friendlyError(e));
    } finally {
      setBusy('');
    }
  };

  const chip = (active) => ({
    className: `px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${active ? 'border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`,
    style: active ? { background: c.primary, color: c.onPrimary } : undefined,
  });
  const err = (cond) => (tried && cond ? 'border-red-300 bg-red-50/40' : '');

  if (locked) {
    return (
      <div className="space-y-3 text-center py-6">
        <p className="text-sm font-bold rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-3">{texts.locked('')}</p>
        <button onClick={onDone} className="text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-2" style={{ background: c.primary, color: c.onPrimary }}>{texts.back}</button>
      </div>
    );
  }

  if (done && editing) {
    return (
      <div className="space-y-3 text-center py-6">
        <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: c.primary }} />
        <p className="text-sm font-bold" style={{ color: c.dark }}>{texts.saved}</p>
        <button onClick={onDone} className="text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-2" style={{ background: c.primary, color: c.onPrimary }}>{texts.back}</button>
      </div>
    );
  }

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
        <h3 className="text-base font-bold leading-tight" style={{ color: c.dark }}>{editing ? texts.editTitle : texts.formTitle}</h3>
        <p className="text-xs mt-0.5">{editing ? texts.editIntro : texts.formIntro}</p>
      </div>

      {editing ? (
        <p className="text-[11px]">Pedido por <b>{editing.requestedBy || 'sin nombre'}</b></p>
      ) : (
        <div className="space-y-1">
          <label className={labelCls} style={{ color: c.label }} htmlFor="req-name">Nombre y apellido</label>
          <input id="req-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Quién pide el posteo" className={`${inputCls} ${err(!name.trim())}`} />
        </div>
      )}

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
          <DateFieldEs id="req-date" value={form.publishDate} onChange={(v) => set('publishDate', v)} ariaLabel="Fecha de publicación" className={`!py-1 bg-slate-50 ${err(!form.publishDate || (!keepsOldDate && form.publishDate < todayIso))}`} />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: c.label }} htmlFor="req-theme">Temática</label>
          <select id="req-theme" value={form.theme} onChange={(e) => set('theme', e.target.value)} className={inputCls}>
            <option value="">Sin temática</option>
            {WORLD_DAY_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelCls} style={{ color: c.label }} htmlFor="req-copy">Copy</label>
        <textarea id="req-copy" rows={6} value={form.copy} onChange={(e) => set('copy', e.target.value)} placeholder="Texto exacto a publicar, tal cual tiene que salir (con hashtags, menciones y emojis si van)" aria-invalid={copyOver} className={`${inputCls} resize-y leading-snug ${copyOver ? 'border-red-300 bg-red-50/40 focus:ring-red-200' : err(!form.copy.trim())}`} />
        <div className="flex items-start justify-between gap-2">
          {copyOver
            ? <p className="text-[11px] font-bold text-red-600" role="alert">Se pasó de los {fmtNum(CLIENT_COPY_MAX)} caracteres permitidos en las redes sociales: sobran {fmtNum(copyLen - CLIENT_COPY_MAX)}.</p>
            : <span />}
          <p className={`text-[10px] text-right font-mono shrink-0 ${copyOver ? 'text-red-600 font-bold' : 'opacity-60'}`}>{fmtNum(copyLen)} / {fmtNum(CLIENT_COPY_MAX)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <p className={labelCls} style={{ color: c.label }}>Imágenes o videos (opcional)</p>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {kept.length > 0 && (
          <ul className="space-y-1">
            {kept.map((m) => (
              <li key={m.path} className="flex items-center gap-2 text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                <span className="truncate flex-1">{m.name}</span>
                <span className="opacity-60 shrink-0">ya cargado</span>
                <button type="button" onClick={() => setKept((prev) => prev.filter((x) => x.path !== m.path))} className="text-slate-400 hover:text-red-500 shrink-0" title="Quitar"><Trash2 className="w-3 h-3" /></button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={kept.length + files.length >= CLIENT_MEDIA_MAX_FILES}
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

      {tried && copyOver && <p className="text-[11px] font-bold text-red-600">Hay que acortar el copy para poder {editing ? 'guardar' : 'enviar'}.</p>}

      <button onClick={submit} disabled={!!busy} className="w-full text-xs font-bold uppercase tracking-widest rounded-xl px-4 py-3 shadow-sm disabled:opacity-60" style={{ background: c.primary, color: c.onPrimary }}>
        {busy || (editing ? texts.save : texts.submit)}
      </button>
      {editing && (
        <button type="button" onClick={onCancel} disabled={!!busy} className="w-full text-[11px] font-bold uppercase tracking-widest rounded-xl px-3 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-60" style={{ color: c.dark }}>
          Cancelar
        </button>
      )}
    </div>
  );
}

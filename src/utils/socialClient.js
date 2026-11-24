// ════════════════════════════════════════════════════════════════════
// socialClient — Link de cada cuenta de Social Media (sin React)
// ════════════════════════════════════════════════════════════════════
//   socialAccountBrand(group)  — marca de la cuenta para el link
//   clientRequestTitle(form)   — título del posteo que crea el pedido
//   clientRequestMissing(form, todayIso) — qué falta para enviar
//   mediaProblems(files)       — archivos que no se pueden subir
//   mediaPath(token, file, id) — dónde se guarda cada archivo
//   clientRequestPayload(form, media) — lo que recibe la RPC
//   isClientRequest / clientRequestsToNotice — pedidos para el aviso
//   socialClientUrl(token, origin) — el link de la cuenta
//   copyLength / copyTooLong   — largo del copy contra CLIENT_COPY_MAX
//   canClientEdit(post)        — el cliente puede editar su pedido (solo «En proceso»)
//   clientRequestForm(post)    — valores del formulario para editar un pedido
//   clientEditTitle(post, form) — título después de editar (respeta uno cambiado en el Hub)
//   clientEditsToNotice        — pedidos que el cliente editó, para el aviso
// ════════════════════════════════════════════════════════════════════

import {
  CLIENT_POST_TYPE_BY_ID, CLIENT_REQUEST_SOURCE, CLIENT_MEDIA_MAX_FILES, CLIENT_MEDIA_MAX_MB,
  CLIENT_REQUEST_NOTICE_DAYS, CLIENT_COPY_MAX, CLIENT_EDITABLE_STATUS,
} from '@/constants/socialPosts';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

// Grupos «CU …» → Control Union; «PS …» → Peterson Solutions; Bel y el resto, sin marca
export const socialAccountBrand = (group) => {
  const g = clean(group).toUpperCase();
  if (/^CU\b/.test(g) || g.startsWith('CONTROL UNION')) return 'Control Union';
  if (/^PS\b/.test(g) || g.startsWith('PETERSON')) return 'Peterson Solutions';
  return '';
};

// «Webinar · Primeras palabras del copy…» (lo que se ve en la hoja y el calendario)
export const clientRequestTitle = ({ postType, copy } = {}) => {
  const type = CLIENT_POST_TYPE_BY_ID[postType]?.label || 'Posteo';
  const text = clean(copy);
  if (!text) return `Pedido · ${type}`;
  const short = text.length > 60 ? `${text.slice(0, 60).replace(/\s+\S*$/, '')}…` : text;
  return `${type} · ${short}`;
};

// Campos obligatorios que faltan (en el orden del formulario)
export const clientRequestMissing = (form = {}, todayIso = '') => {
  const out = [];
  if (!clean(form.requestedBy)) out.push('nombre y apellido');
  if (!(form.networks || []).length) out.push('red social');
  if (!CLIENT_POST_TYPE_BY_ID[form.postType]) out.push('tipo de posteo');
  if (!ISO_RE.test(form.publishDate || '')) out.push('fecha de publicación');
  else if (todayIso && form.publishDate < todayIso) out.push('una fecha de publicación de hoy en adelante');
  if (!String(form.copy || '').trim()) out.push('copy');
  return out;
};

// Archivos: solo imágenes y videos, hasta N y hasta X MB cada uno
export const mediaProblems = (files = []) => {
  const out = [];
  if (files.length > CLIENT_MEDIA_MAX_FILES) out.push(`Se pueden adjuntar hasta ${CLIENT_MEDIA_MAX_FILES} archivos.`);
  files.forEach((f) => {
    const type = String(f.type || '');
    if (!type.startsWith('image/') && !type.startsWith('video/')) out.push(`«${f.name}» no es una imagen ni un video.`);
    else if ((f.size || 0) > CLIENT_MEDIA_MAX_MB * 1024 * 1024) out.push(`«${f.name}» pesa más de ${CLIENT_MEDIA_MAX_MB} MB.`);
  });
  return out;
};

// Nombre de archivo seguro para la URL (sin acentos ni espacios)
export const safeFileName = (name) => {
  const base = String(name || 'archivo').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/-\./g, '.').replace(/^[-.]+|-+$/g, '');
  return (cleaned || 'archivo').slice(-80);
};

// <token>/<id>-<nombre>: la política del bucket solo deja subir dentro de la carpeta de un token válido
export const mediaPath = (token, fileName, id) => `${token}/${id}-${safeFileName(fileName)}`;

export const clientRequestPayload = (form = {}, media = []) => ({
  requestedBy: clean(form.requestedBy),
  networks: [...new Set(form.networks || [])],
  postType: form.postType,
  publishDate: form.publishDate,
  theme: form.theme || '',
  copy: String(form.copy || '').trim(),
  link: clean(form.link),
  requestNotes: String(form.requestNotes || '').trim(),
  title: clientRequestTitle(form),
  media,
});

export const isClientRequest = (post) => post?.source === CLIENT_REQUEST_SOURCE;

// Link de la cuenta para el cliente: /?social=<token> (main.jsx → SocialPublicPage)
export const socialClientUrl = (token, origin = '') => (token ? `${origin}/?social=${token}` : '');

// Pedidos para avisarle a la responsable: uno por cada pedido de los últimos
// días, sin importar el estado (si alguien lo avanza antes de que ella lo vea,
// el aviso sigue; deja de estar sin leer cuando lo abre o lo marca leído)
export const clientRequestsToNotice = (posts = [], now = new Date()) => {
  const limit = now.getTime() - CLIENT_REQUEST_NOTICE_DAYS * 86400000;
  return posts.filter((p) => isClientRequest(p)
    && p.requestedAt && new Date(p.requestedAt).getTime() >= limit);
};

// Largo del copy como lo cuenta la base (un emoji = 1), sin espacios de los bordes
export const copyLength = (copy) => [...String(copy || '').trim()].length;
export const copyTooLong = (copy) => copyLength(copy) > CLIENT_COPY_MAX;

// Solo los pedidos del cliente y solo mientras están «En proceso»
export const canClientEdit = (post) => isClientRequest(post) && post.status === CLIENT_EDITABLE_STATUS;

// Lo que el formulario muestra al editar un pedido
export const clientRequestForm = (post = {}) => ({
  networks: [...(post.networks || [])],
  postType: post.postType || '',
  publishDate: post.publishDate || '',
  theme: post.theme || '',
  copy: post.copy || '',
  link: post.link || '',
  requestNotes: post.requestNotes || '',
});

// Si el título sigue siendo el automático, se rearma con lo nuevo; si en el
// Hub le pusieron otro, queda ese
export const clientEditTitle = (post = {}, form = {}) => (
  post.title && post.title !== clientRequestTitle(post) ? post.title : clientRequestTitle(form)
);

// Pedidos que el cliente editó en los últimos días (un aviso por cada edición)
export const clientEditsToNotice = (posts = [], now = new Date()) => {
  const limit = now.getTime() - CLIENT_REQUEST_NOTICE_DAYS * 86400000;
  return posts.filter((p) => isClientRequest(p)
    && p.clientEditedAt && new Date(p.clientEditedAt).getTime() >= limit);
};

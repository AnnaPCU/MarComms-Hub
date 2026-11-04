// ════════════════════════════════════════════════════════════════════
// mentions — Etiquetar a alguien del equipo con @ (sin React)
// ════════════════════════════════════════════════════════════════════
//   mentionQuery(text, caret)   → { start, query } si se está escribiendo
//                                 una @ (para el selector), o null
//   filterPeople(names, query)  → quiénes coinciden con lo escrito
//   insertMention(text, start, caret, name) → el texto con «@Nombre » y
//                                 el nuevo caret
//   extractMentions(text, names) / mentionsName(text, name)
//   mentionSnippet(text, name)  → trozo del texto alrededor de la etiqueta
//   textHash(text)              → id corto (cambia si cambia el texto)
// ════════════════════════════════════════════════════════════════════

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const mentionQuery = (text, caret) => {
  const before = String(text ?? '').slice(0, caret ?? String(text ?? '').length);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && /[\p{L}\p{N}]/u.test(before[at - 1])) return null; // un mail, no una etiqueta
  const query = before.slice(at + 1);
  if (query.length > 30 || /\n/.test(query) || (query.match(/ /g) || []).length > 1) return null;
  return { start: at, query };
};

export const filterPeople = (names = [], query = '', max = 8) => {
  const q = fold(query).trim();
  return names.filter((n) => {
    const f = fold(n);
    return !q || f.startsWith(q) || f.split(' ').some((part) => part.startsWith(q));
  }).slice(0, max);
};

export const insertMention = (text, start, caret, name) => {
  const t = String(text ?? '');
  const next = `${t.slice(0, start)}@${name} ${t.slice(caret)}`;
  return { text: next, caret: start + name.length + 2 };
};

export const extractMentions = (text, names = []) => {
  const t = fold(text);
  if (!t.includes('@')) return [];
  return names.filter((n) => n && new RegExp(`(^|[^\\p{L}\\p{N}])@${esc(fold(n))}(?![\\p{L}\\p{N}])`, 'u').test(t));
};

export const mentionsName = (text, name) => extractMentions(text, [name]).length > 0;

export const mentionSnippet = (text, name, max = 100) => {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const i = fold(s).indexOf(`@${fold(name)}`);
  const start = Math.max(0, Math.min(i < 0 ? 0 : i - 30, s.length - max));
  return `${start > 0 ? '…' : ''}${s.slice(start, start + max).trim()}${start + max < s.length ? '…' : ''}`;
};

export const textHash = (s) => {
  let h = 5381;
  for (const ch of String(s ?? '')) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36);
};

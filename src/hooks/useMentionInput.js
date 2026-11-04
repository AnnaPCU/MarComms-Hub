// ════════════════════════════════════════════════════════════════════
// useMentionInput — Etiquetar con @ en un input o textarea
// ════════════════════════════════════════════════════════════════════
// Mientras se escribe «@Vic», muestra el equipo que coincide; flechas
// para moverse, Enter o Tab para elegir, Esc para cerrar. Al elegir,
// reemplaza lo escrito por «@Nombre Apellido » y deja el cursor después.
//
// Uso:
//   const mention = useMentionInput({ people, ref, setText });
//   <textarea ref={ref} onChange={(e) => { setText(e.target.value); mention.update(); }}
//     onKeyDown={(e) => { if (mention.onKeyDown(e)) return; … }} onKeyUp={mention.update} onClick={mention.update} />
//   {mention.open && <MentionPicker matches={mention.matches} active={mention.active} onPick={mention.pick} onHover={mention.setActive} />}
// ════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useRef, useState } from 'react';
import { filterPeople, insertMention, mentionQuery } from '@/utils/mentions';

export const useMentionInput = ({ people = [], ref, setText, enabled = true }) => {
  const [state, setState] = useState(null); // { start, query } | null
  const [active, setActive] = useState(0);
  const last = useRef(null);
  const matches = useMemo(() => (state ? filterPeople(people, state.query) : []), [people, state]);
  const open = enabled && !!state && matches.length > 0;

  const update = useCallback(() => {
    const el = ref?.current;
    if (!el || !enabled) return;
    const q = mentionQuery(el.value, el.selectionStart ?? el.value.length);
    const key = q ? `${q.start}:${q.query}` : null;
    if (key === last.current) return;
    last.current = key;
    setState(q);
    setActive(0);
  }, [ref, enabled]);

  const close = useCallback(() => { last.current = null; setState(null); }, []);

  const pick = useCallback((name) => {
    const el = ref?.current;
    if (!el || !state || !name) return;
    const { text, caret } = insertMention(el.value, state.start, el.selectionStart ?? el.value.length, name);
    setText(text);
    close();
    requestAnimationFrame(() => { try { el.focus(); el.setSelectionRange(caret, caret); } catch (_e) { /* sin selección: sigue igual */ } });
  }, [ref, state, setText, close]);

  // true si se encargó de la tecla (el componente no debe hacer nada más)
  const onKeyDown = (e) => {
    if (!open) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % matches.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[active]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); close(); return true; }
    return false;
  };

  return { open, matches, active, setActive, update, pick, close, onKeyDown };
};

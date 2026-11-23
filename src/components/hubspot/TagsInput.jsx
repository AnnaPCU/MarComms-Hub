// ════════════════════════════════════════════════════════════════════
// TagsInput — Tags de una entidad del Weekly check
// ════════════════════════════════════════════════════════════════════
// Los tags como chips (× los saca) + un campo para sumar: Enter o coma
// agrega, Backspace con el campo vacío saca el último. Sugiere los tags
// que ya se usan en otras entidades.
//
// Props: tags, options (tags ya usados), onChange(tags), compact
// ════════════════════════════════════════════════════════════════════

import React, { useId, useState } from 'react';
import { cleanTags } from '@/utils/crmWeekly';
import { TagChip } from './EntityButton';

export default function TagsInput({ tags = [], options = [], onChange, compact = false }) {
  const [value, setValue] = useState('');
  const listId = useId();
  const add = (raw = value) => {
    const v = raw.trim().replace(/,$/, '').trim();
    setValue('');
    if (v) onChange(cleanTags([...tags, v]));
  };
  const free = options.filter((o) => !tags.some((t) => t.toLowerCase() === o.toLowerCase()));
  return (
    <div className={`flex items-center gap-1 flex-wrap ${compact ? '' : 'p-2 bg-slate-50 border border-slate-200 rounded-xl'}`}>
      {tags.map((t) => <TagChip key={t} tag={t} onRemove={() => onChange(tags.filter((x) => x !== t))} />)}
      <input
        list={listId}
        value={value}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setValue(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(); }
          if (e.key === 'Escape') setValue('');
          if (e.key === 'Backspace' && !value && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => add()}
        placeholder={tags.length ? '+ tag' : 'Add tag…'}
        className="flex-1 min-w-[90px] bg-transparent text-xs font-bold text-slate-700 outline-none px-1 py-0.5 placeholder:text-slate-300"
        aria-label="Add tag"
      />
      <datalist id={listId}>{free.map((o) => <option key={o} value={o} />)}</datalist>
    </div>
  );
}

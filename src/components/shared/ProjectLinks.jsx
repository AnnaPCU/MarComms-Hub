// ════════════════════════════════════════════════════════════════════
// ProjectLinks — Links externos del proyecto (Planner + ticket HubSpot)
// ════════════════════════════════════════════════════════════════════
// Dos inputs de URL con botón para abrir en pestaña nueva cuando el
// link es válido. Se usa en Webinars, Eventos, Campañas y Content Hub.
//
// El valor se edita en un borrador local y se guarda al salir del campo
// (blur o Enter) — así no disparamos un update a Supabase por cada tecla.
//
// Props:
//   plannerLink / hubspotLink — valores actuales (string)
//   onChange(field, value)    — field: 'plannerLink' | 'hubspotLink'
//   columns                   — true: 2 columnas / false: apilado
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { ClipboardList, Ticket, ExternalLink } from 'lucide-react';

const FIELDS = [
  { key: 'plannerLink', label: 'Link Planner', icon: ClipboardList, placeholder: 'https://tasks.office.com/...' },
  { key: 'hubspotLink', label: 'Ticket HubSpot', icon: Ticket, placeholder: 'https://app.hubspot.com/...' },
];

function LinkField({ field, value, onCommit }) {
  const { key, label, icon: Icon, placeholder } = field;
  const [draft, setDraft] = useState(value || '');

  // Sync con cambios externos (realtime u otro módulo)
  useEffect(() => { setDraft(value || ''); }, [value]);

  const commit = () => {
    const clean = draft.trim();
    if (clean !== (value || '')) onCommit(key, clean);
  };

  const isUrl = /^https?:\/\//i.test(draft.trim());

  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 text-xs"
        />
        {isUrl && (
          <a
            href={draft.trim()}
            target="_blank"
            rel="noreferrer"
            title={`Abrir ${label}`}
            className="w-10 shrink-0 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl flex items-center justify-center transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function ProjectLinks({ plannerLink = '', hubspotLink = '', onChange, columns = false }) {
  const values = { plannerLink, hubspotLink };
  return (
    <div className={columns ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'}>
      {FIELDS.map((f) => (
        <LinkField key={f.key} field={f} value={values[f.key]} onCommit={onChange} />
      ))}
    </div>
  );
}

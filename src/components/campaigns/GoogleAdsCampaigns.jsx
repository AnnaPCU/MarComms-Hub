// ════════════════════════════════════════════════════════════════════
// GoogleAdsCampaigns — Campañas de una tarjeta de Paid Media
// ════════════════════════════════════════════════════════════════════
// Una tarjeta por unidad y país (oct 2026) con la lista de sus campañas:
//   · GoogleAdsChips: en la tarjeta de la grilla, etiquetas con un punto
//     verde (activa), ámbar (pausada) o gris tachado (inhabilitada).
//   · GoogleAdsCampaigns (default): en la ficha, la lista editable: agregar
//     campaña, renombrar y cambiar el estado (Activa / Pausada /
//     Inhabilitada). Solo se borran las agregadas a mano; las que vienen de
//     Google Ads se inhabilitan.
// Lógica pura en src/utils/googleAds.js, estados en PAID_CAMPAIGN_STATUSES.
//
// Props (ficha): ads (campaign.data.google_ads), name (nombre de la
//   tarjeta, para filas viejas de una campaña), finished (la tarjeta ya
//   tiene el paso «Campaña finalizada»), onChange(change) — change recibe
//   la lista guardada y devuelve la nueva (se aplica con updater funcional).
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, ListChecks, Pencil, Plus, Trash2, X } from 'lucide-react';

import { PAID_CAMPAIGN_STATUSES, paidCampaignStatus } from '@/constants/campaigns';
import { useConfirm } from '@/hooks/useConfirm';
import {
  adsCampaignList, adsCampaignName, adsCampaignsOf, adsNameError, adsSummary, isManualAdsCampaign,
  addAdsCampaign, removeAdsCampaign, renameAdsCampaign, setAdsCampaignStatus,
} from '@/utils/googleAds';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const summaryText = ({ total, active, paused, disabled }) => [
  plural(total, 'campaña', 'campañas'),
  plural(active, 'activa', 'activas'),
  paused ? plural(paused, 'pausada', 'pausadas') : '',
  disabled ? plural(disabled, 'inhabilitada', 'inhabilitadas') : '',
].filter(Boolean).join(' · ');

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);

export function GoogleAdsChips({ ads, name }) {
  const list = adsCampaignsOf(ads, name);
  if (!list.length) return null;
  return (
    <div className="mb-3">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Campañas · {summaryText(adsSummary(list))}</p>
      <div className="flex flex-wrap gap-1">
        {list.map((c) => {
          const st = paidCampaignStatus(c.estado);
          return (
            <span key={c.clave || adsCampaignName(c)} title={`${c.nombre || adsCampaignName(c)} · ${st.label}`} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${st.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
              {adsCampaignName(c)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange, title }) {
  const st = paidCampaignStatus(value);
  const known = PAID_CAMPAIGN_STATUSES.some((s) => s.id === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} title={title} className={`shrink-0 text-[9px] font-black uppercase tracking-wider pl-2 pr-6 py-1 rounded border outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer ${st.badge}`}>
      {!known && <option value={value}>{st.label}</option>}
      {PAID_CAMPAIGN_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}

const inputCls = 'flex-1 min-w-0 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-400';

export default function GoogleAdsCampaigns({ ads, name, finished = false, onChange }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // { clave, value }
  const [adding, setAdding] = useState(null);   // { value, estado }
  const [error, setError] = useState('');
  const stored = adsCampaignList(ads, name);
  const list = adsCampaignsOf(ads, name);
  const summary = adsSummary(list);

  const saveRename = () => {
    if (!editing) return;
    const msg = adsNameError(stored, editing.value, editing.clave);
    if (msg) { setError(msg); return; }
    onChange((cur) => renameAdsCampaign(cur, editing.clave, editing.value));
    setEditing(null); setError('');
  };

  const saveNew = () => {
    if (!adding) return;
    const msg = adsNameError(stored, adding.value);
    if (msg) { setError(msg); return; }
    const id = newId();
    onChange((cur) => addAdsCampaign(cur, { id, name: adding.value, estado: adding.estado }));
    setAdding(null); setError('');
  };

  const remove = async (c) => {
    const ok = await confirm({
      title: '¿Borrar campaña?',
      message: `Vas a borrar «${adsCampaignName(c)}» de esta tarjeta.`,
      confirmText: 'Borrar', tone: 'danger',
    });
    if (ok) onChange((cur) => removeAdsCampaign(cur, c.clave));
  };

  const keys = (save, cancel) => (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { cancel(); setError(''); }
  };

  return (
    <div className="p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/40 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-black text-xs uppercase flex items-center gap-2 text-slate-600"><ListChecks className="w-4 h-4 text-amber-500" /> Campañas</h4>
        {list.length > 0 && <span className="text-[10px] font-black text-slate-500">{summaryText(summary)}</span>}
      </div>

      <ul className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100">
        {list.length === 0 && !adding && (
          <li className="px-3 py-3 text-[11px] font-medium text-slate-400">Todavía no hay campañas en esta tarjeta.</li>
        )}
        {list.map((c) => (
          <li key={c.clave || adsCampaignName(c)} className="group flex items-center gap-2 px-3 py-2">
            {editing && editing.clave === c.clave ? (
              <>
                <input autoFocus value={editing.value} onChange={(e) => { setEditing({ ...editing, value: e.target.value }); setError(''); }} onKeyDown={keys(saveRename, () => setEditing(null))} className={inputCls} aria-label="Nombre de la campaña" />
                <button type="button" onClick={saveRename} title="Guardar (Enter)" className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => { setEditing(null); setError(''); }} title="Cancelar (Esc)" className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setEditing({ clave: c.clave, value: adsCampaignName(c) }); setAdding(null); setError(''); }} title={c.nombre && c.nombre !== adsCampaignName(c) ? `En Google Ads: ${c.nombre} · Cliqueá para renombrar` : 'Cliqueá para renombrar'} className={`flex-1 min-w-0 text-left text-xs font-bold truncate ${c.estado === 'Inhabilitada' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {adsCampaignName(c)}
                </button>
                <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" aria-hidden="true" />
              </>
            )}
            <StatusSelect value={c.estado} title="Estado de la campaña" onChange={(estado) => onChange((cur) => setAdsCampaignStatus(cur, c.clave, estado))} />
            {isManualAdsCampaign(c) ? (
              <button type="button" onClick={() => remove(c)} title="Borrar (agregada a mano)" className="w-7 h-7 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            ) : <span className="w-7 shrink-0" aria-hidden="true" />}
          </li>
        ))}
        {adding && (
          <li className="flex items-center gap-2 px-3 py-2 bg-amber-50/40">
            <input autoFocus value={adding.value} onChange={(e) => { setAdding({ ...adding, value: e.target.value }); setError(''); }} onKeyDown={keys(saveNew, () => setAdding(null))} placeholder="Nombre de la campaña (ej: GHG)" className={inputCls} aria-label="Nombre de la campaña nueva" />
            <StatusSelect value={adding.estado} title="Estado" onChange={(estado) => setAdding({ ...adding, estado })} />
            <button type="button" onClick={saveNew} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest">Agregar</button>
            <button type="button" onClick={() => { setAdding(null); setError(''); }} title="Cancelar (Esc)" className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></button>
          </li>
        )}
      </ul>

      {error && <p className="text-[10px] font-bold text-red-600">{error}</p>}
      {!adding && (
        <button type="button" onClick={() => { setAdding({ value: '', estado: 'Activa' }); setEditing(null); setError(''); }} className="text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-800 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Agregar campaña
        </button>
      )}
      {list.length > 0 && summary.active === 0 && !finished && (
        <p className="text-[10px] font-medium text-slate-500">No queda ninguna campaña activa: si la tarjeta terminó, tildá «Campaña finalizada» para pasarla a Completadas.</p>
      )}
    </div>
  );
}

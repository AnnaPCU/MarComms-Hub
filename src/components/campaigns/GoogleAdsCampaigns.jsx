// ════════════════════════════════════════════════════════════════════
// GoogleAdsCampaigns — Campañas de Google Ads de una tarjeta de Paid Media
// ════════════════════════════════════════════════════════════════════
// Una tarjeta por unidad y país (oct 2026). Solo nombre y estado:
//   · GoogleAdsChips: en la tarjeta de la grilla, etiquetas cortas con un
//     punto verde (activa) o gris (pausada / terminada).
//   · GoogleAdsCampaigns (default): en la ficha, la lista con su estado.
// Lógica en src/utils/googleAds.js.
//
// Props: ads (campaign.data.google_ads), name (nombre de la tarjeta, para
//        las filas viejas de una sola campaña)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { Search } from 'lucide-react';

import { adsCampaignsOf, adsSummary, isAdsCampaignActive } from '@/utils/googleAds';

const summaryText = ({ total, active, inactive }) => [
  `${total} ${total === 1 ? 'campaña' : 'campañas'}`,
  `${active} ${active === 1 ? 'activa' : 'activas'}`,
  inactive ? `${inactive} ${inactive === 1 ? 'pausada' : 'pausadas'}` : '',
].filter(Boolean).join(' · ');

export function GoogleAdsChips({ ads, name }) {
  const list = adsCampaignsOf(ads, name);
  if (!list.length) return null;
  return (
    <div className="mb-3">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Google Ads · {summaryText(adsSummary(list))}</p>
      <div className="flex flex-wrap gap-1">
        {list.map((c) => {
          const on = isAdsCampaignActive(c);
          return (
            <span key={c.clave || c.nombre} title={`${c.nombre} · ${on ? 'Activa' : (c.estado || 'Pausada')}`} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${on ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {c.nombre_corto || c.nombre}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function GoogleAdsCampaigns({ ads, name }) {
  const list = adsCampaignsOf(ads, name);
  if (!list.length) return null;
  return (
    <div className="p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/40 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-black text-xs uppercase flex items-center gap-2 text-slate-600"><Search className="w-4 h-4 text-amber-500" /> Campañas de Google Ads</h4>
        <span className="text-[10px] font-black text-slate-500">{summaryText(adsSummary(list))}</span>
      </div>
      <ul className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100">
        {list.map((c) => {
          const on = isAdsCampaignActive(c);
          return (
            <li key={c.clave || c.nombre} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-xs font-bold text-slate-700 min-w-0 truncate" title={c.nombre}>{c.nombre}</span>
              <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${on ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{on ? 'Activa' : (c.estado || 'Pausada')}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

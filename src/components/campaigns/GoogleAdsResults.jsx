// ════════════════════════════════════════════════════════════════════
// GoogleAdsResults — Resultados de Google Ads en la ficha de Paid Media
// ════════════════════════════════════════════════════════════════════
// Solo lectura. Muestra lo que trajo la carga del histórico de Google Ads
// (oct 2026, supabase/seed/0036_paid_media_google_ads_*.sql) en
// `campaign.data.google_ads`: estado en la
// plataforma, período con impresiones, impresiones, clics, CTR, CPC,
// conversiones, CPL, gasto en la moneda original, landings y el gasto
// por mes. La «Inversión en pauta (USD)» de la ficha es el total de gasto.
//
// Props: ads (campaign.data.google_ads)
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ExternalLink, TrendingUp } from 'lucide-react';

import { formatDate } from '@/utils/date';

const num = (v, digits = 0) => (v === null || v === undefined || v === '' ? '—'
  : Number(v).toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const usd = (v) => (v === null || v === undefined ? '—' : `$${num(v, 2)}`);

export default function GoogleAdsResults({ ads }) {
  if (!ads) return null;
  const r = ads.resultados || {};
  const kpis = [
    ['Impresiones', num(r.impresiones)],
    ['Clics', num(r.clics)],
    ['CTR', r.ctr_pct === null || r.ctr_pct === undefined ? '—' : `${num(r.ctr_pct, 2)}%`],
    ['CPC (USD)', usd(r.cpc_usd)],
    ['Conversiones', num(r.conversiones)],
    ['CPL (USD)', r.conversiones ? usd(r.cpl_usd) : '—'],
  ];
  const spend = Object.entries(ads.gasto_original || {}).filter(([, v]) => v);
  const active = ads.estado === 'Activa';

  return (
    <div className="p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/40 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-black text-xs uppercase flex items-center gap-2 text-slate-600"><TrendingUp className="w-4 h-4 text-amber-500" /> Resultados · Google Ads</h4>
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{ads.estado || 'Sin estado'}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {kpis.map(([label, value]) => (
          <div key={label} className="bg-white border border-slate-100 rounded-xl px-2.5 py-2">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-black font-mono text-slate-800">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-bold text-slate-500">
        Con impresiones del {formatDate(ads.primer_dia) || '—'} al {formatDate(ads.ultimo_dia) || '—'}
        {spend.length > 0 && <> · Gasto original: <span className="font-mono">{spend.map(([cur, v]) => `${cur} ${num(v, 2)}`).join(' + ')}</span></>}
      </p>
      {Array.isArray(ads.mensual) && ads.mensual.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-wider">
              <tr><th className="text-left px-2.5 py-1.5">Mes</th><th className="text-right px-2.5 py-1.5">USD</th><th className="text-right px-2.5 py-1.5">Impr.</th><th className="text-right px-2.5 py-1.5">Clics</th><th className="text-right px-2.5 py-1.5">Conv.</th></tr>
            </thead>
            <tbody className="font-mono font-bold text-slate-700">
              {ads.mensual.map((m) => (
                <tr key={m.mes} className="border-t border-slate-100">
                  <td className="px-2.5 py-1">{m.mes}</td>
                  <td className="px-2.5 py-1 text-right">{num(m.usd, 2)}</td>
                  <td className="px-2.5 py-1 text-right">{num(m.impresiones)}</td>
                  <td className="px-2.5 py-1 text-right">{num(m.clics)}</td>
                  <td className="px-2.5 py-1 text-right">{num(m.conversiones)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(ads.landings || []).length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Landings</p>
          {ads.landings.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" title={u} className="flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:underline min-w-0">
              <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{u.replace(/^https?:\/\//, '')}</span>
            </a>
          ))}
        </div>
      )}
      <p className="text-[9px] font-medium text-slate-400">Datos de Google Ads al {formatDate(ads.extraido) || '—'}{ads.estrategia_puja ? ` · Puja: ${ads.estrategia_puja}` : ''}. Solo lectura: se actualizan con una nueva carga.</p>
    </div>
  );
}

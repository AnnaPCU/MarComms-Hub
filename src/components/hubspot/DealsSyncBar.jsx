// ════════════════════════════════════════════════════════════════════
// DealsSyncBar — Estado de los deals de HubSpot en el Weekly check
// ════════════════════════════════════════════════════════════════════
// «Deals de HubSpot · actualizado el … a las …» + botón «Actualizar»
// (llama a la Edge Function hubspot-weekly-deals, con freno de 10 min).
// Si la última corrida falló, lo dice en rojo (así no queda un número
// viejo sin que nadie se entere). Si hay deals de esta semana o la anterior
// sin «PCU Entity» (hay que completarlo en HubSpot), lo avisa. Los de
// entidades que no están en el Hub no se avisan: el portal es global.
//
// Props: sync (dealSync de useCrmWeekly), onRefresh (async)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { syncStatus, unassignedOf } from '@/utils/crmWeeklyDeals';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

export default function DealsSyncBar({ sync, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const status = syncStatus(sync);
  const un = unassignedOf(sync);

  const refresh = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await onRefresh();
      if (r?.skipped) setMsg(r.message);
    } catch (e) {
      setMsg(e?.message || 'No se pudo actualizar. Probá de nuevo en un rato.');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deals de HubSpot</span>
        <span>{sync?.lastOkAt ? `Actualizado el ${fmt(sync.lastOkAt)}` : 'Todavía sin datos'}</span>
        <span className="text-slate-300">·</span>
        <span>Sin importaciones · semana de lunes a domingo (hora de Argentina)</span>
        <button onClick={refresh} disabled={busy} className="ml-auto bg-white border border-slate-200 hover:border-sky-300 hover:text-sky-700 text-slate-600 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50" title="Traer los deals de las últimas 8 semanas desde HubSpot">
          <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      {status.tone === 'error' && (
        <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-[11px] font-bold flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>La última actualización de deals falló ({fmt(sync.lastRunAt)}): {status.text} Los números que se ven son de la última vez que anduvo.</span>
        </p>
      )}
      {msg && <p className="text-[11px] font-bold text-slate-500">{msg}</p>}
      {(un.current > 0 || un.previous > 0) && (
        <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2 text-[11px] font-bold">
          Deals sin «PCU Entity» en HubSpot: {un.current} esta semana · {un.previous} la semana anterior. No se cuentan en ninguna entidad: hay que completar ese campo en HubSpot.
        </p>
      )}
    </div>
  );
}

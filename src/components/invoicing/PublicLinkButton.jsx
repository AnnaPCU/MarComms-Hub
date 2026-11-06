// ════════════════════════════════════════════════════════════════════
// PublicLinkButton — «Link externo» de Facturación (header del Hub)
// ════════════════════════════════════════════════════════════════════
// Abre un menú con el link de solo lectura (/?facturacion=<token>,
// migration 0052), para copiarlo o abrirlo. El link muestra todas las
// hojas de todos los meses en tiempo real (se relee cada 30 s), sin
// editar y sin notas del mes ni historial.
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import { getPublicLinkToken } from '@/services/invoicingService';

export const publicInvoicingUrl = (token) => `${window.location.origin}/?facturacion=${token}`;

export default function PublicLinkButton() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle', token: null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || state.status !== 'idle') return;
    setState({ status: 'loading', token: null });
    getPublicLinkToken()
      .then((token) => setState({ status: token ? 'ok' : 'missing', token }))
      .catch((e) => { console.error('[PublicLinkButton] no se pudo leer el link:', e); setState({ status: 'missing', token: null }); });
  }, [open, state.status]);

  const url = state.token ? publicInvoicingUrl(state.token) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (_e) { /* sin portapapeles: se copia a mano */ }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2" title="Link de solo lectura para ver la facturación sin entrar al Hub">
        <Link2 className="w-4 h-4" /> Link externo
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="hub-popover absolute right-0 top-full mt-2 z-50 w-[min(92vw,420px)] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 text-slate-700" role="dialog" aria-label="Link externo de Facturación">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Link externo · solo lectura</p>
            <p className="text-xs">Quien tenga el link ve todas las hojas de todos los meses y «Mes a mes», sin poder editar. Se actualiza solo. No muestra las notas del mes ni el historial.</p>
            {state.status === 'loading' && <p className="text-xs font-bold text-slate-400">Buscando el link…</p>}
            {state.status === 'missing' && <p className="text-xs font-bold text-amber-700">El link todavía no está activado en la base (migración 0052).</p>}
            {state.status === 'ok' && (
              <>
                <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Link externo" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-700 outline-none" />
                <div className="flex gap-2">
                  <button onClick={copy} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copiado' : 'Copiar link'}
                  </button>
                  <a href={url} target="_blank" rel="noreferrer" className="border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 text-slate-600">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir
                  </a>
                </div>
                <p className="text-[10px] font-bold text-slate-400">Compartilo solo con quien corresponda: no pide contraseña.</p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

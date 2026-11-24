// ════════════════════════════════════════════════════════════════════
// AccountLinkButtons — Copiar / abrir el link de una cuenta de Social Media
// ════════════════════════════════════════════════════════════════════
// El link (/?social=<token>, migration 0055) es lo que se le pasa al
// cliente: calendario de su cuenta + pedido de posteo, sin login. Se usa
// en «Cuentas y planes» (AccountsModal) y en el calendario del Hub con una
// cuenta elegida. Sin token (migración no corrida o cuenta por defecto)
// no muestra nada.
//
// Props: token, withLabel (texto «Link del cliente» al lado)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Check, ExternalLink, Link2 } from 'lucide-react';
import { socialClientUrl } from '@/utils/socialClient';

export default function AccountLinkButtons({ token, withLabel = false }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;
  const url = socialClientUrl(token, window.location.origin);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_e) { window.prompt('Copiá el link de la cuenta:', url); }
  };
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={copy} title="Copiar el link del cliente (calendario de la cuenta + pedido de posteo)" className={`h-7 rounded-lg border border-slate-200 bg-white hover:bg-pink-50 hover:text-pink-700 text-slate-500 flex items-center justify-center gap-1 ${withLabel ? 'px-2 text-[10px] font-black uppercase tracking-wider' : 'w-7'}`}>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
        {withLabel && (copied ? 'Copiado' : 'Link del cliente')}
      </button>
      <a href={url} target="_blank" rel="noreferrer" title="Abrir la vista del cliente" className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-pink-50 hover:text-pink-700 text-slate-500 flex items-center justify-center">
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </span>
  );
}

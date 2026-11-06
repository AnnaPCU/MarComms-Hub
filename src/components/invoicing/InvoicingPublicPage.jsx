// ════════════════════════════════════════════════════════════════════
// InvoicingPublicPage — Link externo de Facturación: /?facturacion=<token>
// ════════════════════════════════════════════════════════════════════
// Se abre sin login (ver main.jsx) y sin cargar el resto del Hub. Lee todo
// con get_public_invoicing (migration 0052): meses y filas de las hojas,
// sin notas del mes, zona libre de MKT Plan ni historial. Se actualiza sola
// cada 30 segundos y al volver a la pestaña. Respeta el modo oscuro si se
// activó en el Hub (useTheme).
// ════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { getPublicInvoicing } from '@/services/invoicingService';
import { useTheme } from '@/hooks/useTheme';
import InvoicingExternalView from './InvoicingExternalView';

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PUBLIC_REFRESH_MS = 30000;

function Message({ title, text }) {
  return (
    <div className="max-w-md mx-auto mt-24 text-center px-6">
      <p className="text-lg font-black text-slate-800">{title}</p>
      {text && <p className="text-sm mt-2 text-slate-500">{text}</p>}
    </div>
  );
}

export default function InvoicingPublicPage({ token }) {
  useTheme(); // aplica el tema guardado (claro por defecto)
  const validToken = TOKEN_RE.test(String(token || ''));
  const [state, setState] = useState({ status: validToken ? 'loading' : 'notfound', data: null, loadedAt: null });

  const load = useCallback(async () => {
    if (!validToken) return;
    try {
      const data = await getPublicInvoicing(token);
      setState({ status: data ? 'ok' : 'notfound', data, loadedAt: new Date() });
    } catch (e) {
      console.error('[InvoicingPublicPage] no se pudo leer la facturación:', e);
      // Si ya se mostraba, queda como estaba hasta el próximo intento
      setState((prev) => (prev.data ? prev : { status: 'error', data: null, loadedAt: null }));
    }
  }, [token, validToken]);

  useEffect(() => {
    load();
    const id = setInterval(load, PUBLIC_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  useEffect(() => { document.title = 'Facturación MarComms'; }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {state.status === 'loading' && <Message title="Cargando la facturación…" />}
      {state.status === 'notfound' && <Message title="Este link no está disponible" text="Puede haber cambiado o haberse desactivado. Pedí el link actualizado al equipo de MarComms." />}
      {state.status === 'error' && <Message title="No se pudo cargar la facturación" text="Probá de nuevo en unos minutos." />}
      {state.status === 'ok' && <InvoicingExternalView months={state.data.months} rows={state.data.rows} updatedAt={state.data.updatedAt} loadedAt={state.loadedAt} />}
    </div>
  );
}

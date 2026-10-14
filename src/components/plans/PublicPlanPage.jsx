// ════════════════════════════════════════════════════════════════════
// PublicPlanPage — Link externo de un plan: /?plan=<token>
// ════════════════════════════════════════════════════════════════════
// Se abre sin login (ver main.jsx). Lee el plan con get_public_plan
// (migration 0030), que devuelve solo el nombre y las tareas sin
// Responsable ni Deadline. Se actualiza sola cada minuto y al volver a
// la pestaña.
//
// Si está embebida en el Hub (vista previa en un iframe), le avisa al Hub
// su alto para que el recuadro no tenga scroll propio.
// ════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicPlan } from '@/services/planTasksService';
import { todayIso as getTodayIso } from '@/utils/date';
import PlanExternalView from './PlanExternalView';

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFRESH_MS = 60000;
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap';

function Message({ title, text }) {
  return (
    <div className="max-w-md mx-auto mt-24 text-center px-6" style={{ fontFamily: 'Ubuntu, Calibri, sans-serif', color: '#4f6566' }}>
      <p className="text-lg font-bold" style={{ color: '#1b1e42' }}>{title}</p>
      <p className="text-sm mt-2">{text}</p>
    </div>
  );
}

export default function PublicPlanPage({ token }) {
  const validToken = TOKEN_RE.test(String(token || ''));
  const [state, setState] = useState({ status: validToken ? 'loading' : 'notfound', plan: null, updatedAt: null });
  const rootRef = useRef(null);

  const load = useCallback(async () => {
    if (!validToken) return;
    try {
      const plan = await getPublicPlan(token);
      setState({ status: plan ? 'ok' : 'notfound', plan, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error('[PublicPlanPage] no se pudo leer el plan:', e);
      // Si ya se mostraba el plan, se deja como estaba hasta el próximo intento
      setState((prev) => (prev.plan ? prev : { status: 'error', plan: null, updatedAt: null }));
    }
  }, [token, validToken]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  // Tipografía digital de las dos marcas (Ubuntu); solo en esta página
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    document.title = state.plan ? `${state.plan.name} · Plan de marketing` : 'Plan de marketing';
  }, [state.plan]);

  // Vista previa en el Hub: avisar el alto al iframe
  useEffect(() => {
    if (window.parent === window || !rootRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'plan-preview-height', height: document.documentElement.scrollHeight }, window.location.origin);
    });
    ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [state.status]);

  return (
    <div ref={rootRef} className="min-h-screen bg-slate-50 py-6 sm:py-10 px-3 sm:px-6">
      {state.status === 'loading' && <Message title="Cargando el plan…" text="" />}
      {state.status === 'notfound' && <Message title="Este link no está disponible" text="Puede que haya cambiado o que se haya desactivado. Pedile el link actualizado a tu contacto." />}
      {state.status === 'error' && <Message title="No se pudo cargar el plan" text="Probá de nuevo en unos minutos." />}
      {state.status === 'ok' && (
        <div className="max-w-6xl mx-auto">
          <PlanExternalView plan={state.plan} tasks={state.plan.tasks} todayIso={getTodayIso()} updatedAt={state.updatedAt} />
        </div>
      )}
    </div>
  );
}

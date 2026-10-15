// ════════════════════════════════════════════════════════════════════
// PublicPlanPage — Link externo de un plan: /?plan=<token>
// ════════════════════════════════════════════════════════════════════
// Se abre sin login (ver main.jsx). Lee el plan con get_public_plan
// (migration 0030), que devuelve solo el nombre y las tareas sin
// Responsable ni Deadline. Se actualiza sola cada minuto y al volver a
// la pestaña. Respeta el modo oscuro si se activó en el Hub (useTheme);
// si no, en claro.
//
// Si está embebida en el Hub (vista previa en un iframe), le avisa al Hub
// su alto (crece y se achica con el contenido) para que el recuadro no
// tenga scroll propio. Los mensajes de error son impersonales: todavía no
// se sabe de qué marca es el plan.
// ════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicPlan } from '@/services/planTasksService';
import { useTheme } from '@/hooks/useTheme';
import { todayIso as getTodayIso } from '@/utils/date';
import PlanExternalView from './PlanExternalView';

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFRESH_MS = 60000;
const EMBEDDED = typeof window !== 'undefined' && window.parent !== window;
const IFRAME_BORDER = 2; // borde de 1px arriba y abajo del iframe del Hub
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap';

function Message({ title, text }) {
  return (
    <div className="max-w-md mx-auto mt-24 text-center px-6" style={{ fontFamily: 'Ubuntu, Calibri, sans-serif' }}>
      <p className="text-lg font-bold text-slate-800">{title}</p>
      <p className="text-sm mt-2 text-slate-500">{text}</p>
    </div>
  );
}

export default function PublicPlanPage({ token }) {
  const { resolved: theme } = useTheme();
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
    if (!EMBEDDED || !rootRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      // El alto del contenido (no el del documento, que nunca baja del iframe)
      window.parent.postMessage({ type: 'plan-preview-height', height: rootRef.current.offsetHeight + IFRAME_BORDER }, window.location.origin);
    });
    ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [state.status]);

  return (
    <div ref={rootRef} className={`${EMBEDDED ? '' : 'min-h-screen '}bg-slate-50 py-6 sm:py-10 px-3 sm:px-6`}>
      {state.status === 'loading' && <Message title="Cargando el plan…" text="" />}
      {state.status === 'notfound' && <Message title="Este link no está disponible" text="Puede haber cambiado o haberse desactivado. Para acceder, es necesario solicitar el link actualizado." />}
      {state.status === 'error' && <Message title="No se pudo cargar el plan" text="Se puede volver a intentar en unos minutos." />}
      {state.status === 'ok' && (
        <div className="max-w-6xl mx-auto">
          <PlanExternalView plan={state.plan} tasks={state.plan.tasks} todayIso={getTodayIso()} updatedAt={state.updatedAt} dark={theme === 'dark'} />
        </div>
      )}
    </div>
  );
}

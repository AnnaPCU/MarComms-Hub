// ════════════════════════════════════════════════════════════════════
// SocialPublicPage — Link de una cuenta de Social Media: /?social=<token>
// ════════════════════════════════════════════════════════════════════
// Se abre sin login (ver main.jsx), como el link de cada plan. Muestra:
//   - el calendario con los posteos de ESA cuenta y su estado (el mismo
//     WorldDaysCalendar del Hub en modo `external`: sin filtro de cuentas,
//     sin el bloque de competencia ni el pie interno);
//   - a la derecha, en lugar de «Próximas fechas», el formulario para pedir
//     un posteo (ClientRequestForm). Cliquear un posteo muestra su detalle
//     (ClientPostDetail); cliquear un día mundial prearma fecha y temática.
// No muestra la hoja de Posteos, los conteos del mes ni Herramientas.
//
// Lee con get_public_social_account (migration 0055): cuenta + posteos sin
// las notas internas. Se relee cada minuto, al volver a la pestaña y
// después de cada pedido. Marca según el grupo de la cuenta
// (socialAccountBrand): Control Union, Peterson Solutions o sin marca; nunca
// se mezclan. Respeta el modo oscuro si se activó en el Hub (useTheme).
// ════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { getPublicSocialAccount } from '@/services/socialPostsService';
import { useTheme } from '@/hooks/useTheme';
import { brandTheme } from '@/constants/brands';
import { socialClientTexts } from '@/constants/socialClient';
import { POST_STATUSES } from '@/constants/socialPosts';
import { socialAccountBrand } from '@/utils/socialClient';
import { todayIso as getTodayIso } from '@/utils/date';
import WorldDaysCalendar from './WorldDaysCalendar';
import ClientRequestForm from './ClientRequestForm';
import ClientPostDetail from './ClientPostDetail';

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFRESH_MS = 60000;
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap';
const MARCOMMS_LOGO = { color: '/logos/marcomms-color.png', white: '/logos/marcomms-white.png' };

function Message({ title, text }) {
  return (
    <div className="max-w-md mx-auto mt-24 text-center px-6" style={{ fontFamily: 'Ubuntu, Calibri, sans-serif' }}>
      <p className="text-lg font-bold text-slate-800">{title}</p>
      <p className="text-sm mt-2 text-slate-500">{text}</p>
    </div>
  );
}

export default function SocialPublicPage({ token }) {
  const { resolved } = useTheme();
  const dark = resolved === 'dark';
  const validToken = TOKEN_RE.test(String(token || ''));
  const [state, setState] = useState({ status: validToken ? 'loading' : 'notfound', account: null });
  const [calendarTheme, setCalendarTheme] = useState('all');
  const [prefill, setPrefill] = useState(null); // { publishDate, theme, label, nonce } desde un día mundial

  const load = useCallback(async () => {
    if (!validToken) return;
    try {
      const account = await getPublicSocialAccount(token);
      setState({ status: account ? 'ok' : 'notfound', account });
    } catch (e) {
      console.error('[SocialPublicPage] no se pudo leer la cuenta:', e);
      setState((prev) => (prev.account ? prev : { status: 'error', account: null }));
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

  const account = state.account;
  useEffect(() => {
    document.title = account ? `${account.name} · Calendario de publicaciones` : 'Calendario de publicaciones';
  }, [account]);

  if (state.status !== 'ok') {
    return (
      <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-3 sm:px-6">
        {state.status === 'loading' && <Message title="Cargando el calendario…" text="" />}
        {state.status === 'notfound' && <Message title="Este link no está disponible" text="Puede haber cambiado o haberse desactivado. Para acceder, es necesario solicitar el link actualizado." />}
        {state.status === 'error' && <Message title="No se pudo cargar el calendario" text="Se puede volver a intentar en unos minutos." />}
      </div>
    );
  }

  const brand = socialAccountBrand(account.group);
  const theme = brandTheme(brand);
  const c = dark ? theme.darkColors : theme.colors;
  const texts = socialClientTexts(brand);
  const accent = { bg: c.primary, fg: c.onPrimary, text: c.link };
  const todayIso = getTodayIso();
  const calendarAccount = { id: account.id, name: account.name, group: account.group, active: true };

  const pickWorldDay = (d) => {
    setPrefill({ publishDate: d.date >= todayIso ? d.date : '', theme: d.theme || '', label: d.name, nonce: Date.now() });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-3 sm:px-6" style={{ fontFamily: 'Ubuntu, Calibri, "DM Sans", sans-serif', color: c.text }}>
      <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Encabezado: MarComms | cuenta · logo de la marca (la tagline va al pie) */}
        <div className="h-1" style={{ background: c.primary }} />
        <header className="px-5 sm:px-8 pt-5 pb-5 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-4 min-w-0">
              <img src={dark ? MARCOMMS_LOGO.white : MARCOMMS_LOGO.color} alt="MarComms" className="h-7 sm:h-9 w-auto block shrink-0" />
              <span className="hidden sm:block w-px h-9 bg-slate-200" />
              <div className="hidden sm:block min-w-0">
                <p className="text-[13px] font-bold leading-tight truncate" style={{ color: c.dark }}>{account.group}</p>
                <p className="text-[11px] mt-0.5" style={{ color: c.label }}>Social Media</p>
              </div>
            </div>
            {theme.logo && <img src={dark && theme.logoWhite ? theme.logoWhite : theme.logo} alt={theme.name} className="h-5 sm:h-7 w-auto block shrink-0" />}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.label }}>{texts.eyebrow}</p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1" style={{ color: c.dark }}>{account.name}</h1>
          <p className="text-sm mt-1">{texts.intro}</p>
        </header>

        <section className="px-3 sm:px-6 py-5" style={{ background: c.soft }}>
          <WorldDaysCalendar
            todayIso={todayIso}
            theme={calendarTheme}
            onThemeChange={setCalendarTheme}
            posts={account.posts}
            accounts={[calendarAccount]}
            external
            lockAccountId={account.id}
            accent={accent}
            onPickWorldDay={pickWorldDay}
            renderSide={({ selectedPost, closePost }) => (selectedPost
              ? <ClientPostDetail post={selectedPost} onClose={closePost} c={c} />
              : <ClientRequestForm token={token} texts={texts} c={c} todayIso={todayIso} prefill={prefill} onSubmitted={load} />)}
          />
          <div className="flex flex-wrap items-center gap-3 px-1 pt-3 text-[11px] font-bold" style={{ color: c.label }}>
            <span>Estado de cada posteo:</span>
            {POST_STATUSES.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />{s.label}</span>
            ))}
            <span className="opacity-60">·</span>
            <span>Cliquear un posteo muestra su detalle; cliquear un día mundial toma su fecha para el pedido.</span>
          </div>
        </section>

        {/* Pie: MarComms a la izquierda; línea y tagline de la marca a la derecha */}
        <footer className="px-5 sm:px-8 pt-6 pb-5 border-t border-slate-100" style={{ color: c.label }}>
          <div className="flex flex-col-reverse sm:flex-row sm:items-end justify-between gap-5 sm:gap-6">
            <img src={dark ? MARCOMMS_LOGO.white : MARCOMMS_LOGO.color} alt="MarComms" className="h-6 sm:h-7 w-auto block shrink-0 self-start sm:self-auto" />
            {theme.tagline && (
              <div className="sm:flex-1 sm:max-w-[60%] text-right">
                <div className="h-1 rounded-full mb-3" style={{ background: dark ? c.primary : '#1b1e42' }} />
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em]">{theme.tagline}</p>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

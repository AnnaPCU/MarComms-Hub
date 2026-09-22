// ════════════════════════════════════════════════════════════════════
// useNotificationAlerts — Que las notificaciones lleguen, no solo existan
// ════════════════════════════════════════════════════════════════════
// Recibe la lista de notificaciones calculada (utils/notifications.js) y
// se ocupa de avisar por todos los canales que tiene el navegador:
//
//   1. Modal de bienvenida  — al loguearse (o abrir una pestaña nueva),
//                             si hay sin leer. Una vez por sesión de pestaña.
//   2. Toasts               — cada notificación que aparece mientras la
//                             persona está en la app (llegan por realtime).
//   3. Aviso del navegador  — Notification API, cuando la pestaña está en
//                             segundo plano. Requiere permiso (se pide con
//                             un botón, los navegadores exigen gesto).
//   4. Título de la pestaña — "(3) Marcomms Hub" mientras haya sin leer.
//
// Lo "ya visto" se guarda en localStorage por usuario para que al volver
// no salte un toast por cada notificación vieja (para eso está el modal).
//
// Devuelve:
//   toasts, dismissToast(id)
//   welcomeOpen, closeWelcome()
//   browserPermission ('default' | 'granted' | 'denied' | 'unsupported')
//   requestBrowserPermission()
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildBrowserNotification,
  buildTabTitle,
  diffNewNotifications,
  mergeSeenIds,
  seenStorageKey,
  welcomeSessionKey,
} from '@/utils/notificationAlerts';

const TOAST_MS = 9000;
const MAX_TOASTS = 4;

const readSeen = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? new Set(arr) : null;
  } catch (_e) { return null; }
};
const writeSeen = (key, set) => {
  try { window.localStorage.setItem(key, JSON.stringify([...set])); } catch (_e) { /* storage deshabilitado */ }
};

const getPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
};

export const useNotificationAlerts = ({ currentUser, notifications, unreadCount, ready, onOpen }) => {
  const userName = currentUser?.name || '';
  const [toasts, setToasts] = useState([]);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(getPermission);

  const seenRef = useRef(null);       // Set de ids ya vistos (para el usuario actual)
  const seenUserRef = useRef('');     // a qué usuario pertenece seenRef
  const armedRef = useRef(false);     // true una vez que pasó la carga inicial
  const timersRef = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) { clearTimeout(timersRef.current[id]); delete timersRef.current[id]; }
  }, []);

  const pushToast = useCallback((notif) => {
    setToasts((prev) => [...prev.filter((t) => t.id !== notif.id), notif].slice(-MAX_TOASTS));
    timersRef.current[notif.id] = setTimeout(() => dismissToast(notif.id), TOAST_MS);
  }, [dismissToast]);

  const showBrowserNotification = useCallback((notif) => {
    if (getPermission() !== 'granted') return;
    // Si la pestaña está visible y con foco, el toast alcanza
    if (document.visibilityState === 'visible' && document.hasFocus()) return;
    try {
      const { title, body, tag } = buildBrowserNotification(notif);
      const n = new window.Notification(title, { body, tag, icon: '/favicon.png' });
      n.onclick = () => { window.focus(); if (onOpen) onOpen(notif); n.close(); };
    } catch (_e) { /* algunos navegadores tiran si no hay service worker */ }
  }, [onOpen]);

  // ── Reset al cambiar de usuario (login / logout) ──
  useEffect(() => {
    armedRef.current = false;
    seenRef.current = null;
    seenUserRef.current = userName;
    setToasts([]);
    setWelcomeOpen(false);
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
  }, [userName]);

  // ── Núcleo: cada vez que cambia la lista ──
  useEffect(() => {
    if (!userName || !ready) return;
    const key = seenStorageKey(userName);

    if (!armedRef.current) {
      // Primera pasada con datos completos: todo lo actual cuenta como "ya visto"
      // (de las viejas se ocupa el modal de bienvenida), y de acá en más
      // cualquier id nuevo dispara toast + aviso del navegador.
      armedRef.current = true;
      seenRef.current = mergeSeenIds(readSeen(key) || new Set(), notifications);
      writeSeen(key, seenRef.current);

      // Modal de bienvenida: una vez por sesión de pestaña y por usuario
      const wKey = welcomeSessionKey(userName);
      let shown = false;
      try { shown = window.sessionStorage.getItem(wKey) === '1'; } catch (_e) { shown = false; }
      if (!shown && unreadCount > 0) {
        setWelcomeOpen(true);
        try { window.sessionStorage.setItem(wKey, '1'); } catch (_e) { /* ignorar */ }
      }
      return;
    }

    const fresh = diffNewNotifications(notifications, seenRef.current);
    if (fresh.length === 0) return;
    seenRef.current = mergeSeenIds(seenRef.current, fresh);
    writeSeen(key, seenRef.current);
    fresh.forEach((n) => { pushToast(n); showBrowserNotification(n); });
  }, [userName, ready, notifications, unreadCount, pushToast, showBrowserNotification]);

  // ── Título de la pestaña ──
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.title = buildTabTitle(userName ? unreadCount : 0);
    return () => { document.title = buildTabTitle(0); };
  }, [userName, unreadCount]);

  // ── Permiso del navegador ──
  const requestBrowserPermission = useCallback(async () => {
    if (getPermission() === 'unsupported') return 'unsupported';
    try {
      const result = await window.Notification.requestPermission();
      setBrowserPermission(result);
      return result;
    } catch (_e) {
      setBrowserPermission(getPermission());
      return getPermission();
    }
  }, []);

  // Limpiar timers al desmontar
  useEffect(() => () => Object.values(timersRef.current).forEach(clearTimeout), []);

  return {
    toasts,
    dismissToast,
    welcomeOpen,
    closeWelcome: () => setWelcomeOpen(false),
    browserPermission,
    requestBrowserPermission,
  };
};

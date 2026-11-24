// ════════════════════════════════════════════════════════════════════
// SOCIAL CLIENT — Textos del link de cada cuenta de Social Media
// ════════════════════════════════════════════════════════════════════
// El link (/?social=<token>) lo ve el cliente: va con la marca de la
// cuenta (CU… → Control Union, PS… → Peterson Solutions, el resto sin
// marca) y en su tono. Control Union: formal e impersonal. Peterson
// Solutions: cercano, «nosotros», el cliente como protagonista.
// Colores, logos y tagline salen de src/constants/brands.js.
//
// Edición del pedido (nov 2026, migration 0080): el cliente cambia su
// pedido mientras está «En proceso»; después, `locked(estado)` le pide que
// le escriba a la responsable de Social Media.
// ════════════════════════════════════════════════════════════════════

import { SOCIAL_MEDIA_OWNER } from './socialPosts';

const NEUTRAL = {
  eyebrow: 'Calendario de publicaciones',
  intro: 'Estado de las publicaciones de la cuenta y solicitud de nuevos posteos.',
  formTitle: 'Solicitar un posteo',
  formIntro: 'Completá los datos y el pedido queda cargado en el calendario.',
  submit: 'Enviar pedido',
  success: 'Pedido recibido. Ya figura en el calendario como «En proceso».',
  another: 'Pedir otro posteo',
  edit: 'Editar pedido',
  editTitle: 'Editar el pedido',
  editIntro: 'Se puede cambiar mientras el pedido está «En proceso».',
  save: 'Guardar cambios',
  saved: 'Cambios guardados. El calendario ya muestra el pedido actualizado.',
  back: 'Volver al calendario',
  locked: (status) => `Este pedido ${status ? `ya está «${status}»` : 'ya no está «En proceso»'} y no se puede modificar. Para pedir un cambio, escribile a ${SOCIAL_MEDIA_OWNER}.`,
};

export const SOCIAL_CLIENT_TEXTS = {
  'Control Union': {
    eyebrow: 'Calendario de publicaciones',
    intro: 'Estado de las publicaciones de la cuenta, actualizado de forma continua, y solicitud de nuevos posteos.',
    formTitle: 'Solicitud de publicación',
    formIntro: 'Complete los datos de la publicación. La solicitud queda registrada en el calendario.',
    submit: 'Enviar solicitud',
    success: 'Solicitud registrada. Figura en el calendario en estado «En proceso».',
    another: 'Nueva solicitud',
    edit: 'Editar solicitud',
    editTitle: 'Edición de la solicitud',
    editIntro: 'La solicitud se puede modificar mientras se encuentra «En proceso».',
    save: 'Guardar cambios',
    saved: 'Cambios registrados. El calendario muestra la solicitud actualizada.',
    back: 'Volver al calendario',
    locked: (status) => `Esta solicitud ${status ? `se encuentra en estado «${status}»` : 'ya no se encuentra «En proceso»'} y no admite modificaciones. Para solicitar un cambio, comuníquese con ${SOCIAL_MEDIA_OWNER}.`,
  },
  'Peterson Solutions': {
    eyebrow: 'Tu calendario de publicaciones',
    intro: 'Acá ves en qué estado está cada posteo y nos podés pedir uno nuevo.',
    formTitle: 'Pedinos un posteo',
    formIntro: 'Contanos qué querés publicar y nos ponemos en marcha.',
    submit: 'Enviar pedido',
    success: '¡Listo! Recibimos tu pedido y ya lo ves en el calendario, «En proceso».',
    another: 'Pedir otro posteo',
    edit: 'Editar pedido',
    editTitle: 'Editá tu pedido',
    editIntro: 'Podés cambiarlo mientras está «En proceso».',
    save: 'Guardar cambios',
    saved: '¡Listo! Guardamos tus cambios y ya los ves en el calendario.',
    back: 'Volver al calendario',
    locked: (status) => `Este pedido ${status ? `ya está «${status}»` : 'ya no está «En proceso»'}, así que no se puede modificar desde acá. Si necesitás un cambio, escribile a ${SOCIAL_MEDIA_OWNER} y lo vemos juntos.`,
  },
};

export const socialClientTexts = (brand) => SOCIAL_CLIENT_TEXTS[brand] || NEUTRAL;

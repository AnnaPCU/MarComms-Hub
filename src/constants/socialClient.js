// ════════════════════════════════════════════════════════════════════
// SOCIAL CLIENT — Textos del link de cada cuenta de Social Media
// ════════════════════════════════════════════════════════════════════
// El link (/?social=<token>) lo ve el cliente: va con la marca de la
// cuenta (CU… → Control Union, PS… → Peterson Solutions, el resto sin
// marca) y en su tono. Control Union: formal e impersonal. Peterson
// Solutions: cercano, «nosotros», el cliente como protagonista.
// Colores, logos y tagline salen de src/constants/brands.js.
// ════════════════════════════════════════════════════════════════════

const NEUTRAL = {
  eyebrow: 'Calendario de publicaciones',
  intro: 'Estado de las publicaciones de la cuenta y solicitud de nuevos posteos.',
  formTitle: 'Solicitar un posteo',
  formIntro: 'Completá los datos y el pedido queda cargado en el calendario.',
  submit: 'Enviar pedido',
  success: 'Pedido recibido. Ya figura en el calendario como «En proceso».',
  another: 'Pedir otro posteo',
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
  },
  'Peterson Solutions': {
    eyebrow: 'Tu calendario de publicaciones',
    intro: 'Acá ves en qué estado está cada posteo y nos podés pedir uno nuevo.',
    formTitle: 'Pedinos un posteo',
    formIntro: 'Contanos qué querés publicar y nos ponemos en marcha.',
    submit: 'Enviar pedido',
    success: '¡Listo! Recibimos tu pedido y ya lo ves en el calendario, «En proceso».',
    another: 'Pedir otro posteo',
  },
};

export const socialClientTexts = (brand) => SOCIAL_CLIENT_TEXTS[brand] || NEUTRAL;

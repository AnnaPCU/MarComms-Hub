// ════════════════════════════════════════════════════════════════════
// SECTIONS — Secciones del Hub ocultas temporalmente
// ════════════════════════════════════════════════════════════════════
// Desde sep 2026 el seguimiento persona por persona se hace en el CRM
// (sistema de tickets). El Hub queda como herramienta para que quien
// coordina (Vicky, Felo, Agus, Ale) siga los proyectos en conjunto.
//
// Por eso se ocultan "Mi Semana" y "Facturación". El código sigue en
// src/components/myweek y src/components/facturacion — para volver a
// mostrarlas, sacar el id de esta lista y listo.
//
// Efecto de estar acá:
//   - No aparece en el Hub Central ni en el menú lateral
//   - No aparece en Acción Rápida
//   - Las notificaciones que navegan a esa sección no se muestran
// ════════════════════════════════════════════════════════════════════

export const HIDDEN_SECTIONS = ['my_week', 'facturacion'];

export const isSectionHidden = (id) => HIDDEN_SECTIONS.includes(id);

// Dentro de Social Media, la pestaña "Pedidos" (piezas por persona) se
// ocultó en sep 2026: la vista principal pasó a ser la hoja de posteos.
// Poner en true para volver a mostrarla (tab, botón "Nuevo pedido" y la
// acción rápida).
export const SHOW_SOCIAL_PEDIDOS = false;

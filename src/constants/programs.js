// ════════════════════════════════════════════════════════════════════
// PROGRAMS — Programas: una campaña integral que agrupa pilares
// ════════════════════════════════════════════════════════════════════
// Un programa (ej. "ISO 27001 España") junta varios pilares: webinar,
// evento, email marketing, paid media, creación de BBDD, investigación.
// Al crearlo se generan los pilares como proyectos propios, vinculados
// por programId. Lógica en src/utils/programs.js, UI en components/programs.
// ════════════════════════════════════════════════════════════════════

import { PILLARS } from './campaigns';

// Qué necesita cada pilar al crearse desde el programa
export const PROGRAM_PILLARS = PILLARS.map((p) => ({
  ...p,
  needsDate: p.id === 'webinars' || p.id === 'eventos',   // fecha obligatoria
  hint: {
    webinars: 'Crea el webinar con sus 21 tareas y la campaña de mailings vinculada.',
    eventos:  'Crea el evento con sus 5 fases de tareas.',
    email:    'Campaña de email marketing (Mailchimp), 3 envíos por defecto.',
    paid:     'Pauta en plataformas (Google, Meta, LinkedIn).',
    database: 'Armado o limpieza de base de datos.',
    research: 'Investigación de mercado o competencia.',
  }[p.id] || '',
}));

export const PROGRAM_STATUS = {
  planned:   { id: 'planned',   label: 'Por arrancar', color: 'bg-slate-100 text-slate-600 border-slate-200',    dot: 'bg-slate-400' },
  active:    { id: 'active',    label: 'En curso',     color: 'bg-violet-50 text-violet-700 border-violet-200',  dot: 'bg-violet-500' },
  completed: { id: 'completed', label: 'Completado',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

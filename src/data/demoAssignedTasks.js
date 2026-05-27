// ════════════════════════════════════════════════════════════════════
// DEMO ASSIGNED TASKS — Tareas asignadas entre usuarios
// ════════════════════════════════════════════════════════════════════
// Tareas que un miembro asigna a otro desde Mi Semana.
// Aparecen en:
//   - Mi Semana del destinatario (con sourceType: 'assigned')
//   - Notificaciones del destinatario (tipo cyan "assigned")
//
// El asignador (assignedBy) puede borrarlas; el destinatario solo togglear done.
// ════════════════════════════════════════════════════════════════════

export const DEMO_ASSIGNED_TASKS = [
  {
    id: 'at-demo-1',
    title: 'Revisar copy del lanzamiento Q3',
    detail: 'Pasar por el doc compartido y dejar comentarios antes del viernes',
    assignedTo: 'Agus',
    assignedBy: 'Vicky',
    assignedAt: '2026-05-04T09:00:00.000Z',
    deadline: '2026-05-08',
    done: false,
    project: null,
  },
];

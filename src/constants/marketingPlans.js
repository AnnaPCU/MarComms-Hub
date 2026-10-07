// ════════════════════════════════════════════════════════════════════
// MARKETING PLANS — Constantes del seguimiento de Planes de Marketing
// ════════════════════════════════════════════════════════════════════
// Réplica del Excel "Seguimiento Planes Marketing" (hoja Listas):
// estados, prioridades y meses. Las etiquetas son las del Excel, así
// el import las reconoce tal cual.
// ════════════════════════════════════════════════════════════════════

// Hojas del Excel que no son planes
export const SUMMARY_SHEET = 'Resumen General';
export const NON_PLAN_SHEETS = ['Resumen General', 'Plantilla', 'Listas'];

export const TASK_STATUSES = [
  { id: 'Pendiente',  label: 'Pendiente',  chip: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  { id: 'En curso',   label: 'En curso',   chip: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  { id: 'Bloqueado',  label: 'Bloqueado',  chip: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
  { id: 'Completado', label: 'Completado', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'Cancelado',  label: 'Cancelado',  chip: 'bg-slate-100 text-slate-500 border-slate-200',      dot: 'bg-slate-400' },
];
// Tareas sin estado cargado: el Excel las cuenta como abiertas
export const NO_STATUS = { id: '', label: 'Sin estado', chip: 'bg-slate-50 text-slate-400 border-slate-200', dot: 'bg-slate-300' };
export const statusMeta = (status) => TASK_STATUSES.find((s) => s.id === status) || NO_STATUS;

export const DONE_STATUS = 'Completado';
export const CANCELLED_STATUS = 'Cancelado';

export const TASK_PRIORITIES = [
  { id: 'Alta',  chip: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'Media', chip: 'bg-amber-50 text-amber-600 border-amber-100' },
  { id: 'Baja',  chip: 'bg-slate-50 text-slate-500 border-slate-200' },
];
export const priorityMeta = (p) => TASK_PRIORITIES.find((x) => x.id === p) || null;

export const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Encabezados del Excel → campo del Hub
export const TASK_HEADERS = {
  'mes': 'month', 'fecha': 'date', 'acción / tarea': 'title', 'accion / tarea': 'title', 'responsable': 'owner',
  'estado': 'status', 'prioridad': 'priority', 'objetivo': 'objective', 'resultado': 'result',
  'comentario': 'comment', 'link': 'link',
};
export const MONTHLY_HEADERS = {
  'mes': 'month', 'fecha reunión': 'meetingDate', 'fecha reunion': 'meetingDate', 'foco del mes': 'focus',
  'resultados del mes': 'results', 'decisiones / próximos pasos': 'decisions', 'decisiones / proximos pasos': 'decisions',
  'link': 'link',
};
export const OBJECTIVE_HEADERS = { 'objetivo': 'objective', 'meta': 'goal', 'resultado actual': 'current', 'comentario': 'comment' };
// Etiquetas del bloque de datos generales (arriba de cada pestaña)
export const META_LABELS = {
  'owner': 'owner', 'cc en mails': 'cc', 'marca': 'brand', 'país': 'country', 'pais': 'country',
  'reunión de seguimiento': 'followUpMeeting', 'reunion de seguimiento': 'followUpMeeting',
  'próxima reunión': 'nextMeeting', 'proxima reunion': 'nextMeeting', 'mes de inicio': 'startMonth',
  'período': 'period', 'periodo': 'period',
  // Totales que calcula el propio Excel (se usan solo para avisar si no coinciden)
  'tareas': 'xlsTotal', 'completadas': 'xlsCompleted', 'abiertas': 'xlsOpen', '% avance': 'xlsPct',
};

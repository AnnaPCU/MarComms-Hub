// ════════════════════════════════════════════════════════════════════
// PLAN TASKS — Constantes de la sección Planes (tareas de cada plan)
// ════════════════════════════════════════════════════════════════════
// Replica la sección "3) TAREAS" de cada pestaña del Excel "Seguimiento
// Planes Marketing", editable en tiempo real como la hoja de Social Media.
//
// Columnas (pedido oct 2026):
//   Mes · Acción / Tarea · Responsable* · Deadline* · Estado · Objetivo ·
//   Resultado · Detalle (ex "Comentario") · Link (opcional)
//   * solo en la vista interna. Sin "Fecha" ni "Prioridad".
// ════════════════════════════════════════════════════════════════════

// Estados del Excel (hoja Listas). Los ids son los textos tal cual.
export const PLAN_TASK_STATUSES = [
  { id: 'Pendiente',  label: 'Pendiente',  chip: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   solid: 'bg-amber-400' },
  { id: 'En curso',   label: 'En curso',   chip: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    solid: 'bg-blue-500' },
  { id: 'Bloqueado',  label: 'Bloqueado',  chip: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     solid: 'bg-red-500' },
  { id: 'Completado', label: 'Completado', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', solid: 'bg-emerald-500' },
  { id: 'Cancelado',  label: 'Cancelado',  chip: 'bg-slate-100 text-slate-500 border-slate-200',      dot: 'bg-slate-400',   solid: 'bg-slate-400' },
];
export const PLAN_TASK_STATUS_BY_ID = Object.fromEntries(PLAN_TASK_STATUSES.map((s) => [s.id, s]));
export const DEFAULT_TASK_STATUS = 'Pendiente';
export const DONE_TASK_STATUS = 'Completado';
export const CANCELLED_TASK_STATUS = 'Cancelado';

// Clic en el punto del estado (como en Social Media): Pendiente → En curso
// → Completado → Pendiente. Bloqueado y Cancelado se eligen en el editor.
const NEXT_STATUS = { Pendiente: 'En curso', 'En curso': 'Completado', Completado: 'Pendiente', Bloqueado: 'En curso', Cancelado: 'Pendiente' };
export const nextTaskStatus = (status) => NEXT_STATUS[status] || DEFAULT_TASK_STATUS;

export const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Excel → columnas de la tabla (para la importación). "Fecha" y "Prioridad" no se traen.
export const EXCEL_TASK_HEADERS = {
  'mes': 'month', 'acción / tarea': 'title', 'accion / tarea': 'title', 'responsable': 'owner',
  'estado': 'status', 'objetivo': 'objective', 'resultado': 'result', 'comentario': 'detail',
  'detalle': 'detail', 'link': 'link', 'deadline': 'deadline',
};
export const EXCEL_IGNORED_HEADERS = ['fecha', 'prioridad'];
// Pestañas del Excel que no son planes
export const EXCEL_NON_PLAN_SHEETS = ['Resumen General', 'Plantilla', 'Listas'];

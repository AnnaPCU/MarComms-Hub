// ════════════════════════════════════════════════════════════════════
// DATE UTILS — Manipulación de fechas
// ════════════════════════════════════════════════════════════════════

// Suma N días a una fecha ISO (YYYY-MM-DD). Devuelve string ISO.
// Si la fecha es vacía o inválida, devuelve "".
export const addDays = (dateStr, n) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// Alias usado en events
export const addDaysIso = addDays;

// Formato amigable para PDFs: "18 may 2026"
export const formatPdfDate = (iso) => {
  if (!iso) return '';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dateStr = iso.length === 10 ? iso + 'T00:00:00' : iso;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Formato corto en español (Buenos Aires): "18/05/2026"
export const formatDate = (iso) => {
  if (!iso) return '';
  const dateStr = iso.length === 10 ? iso + 'T00:00:00' : iso;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR');
};

// Devuelve true si la fecha es anterior a hoy
export const isOverdue = (iso) => {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return d < today;
};

// Devuelve días entre dos fechas (negativo si la primera es posterior)
export const daysBetween = (iso1, iso2) => {
  if (!iso1 || !iso2) return null;
  const d1 = new Date(iso1 + 'T00:00:00');
  const d2 = new Date(iso2 + 'T00:00:00');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

// Convierte un Date a ISO local (YYYY-MM-DD) sin pasar por UTC
// (toISOString corre la fecha un día en zonas horarias positivas).
export const toIsoDate = (d) => {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ISO de hoy (local)
export const todayIso = () => toIsoDate(new Date());

// Devuelve true si la fecha ISO cae de lunes a viernes.
// No contempla feriados: el equipo trabaja en varios países y no hay
// un calendario único de feriados.
export const isBusinessDay = (iso) => {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
};

// Suma N días hábiles (lun–vie) a una fecha ISO. N negativo resta.
// Los fines de semana no cuentan: restar 3 hábiles a un lunes da el
// miércoles anterior.
export const addBusinessDays = (dateStr, n) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const step = n < 0 ? -1 : 1;
  let remaining = Math.abs(n);
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return toIsoDate(d);
};

export const subtractBusinessDays = (dateStr, n) => addBusinessDays(dateStr, -Math.abs(n));

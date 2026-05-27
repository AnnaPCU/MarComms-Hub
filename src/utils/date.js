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

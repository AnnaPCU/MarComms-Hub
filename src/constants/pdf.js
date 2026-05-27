// ════════════════════════════════════════════════════════════════════
// PDF & MAILCHIMP — Constantes de styling para los reportes
// ════════════════════════════════════════════════════════════════════

// ── Temas del PDF (color según tipo de proyecto) ──
// Usados por generateProjectPDF en utils/pdf.js
export const PDF_THEMES = {
  webinar: {
    label: 'Webinar',
    color: '#4f46e5',       // indigo-600
    colorLight: '#eef2ff',  // indigo-50
    colorBorder: '#c7d2fe', // indigo-200
  },
  campaign: {
    label: 'Campaña',
    color: '#9333ea',       // purple-600
    colorLight: '#faf5ff',  // purple-50
    colorBorder: '#e9d5ff', // purple-200
  },
  event: {
    label: 'Evento',
    color: '#ea580c',       // orange-600
    colorLight: '#fff7ed',  // orange-50
    colorBorder: '#fed7aa', // orange-200
  },
};

// ── Paleta del Mailchimp Report Tool ──
export const MAILCHIMP_COLORS = {
  primary:      '#2563eb',
  primaryDark:  '#1e40af',
  primaryLight: '#dbeafe',
  accent:       '#f59e0b',
  accentDark:   '#d97706',
  success:      '#059669',
  danger:       '#dc2626',
  slate:        '#334155',
  bg:           '#f1f5f9',
};

// ── Colores por email en la secuencia (Email 1, 2, 3) ──
export const MAILCHIMP_EMAIL_COLORS = ['#2563eb', '#7c3aed', '#059669'];

// ── Labels de cada email en la secuencia ──
export const MAILCHIMP_EMAIL_LABELS = ['Email 1', 'Email 2', 'Email 3'];

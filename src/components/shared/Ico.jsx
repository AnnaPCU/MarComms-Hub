// ════════════════════════════════════════════════════════════════════
// Ico — Wrapper SVG genérico con paths predefinidos
// ════════════════════════════════════════════════════════════════════
// Permite renderizar íconos por nombre sin importar todos de lucide-react.
// Útil para íconos pequeños embebidos en celdas de tabla, badges, etc.
//
// Uso: <Ico name="Calendar" size={12} color="#94a3b8" />
// ════════════════════════════════════════════════════════════════════

import React from 'react';

// Paths SVG (todos con viewBox 0 0 24 24)
const PATHS = {
  Plus:         '<path d="M5 12h14"/><path d="M12 5v14"/>',
  Calendar:     '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  Trash2:       '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  Lock:         '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  CheckCircle2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  Clock:        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  ArrowLeft:    '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  UserCircle:   '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>',
  Database:     '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
};

export default function Ico({ name, size = 16, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: PATHS[name] || '' }}
    />
  );
}

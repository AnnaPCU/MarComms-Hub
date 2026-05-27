// ════════════════════════════════════════════════════════════════════
// SimpleStep — Checkbox visual de un step de campaña
// ════════════════════════════════════════════════════════════════════
// Botón con ícono custom (paso pendiente) o ✓ verde (paso completo).
// Usado en CampaignsApp para steps simples (paid, database, research).
//
// Props:
//   label  — texto del step
//   camp   — objeto campaña (lee completedSteps)
//   id     — id del step
//   set    — (camp, stepId) => void  callback para toggle
//   Icon   — componente ícono (lucide) que se muestra cuando NO está done
//   color  — clase Tailwind del color del ícono pendiente
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function SimpleStep({ label, camp, id, set, Icon, color = 'text-blue-500' }) {
  const isDone = (camp.completedSteps || []).includes(id);
  return (
    <button
      onClick={() => set(camp, id)}
      className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition-all ${
        isDone
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-slate-100 text-slate-400'
      }`}
    >
      {isDone ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <Icon className={`w-4 h-4 ${color}`} />
      )}
      <span className="text-[10px] font-black uppercase">{label}</span>
    </button>
  );
}

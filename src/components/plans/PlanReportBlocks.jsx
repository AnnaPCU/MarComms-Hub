// ════════════════════════════════════════════════════════════════════
// PlanReportBlocks — KPIs del mes e Iniciativas, como en el reporte
// ════════════════════════════════════════════════════════════════════
// Bloques que comparten la vista interna del plan y el link externo, con
// el diseño del reporte mensual al cliente:
//   · KPIs del mes: Operativos (tarjetas blancas con borde de la marca) y
//     Performance (tarjetas Dark Blue con monto, moneda, nota y etiqueta).
//   · Iniciativas: una tabla por tipo (# · Iniciativa · Detalle).
// Los colores salen de la marca del plan (src/constants/brands.js):
// Control Union y Peterson Solutions nunca se mezclan.
//
// Props comunes: c (colores de la marca para el modo actual), navy (Dark
// Blue de la marca: fondo de Performance y de los encabezados de tabla).
// Performance muestra la variación contra el mes anterior (kpi.change,
// ver monthKpiGroups): verde si sube, rojo si baja.
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { formatKpiChange, formatKpiNumber } from '@/utils/planKpis';

// "KPIs del mes ——— Operativos y de performance"
export function ReportSectionTitle({ title, aside, c, children }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-[11px] font-bold uppercase tracking-widest min-w-0" style={{ color: c.primary }}>{title}</h2>
      <span className="flex-1 min-w-[16px] h-px" style={{ background: c.primary, opacity: 0.25 }} />
      {aside && <span className="hidden sm:inline text-[11px] italic shrink-0" style={{ color: c.label }}>{aside}</span>}
      {children}
    </div>
  );
}

export function GroupLabel({ label, count, c, hollow = false }) {
  return (
    <p className="flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: c.dark }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={hollow ? { border: `1.5px solid ${c.primary}` } : { background: c.primary }} />
      {label}{count !== undefined ? ` · ${count}` : ''}
    </p>
  );
}

const UP = '#4ade80';
const DOWN = '#f87171';

// "▲ +100 % vs septiembre" (prevLabel: nombre del mes anterior)
function KpiChange({ kpi, prevLabel, onNavy }) {
  const { pct, prevValue } = kpi.change;
  const n = Math.round(pct * 100);
  const Icon = n > 0 ? ArrowUpRight : n < 0 ? ArrowDownRight : ArrowRight;
  const color = n > 0 ? (onNavy ? UP : '#15803d') : n < 0 ? (onNavy ? DOWN : '#b91c1c') : (onNavy ? 'rgba(255,255,255,0.7)' : '#64748b');
  return (
    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold" style={{ color }} title={`${prevLabel}: ${formatKpiNumber(prevValue)}${kpi.currency ? ` ${kpi.currency}` : ''}`}>
      <Icon className="w-3.5 h-3.5" /> {formatKpiChange(pct)} <span className="font-medium opacity-80">vs {prevLabel}</span>
    </span>
  );
}

// Una tarjeta. `muted`: no se muestra en el link (vista interna, sin valor).
// `hint`: texto interno debajo (ej. "calculado de 3 tareas").
// Investment: tarjeta blanca con borde superior Dark Blue (c.dark: en
// oscuro, el texto claro de la marca) y "Activation" como kicker.
function KpiCard({ kpi, c, navy, muted, hint, prevLabel, onClick }) {
  const dark = kpi.group === 'performance';
  const invest = kpi.group === 'investment';
  const hasValue = kpi.value !== null && kpi.value !== undefined;
  const Tag = onClick ? 'button' : 'div';
  const base = 'text-left rounded-xl p-4 min-h-[118px] flex flex-col w-full';
  const style = muted
    ? { border: `1.5px dashed ${dark ? navy : invest ? c.dark : c.primary}`, opacity: 0.75 }
    : dark ? { background: navy } : invest ? { borderTop: `3px solid ${c.dark}` } : { borderLeft: `3px solid ${c.primary}` };
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`${base} ${!muted && !dark ? 'bg-white border border-slate-200 shadow-sm' : ''} ${muted ? 'bg-white' : ''} ${onClick ? 'hover:shadow-md transition-shadow' : ''}`} style={style}>
      {kpi.kicker && <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: c.primary }}>{kpi.kicker}</span>}
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: dark && !muted ? c.primary : c.label }}>{kpi.label}</span>
      {hasValue ? (
        <span className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-3xl font-bold leading-none" style={{ color: dark && !muted ? '#ffffff' : c.dark }}>{formatKpiNumber(kpi.value)}</span>
          {kpi.currency && <span className="text-xs font-bold" style={{ color: dark && !muted ? 'rgba(255,255,255,0.75)' : c.label }}>{kpi.currency}</span>}
        </span>
      ) : (
        <span className="mt-1.5 text-sm font-bold" style={{ color: c.label }}>Sin cargar</span>
      )}
      {kpi.change && prevLabel && <KpiChange kpi={kpi} prevLabel={prevLabel} onNavy={dark && !muted} />}
      {kpi.note && <span className="mt-2 text-[11px] italic leading-snug" style={{ color: dark && !muted ? 'rgba(255,255,255,0.7)' : c.label }}>{kpi.note}</span>}
      {kpi.tag && (
        <span className="mt-2 self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={dark && !muted ? { background: 'rgba(255,255,255,0.12)', color: c.primary } : { background: c.soft, color: c.dark }}>{kpi.tag}</span>
      )}
      {hint && <span className="mt-auto pt-2 text-[10px] font-bold" style={{ color: dark && !muted ? 'rgba(255,255,255,0.55)' : c.label }}>{hint}</span>}
    </Tag>
  );
}

// groups: monthKpiGroups(...). En el link (internal = false) solo van los
// KPIs con valor mayor a 0 y los grupos que tienen alguno; sin ninguno no
// se muestra. internal: muestra todos (los que no van, punteados) y
// `hintOf(kpi)`. prevLabel: nombre del mes anterior ("septiembre").
export function KpiGroupsView({ groups, c, navy, internal = false, hintOf, prevLabel, onCardClick }) {
  const shown = groups
    .map((g) => ({ ...g, items: internal ? g.items : g.items.filter((k) => k.visible) }))
    .filter((g) => g.items.length > 0);
  if (!shown.length) return null;
  return (
    <div className={`grid gap-x-4 gap-y-5 ${shown.length > 1 ? 'lg:grid-cols-2' : ''}`}>
      {shown.map((g) => (
        <div key={g.id}>
          <GroupLabel label={g.label} c={c} hollow={g.id === 'performance'} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {g.items.map((k) => (
              <KpiCard key={k.id} kpi={k} c={c} navy={navy} muted={internal && !k.visible} hint={internal && hintOf ? hintOf(k) : null} prevLabel={prevLabel} onClick={onCardClick ? () => onCardClick(k) : null} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// groups: initiativeGroups(...). onRowClick(item) y footer(group) solo en
// la vista interna (editar / agregar).
export function InitiativesTables({ groups, c, navy, onRowClick, footer }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key || 'sin-tipo'}>
          {(g.label || groups.length > 1) && <GroupLabel label={g.label || 'Otras iniciativas'} count={g.items.length} c={c} />}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr style={{ background: navy }}>
                  <th className="w-12 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white">#</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white sm:w-[34%]">Iniciativa</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((it, i) => (
                  <tr
                    key={it.id}
                    onClick={onRowClick ? () => onRowClick(it) : undefined}
                    title={onRowClick ? 'Clic para editar la iniciativa' : undefined}
                    className={`border-t border-slate-100 align-top ${onRowClick ? 'cursor-pointer hover:bg-slate-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 text-[12px]" style={{ color: c.label }}>{i + 1}</td>
                    <td className="px-4 py-3 text-[13px] font-bold leading-snug" style={{ color: c.dark }}>{it.title}</td>
                    <td className="px-4 py-3 text-[12px] leading-snug whitespace-pre-line" style={{ color: c.text }}>{it.detail || <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {footer && footer(g)}
          </div>
        </div>
      ))}
    </div>
  );
}

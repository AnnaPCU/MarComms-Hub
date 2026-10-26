// ════════════════════════════════════════════════════════════════════
// KpiEditor — Cargar / corregir los KPIs de un plan en un mes
// ════════════════════════════════════════════════════════════════════
// Los KPIs del reporte, en sus grupos (Operativos, Performance, Investment):
//   · Entregables completados y Reuniones internas se calculan solos con
//     las tareas del mes: el campo queda vacío y muestra el cálculo; si se
//     escribe un número, ese manda.
//   · Investment (en USD): Plan MarComms se arrastra del último mes
//     cargado (`carried`); Paid Media Always On / One Shot va mes a mes.
//   · Contactos generados por BBDD, Deals, MQLs y Ventas se cargan a mano.
//     Deals es una cantidad (sin moneda). MQLs y Ventas: monto, moneda
//     opcional y la cantidad que representan ("8 MQLs", "2 ventas").
//     Todos aceptan una descripción debajo del número.
// Vacío o en 0, el KPI no se muestra en el link externo. Los de
// performance se comparan solos con el mes anterior.
//
// Props: plan, monthKey, stored (kpis guardados del mes), auto
//   (autoKpis del mes), carried (carriedKpis: lo que se arrastra de meses
//   anteriores), onSave(kpis) (async), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { PLAN_KPIS, PLAN_KPI_GROUPS, KPI_CURRENCIES } from '@/constants/planKpis';
import { cleanKpis, formatKpiNumber, kpiFormValues } from '@/utils/planKpis';
import { monthLabel } from '@/utils/planTasks';

const inputCls = 'w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

const autoText = (id, auto) => (id === 'meetings'
  ? `Automático: ${auto.meetings} (de ${auto.meetingTasks} ${auto.meetingTasks === 1 ? 'tarea de reunión completada' : 'tareas de reunión completadas'})`
  : `Automático: ${auto.deliverables} (tareas completadas del mes que no son reuniones)`);

export default function KpiEditor({ plan, monthKey, stored, auto, carried = {}, onSave, onClose }) {
  const [form, setForm] = useState(() => kpiFormValues(stored));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const set = (id, field, v) => {
    setForm((f) => ({ ...f, [id]: { ...f[id], [field]: v } }));
    if (errors[id]) setErrors((e) => ({ ...e, [id]: '' }));
  };

  const submit = async () => {
    if (saving) return;
    const { kpis, errors: errs } = cleanKpis(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setSaveError('');
    try { await onSave(kpis); }
    catch (_e) { setSaveError('No se pudieron guardar los KPIs. Probá de nuevo; si sigue fallando, revisá la consola.'); setSaving(false); }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
        <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 truncate">{plan?.name}</p>
              <h2 className="text-base font-black text-slate-900">KPIs de {monthLabel(monthKey)}</h2>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Lo que quede vacío o en 0 no aparece en el link externo. Deals, MQLs y Ventas se comparan solos con el mes anterior.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>

          <div className="p-5 space-y-5 overflow-y-auto">
            {PLAN_KPI_GROUPS.map((g) => (
              <section key={g.id} className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">{g.label}</h3>
                {PLAN_KPIS.filter((k) => k.group === g.id).map((k) => {
                  const f = form[k.id];
                  return (
                    <div key={k.id} className="border border-slate-200 rounded-2xl p-3 space-y-2">
                      <p className="text-xs font-black text-slate-800">
                        {k.kicker && <span className="text-[10px] uppercase tracking-widest text-slate-400 mr-1.5">{k.kicker}</span>}
                        {k.label}
                        {k.hint && <span className="ml-1.5 text-[10px] font-bold text-slate-400">· {k.hint}</span>}
                      </p>
                      <div className={`grid grid-cols-1 gap-2 ${k.money ? 'sm:grid-cols-[1fr_110px_1fr]' : 'sm:grid-cols-[1fr_2fr]'}`}>
                        <div className="space-y-1">
                          <label className={labelCls} htmlFor={`kpi-${k.id}`}>{k.money ? 'Monto' : 'Número'}</label>
                          <input
                            id={`kpi-${k.id}`}
                            inputMode="decimal"
                            value={f.value}
                            onChange={(e) => set(k.id, 'value', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                            placeholder={k.auto ? String(auto[k.id]) : carried[k.id] ? formatKpiNumber(carried[k.id].value) : k.group === 'investment' ? 'Ej: 1.500' : k.money ? 'Ej: 40.000' : k.id === 'deals' ? 'Ej: 40' : 'Ej: 800'}
                            className={`${inputCls} font-mono ${errors[k.id] ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                          />
                        </div>
                        {k.money && (
                          <div className="space-y-1">
                            <label className={labelCls} htmlFor={`kpi-${k.id}-cur`}>Moneda</label>
                            <select id={`kpi-${k.id}-cur`} value={f.currency} onChange={(e) => set(k.id, 'currency', e.target.value)} className={inputCls}>
                              <option value="">Sin moneda</option>
                              {[...new Set([...KPI_CURRENCIES, f.currency].filter(Boolean))].map((cur) => <option key={cur} value={cur}>{cur}</option>)}
                            </select>
                          </div>
                        )}
                        {k.count ? (
                          <div className="space-y-1">
                            <label className={labelCls} htmlFor={`kpi-${k.id}-count`}>Cantidad de {k.count.many} <span className="normal-case tracking-normal font-bold text-slate-300">(va abajo del monto)</span></label>
                            <input id={`kpi-${k.id}-count`} inputMode="numeric" value={f.count} onChange={(e) => set(k.id, 'count', e.target.value)} placeholder={k.id === 'sales' ? 'Ej: 2' : 'Ej: 8'} className={`${inputCls} font-mono`} />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className={labelCls} htmlFor={`kpi-${k.id}-note`}>Descripción <span className="normal-case tracking-normal font-bold text-slate-300">(opcional)</span></label>
                            <input id={`kpi-${k.id}-note`} value={f.note} onChange={(e) => set(k.id, 'note', e.target.value)} placeholder={k.id === 'contacts' ? 'Ej: Top 5 estados USDA' : k.money ? 'Va debajo del monto' : 'Va debajo del número'} className={inputCls} />
                          </div>
                        )}
                      </div>
                      {k.money && k.count && (
                        <div className="space-y-1">
                          <label className={labelCls} htmlFor={`kpi-${k.id}-note`}>Descripción <span className="normal-case tracking-normal font-bold text-slate-300">(opcional · va debajo del monto)</span></label>
                          <input id={`kpi-${k.id}-note`} value={f.note} onChange={(e) => set(k.id, 'note', e.target.value)} placeholder="Ej: 20 % proveniente de bases de datos creadas con la Commercial Tool" className={inputCls} />
                        </div>
                      )}
                      {k.auto && <p className="text-[10px] font-bold text-slate-400">{autoText(k.id, auto)}. Escribí un número solo para corregirlo.</p>}
                      {k.carry && (
                        <p className="text-[10px] font-bold text-slate-400">
                          {carried[k.id]
                            ? `Vacío = sigue el de ${monthLabel(carried[k.id].from)} (${carried[k.id].currency || ''} ${formatKpiNumber(carried[k.id].value)}). Un monto nuevo rige desde ${monthLabel(monthKey)} en adelante.`
                            : 'Se repite todos los meses: cargalo una vez y sigue igual hasta que lo cambies.'}
                        </p>
                      )}
                      {errors[k.id] && <p className="text-[10px] font-bold text-red-600">{errors[k.id]}</p>}
                    </div>
                  );
                })}
              </section>
            ))}
            {saveError && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{saveError}</p>}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <div className="flex-1" />
            <button onClick={onClose} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">Cancelar</button>
            <button onClick={submit} disabled={saving} className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg">
              {saving ? 'Guardando…' : 'Guardar KPIs'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

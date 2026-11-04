// ════════════════════════════════════════════════════════════════════
// HistoryView — «Historial»: quién cambió qué y cuándo
// ════════════════════════════════════════════════════════════════════
// Lee invoicing_changes (lo escribe un trigger, migration 0051): un
// renglón por celda cambiada, con antes → después, y las filas creadas o
// borradas. Se puede filtrar por mes, hoja y persona, y buscar. Los
// cambios nuevos aparecen solos (realtime).
//
// Props: months (['YYYY-MM']), dark
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, History, Search } from 'lucide-react';
import { SHEET_LABELS } from '@/constants/invoicing';
import { listChanges, subscribeChanges } from '@/services/invoicingService';
import { changeTitle, changeValueText, dayLabel, groupChanges, timeOf } from '@/utils/invoicingHistory';
import { todayIso } from '@/utils/date';
import { monthLabel } from '@/utils/planTasks';

const PAGE = 300;
const isMissingTable = (e) => e?.code === '42P01' || e?.code === 'PGRST205' || /does not exist|schema cache/i.test(e?.message || '');
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function HistoryView({ months = [] }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(true);
  const [month, setMonth] = useState('');
  const [sheet, setSheet] = useState('');
  const [who, setWho] = useState('');
  const [q, setQ] = useState('');
  const timer = useRef(null);

  const load = async (opts = {}) => {
    try {
      const list = await listChanges({ month: month || undefined, limit: PAGE, before: opts.before });
      setChanges((prev) => (opts.before ? [...prev, ...list] : list));
      setMore(list.length === PAGE);
      setError(false); setMissing(false);
    } catch (e) {
      if (isMissingTable(e)) setMissing(true);
      else { console.error('[HistoryView] fetch error:', e); setError(true); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); load(); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const off = subscribeChanges(() => { clearTimeout(timer.current); timer.current = setTimeout(() => load(), 400); });
    return () => { clearTimeout(timer.current); off(); };
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = useMemo(() => [...new Set(changes.map((c) => c.by).filter(Boolean))].sort(), [changes]);
  const filtered = useMemo(() => {
    const term = fold(q).trim();
    return changes.filter((c) => (!sheet || c.sheet === sheet) && (!who || c.by === who)
      && (!term || fold(`${c.rowLabel} ${c.key || ''} ${changeValueText(c.sheet, c.key, c.before)} ${changeValueText(c.sheet, c.key, c.after)}`).includes(term)));
  }, [changes, sheet, who, q]);
  const days = useMemo(() => groupChanges(filtered), [filtered]);
  const today = todayIso();

  if (missing) return <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-bold">El historial todavía no está activado en la base (falta la migración 0051 en Supabase).</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el historial" aria-label="Buscar en el historial" className="w-60 max-w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-300" />
        </label>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes del historial" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
          <option value="">Todos los meses</option>
          {[...months].reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          <option value="fija">Entidades (sin mes)</option>
        </select>
        <select value={sheet} onChange={(e) => setSheet(e.target.value)} aria-label="Hoja" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
          <option value="">Todas las hojas</option>
          {Object.entries(SHEET_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Persona" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
          <option value="">Todas las personas</option>
          {people.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="ml-auto text-[11px] font-bold text-slate-400">{filtered.length} {filtered.length === 1 ? 'cambio' : 'cambios'}{more ? ' (hay más)' : ''}</span>
      </div>

      {error && <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-bold">No se pudo cargar el historial. Revisá la consola.</p>}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-16">Cargando el historial…</p>
      ) : days.length === 0 ? (
        <p className="bg-white rounded-2xl border border-slate-200 px-4 py-12 text-center text-xs font-bold text-slate-400"><History className="w-6 h-6 mx-auto mb-2 text-slate-300" />Todavía no hay cambios registrados{q || sheet || who ? ' con esos filtros' : ''}.</p>
      ) : (
        <div className="space-y-5">
          {days.map((d) => (
            <section key={d.day}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{dayLabel(d.day, today)} <span className="text-slate-300 normal-case tracking-normal">· {d.day.split('-').reverse().join('/')}</span></h3>
              <ol className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                {d.items.map((it) => (
                  <li key={it.id} className="flex items-start gap-3 px-4 py-2.5 text-xs">
                    <span className="font-mono text-[10px] text-slate-400 w-10 shrink-0 pt-0.5">{timeOf(it.at)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-800">{it.by || 'Sin nombre'}</span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">{it.bulk && it.sheets.size > 1 ? `${it.sheets.size} hojas` : SHEET_LABELS[it.sheet] || it.sheet}</span>
                        {it.month && <span className="text-[10px] font-bold text-slate-400">{monthLabel(it.month)}</span>}
                        {!it.bulk || it.count === 1 ? <span className="font-bold text-slate-600 truncate">{it.rowLabel || 'Fila sin nombre'}</span> : null}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 flex-wrap text-slate-600">
                        <span className={`font-bold ${it.action === 'insert' ? 'text-emerald-700' : it.action === 'delete' ? 'text-red-600' : 'text-slate-500'}`}>{changeTitle(it)}{it.action === 'update' ? ':' : ''}</span>
                        {it.action === 'update' && (
                          <>
                            <span className="font-mono text-slate-400 break-all">{changeValueText(it.sheet, it.key, it.before)}</span>
                            <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                            <span className="font-mono font-black text-slate-800 break-all">{changeValueText(it.sheet, it.key, it.after)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {more && (
            <button onClick={() => load({ before: changes[changes.length - 1]?.at })} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">Cargar más</button>
          )}
        </div>
      )}
    </div>
  );
}

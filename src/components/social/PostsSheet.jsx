// ════════════════════════════════════════════════════════════════════
// PostsSheet — Hoja de seguimiento de posteos de LinkedIn
// ════════════════════════════════════════════════════════════════════
// Reemplaza el Excel de Delfi. Una fila por cuenta (agrupadas por
// cuenta de LinkedIn), una columna por semana del mes, y en cada celda
// los posteos de esa semana como chips coloreados por estado.
//
//   - Clic en el punto del chip → rota el estado (proceso → listo →
//     aprobado → programado).
//   - Clic en el chip → abre el editor (título, temática, estado, semana…).
//   - Botón + de la celda → posteo nuevo en esa cuenta y semana.
//   - Última columna: posteos del mes vs. esperados según el plan.
//   - Celdas de semanas ya cerradas que van por debajo del plan se
//     marcan como "falta".
//
// Props:
//   accounts, posts, loading, usingFallback
//   currentUser
//   createPost / updatePost / removePost
//   createAccount / updateAccount / removeAccount
//   todayIso (default: hoy)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings2 } from 'lucide-react';

import { POST_STATUSES, POST_STATUS_BY_ID, ACCOUNT_PLAN_BY_ID, nextPostStatus, ACCOUNT_GROUPS } from '@/constants/socialPosts';
import { WORLD_DAY_THEME_BY_ID } from '@/constants/worldDays';
import { weeksOfMonth, expectedPostsBy, accountMonthSummary } from '@/utils/socialPosts';
import { todayIso as getTodayIso } from '@/utils/date';
import PostEditor from './PostEditor';
import AccountsModal from './AccountsModal';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function PostsSheet({
  accounts, posts, loading, usingFallback, currentUser,
  createPost, updatePost, removePost, createAccount, updateAccount, removeAccount,
  todayIso,
}) {
  const today = todayIso || getTodayIso();
  const [cursor, setCursor] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [editor, setEditor] = useState(null); // { post } | { account, weekStart }
  const [showAccounts, setShowAccounts] = useState(false);

  const isCurrentMonth = cursor.year === Number(today.slice(0, 4)) && cursor.month === Number(today.slice(5, 7));
  const goMonth = (delta) => setCursor(({ year, month }) => {
    const d = new Date(year, month - 1 + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const weeks = useMemo(() => weeksOfMonth(cursor.year, cursor.month), [cursor]);
  const monthKey = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`;
  const monthPosts = useMemo(() => (posts || []).filter((p) => p.monthKey === monthKey), [posts, monthKey]);

  const activeAccounts = useMemo(() => (accounts || []).filter((a) => a.active !== false), [accounts]);
  const groups = useMemo(() => {
    const order = [...ACCOUNT_GROUPS];
    activeAccounts.forEach((a) => { if (!order.includes(a.group)) order.push(a.group); });
    return order
      .map((g) => ({ name: g, accounts: activeAccounts.filter((a) => a.group === g).sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0)) }))
      .filter((g) => g.accounts.length > 0 && (filterGroup === 'all' || g.name === filterGroup));
  }, [activeAccounts, filterGroup]);

  // Resumen del mes (sobre todas las cuentas, sin filtros)
  const summary = useMemo(() => {
    let count = 0, expected = 0, programmed = 0;
    activeAccounts.forEach((a) => {
      const s = accountMonthSummary(a, monthPosts, weeks);
      count += s.count; expected += s.expected;
    });
    programmed = monthPosts.filter((p) => p.status === 'programado').length;
    return { count, expected, programmed };
  }, [activeAccounts, monthPosts, weeks]);

  const rotateStatus = (post) => updatePost && updatePost(post.id, { status: nextPostStatus(post.status) });

  const savePost = async (data) => {
    if (editor?.post) await updatePost(editor.post.id, data);
    else await createPost({ ...data, accountId: editor.account.id, createdBy: currentUser?.name || '' });
    setEditor(null);
  };

  const renderChip = (post) => {
    const st = POST_STATUS_BY_ID[post.status] || POST_STATUSES[0];
    const theme = post.theme ? WORLD_DAY_THEME_BY_ID[post.theme] : null;
    return (
      <div key={post.id} className={`group flex items-stretch rounded-md border text-[10px] font-bold leading-tight overflow-hidden ${st.color}`} title={`${post.title}\nEstado: ${st.label}${theme ? `\nTemática: ${theme.label}` : ''}`}>
        <button
          onClick={() => rotateStatus(post)}
          className={`w-5 shrink-0 flex items-center justify-center ${st.solid} hover:brightness-110`}
          title={`${st.label} → cambiar a ${POST_STATUS_BY_ID[nextPostStatus(post.status)].label}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
        </button>
        <button onClick={() => setEditor({ post })} className="flex-1 min-w-0 text-left px-1.5 py-1">
          <p className="truncate">{post.title || 'Sin título'}</p>
          <p className="text-[8px] font-black uppercase tracking-wider opacity-70 truncate">{st.short}{theme ? ` · ${theme.label}` : ''}</p>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Barra superior */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => goMonth(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600" title="Mes anterior"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => goMonth(1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600" title="Mes siguiente"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <h2 className="text-base font-black text-slate-800 tracking-tight">
          {MONTHS[cursor.month - 1]} <span className="text-slate-400 font-bold">{cursor.year}</span>
        </h2>
        {!isCurrentMonth && (
          <button onClick={() => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })} className="text-[10px] font-black uppercase tracking-wider text-pink-600 hover:text-pink-700 px-2 py-1 rounded-md hover:bg-pink-50">Hoy</button>
        )}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-bold text-slate-500 ml-2">
          <span className="font-mono text-slate-800">{summary.count}</span> posteos
          <span className="text-slate-300">·</span>
          <span className="font-mono text-slate-800">{summary.expected}</span> esperados
          <span className="text-slate-300">·</span>
          <span className="font-mono text-violet-700">{summary.programmed}</span> programados
        </div>
        <div className="flex-1" />
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-pink-300">
          <option value="all">Todas las cuentas</option>
          {ACCOUNT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-pink-300">
          <option value="all">Todos los estados</option>
          {POST_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={() => setShowAccounts(true)} className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600" title="Cuentas y planes">
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {usingFallback && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold px-4 py-2 rounded-xl">
          Mostrando las cuentas por defecto: la tabla de Supabase todavía no tiene cuentas. Corré la migración 0017 para poder cargar posteos.
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full border-collapse text-xs table-fixed" style={{ minWidth: 640 }}>
          <colgroup>
            <col style={{ width: 150 }} />
            {weeks.map((w) => <col key={w.start} />)}
            <col style={{ width: 64 }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Cuenta</th>
              {weeks.map((w) => {
                const isNow = today >= w.start && today <= w.end;
                return (
                  <th key={w.start} className={`px-2 py-2 text-[10px] font-black uppercase tracking-widest text-center ${isNow ? 'text-pink-600' : 'text-slate-400'}`}>
                    <span className="block">Semana {w.index}</span>
                    <span className={`block text-[9px] font-bold normal-case tracking-normal ${isNow ? 'text-pink-500' : 'text-slate-400'}`}>{w.label}</span>
                  </th>
                );
              })}
              <th className="px-1 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Mes</th>
            </tr>
          </thead>
          <tbody>
            {loading && groups.length === 0 && (
              <tr><td colSpan={weeks.length + 2} className="px-4 py-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cargando…</td></tr>
            )}
            {groups.map((g) => (
              <React.Fragment key={g.name}>
                <tr className="bg-pink-50/60 border-y border-pink-100">
                  <td colSpan={weeks.length + 2} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-pink-700 sticky left-0">{g.name}</td>
                </tr>
                {g.accounts.map((account) => {
                  const s = accountMonthSummary(account, monthPosts, weeks);
                  const plan = ACCOUNT_PLAN_BY_ID[account.plan];
                  const counterCls = s.expected === 0 ? 'bg-slate-100 text-slate-500'
                    : s.count >= s.expected ? 'bg-emerald-100 text-emerald-700'
                    : s.count === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                  let cumulative = 0;
                  return (
                    <tr key={account.id} className="border-b border-slate-100 align-top hover:bg-slate-50/50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2">
                        <p className="font-black text-slate-800 text-xs leading-tight">{account.name}</p>
                        {plan && plan.postsPerMonth > 0 && (
                          <span className={`inline-block mt-1 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${plan.color}`}>{plan.label} · {plan.postsPerMonth}/mes</span>
                        )}
                      </td>
                      {weeks.map((w) => {
                        const all = s.byWeek[w.index - 1];
                        cumulative += all.length;
                        const shown = filterStatus === 'all' ? all : all.filter((p) => p.status === filterStatus);
                        const closed = w.end < today;
                        const missing = closed && cumulative < expectedPostsBy(account.plan, w.index, weeks.length);
                        const isNow = today >= w.start && today <= w.end;
                        return (
                          <td key={w.start} className={`px-1.5 py-1.5 border-l border-slate-100 ${isNow ? 'bg-pink-50/30' : ''}`}>
                            <div className={`min-h-[44px] rounded-lg p-1 space-y-1 ${missing && all.length === 0 ? 'border border-dashed border-red-300 bg-red-50/40' : ''}`}>
                              {shown.map(renderChip)}
                              {missing && all.length === 0 && <p className="text-[8px] font-black uppercase tracking-wider text-red-500 px-1">Falta</p>}
                              <button
                                onClick={() => setEditor({ account, weekStart: w.start })}
                                disabled={!!account.isFallback}
                                className="w-full flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-300 hover:text-pink-600 hover:bg-pink-50 rounded-md py-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Agregar posteo"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 border-l border-slate-100 text-center">
                        <span className={`inline-block font-mono text-xs font-black px-2 py-1 rounded-lg ${counterCls}`}>
                          {s.count}{s.expected > 0 ? `/${s.expected}` : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {!loading && groups.length === 0 && (
              <tr><td colSpan={weeks.length + 2} className="px-4 py-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">No hay cuentas para mostrar</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] font-bold text-slate-500">
        {POST_STATUSES.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />{s.label}</span>
        ))}
        <span className="text-slate-300">·</span>
        <span>Clic en el punto del posteo para pasar al siguiente estado. Clic en el título para editarlo.</span>
      </div>

      {editor && (
        <PostEditor
          post={editor.post || null}
          account={editor.account || activeAccounts.find((a) => a.id === editor.post?.accountId)}
          weeks={weeks}
          defaultWeekStart={editor.weekStart || editor.post?.weekStart}
          onSave={savePost}
          onDelete={editor.post ? async () => { await removePost(editor.post.id); setEditor(null); } : null}
          onClose={() => setEditor(null)}
        />
      )}
      {showAccounts && (
        <AccountsModal
          accounts={accounts}
          usingFallback={usingFallback}
          onCreate={createAccount}
          onUpdate={updateAccount}
          onRemove={removeAccount}
          onClose={() => setShowAccounts(false)}
        />
      )}
    </div>
  );
}

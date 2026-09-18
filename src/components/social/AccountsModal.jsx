// ════════════════════════════════════════════════════════════════════
// AccountsModal — Cuentas (clientes) de la hoja de posteos y su plan
// ════════════════════════════════════════════════════════════════════
// Permite renombrar, cambiar de grupo, cambiar el plan (active /
// semi active / sin plan), desactivar y agregar cuentas.
//
// Props:
//   accounts, usingFallback
//   onCreate(obj), onUpdate(id, patch), onRemove(id), onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';
import { ACCOUNT_GROUPS, ACCOUNT_PLANS } from '@/constants/socialPosts';

const sel = 'bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-300';

export default function AccountsModal({ accounts, usingFallback, onCreate, onUpdate, onRemove, onClose }) {
  const confirm = useConfirm();
  const [draft, setDraft] = useState({ name: '', group: ACCOUNT_GROUPS[0], plan: 'active' });
  const [busy, setBusy] = useState(false);

  const list = [...(accounts || [])].sort((a, b) => {
    const ga = ACCOUNT_GROUPS.indexOf(a.group), gb = ACCOUNT_GROUPS.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const add = async () => {
    if (!draft.name.trim() || busy) return;
    setBusy(true);
    try {
      const maxOrder = Math.max(0, ...list.map((a) => a.sortOrder ?? 0));
      await onCreate({ ...draft, name: draft.name.trim(), sortOrder: maxOrder + 10, active: true });
      setDraft({ name: '', group: draft.group, plan: 'active' });
    } catch (_e) {
      alert('No se pudo crear la cuenta. Revisá la consola.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a) => {
    const ok = await confirm({
      title: '¿Eliminar cuenta?',
      message: `Se elimina "${a.name}" y todos sus posteos. Si solo querés sacarla de la hoja, desactivala.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (ok) onRemove(a.id);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-pink-50 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Cuentas y planes</h2>
              <p className="text-[11px] font-bold text-slate-500">Active = 4 posteos por mes · Semi active = 2 · Sin plan = no se controla</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>

          {usingFallback && (
            <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-[11px] font-bold">
              Estas son las cuentas por defecto. Para editarlas hay que correr la migración 0017 en Supabase.
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <th className="text-left px-4 py-2">Cuenta</th>
                  <th className="text-left px-2 py-2">Grupo</th>
                  <th className="text-left px-2 py-2">Plan</th>
                  <th className="text-center px-2 py-2">Activa</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((a) => (
                  <tr key={a.id} className={a.active === false ? 'opacity-50' : ''}>
                    <td className="px-4 py-1.5">
                      <input
                        defaultValue={a.name}
                        disabled={usingFallback}
                        onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== a.name) onUpdate(a.id, { name: v }); }}
                        className={sel + ' w-full'}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={a.group} disabled={usingFallback} onChange={(e) => onUpdate(a.id, { group: e.target.value })} className={sel}>
                        {ACCOUNT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                        {!ACCOUNT_GROUPS.includes(a.group) && <option value={a.group}>{a.group}</option>}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={a.plan} disabled={usingFallback} onChange={(e) => onUpdate(a.id, { plan: e.target.value })} className={sel}>
                        {ACCOUNT_PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input type="checkbox" checked={a.active !== false} disabled={usingFallback} onChange={(e) => onUpdate(a.id, { active: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-pink-600" />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button onClick={() => remove(a)} disabled={usingFallback} className="text-slate-300 hover:text-red-500 disabled:opacity-30" title="Eliminar cuenta"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              placeholder="Nueva cuenta (ej: Colombia)"
              disabled={usingFallback}
              className={sel + ' flex-1 min-w-[160px]'}
            />
            <select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} disabled={usingFallback} className={sel}>
              {ACCOUNT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} disabled={usingFallback} className={sel}>
              {ACCOUNT_PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button onClick={add} disabled={!draft.name.trim() || busy || usingFallback} className="text-[10px] font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

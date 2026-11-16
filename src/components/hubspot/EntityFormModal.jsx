// ════════════════════════════════════════════════════════════════════
// EntityFormModal — Alta / edición de una entidad (país) del Weekly check
// ════════════════════════════════════════════════════════════════════
// Código de HubSpot (solo al crear: lo usan el checklist y los steps, no
// se cambia) · nombre legal · país · marca · importancia · tags. La
// entidad nueva arranca con el checklist sin tildar. Eliminar borra
// también su checklist y sus próximos steps (con confirmación).
//
// Región (Américas / EMEA / APAC, migration 0073): las de Américas van
// también en el Weekly check.
//
// Props: entity (o null = nueva), entities (para validar el código),
//   defaultRegion (alta desde el Global check con una región filtrada),
//   tagOptions, onSave(data) (async), onDelete() | null, onClose()
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useConfirm } from '@/hooks/useConfirm';
import { CRM_BRANDS, CRM_PRIORITIES, CRM_REGIONS } from '@/constants/crmWeekly';
import { cleanTags, entityProblem } from '@/utils/crmWeekly';
import TagsInput from './TagsInput';

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-300';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

export default function EntityFormModal({ entity, entities = [], tagOptions = [], countryOptions = [], defaultRegion = 'Américas', onSave, onDelete, onClose }) {
  const confirm = useConfirm();
  const isNew = !entity;
  const [form, setForm] = useState({
    code: entity?.code || '',
    name: entity?.name || '',
    country: entity?.country || '',
    brand: entity?.brand || 'Control Union',
    region: entity?.region || defaultRegion,
    priority: entity?.priority || '',
    tags: entity?.tags || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };
  const problem = entityProblem(form, entities, isNew);

  const submit = async () => {
    if (problem) { setError(problem); return; }
    setSaving(true); setError('');
    try {
      await onSave({
        ...(isNew ? { code: form.code.trim() } : {}),
        name: form.name.trim(), country: form.country.trim(), brand: form.brand, region: form.region,
        priority: form.priority || null, tags: cleanTags(form.tags),
      });
    } catch (e) {
      setError(/duplicate|23505/i.test(`${e?.code} ${e?.message}`) ? `Ya hay una entidad con el código ${form.code.trim()}.` : 'No se pudo guardar. Probá de nuevo; si sigue fallando, revisá la consola.');
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: '¿Eliminar la entidad?',
      message: `Vas a eliminar ${entity.code} · ${entity.name} del Weekly check, junto con su checklist y sus próximos steps. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    setSaving(true);
    try { await onDelete(); } catch (_e) { setError('No se pudo eliminar. Probá de nuevo.'); setSaving(false); }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-sky-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Weekly check · CRM HubSpot</p>
              <h2 className="text-base font-black text-slate-900">{isNew ? 'Agregar entidad / país' : `Editar ${entity.code} · ${entity.name}`}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0" title="Cerrar"><X className="w-4 h-4 text-slate-600" /></button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <div className="space-y-1">
                <label className={labelCls} htmlFor="ent-code">Código</label>
                <input id="ent-code" autoFocus={isNew} disabled={!isNew} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="Ej: 538" className={`${inputCls} font-mono disabled:opacity-60`} />
              </div>
              <div className="space-y-1">
                <label className={labelCls} htmlFor="ent-name">Nombre de la entidad</label>
                <input id="ent-name" autoFocus={!isNew} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Control Union Argentina S.A." className={inputCls} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 -mt-2">{isNew ? 'El código es el de la entidad en HubSpot. Después no se puede cambiar.' : 'El código no se cambia: lo usan el checklist y los steps de la entidad.'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls} htmlFor="ent-country">País</label>
                <input id="ent-country" list="ent-countries" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Ej: Argentina" className={inputCls} />
                <datalist id="ent-countries">{countryOptions.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="space-y-1">
                <span className={labelCls}>Marca</span>
                <div className="flex gap-1.5">
                  {CRM_BRANDS.map((b) => (
                    <button key={b} type="button" onClick={() => set('brand', b)} className={`flex-1 px-2 py-2.5 rounded-xl text-[11px] font-black border ${form.brand === b ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{b}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <span className={labelCls}>Región</span>
              <div className="flex gap-1.5">
                {CRM_REGIONS.map((r) => (
                  <button key={r} type="button" onClick={() => set('region', r)} className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-black border ${form.region === r ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{r}</button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-slate-400">Las de Américas aparecen en el Weekly check; todas, en el Global check.</p>
            </div>
            <div className="space-y-1">
              <span className={labelCls}>Importancia</span>
              <div className="flex gap-1.5">
                {[{ id: '', label: 'Sin definir' }, ...CRM_PRIORITIES].map((p) => (
                  <button key={p.id || 'none'} type="button" onClick={() => set('priority', p.id)} className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-black border ${form.priority === p.id ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{p.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className={labelCls}>Tags</span>
              <TagsInput tags={form.tags} options={tagOptions} onChange={(tags) => set('tags', tags)} />
              <p className="text-[10px] font-bold text-slate-400">Escribí y Enter para sumar un tag (ej. «Piloto», «Foco Q1»). Sirven para filtrar la lista.</p>
            </div>
            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            {onDelete && (
              <button onClick={remove} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-2 disabled:opacity-40">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} disabled={saving} className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-2">Cancelar</button>
            <button onClick={submit} disabled={saving} className="text-[10px] font-black uppercase tracking-wider bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg">
              {saving ? 'Guardando…' : isNew ? 'Agregar' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ════════════════════════════════════════════════════════════════════
// UtmForm — Formulario del generador + preview en vivo de la URL
// ════════════════════════════════════════════════════════════════════
// La preview se arma desde el primer cambio: cada campo que se completa
// se suma a la URL. Copiar y guardar se habilitan cuando no falta nada.
//
// Props:
//   form, setField(key, value), onClear
//   accent  — clases de color (ACCENT_MAP en MarcommsUtmBuilder)
//   onCopy(), onSave(), copied, savedFeedback, error
// ════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { Zap, Lock, AlertCircle, CheckCircle2, Copy, Save } from 'lucide-react';
import { MARKETS, MARCOMMS_BUSINESS_UNITS, ORGANIZATIONS } from '@/constants/markets';
import { UTM_SOURCES, UTM_MEDIUMS } from '@/constants/campaigns';
import { buildUtmCampaign, buildUtmUrl, hasUtmCampaignParts, missingUtmFields, UTM_IDENTIFIER } from '@/utils/utm';

const labelCls = 'text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block';

export default function UtmForm({ form, setField, onClear, accent, onCopy, onSave, copied, savedFeedback, error }) {
  const inputCls = `w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`;
  const innerCls = `w-full p-2 bg-white border-2 border-purple-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`;

  const preview = useMemo(() => buildUtmUrl(form), [form]);
  const utmCampaign = useMemo(() => buildUtmCampaign(form), [form]);
  const missing = useMemo(() => missingUtmFields(form), [form]);
  const complete = missing.length === 0;
  const touched = Object.values(form).some((v) => (v || '').toString().trim());

  // Si llega una unidad que no está en la lista (proyecto viejo), se muestra igual
  const businessUnits = MARCOMMS_BUSINESS_UNITS.includes(form.businessUnit) || !form.businessUnit
    ? MARCOMMS_BUSINESS_UNITS : [form.businessUnit, ...MARCOMMS_BUSINESS_UNITS];

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className={labelCls}>URL del sitio web *</label>
        <input type="text" value={form.url} onChange={(e) => setField('url', e.target.value)} placeholder="https://argentina.controlunion.com/service/logistica/" className={inputCls} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Organización</label>
          <select value={form.organization} onChange={(e) => setField('organization', e.target.value)} className={inputCls}>
            {ORGANIZATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <p className="text-[9px] font-medium text-slate-400 mt-0.5">Clasifica el UTM; no va en el <code className="font-mono">utm_campaign</code>.</p>
        </div>
        <div>
          <label className={labelCls}>Fuente UTM *</label>
          <select value={form.source} onChange={(e) => setField('source', e.target.value)} className={inputCls}>
            <option value="">Seleccionar...</option>
            {UTM_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>UTM Medio *</label>
          <select value={form.medium} onChange={(e) => setField('medium', e.target.value)} className={inputCls}>
            <option value="">Seleccionar...</option>
            {UTM_MEDIUMS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bloque destacado: estructura del utm_campaign */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-purple-600 fill-current" />
          <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Estructura del utm_campaign</span>
          <span className="text-[10px] text-purple-600 font-medium">· unidad_país_marcomms_campaña</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">1. Unidad de Negocio *</label>
            <select value={form.businessUnit} onChange={(e) => setField('businessUnit', e.target.value)} className={innerCls}>
              {businessUnits.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">2. País *</label>
            <select value={form.country} onChange={(e) => setField('country', e.target.value)} className={innerCls}>
              <option value="">Seleccionar...</option>
              {Object.keys(MARKETS).sort().map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">3. Identificador</label>
            <div className="w-full p-2 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 rounded-lg text-xs font-black text-purple-800 tracking-wide flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-purple-500" /> {UTM_IDENTIFIER}
            </div>
            <p className="text-[9px] font-bold text-purple-500 mt-0.5">Fijo: el lead viene del equipo MarComms</p>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">4. Nombre de la Campaña *</label>
          <input type="text" value={form.campaignName} onChange={(e) => setField('campaignName', e.target.value)} placeholder="Warrants Mayo 2026" className={innerCls} />
        </div>

        {utmCampaign && hasUtmCampaignParts(form) && (
          <div className="bg-white border border-purple-200 rounded-lg p-2.5">
            <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">utm_campaign =</p>
            <code className="text-[11px] text-purple-800 font-mono font-bold break-all leading-tight block">{utmCampaign}</code>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-[11px] font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* Preview en vivo de la URL final */}
      <div className="bg-slate-900 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL final con tracking MarComms</p>
          {touched && (
            <span className={`text-[9px] font-black uppercase tracking-widest ${complete ? 'text-emerald-400' : 'text-amber-400'}`}>
              {complete ? 'Lista para usar' : `Falta: ${missing.join(', ')}`}
            </span>
          )}
        </div>
        <div className="bg-slate-800 rounded-lg p-2.5 break-all min-h-[44px]">
          {preview
            ? <code className="text-[11px] text-emerald-400 font-mono leading-relaxed">{preview}</code>
            : <span className="text-[11px] text-slate-500 font-medium italic">Empezá por la URL del sitio: la preview se arma sola con cada campo que completes.</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onCopy} disabled={!complete} title={complete ? 'Copiar la URL' : 'Completá los campos obligatorios'} className={`flex-1 min-w-[140px] ${copied ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-900'} disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5`}>
            {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> ¡Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar URL</>}
          </button>
          <button onClick={onSave} disabled={!complete} title={complete ? 'Guardar en el repositorio' : 'Completá los campos obligatorios'} className={`flex-1 min-w-[140px] ${savedFeedback ? 'bg-emerald-600' : accent.btn} text-white disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5`}>
            {savedFeedback ? <><CheckCircle2 className="w-3.5 h-3.5" /> ¡Guardado!</> : <><Save className="w-3.5 h-3.5" /> Guardar en repositorio</>}
          </button>
          <button onClick={onClear} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all">Limpiar</button>
        </div>
      </div>
    </div>
  );
}

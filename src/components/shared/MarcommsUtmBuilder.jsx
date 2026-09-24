// ════════════════════════════════════════════════════════════════════
// MarcommsUtmBuilder — Generador de UTMs con estructura unificada
// ════════════════════════════════════════════════════════════════════
// Componente reusable en 5 contextos: UTM Generator (vista propia),
// webinar, evento, campaña, social media. Cada contexto pasa `accentColor`.
//
// Estructura del utm_campaign (sep 2026, sin "servicio"):
//   [unidad_negocio]_[país]_marcomms_[nombre_campaña]
//
// - Identificador fijo "MarComms" (candado, no editable)
// - "Organización" (Control Union / Peterson Solutions / PCU) clasifica el
//   UTM para filtrar en el repositorio; NO va dentro del utm_campaign.
// - La preview de la URL se arma en vivo desde el primer cambio.
//
// Sub-componentes en ./utm/: UtmForm (formulario + preview) y
// UtmRepository (guardados con filtros). Lógica pura en utils/utm.js.
//
// Props:
//   defaultCampaignName, defaultCountry, defaultBusinessUnit, currentUser
//   accentColor — purple | indigo | orange | pink
//   layout      — 'stacked' (default, dentro de un proyecto: repositorio
//                 plegable) | 'wide' (vista UTM Generator: formulario y
//                 repositorio a lo ancho)
// ════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Link, ChevronDown, Database } from 'lucide-react';
import { MARCOMMS_BUSINESS_UNITS } from '@/constants/markets';
import { useUtmLinks } from '@/hooks/useUtmLinks';
import { useConfirm } from '@/hooks/useConfirm';
import { buildUtmCampaign, buildUtmUrl, isUtmFormComplete, normalizeLegacyUtmValue, utmValueLabel } from '@/utils/utm';
import UtmForm from './utm/UtmForm';
import UtmRepository from './utm/UtmRepository';

const ACCENT_MAP = {
  purple: { bg: 'from-purple-600 to-pink-600',   btn: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-400', text: 'text-purple-700' },
  indigo: { bg: 'from-indigo-500 to-purple-500', btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'focus:ring-indigo-400', text: 'text-indigo-700' },
  orange: { bg: 'from-orange-500 to-red-500',    btn: 'bg-orange-600 hover:bg-orange-700', ring: 'focus:ring-orange-400', text: 'text-orange-700' },
  pink:   { bg: 'from-pink-500 to-rose-500',     btn: 'bg-pink-600 hover:bg-pink-700',     ring: 'focus:ring-pink-400',   text: 'text-pink-700' },
};

const copyText = (text) => {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select(); document.execCommand('copy');
  document.body.removeChild(ta);
};

export default function MarcommsUtmBuilder({
  defaultCampaignName = '',
  defaultCountry = '',
  defaultBusinessUnit = '',
  accentColor = 'purple',
  currentUser = null,
  layout = 'stacked',
}) {
  const confirm = useConfirm();
  const { data: savedLinks, create: saveLink, remove: removeLink, error: repoError } = useUtmLinks();
  const wide = layout === 'wide';
  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.purple;

  const initialForm = useCallback(() => ({
    url: '', source: '', medium: '', organization: 'Control Union',
    businessUnit: defaultBusinessUnit || '', country: defaultCountry || '', campaignName: defaultCampaignName || '',
  }), [defaultBusinessUnit, defaultCountry, defaultCampaignName]);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showSaved, setShowSaved] = useState(wide);

  // Re-rellenar cuando cambien los defaults (al abrir otro proyecto)
  useEffect(() => {
    setForm((f) => ({
      ...f,
      campaignName: defaultCampaignName || f.campaignName,
      country: defaultCountry || f.country,
      businessUnit: defaultBusinessUnit || f.businessUnit,
    }));
  }, [defaultCampaignName, defaultCountry, defaultBusinessUnit]);

  const setField = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };
  const clearAll = () => { setForm(initialForm()); setError(''); };

  const copyToClipboard = () => {
    if (!isUtmFormComplete(form)) return;
    try { copyText(buildUtmUrl(form)); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (_e) { setError('No se pudo copiar. Seleccionalo manualmente.'); }
  };

  const saveToRepo = async () => {
    if (!isUtmFormComplete(form)) return;
    try {
      await saveLink({
        label: [form.campaignName, utmValueLabel('medium', form.medium)].filter(Boolean).join(' · ') || 'UTM',
        url: buildUtmUrl(form),
        source: form.source, medium: form.medium, businessUnit: form.businessUnit, organization: form.organization,
        country: form.country, campaignName: form.campaignName,
        utmCampaign: buildUtmCampaign(form),
        createdBy: currentUser?.name || '',
      });
      setSavedFeedback(true); setShowSaved(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (_e) {
      setError('No se pudo guardar en el repositorio. Revisá la consola.');
    }
  };

  const copySaved = (link) => {
    try { copyText(link.url); setCopiedId(link.id); setTimeout(() => setCopiedId(null), 2000); } catch (_e) { /* noop */ }
  };

  // Carga un UTM guardado en el formulario (valores viejos se traducen; los ambiguos quedan vacíos)
  const loadSaved = (link) => {
    setForm({
      url: (link.url || '').split('?')[0] || link.url || '',
      source: normalizeLegacyUtmValue('source', link.source),
      medium: normalizeLegacyUtmValue('medium', link.medium),
      organization: link.organization === 'Peterson' ? 'Peterson Solutions' : (link.organization || 'Control Union'),
      businessUnit: link.businessUnit === 'Peterson' ? 'Peterson Solutions' : (MARCOMMS_BUSINESS_UNITS.includes(link.businessUnit) ? link.businessUnit : ''),
      country: link.country || '',
      campaignName: link.campaignName || '',
    });
    setError('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSaved = async (link) => {
    const ok = await confirm({ title: '¿Eliminar UTM del repositorio?', message: link.label || link.url, confirmText: 'Eliminar', tone: 'danger' });
    if (!ok) return;
    try { await removeLink(link.id); } catch (_e) { /* noop */ }
  };

  const header = (
    <div className={`bg-gradient-to-r ${accent.bg} p-4 text-white`}>
      <div className="flex items-center gap-2">
        <Link className="w-5 h-5" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight">Generador de UTMs · MarComms</h3>
          <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">Trackeá leads con estructura unificada del equipo</p>
        </div>
      </div>
    </div>
  );
  const formEl = <UtmForm form={form} setField={setField} onClear={clearAll} accent={accent} onCopy={copyToClipboard} onSave={saveToRepo} copied={copied} savedFeedback={savedFeedback} error={error} />;

  const repoProps = { links: savedLinks || [], error: repoError, onCopy: copySaved, onLoad: loadSaved, onDelete: deleteSaved, copiedId, accent };

  if (wide) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">{header}{formEl}</div>
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 space-y-3">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" /> Repositorio de UTMs
            <span className="bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-1.5 text-[9px]">{(savedLinks || []).length}</span>
          </h3>
          <UtmRepository {...repoProps} compact={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
      {header}
      {formEl}
      <div className="px-4 pb-4">
        <div className="border-2 border-slate-100 rounded-xl overflow-hidden">
          <button onClick={() => setShowSaved((v) => !v)} className="w-full bg-slate-50 hover:bg-slate-100 px-3 py-2.5 flex items-center justify-between transition-colors">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" /> Repositorio de UTMs
              <span className="bg-white text-slate-500 border border-slate-200 rounded-full px-1.5 text-[9px]">{(savedLinks || []).length}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSaved ? 'rotate-180' : ''}`} />
          </button>
          {showSaved && <div className="p-3"><UtmRepository {...repoProps} compact /></div>}
        </div>
      </div>
    </div>
  );
}

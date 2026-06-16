// ════════════════════════════════════════════════════════════════════
// MarcommsUtmBuilder — Generador de UTMs con estructura unificada
// ════════════════════════════════════════════════════════════════════
// Componente reusable en 4 contextos: webinar, evento, campaña, content hub.
// Cada contexto pasa `accentColor` distinto.
//
// Estructura del utm_campaign:
//   [unidad_negocio]_[país]_[servicio]_marcomms_[nombre_campaña]
//
// Campo "Identificador" = MARCOMMS FIJO (icono candado, no editable)
// Servicio dropdown solo "Certificaciones"
// ════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Link, Zap, Lock, AlertCircle, CheckCircle2, Copy, Save, Trash2, Search, ChevronDown, Database } from 'lucide-react';
import { slugifyUtm } from '@/utils/slugify';
import { MARKETS, MARCOMMS_BUSINESS_UNITS } from '@/constants/markets';
import { MARCOMMS_SERVICES } from '@/constants/services';
import { UTM_SOURCES, UTM_MEDIUMS } from '@/constants/campaigns';
import { useUtmLinks } from '@/hooks/useUtmLinks';
import { useConfirm } from '@/hooks/useConfirm';

const ACCENT_MAP = {
  purple: { bg: 'from-purple-600 to-pink-600',   btn: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-400', text: 'text-purple-700' },
  indigo: { bg: 'from-indigo-500 to-purple-500', btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'focus:ring-indigo-400', text: 'text-indigo-700' },
  orange: { bg: 'from-orange-500 to-red-500',    btn: 'bg-orange-600 hover:bg-orange-700', ring: 'focus:ring-orange-400', text: 'text-orange-700' },
  pink:   { bg: 'from-pink-500 to-rose-500',     btn: 'bg-pink-600 hover:bg-pink-700',     ring: 'focus:ring-pink-400',   text: 'text-pink-700' },
};

export default function MarcommsUtmBuilder({
  defaultCampaignName = '',
  defaultCountry = '',
  defaultBusinessUnit = '',
  accentColor = 'purple',
  currentUser = null,
}) {
  const confirm = useConfirm();
  const { data: savedLinks, create: saveLink, remove: removeLink, error: repoError } = useUtmLinks();
  const [repoQuery, setRepoQuery] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [businessUnit, setBusinessUnit] = useState(defaultBusinessUnit || 'MARCOMMS');
  const [country, setCountry] = useState(defaultCountry || '');
  const [service, setService] = useState('');
  const [objective] = useState('MARCOMMS'); // fijo, no editable
  const [campaignName, setCampaignName] = useState(defaultCampaignName || '');
  const [generated, setGenerated] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Re-rellenar cuando cambien los defaults (al abrir otra campaña)
  useEffect(() => {
    if (defaultCampaignName) setCampaignName(defaultCampaignName);
    if (defaultCountry) setCountry(defaultCountry);
    if (defaultBusinessUnit) setBusinessUnit(defaultBusinessUnit);
  }, [defaultCampaignName, defaultCountry, defaultBusinessUnit]);

  // Preview del utm_campaign en vivo
  const buildUtmCampaign = () => {
    const parts = [businessUnit, country, service, objective, campaignName]
      .map((p) => slugifyUtm(p))
      .filter(Boolean);
    return parts.join('_');
  };

  const utmCampaignPreview = buildUtmCampaign();

  const generate = () => {
    if (!url.trim()) { setError('Falta la URL del sitio web.'); return; }
    if (!source) { setError('Seleccioná una Fuente UTM.'); return; }
    if (!medium) { setError('Seleccioná un UTM Medio.'); return; }
    if (!businessUnit.trim()) { setError('Falta la Unidad de Negocio.'); return; }
    if (!country.trim()) { setError('Falta el País.'); return; }
    if (!service.trim()) { setError('Falta el Servicio.'); return; }
    if (!campaignName.trim()) { setError('Falta el nombre de la Campaña.'); return; }

    let cleanUrl = url.trim();
    if (!cleanUrl.match(/^https?:\/\//)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const utmCampaignValue = buildUtmCampaign();
    const params = new URLSearchParams();
    params.append('utm_source', slugifyUtm(source));
    params.append('utm_medium', slugifyUtm(medium));
    params.append('utm_campaign', utmCampaignValue);

    const separator = cleanUrl.includes('?') ? '&' : '?';
    const finalUrl = `${cleanUrl}${separator}${params.toString()}`;

    setGenerated(finalUrl);
    setError('');
  };

  const copyToClipboard = async () => {
    if (!generated) return;
    try {
      const ta = document.createElement('textarea');
      ta.value = generated;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('No se pudo copiar. Seleccionalo manualmente.');
    }
  };

  const clearAll = () => {
    setUrl('');
    setSource('');
    setMedium('');
    setBusinessUnit(defaultBusinessUnit || 'MARCOMMS');
    setCountry(defaultCountry || '');
    setService('');
    setCampaignName(defaultCampaignName || '');
    setGenerated('');
    setError('');
  };

  // ── Repositorio de UTMs ──
  const saveToRepo = async () => {
    if (!generated) return;
    try {
      await saveLink({
        label: [campaignName, medium].filter(Boolean).join(' · ') || 'UTM',
        url: generated,
        source, medium, businessUnit, country, service,
        campaignName,
        utmCampaign: buildUtmCampaign(),
        createdBy: currentUser?.name || '',
      });
      setSavedFeedback(true);
      setShowSaved(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (e) {
      setError('No se pudo guardar en el repositorio. ¿Corriste la migration 0009_utm_links?');
    }
  };

  const copySaved = async (link) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = link.url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_e) { /* noop */ }
  };

  // Carga un UTM guardado en el formulario (para editarlo / regenerarlo)
  const loadSaved = (link) => {
    setUrl(link.url.split('?')[0] || link.url);
    setSource(link.source || '');
    setMedium(link.medium || '');
    setBusinessUnit(link.businessUnit || 'MARCOMMS');
    setCountry(link.country || '');
    setService(link.service || '');
    setCampaignName(link.campaignName || '');
    setGenerated(link.url);
    setError('');
  };

  const deleteSaved = async (link) => {
    const ok = await confirm({
      title: '¿Eliminar UTM del repositorio?',
      message: link.label || link.url,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    try { await removeLink(link.id); } catch (_e) { /* noop */ }
  };

  const filteredSaved = (savedLinks || []).filter((l) => {
    if (!repoQuery.trim()) return true;
    const q = repoQuery.toLowerCase();
    return [l.label, l.url, l.campaignName, l.country, l.businessUnit, l.medium, l.utmCampaign]
      .some((f) => (f || '').toLowerCase().includes(q));
  });

  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.purple;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
      <div className={`bg-gradient-to-r ${accent.bg} p-4 text-white`}>
        <div className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Generador de UTMs · Marcomms</h3>
            <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">
              Trackeá leads con estructura unificada del equipo
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* URL del sitio */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
            URL del sitio web *
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://argentina.controlunion.com/service/logistica/"
            className={`w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
          />
        </div>

        {/* Fuente y Medio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Fuente UTM *</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={`w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
            >
              <option value="">Seleccionar...</option>
              {UTM_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">UTM Medio *</label>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              className={`w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
            >
              <option value="">Seleccionar...</option>
              {UTM_MEDIUMS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Bloque destacado: estructura del utm_campaign */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-purple-600 fill-current" />
            <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">
              Estructura del utm_campaign
            </span>
          </div>
          <p className="text-[10px] text-purple-700 font-medium">
            Estos 5 campos arman el <code className="bg-white px-1 rounded text-purple-700 font-mono">utm_campaign</code> automáticamente
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">1. Unidad de Negocio *</label>
              <select
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                className={`w-full p-2 bg-white border-2 border-purple-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
              >
                {MARCOMMS_BUSINESS_UNITS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">2. País *</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`w-full p-2 bg-white border-2 border-purple-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
              >
                <option value="">Seleccionar...</option>
                {Object.keys(MARKETS).sort().map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">3. Servicio *</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className={`w-full p-2 bg-white border-2 border-purple-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
              >
                <option value="">Seleccionar...</option>
                {MARCOMMS_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">4. Identificador</label>
              <div className="w-full p-2 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 rounded-lg text-xs font-black text-purple-800 uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-purple-500" />
                MARCOMMS
              </div>
              <p className="text-[9px] font-bold text-purple-500 mt-0.5">
                Identifica que el lead viene del equipo Marcomms
              </p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 block">5. Nombre de la Campaña *</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Warrants Mayo 2026"
              className={`w-full p-2 bg-white border-2 border-purple-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
            />
          </div>

          {utmCampaignPreview && (
            <div className="bg-white border border-purple-200 rounded-lg p-2.5">
              <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">
                Preview · utm_campaign =
              </p>
              <code className="text-[11px] text-purple-800 font-mono font-bold break-all leading-tight block">
                {utmCampaignPreview}
              </code>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2.5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-[11px] font-bold text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={generate}
            className={`${accent.btn} text-white px-4 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md`}
          >
            <Zap className="w-3.5 h-3.5" /> Generar URL
          </button>
          <button
            onClick={clearAll}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all"
          >
            Limpiar
          </button>
        </div>

        {generated && (
          <div className="bg-slate-900 rounded-xl p-3 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              URL Final con tracking Marcomms
            </p>
            <div className="bg-slate-800 rounded-lg p-2.5 break-all">
              <code className="text-[11px] text-emerald-400 font-mono leading-relaxed">{generated}</code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className={`flex-1 ${copied ? 'bg-emerald-600' : 'bg-white hover:bg-slate-100'} ${copied ? 'text-white' : 'text-slate-900'} px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5`}
              >
                {copied ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> ¡Copiado!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copiar URL</>
                )}
              </button>
              <button
                onClick={saveToRepo}
                className={`flex-1 ${savedFeedback ? 'bg-emerald-600 text-white' : `${accent.btn} text-white`} px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5`}
              >
                {savedFeedback ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> ¡Guardado!</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> Guardar en repositorio</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Repositorio de UTMs guardados (reutilizar) ── */}
        <div className="border-2 border-slate-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSaved((v) => !v)}
            className="w-full bg-slate-50 hover:bg-slate-100 px-3 py-2.5 flex items-center justify-between transition-colors"
          >
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" /> Repositorio de UTMs
              <span className="bg-white text-slate-500 border border-slate-200 rounded-full px-1.5 text-[9px]">{(savedLinks || []).length}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSaved ? 'rotate-180' : ''}`} />
          </button>
          {showSaved && (
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-slate-400 font-medium">Reutilizá un UTM ya creado: copialo o cargalo para editar.</p>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoQuery}
                  onChange={(e) => setRepoQuery(e.target.value)}
                  placeholder="Buscar por campaña, país, unidad…"
                  className={`w-full pl-8 pr-2.5 py-2 bg-slate-50 border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none ${accent.ring}`}
                />
              </div>
              {repoError ? (
                <p className="text-[10px] font-bold text-red-600 py-2">No se pudo cargar el repositorio. ¿Corriste la migration 0009?</p>
              ) : filteredSaved.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-medium italic py-3 text-center">
                  {(savedLinks || []).length === 0 ? 'Todavía no hay UTMs guardados. Generá uno y guardalo.' : 'Sin resultados.'}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {filteredSaved.map((l) => (
                    <div key={l.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 group">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[11px] font-black text-slate-700 leading-tight">{l.label || l.campaignName || 'UTM'}</p>
                        <button onClick={() => deleteSaved(l)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Eliminar">
                          <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {[l.country, l.businessUnit, l.medium].filter(Boolean).join(' · ')}
                      </p>
                      <code className="text-[9px] text-slate-500 font-mono break-all block mb-2 leading-tight line-clamp-2">{l.url}</code>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => copySaved(l)}
                          className={`flex-1 ${copiedId === l.id ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'} px-2 py-1.5 rounded font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1`}
                        >
                          {copiedId === l.id ? <><CheckCircle2 className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                        </button>
                        <button
                          onClick={() => loadSaved(l)}
                          className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1.5 rounded font-black text-[9px] uppercase tracking-widest transition-all"
                        >
                          Cargar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

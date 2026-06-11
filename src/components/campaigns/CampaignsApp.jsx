// ════════════════════════════════════════════════════════════════════
// CampaignsApp — Módulo de Campañas
// ════════════════════════════════════════════════════════════════════
// 4 tipos: email (13 steps), paid (3), database (3), research (3).
// Variant "webinar" auto-creado y linkeado.
// Sync bidireccional con webinar linkeado (5 mailings).
// Step 12 = Reporte Cliente con import CSV Mailchimp + descarga HTML.
// UTM Builder embebido (purple).
//
// Props:
//   campaigns / setCampaigns          — array global
//   onBack                            — volver al hub
//   onCampaignWebinarStepToggled      — callback al togglear step de campaña-webinar
//   onCampaignDeleted(c)              — callback al eliminar (desvincula webinar)
// ════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlignLeft, ArrowLeft, BarChart3, Calendar, CheckCircle2, ChevronRight,
  Circle, Clock, Copy, Database, DollarSign, Download, ExternalLink, Eye,
  FileText, Files, Hash, Info, Link, Mail, MailWarning, MousePointer2,
  Plus, Receipt, RefreshCw, Send, Settings, Sparkles, Tag, Trash2,
  TrendingUp, Upload, User, Users, Video, X, Zap,
} from 'lucide-react';

import { MARKETS } from '@/constants/markets';
import { SERVICE_OWNERS } from '@/constants/team';
import { STEP_TO_WEBINAR_MAIL } from '@/constants/webinar';
import { getCampaignChecklist } from '@/constants/campaigns';
import { parseMailchimpReport, parseMailchimpSubscribers } from '@/utils/csv';

import OwnerPicker from '@/components/shared/OwnerPicker';
import SimpleStep from '@/components/shared/SimpleStep';
import CommentsSection from '@/components/shared/CommentsSection';
import MarcommsUtmBuilder from '@/components/shared/MarcommsUtmBuilder';
import QuotationBadge from '@/components/shared/QuotationBadge';
import { useConfirm } from '@/hooks/useConfirm';

// UUID para IDs de campañas (compatible con Supabase uuid PK)
const campaignId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function CampaignsApp({ onBack, campaigns, setCampaigns, onCampaignWebinarStepToggled, onCampaignDeleted, currentUser }) {
  const confirm = useConfirm();
  const [activeView, setActiveView] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());

  // ─── Auto-marca completedAt cuando la campaña llega al 100% ───
  useEffect(() => {
    const progCalc = (c) => {
      let total = 13; // Email Marketing manual: 13 pasos (incluye Reporte cliente + Smartsheet)
      if (c.variant === "webinar") total = 5;
      else if (c.type === "paid" || c.type === "database" || c.type === "research") total = 3;
      return Math.min(Math.round(((c.completedSteps || []).length / total) * 100), 100);
    };
    let needsUpdate = false;
    const updated = campaigns.map(c => {
      const p = progCalc(c);
      if (p === 100 && !c.completedAt) {
        needsUpdate = true;
        return { ...c, completedAt: new Date().toISOString() };
      }
      if (p < 100 && c.completedAt) {
        // Si volvió a menos de 100 (ej. destildaron algo), limpiamos la fecha
        needsUpdate = true;
        const { completedAt, ...rest } = c;
        return rest;
      }
      return c;
    });
    if (needsUpdate) setCampaigns(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  const toggleExpand = (id) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newCampData, setNewCampData] = useState({ type: "", budget: "", unit: "", country: "", name: "", detail: "", objective: "", platforms: [], platformInvestment: "", duration: "" });
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [newComment, setNewComment] = useState({});
  const [utmCampaignName, setUtmCampaignName] = useState({});
  const [newCampaignFile, setNewCampaignFile] = useState({}); // {[campaignId]: {name, url}}
  const campaignRefs = useRef({});

  // ─── UTILITY: Generador de UTM ──────────────────────────────────────────
  // Reglas: utm_source=campaign | utm_medium=email|paid_media | utm_campaign=descripción
  const buildUtmUrl = (rawUrl, medium, campaignName) => {
    if (!rawUrl || !medium || !campaignName) return rawUrl;
    let baseUrl = rawUrl.trim();
    // Limpiar UTMs preexistentes para no duplicar
    try {
      const u = new URL(baseUrl);
      ['utm_source','utm_medium','utm_campaign'].forEach(k => u.searchParams.delete(k));
      u.searchParams.set('utm_source', 'campaign');
      u.searchParams.set('utm_medium', medium);
      u.searchParams.set('utm_campaign', campaignName.trim().replace(/\s+/g, '_').toLowerCase());
      return u.toString();
    } catch {
      // Fallback simple si URL no es parseable (ej falta https://)
      const sep = baseUrl.includes('?') ? '&' : '?';
      const slug = campaignName.trim().replace(/\s+/g, '_').toLowerCase();
      return `${baseUrl}${sep}utm_source=campaign&utm_medium=${medium}&utm_campaign=${slug}`;
    }
  };

  // ─── HELPER: agregar comentario a campaña ───────────────────────────────
  const addComment = (campaignId, text) => {
    if (!text || !text.trim()) return;
    setCampaigns(campaigns.map(c => {
      if (c.id !== campaignId) return c;
      const comment = {
        id: Date.now(),
        text: text.trim(),
        author: currentUser?.name || 'Equipo',
        date: new Date().toISOString(),
      };
      return { ...c, comments: [...(c.comments || []), comment] };
    }));
    setNewComment({ ...newComment, [campaignId]: "" });
  };

  const removeComment = async (campaignId, commentId) => {
    const ok = await confirm({
      title: '¿Eliminar comentario?',
      message: 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    setCampaigns(campaigns.map(c => {
      if (c.id !== campaignId) return c;
      return { ...c, comments: (c.comments || []).filter(cm => cm.id !== commentId) };
    }));
  };

  const handleStartNewCampaign = () => {
    setNewCampData({ type: "", budget: "", unit: "", country: "", name: "", detail: "", objective: "", platforms: [], platformInvestment: "", duration: "" });
    setShowBudgetModal(true);
  };

  const createCampaign = () => {
    if (!newCampData.type || !newCampData.budget || !newCampData.unit || !newCampData.country || !newCampData.name) return;
    
    // Validación extra para Paid Media
    if (newCampData.type === "paid" && !newCampData.objective) return;

    let newCampaign;

    if (newCampData.type === "paid") {
      newCampaign = {
        id: campaignId(),
        type: "paid",
        name: newCampData.name,
        budget: parseFloat(newCampData.budget),  // Fee Marcomms
        businessUnit: newCampData.unit,
        country: newCampData.country,
        objective: newCampData.objective,
        detail: newCampData.detail || "",
        platforms: newCampData.platforms || [],
        platformInvestment: newCampData.platformInvestment ? parseFloat(newCampData.platformInvestment) : 0,
        duration: newCampData.duration || "",
        comments: [],
        completedSteps: [],
        report: null
      };
    } else if (newCampData.type === "database" || newCampData.type === "research") {
      newCampaign = {
        id: campaignId(),
        type: newCampData.type,
        name: newCampData.name,
        budget: parseFloat(newCampData.budget),
        businessUnit: newCampData.unit,
        country: newCampData.country,
        detail: newCampData.detail || "",
        completedSteps: [],
        report: null
      };
    } else {
      newCampaign = {
        id: campaignId(),
        type: "email",
        name: newCampData.name,
        budget: parseFloat(newCampData.budget),
        businessUnit: newCampData.unit,
        country: newCampData.country,
        numEmails: 1,
        data: {
          requester: "", senderEmail: "", tag: "", dates: ["", "", ""],
          contents: [
            { subject: "", message: "", cta: "", link: "", banner: "" },
            { subject: "", message: "", cta: "", link: "", banner: "" },
            { subject: "", message: "", cta: "", link: "", banner: "" }
          ]
        },
        completedSteps: [],
        comments: [],
        report: null
      };
    }

    setCampaigns([newCampaign, ...campaigns]);
    setShowBudgetModal(false);
  };

  const updateCampaign = (id, field, value) => {
    setCampaigns(campaigns.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateData = (id, field, value, index = null) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === id) {
        const newData = { ...c.data };
        if (index !== null) {
          const newList = [...newData[field]];
          newList[index] = value;
          newData[field] = newList;
        } else {
          newData[field] = value;
        }
        return { ...c, data: newData };
      }
      return c;
    }));
  };

  const updateContent = (campaignId, index, field, value) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === campaignId) {
        const data = c.data || {};
        const newContents = [...(data.contents || [])];
        // Asegurar que el array tenga al menos `index + 1` elementos
        while (newContents.length <= index) {
          newContents.push({ subject: "", message: "", cta: "", link: "", banner: "" });
        }
        newContents[index] = { ...newContents[index], [field]: value };
        return { ...c, data: { ...data, contents: newContents } };
      }
      return c;
    }));
  };

  const isEmailComplete = (campaign, index) => {
    const data = campaign.data || {};
    const content = (data.contents || [])[index] || {};
    const date = (data.dates || [])[index] || "";
    return date !== "" &&
      (content.subject || "").trim() !== "" &&
      (content.message || "").trim() !== "" &&
      (content.cta || "").trim() !== "" &&
      (content.link || "").trim() !== "" &&
      (content.banner || "").trim() !== "";
  };

  const toggleStep = async (campaign, stepId, condition = true) => {
    const steps = campaign.completedSteps || [];
    const isDone = steps.includes(stepId);
    if (!condition && !isDone) return;

    // Confirmación al COMPLETAR un paso (no al desmarcar)
    if (!isDone) {
      const ok = await confirm({
        title: '¿Paso concretado?',
        message: 'Vas a marcar este paso de la campaña como completado. ¿Confirmás que ya está hecho?',
        confirmText: 'Sí, completar',
        cancelText: 'Todavía no',
        tone: 'success',
      });
      if (!ok) return;
    }

    const willBeDone = !isDone;
    setCampaigns(campaigns.map(c => {
      if (c.id === campaign.id) {
        return { ...c, completedSteps: isDone ? steps.filter(s => s !== stepId) : [...steps, stepId] };
      }
      return c;
    }));
    // Sync con webinar linkeado si aplica
    if (campaign.linkedWebinarId && STEP_TO_WEBINAR_MAIL[stepId] && onCampaignWebinarStepToggled) {
      onCampaignWebinarStepToggled(campaign.id, stepId, willBeDone);
    }
  };

  const toggleQuotation = (campaignId, next) => {
    setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, quotationValidated: next } : c));
  };

  const handleBulkFileUpload = (campaignId, files) => {
    const fileList = Array.from(files).slice(0, 3);
    setUploadedFiles({ ...uploadedFiles, [campaignId]: fileList });
  };

  const generateGeminiReport = (campaignId) => {
    const files = uploadedFiles[campaignId] || [];
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      setCampaigns(campaigns.map(c => {
        if (c.id === campaignId) {
          const emailReports = files.map((f, idx) => ({
            name: `Envío ${idx + 1}`,
            fileName: f.name,
            delivered: Math.floor(Math.random() * 500) + 1200,
            openRate: (Math.random() * 15 + 20).toFixed(1) + "%",
            ctr: (Math.random() * 4 + 3).toFixed(1) + "%"
          }));

          return {
            ...c,
            report: {
              emailReports,
              hotLeads: [
                { email: "c.rodriguez@tech.com", clicks: 14, score: "Crítico", activity: "Click en 3/3 envíos" },
                { email: "ventas.internacional@hub.net", clicks: 9, score: "Alto", activity: "Apertura en 3/3 envíos" },
                { email: "p.alvarez@socio.es", clicks: 7, score: "Alto", activity: "Click en 2/3 envíos" },
                { email: "m.garcia@corporativo.com", clicks: 5, score: "Medio", activity: "Apertura reciente" }
              ]
            },
            completedSteps: [...new Set([...c.completedSteps, 'report'])]
          };
        }
        return c;
      }));
      setIsAnalyzing(false);
    }, 2000);
  };

  const downloadHotLeads = (campaign) => {
    const headers = "Email,Score,Clicks Totales,Actividad Detectada\n";
    const rows = campaign.report.hotLeads.map(l => `${l.email},${l.score},${l.clicks},${l.activity}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `hot_leads_${campaign.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getProgress = (campaign) => {
    let totalPossibleSteps = 13; // Email Marketing tiene 13 pasos (Reporte cliente + Smartsheet)
    if (campaign.variant === "webinar") totalPossibleSteps = 5;
    else if (campaign.type === "paid") totalPossibleSteps = 3;
    else if (campaign.type === "database") totalPossibleSteps = 3;
    else if (campaign.type === "research") totalPossibleSteps = 3;
    const progress = Math.round((campaign.completedSteps.length / totalPossibleSteps) * 100);
    return Math.min(progress, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900 relative">
      <header className="bg-blue-600 py-6 px-8 shadow-lg sticky top-0 z-40 text-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded text-blue-600 font-black text-xs">CH</div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Campaigns Hub</h1>
            </div>
          </div>
          <button 
            onClick={handleStartNewCampaign}
            className="bg-sky-400 text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-sky-500 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" /> Nueva Campaña
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 space-y-12">
        {(() => {
          const campaignsActivas = campaigns.filter(c => getProgress(c) < 100);
          const campaignsCompletadas = campaigns.filter(c => getProgress(c) === 100);
          const totalAFacturar = campaignsCompletadas.reduce((acc, c) => {
            const fee = Number(c.budget || 0);
            const platform = Number(c.platformInvestment || 0);
            return acc + fee + platform;
          }, 0);

          const typeStyles = {
            paid:     { border: "border-amber-300",   bg: "bg-amber-50",   text: "text-amber-700",   chip: "bg-amber-100 text-amber-700",     label: "Paid Media" },
            database: { border: "border-emerald-300", bg: "bg-emerald-50", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700", label: "Creación BBDD" },
            research: { border: "border-purple-300",  bg: "bg-purple-50",  text: "text-purple-700",  chip: "bg-purple-100 text-purple-700",   label: "Investigación" },
            email:    { border: "border-blue-300",    bg: "bg-blue-50",    text: "text-blue-700",    chip: "bg-blue-100 text-blue-700",       label: "Email Mkt." }
          };

          return (
            <>
              {/* Sección 1 — Campañas Activas */}
              <section className="space-y-3">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Campañas Activas</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En proceso de ejecución</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black border border-blue-100">
                    {campaignsActivas.length} {campaignsActivas.length === 1 ? 'CAMPAÑA' : 'CAMPAÑAS'}
                  </span>
                </div>

                {campaignsActivas.length > 0 ? campaignsActivas.map(campaign => (
                  <div key={campaign.id} ref={el => campaignRefs.current[campaign.id] = el} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Header compacto clickeable */}
                    {(() => {
                      const isExpanded = expandedCampaigns.has(campaign.id);
                      const typeMap = {
                        paid:     { label: "Paid Media",         chip: "bg-amber-100 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
                        database: { label: "Creación de BBDD",   chip: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
                        research: { label: "Investigación",      chip: "bg-purple-100 text-purple-700 border-purple-200",    dot: "bg-purple-500" },
                        email:    { label: "Email Marketing",    chip: "bg-blue-100 text-blue-700 border-blue-200",          dot: "bg-blue-500" },
                        webinar:  { label: "Mailings Webinar",   chip: "bg-indigo-100 text-indigo-700 border-indigo-200",    dot: "bg-indigo-500" }
                      };
                      const t = campaign.variant === "webinar" ? typeMap.webinar : (typeMap[campaign.type] || typeMap.email);
                      const prog = getProgress(campaign);
                      return (
                        <div
                          onClick={() => toggleExpand(campaign.id)}
                          className={`p-5 flex items-center gap-4 cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? "border-b border-slate-100" : ""}`}
                        >
                          {/* Dot de color por tipo */}
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.dot}`}></div>

                          {/* Info principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-black text-slate-800 text-sm uppercase truncate">{campaign.name}</h3>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${t.chip}`}>
                                {t.label}
                              </span>
                              {campaign.type === "paid" && campaign.objective && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  {campaign.objective === "posicionamiento" ? "Posicionamiento" : "Conversión"}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {campaign.businessUnit || "—"} · {campaign.country || "—"}
                            </p>
                          </div>

                          {/* Fee */}
                          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg shrink-0">
                            <DollarSign className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-black text-slate-700 tracking-widest">{(campaign.budget || 0).toLocaleString()}</span>
                          </div>

                          {/* Cotización validada */}
                          <div className="hidden lg:block shrink-0">
                            <QuotationBadge
                              validated={!!campaign.quotationValidated}
                              onToggle={(next) => toggleQuotation(campaign.id, next)}
                            />
                          </div>

                          {/* Responsable general */}
                          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg shrink-0">
                            <User className="w-3 h-3 text-purple-600" />
                            <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest hidden sm:inline">Responsable</span>
                            <span className="text-[10px] font-black text-purple-800 uppercase tracking-widest">{campaign.serviceOwner || SERVICE_OWNERS.campaign}</span>
                          </div>

                          {/* Progreso */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div className={`h-full ${t.dot}`} style={{ width: `${prog}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-slate-600 w-8 text-right">{prog}%</span>
                          </div>

                          {/* Botón borrar */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(campaign); }}
                            title="Eliminar campaña"
                            className="w-8 h-8 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center border border-red-100 hover:border-red-500 transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Chevron */}
                          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      );
                    })()}

                    {/* Contenido expandido */}
                    {expandedCampaigns.has(campaign.id) && (<>

                    {campaign.type === "paid" && (
                      /* ─── VISTA PAID MEDIA ─── */
                      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings className="w-4 h-4" /> Configuración de Campaña</h3>

                          <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">País</p>
                                <select
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                                  value={campaign.country}
                                  onChange={(e) => { updateCampaign(campaign.id, 'country', e.target.value); updateCampaign(campaign.id, 'businessUnit', ''); }}
                                >
                                  <option value="">País/Región...</option>
                                  {Object.keys(MARKETS).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Unidad</p>
                                <select
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-amber-400 outline-none"
                                  value={campaign.businessUnit}
                                  disabled={!campaign.country}
                                  onChange={(e) => updateCampaign(campaign.id, 'businessUnit', e.target.value)}
                                >
                                  <option value="">Unidad de Negocio...</option>
                                  {campaign.country && MARKETS[campaign.country].map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Fee Marcomms (USD)</p>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="w-full p-2.5 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                                  value={campaign.budget}
                                  onChange={(e) => updateCampaign(campaign.id, 'budget', Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-purple-600 uppercase mb-1.5 flex items-center gap-1">
                                <User className="w-3 h-3" /> Responsable de la campaña
                              </p>
                              <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                                <OwnerPicker
                                  value={campaign.serviceOwner || SERVICE_OWNERS.campaign}
                                  onChange={(v) => updateCampaign(campaign.id, 'serviceOwner', v)}
                                  compact={false}
                                  placeholder="Asignar responsable..."
                                />
                              </div>
                              <p className="text-[9px] text-purple-600 font-bold mt-1">Líder del servicio</p>
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Plataformas</p>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { id: "google",   label: "Google Ads" },
                                  { id: "linkedin", label: "LinkedIn" },
                                  { id: "meta",     label: "Meta" }
                                ].map(plat => {
                                  const isSelected = (campaign.platforms || []).includes(plat.id);
                                  return (
                                    <button
                                      key={plat.id}
                                      onClick={() => {
                                        const current = campaign.platforms || [];
                                        const next = isSelected ? current.filter(p => p !== plat.id) : [...current, plat.id];
                                        updateCampaign(campaign.id, 'platforms', next);
                                      }}
                                      className={`p-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 transition-all ${isSelected ? "bg-amber-500 border-amber-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-amber-300"}`}
                                    >
                                      {plat.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Inversión Oficina (USD)</p>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full p-2.5 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                                    value={campaign.platformInvestment || 0}
                                    onChange={(e) => updateCampaign(campaign.id, 'platformInvestment', Math.max(0, parseFloat(e.target.value) || 0))}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Duración</p>
                                <input
                                  type="text"
                                  placeholder="Ej: 30 días"
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                                  value={campaign.duration || ""}
                                  onChange={(e) => updateCampaign(campaign.id, 'duration', e.target.value)}
                                />
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Objetivo</p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => updateCampaign(campaign.id, 'objective', 'posicionamiento')}
                                  className={`p-3 rounded-lg text-[10px] font-black uppercase tracking-wider border-2 transition-all ${campaign.objective === 'posicionamiento' ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'}`}
                                >
                                  Posicionamiento
                                </button>
                                <button
                                  onClick={() => updateCampaign(campaign.id, 'objective', 'conversion')}
                                  className={`p-3 rounded-lg text-[10px] font-black uppercase tracking-wider border-2 transition-all ${campaign.objective === 'conversion' ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'}`}
                                >
                                  Conversión
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Detalle / Brief</p>
                              <textarea
                                rows="5"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 resize-none focus:ring-2 focus:ring-amber-400 outline-none"
                                placeholder="Descripción, creatividades, segmentación, fechas..."
                                value={campaign.detail || ""}
                                onChange={(e) => updateCampaign(campaign.id, 'detail', e.target.value)}
                              />
                            </div>

                            {/* Resumen Total */}
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 grid grid-cols-3 gap-2">
                              <div className="text-center">
                                <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Fee</p>
                                <p className="text-sm font-black text-amber-900">${(campaign.budget || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-center border-x border-amber-200">
                                <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Plataforma</p>
                                <p className="text-sm font-black text-amber-900">${(campaign.platformInvestment || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Total</p>
                                <p className="text-sm font-black text-amber-900">${((campaign.budget || 0) + (campaign.platformInvestment || 0)).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Ejecución</h3>

                          <div className="space-y-3">
                            <SimpleStep label="Brief y creatividades aprobadas" Icon={FileText} camp={campaign} id="brief" set={toggleStep} color="text-amber-500" />
                            <SimpleStep label="Piezas subidas a plataforma" Icon={Upload} camp={campaign} id="creativities" set={toggleStep} color="text-amber-500" />
                            <SimpleStep label="Campaña lanzada" Icon={Send} camp={campaign} id="launch" set={toggleStep} color="text-amber-500" />
                          </div>

                          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                            <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-2 text-slate-600"><TrendingUp className="w-4 h-4 text-amber-500" /> Resultados</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Los resultados de Paid Media (impresiones, alcance, CPL, CPC) se cargan al finalizar la campaña desde el reporte de la plataforma.</p>
                          </div>

                          <div className="bg-white border-2 border-amber-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Database className="w-4 h-4 text-amber-500" />
                              <h4 className="font-black text-[11px] text-slate-700 uppercase tracking-widest">Deals Creados en HubSpot</h4>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={campaign.dealsCreated ?? ""}
                              onChange={e => updateCampaign(campaign.id, 'dealsCreated', e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))}
                              placeholder="0"
                              className="w-32 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-lg font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <p className="text-[9px] text-slate-400 font-medium mt-1">Se reporta al cliente en el resumen mensual</p>
                          </div>

                          {/* Timeline de Comentarios mensuales */}
                          <CommentsSection
                            campaignId={campaign.id}
                            comments={campaign.comments}
                            newComment={newComment}
                            setNewComment={setNewComment}
                            addComment={addComment}
                            removeComment={removeComment}
                            accent="amber"
                            title="Timeline de Comentarios"
                            placeholder="Anotá novedades, ajustes, performance del mes..."
                          />
                        </div>
                      </div>
                    )}

                    {(campaign.type === "database" || campaign.type === "research") && (
                      /* ─── VISTA BBDD / RESEARCH ─── */
                      (() => {
                        const isDb = campaign.type === "database";
                        const accentClasses = isDb
                          ? { ring: "focus:ring-emerald-400", text: "text-emerald-500", chip: "bg-emerald-50 border-emerald-100" }
                          : { ring: "focus:ring-purple-400", text: "text-purple-500", chip: "bg-purple-50 border-purple-100" };
                        const sectionTitle = isDb ? "Configuración de la BBDD" : "Configuración de la Investigación";
                        const detailLabel = isDb ? "Detalle / Criterios de segmentación" : "Detalle / Brief de la investigación";
                        const detailPlaceholder = isDb
                          ? "Industria, cargos objetivo, geografía, fuentes..."
                          : "Objetivos, metodología, muestra, timing, deliverables...";

                        const steps = isDb
                          ? [
                              { id: "brief_db",      label: "Brief y criterios aprobados", Icon: FileText },
                              { id: "extraction",    label: "Datos extraídos / importados", Icon: Download },
                              { id: "delivery_db",   label: "BBDD entregada al solicitante", Icon: Send }
                            ]
                          : [
                              { id: "brief_research",label: "Brief y metodología aprobados", Icon: FileText },
                              { id: "fieldwork",     label: "Trabajo de campo finalizado", Icon: Users },
                              { id: "delivery_rs",   label: "Informe final entregado", Icon: Send }
                            ];

                        return (
                          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings className="w-4 h-4" /> {sectionTitle}</h3>

                              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">País</p>
                                    <select
                                      className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 ${accentClasses.ring}`}
                                      value={campaign.country}
                                      onChange={(e) => { updateCampaign(campaign.id, 'country', e.target.value); updateCampaign(campaign.id, 'businessUnit', ''); }}
                                    >
                                      <option value="">País/Región...</option>
                                      {Object.keys(MARKETS).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Unidad</p>
                                    <select
                                      className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 outline-none focus:ring-2 ${accentClasses.ring}`}
                                      value={campaign.businessUnit}
                                      disabled={!campaign.country}
                                      onChange={(e) => updateCampaign(campaign.id, 'businessUnit', e.target.value)}
                                    >
                                      <option value="">Unidad de Negocio...</option>
                                      {campaign.country && MARKETS[campaign.country].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Monto (USD)</p>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      className={`w-full p-2.5 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 ${accentClasses.ring}`}
                                      value={campaign.budget}
                                      onChange={(e) => updateCampaign(campaign.id, 'budget', Math.max(0, parseFloat(e.target.value) || 0))}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">{detailLabel}</p>
                                  <textarea
                                    rows="6"
                                    className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 resize-none outline-none focus:ring-2 ${accentClasses.ring}`}
                                    placeholder={detailPlaceholder}
                                    value={campaign.detail || ""}
                                    onChange={(e) => updateCampaign(campaign.id, 'detail', e.target.value)}
                                  />
                                </div>

                                {/* Responsable de la campaña */}
                                <div>
                                  <p className="text-[9px] font-black text-purple-600 uppercase mb-1.5 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Responsable de la campaña
                                  </p>
                                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                                    <OwnerPicker
                                      value={campaign.serviceOwner || SERVICE_OWNERS.campaign}
                                      onChange={(v) => updateCampaign(campaign.id, 'serviceOwner', v)}
                                      compact={false}
                                      placeholder="Asignar responsable..."
                                    />
                                  </div>
                                  <p className="text-[9px] text-purple-600 font-bold mt-1">Líder del servicio</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Ejecución</h3>

                              <div className="space-y-3">
                                {steps.map(step => (
                                  <SimpleStep key={step.id} label={step.label} Icon={step.Icon} camp={campaign} id={step.id} set={toggleStep} color={accentClasses.text} />
                                ))}
                              </div>

                              <div className={`p-5 rounded-2xl border-2 border-dashed ${accentClasses.chip}`}>
                                <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-2 text-slate-600">
                                  <Info className={`w-4 h-4 ${accentClasses.text}`} />
                                  {isDb ? "Notas sobre la BBDD" : "Notas sobre la Investigación"}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  {isDb
                                    ? "Al finalizar, la BBDD se puede usar directamente en Email Marketing o Paid Media para activación."
                                    : "El informe final incluye insights, benchmarks y recomendaciones accionables para las áreas de Marketing y Ventas."}
                                </p>
                              </div>

                              <div className={`bg-white border-2 rounded-xl p-4 ${isDb ? 'border-emerald-100' : 'border-purple-100'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Database className={`w-4 h-4 ${accentClasses.text}`} />
                                  <h4 className="font-black text-[11px] text-slate-700 uppercase tracking-widest">Deals Creados en HubSpot</h4>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  value={campaign.dealsCreated ?? ""}
                                  onChange={e => updateCampaign(campaign.id, 'dealsCreated', e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))}
                                  placeholder="0"
                                  className={`w-32 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-lg font-black text-slate-700 outline-none focus:ring-2 ${isDb ? 'focus:ring-emerald-400' : 'focus:ring-purple-400'}`}
                                />
                                <p className="text-[9px] text-slate-400 font-medium mt-1">Se reporta al cliente en el resumen mensual</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {campaign.type === "email" && campaign.variant === "webinar" && (
                      /* ─── VISTA CAMPAÑA WEBINAR (5 mailings linkeados al Webinar Hub) ─── */
                      (() => {
                        const webinarSteps = [
                          { id: 'mail1_pre',         label: 'Mailing 01: Invitación',      offset: 'D-15' },
                          { id: 'mail2_teaser',      label: 'Mailing 02: Teaser',          offset: 'D-8' },
                          { id: 'mail3_h24',         label: 'Mailing 03: H-24 (último)',   offset: 'D-1' },
                          { id: 'mailpost_attended', label: 'Mailing Post — Asistentes (grabación + PPT)', offset: 'D+1' },
                          { id: 'mailpost_noshow',   label: 'Mailing Post — No asistidos (link a grabación)', offset: 'D+1' }
                        ];
                        const completed = new Set(campaign.completedSteps || []);
                        const totalDone = webinarSteps.filter(s => completed.has(s.id)).length;
                        const pct = Math.round((totalDone / webinarSteps.length) * 100);

                        return (
                          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* ── Columna izquierda: info linkeo ── */}
                            <div className="space-y-6">
                              <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <Video className="w-5 h-5 text-blue-600" />
                                  <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Campaña Linkeada al Webinar</h4>
                                </div>
                                <p className="text-xs text-blue-800 font-medium leading-relaxed mb-3">
                                  Esta campaña se creó automáticamente al crear el webinar. Los 5 mailings están sincronizados con la sección <strong>Webinars</strong>: tildar acá tilda allá, y viceversa.
                                </p>
                                <div className="bg-white rounded-xl p-3 border border-blue-100">
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">País / Unidad</p>
                                  <p className="text-sm font-black text-slate-800">{campaign.country || '—'} · {campaign.businessUnit || '—'}</p>
                                </div>
                              </div>

                              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Progreso de Mailings</h4>
                                  <span className="text-xs font-black text-blue-600">{totalDone} / {webinarSteps.length} · {pct}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>

                              {/* Comentarios */}
                              <CommentsSection
                                campaignId={campaign.id}
                                comments={campaign.comments}
                                newComment={newComment}
                                setNewComment={setNewComment}
                                addComment={addComment}
                                removeComment={removeComment}
                                accent="blue"
                                title="Comentarios y Notas"
                                placeholder="Anotá feedback, ajustes, pendientes..."
                              />
                            </div>

                            {/* ── Columna derecha: 5 mailings ── */}
                            <div className="space-y-3">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Mail className="w-4 h-4" /> 5 mailings del webinar
                              </h3>
                              {webinarSteps.map((step, idx) => {
                                const isDone = completed.has(step.id);
                                return (
                                  <div
                                    key={step.id}
                                    onClick={() => toggleStep(campaign, step.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isDone ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-black ${isDone ? 'text-emerald-800' : 'text-slate-700'}`}>{step.label}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Offset: {step.offset} del webinar</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {campaign.type === "email" && campaign.variant !== "webinar" && (
                      /* ─── VISTA EMAIL MARKETING (paso a paso) ─── */
                      (() => {
                        const data = campaign.data || {};
                        const numEmails = campaign.numEmails || 1;
                        const extras = data.extras || []; // envíos extra más allá de los 3 base
                        const totalSends = numEmails + extras.length;

                        // Helpers para actualizar nested data
                        const updData = (key, val) => {
                          updateCampaign(campaign.id, 'data', { ...data, [key]: val });
                        };
                        const updContent = (idx, field, val) => {
                          const contents = [...(data.contents || [])];
                          while (contents.length <= idx) contents.push({ subject:"", message:"", cta:"", link:"", banner:"" });
                          contents[idx] = { ...contents[idx], [field]: val };
                          updData('contents', contents);
                        };
                        const updDate = (idx, val) => {
                          const dates = [...(data.dates || [])];
                          while (dates.length <= idx) dates.push("");
                          dates[idx] = val;
                          updData('dates', dates);
                        };
                        const updExtra = (idx, field, val) => {
                          const arr = [...extras];
                          while (arr.length <= idx) arr.push({ date:"", subject:"", message:"", cta:"", link:"", banner:"" });
                          arr[idx] = { ...arr[idx], [field]: val };
                          updData('extras', arr);
                        };
                        const addExtra = () => {
                          updData('extras', [...extras, { date:"", subject:"", message:"", cta:"", link:"", banner:"" }]);
                        };
                        const removeExtra = (idx) => {
                          updData('extras', extras.filter((_, i) => i !== idx));
                        };

                        // Helper render: un bloque completo de "Email N"
                        const renderEmailBlock = (n, source, idx, isExtra) => {
                          const emailData = isExtra ? extras[idx] : (data.contents?.[idx] || { subject:"", message:"", cta:"", link:"", banner:"" });
                          const date = isExtra ? extras[idx]?.date : (data.dates?.[idx] || "");
                          const setField = (field, val) => isExtra ? updExtra(idx, field, val) : updContent(idx, field, val);
                          const setDate = (val) => isExtra ? updExtra(idx, 'date', val) : updDate(idx, val);

                          return (
                            <div key={`${isExtra?'ex':'em'}-${idx}`} className="bg-white border-2 border-blue-100 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Email {n}</span>
                                  {isExtra && <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-amber-200">Extra</span>}
                                </div>
                                {isExtra && (
                                  <button onClick={() => removeExtra(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Fecha de envío</p>
                                <input type="date" value={date || ""} onChange={e => setDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Asunto</p>
                                <input type="text" value={emailData.subject || ""} onChange={e => setField('subject', e.target.value)} placeholder="Ej: Nuestra nueva certificación..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Mensaje comercial</p>
                                <textarea rows="3" value={emailData.message || ""} onChange={e => setField('message', e.target.value)} placeholder="Copy principal del email..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 resize-none outline-none focus:ring-2 focus:ring-blue-400" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">CTA</p>
                                  <input type="text" value={emailData.cta || ""} onChange={e => setField('cta', e.target.value)} placeholder="Ej: Saber más" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Link final</p>
                                  <input type="url" value={emailData.link || ""} onChange={e => setField('link', e.target.value)} placeholder="https://..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Banner (URL imagen con título + fecha)</p>
                                <input type="url" value={emailData.banner || ""} onChange={e => setField('banner', e.target.value)} placeholder="https://..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* ── Columna izquierda: Configuración ── */}
                            <div className="space-y-6">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings className="w-4 h-4" /> Configuración General</h3>

                              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">País</p>
                                    <select value={campaign.country} onChange={(e) => { updateCampaign(campaign.id, 'country', e.target.value); updateCampaign(campaign.id, 'businessUnit', ''); }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400">
                                      <option value="">País/Región...</option>
                                      {Object.keys(MARKETS).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Unidad</p>
                                    <select value={campaign.businessUnit} disabled={!campaign.country} onChange={(e) => updateCampaign(campaign.id, 'businessUnit', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none disabled:opacity-50 focus:ring-2 focus:ring-blue-400">
                                      <option value="">Unidad de Negocio...</option>
                                      {campaign.country && MARKETS[campaign.country].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Fee Marcomms (USD)</p>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                    <input type="number" min="0" value={campaign.budget} onChange={(e) => updateCampaign(campaign.id, 'budget', Math.max(0, parseFloat(e.target.value) || 0))} className="w-full p-2.5 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                                  </div>
                                </div>

                                {/* Responsable de la campaña */}
                                <div>
                                  <p className="text-[9px] font-black text-purple-600 uppercase mb-1.5 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Responsable de la campaña
                                  </p>
                                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                                    <OwnerPicker
                                      value={campaign.serviceOwner || SERVICE_OWNERS.campaign}
                                      onChange={(v) => updateCampaign(campaign.id, 'serviceOwner', v)}
                                      compact={false}
                                      placeholder="Asignar responsable..."
                                    />
                                  </div>
                                  <p className="text-[9px] text-purple-600 font-bold mt-1">Líder del servicio</p>
                                </div>
                              </div>

                              {/* ── DEADLINES (entrega final + auto-cálculo) ── */}
                              {(() => {
                                const ds = campaign.deadlines || {};
                                const finalDelivery = ds.finalDelivery || '';
                                const byStep = ds.byStep || {};

                                // Cálculo sugerido: dado finalDelivery y numEmails
                                const suggestDeadlines = (finalISO, n) => {
                                  if (!finalISO) return {};
                                  const f = new Date(finalISO + 'T00:00:00');
                                  const addD = (base, d) => { const x = new Date(base); x.setDate(x.getDate() + d); return x.toISOString().split('T')[0]; };
                                  // Inicio campaña = finalDelivery - (n * 7) días → primer envío
                                  const startCampaign = addD(f, -(n * 7));
                                  // Semana de preparación: termina el día previo al primer envío
                                  return {
                                    req:        addD(startCampaign, -7),
                                    num:        addD(startCampaign, -7),
                                    dates:      addD(startCampaign, -5),
                                    tag:        addD(startCampaign, -5),
                                    contents:   addD(startCampaign, -3),
                                    banners:    addD(startCampaign, -3),
                                    sender:     addD(startCampaign, -2),
                                    test:       addD(startCampaign, -1),
                                    prog:       addD(startCampaign, 0),
                                    hs_deals:   addD(f, 1),
                                    bbdd_del:   addD(f, 2),
                                    client_report: addD(f, 5),
                                    smartsheet: addD(f, 7)
                                  };
                                };

                                const applySuggested = () => {
                                  if (!finalDelivery) return;
                                  const sug = suggestDeadlines(finalDelivery, campaign.numEmails || 1);
                                  updateCampaign(campaign.id, 'deadlines', { finalDelivery, byStep: sug });
                                };

                                const updateDeadline = (field, val) => {
                                  const next = { finalDelivery, byStep: { ...byStep } };
                                  if (field === 'finalDelivery') next.finalDelivery = val;
                                  else next.byStep[field] = val;
                                  updateCampaign(campaign.id, 'deadlines', next);
                                };

                                return (
                                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border-2 border-blue-100">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        <h4 className="text-[11px] font-black text-blue-800 uppercase tracking-widest">Deadlines de Entrega</h4>
                                      </div>
                                      {finalDelivery && Object.keys(byStep).length === 0 && (
                                        <button onClick={applySuggested} className="text-[9px] font-black bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded uppercase tracking-wider">
                                          Sugerir fechas
                                        </button>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-[9px] font-black text-blue-700 uppercase mb-1">Fecha entrega final (último envío)</p>
                                        <input
                                          type="date"
                                          value={finalDelivery}
                                          onChange={(e) => {
                                            updateDeadline('finalDelivery', e.target.value);
                                            // si todavía no hay nada en byStep, autosugerir al setear final
                                            if (e.target.value && Object.keys(byStep).length === 0) {
                                              const sug = suggestDeadlines(e.target.value, campaign.numEmails || 1);
                                              updateCampaign(campaign.id, 'deadlines', { finalDelivery: e.target.value, byStep: sug });
                                            }
                                          }}
                                          className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                      </div>
                                      {finalDelivery && (
                                        <div className="bg-white border border-blue-100 rounded-xl p-3 space-y-1.5 mt-2">
                                          <p className="text-[9px] font-black text-blue-700 uppercase mb-1">Deadlines por paso (editables)</p>
                                          {[
                                            ['req', '1. Pedido confirmado'],
                                            ['num', '2. Cantidad envíos'],
                                            ['dates', '3. Fechas envío'],
                                            ['tag', '4. Etiquetas BBDD'],
                                            ['contents', '5. Contenidos'],
                                            ['banners', '6. Banners'],
                                            ['sender', '7. Remitente'],
                                            ['test', '8. Tests'],
                                            ['prog', '9. Programar'],
                                            ['hs_deals', '10. Deals HubSpot'],
                                            ['bbdd_del', '11. BBDD borrada'],
                                            ['client_report', '12. Reporte cliente'],
                                            ['smartsheet', '13. Smartsheet']
                                          ].map(([key, lbl]) => (
                                            <div key={key} className="flex items-center gap-2">
                                              <span className="text-[10px] text-slate-600 font-bold flex-1 truncate">{lbl}</span>
                                              <input
                                                type="date"
                                                value={byStep[key] || ''}
                                                onChange={(e) => updateDeadline(key, e.target.value)}
                                                className="text-[10px] p-1 bg-slate-50 border border-slate-200 rounded text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {!finalDelivery && (
                                        <p className="text-[10px] text-blue-600 font-medium italic mt-1">
                                          Cargá la fecha de entrega final y se calculan automáticamente los deadlines de cada paso.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ── ARCHIVOS DE LA CAMPAÑA ── */}
                              {(() => {
                                const files = campaign.files || [];
                                const newFile = newCampaignFile[campaign.id] || { name: '', url: '' };
                                const setNewFileFor = (val) => setNewCampaignFile({ ...newCampaignFile, [campaign.id]: val });
                                const addFile = () => {
                                  if (!newFile.name.trim()) return;
                                  const f = { id: Date.now() + Math.floor(Math.random()*1000), name: newFile.name, url: newFile.url || '', addedAt: new Date().toISOString() };
                                  updateCampaign(campaign.id, 'files', [...files, f]);
                                  setNewFileFor({ name: '', url: '' });
                                };
                                const removeFile = (fid) => {
                                  updateCampaign(campaign.id, 'files', files.filter(f => f.id !== fid));
                                };
                                return (
                                  <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <Files className="w-4 h-4 text-emerald-600" />
                                        <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Archivos de la Campaña</h4>
                                      </div>
                                      {files.length > 0 && (
                                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{files.length}</span>
                                      )}
                                    </div>
                                    {files.length > 0 && (
                                      <div className="space-y-1.5 mb-3">
                                        {files.map(f => (
                                          <div key={f.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-2 group">
                                            <Files className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-black text-slate-800 truncate">{f.name}</p>
                                              {f.url && (
                                                <a href={f.url} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline truncate flex items-center gap-1">
                                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                                  <span className="truncate">{f.url}</span>
                                                </a>
                                              )}
                                            </div>
                                            <button onClick={() => removeFile(f.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        placeholder="Nombre del archivo"
                                        value={newFile.name}
                                        onChange={e => setNewFileFor({ ...newFile, name: e.target.value })}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                                      />
                                      <div className="flex gap-2">
                                        <input
                                          type="url"
                                          placeholder="https://drive.google.com/..."
                                          value={newFile.url}
                                          onChange={e => setNewFileFor({ ...newFile, url: e.target.value })}
                                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                                        />
                                        <button onClick={addFile} disabled={!newFile.name.trim()} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1">
                                          <Plus className="w-3 h-3" /> Subir
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Paso 1: Quién realizó el pedido */}
                              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-black">1</div>
                                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Pedido de la Campaña</h4>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">¿Quién realizó el pedido?</p>
                                <input type="text" value={data.requester || ""} onChange={e => updData('requester', e.target.value)} placeholder="Ej: Juan Pérez — Comercial LATAM" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                              </div>

                              {/* Paso 2: Cantidad de envíos */}
                              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-black">2</div>
                                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Cantidad de Envíos</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3].map(n => (
                                    <button
                                      key={n}
                                      onClick={() => updateCampaign(campaign.id, 'numEmails', n)}
                                      className={`p-3 rounded-lg text-xs font-black uppercase tracking-wider border-2 transition-all ${numEmails === n ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
                                    >
                                      {n} {n === 1 ? "Envío" : "Envíos"}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium mt-2">Podés sumar envíos extra desde la columna derecha.</p>
                              </div>

                              {/* Paso 4: Etiquetas BBDD (múltiples) */}
                              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-black">4</div>
                                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Etiquetas BBDD</h4>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Tags / segmentos a usar (Enter para agregar)</p>
                                {(() => {
                                  // Retro-compat: si existía data.tag string, lo migramos a data.tags array
                                  let tags = data.tags;
                                  if (!Array.isArray(tags)) {
                                    tags = data.tag ? [data.tag] : [];
                                  }
                                  return (
                                    <div className="space-y-2">
                                      {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                          {tags.map((t, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-2.5 py-1 text-[10px] font-black uppercase">
                                              {t}
                                              <button
                                                onClick={() => {
                                                  const nt = tags.filter((_, i) => i !== idx);
                                                  updData('tags', nt);
                                                }}
                                                className="hover:bg-blue-200 rounded-full w-3.5 h-3.5 flex items-center justify-center"
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <input
                                        type="text"
                                        placeholder="Ej: LATAM-AGRO-2025 + Enter"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                            e.preventDefault();
                                            const v = e.currentTarget.value.trim();
                                            if (!tags.includes(v)) {
                                              updData('tags', [...tags, v]);
                                            }
                                            e.currentTarget.value = '';
                                          }
                                        }}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                                      />
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Paso 6: Sender */}
                              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-black">6</div>
                                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Email Remitente</h4>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">¿Desde qué dirección se envía?</p>
                                <input type="email" value={data.senderEmail || ""} onChange={e => updData('senderEmail', e.target.value)} placeholder="marketing@ejemplo.com" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" />
                              </div>

                              {/* UTM Builder Widget */}
                              <MarcommsUtmBuilder
                                defaultCampaignName={campaign.name}
                                defaultCountry={campaign.country}
                                defaultBusinessUnit={campaign.businessUnit}
                                accentColor="purple"
                              />
                            </div>

                            {/* ── Columna derecha: Contenidos + Ejecución ── */}
                            <div className="space-y-6">
                              {/* Paso 3: Fechas + Paso 5: Contenidos */}
                              <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                  <Mail className="w-4 h-4" /> Paso 3 & 5: Fechas + Contenidos por Envío
                                </h3>

                                <div className="space-y-3">
                                  {/* Renderizar los N emails base */}
                                  {[...Array(numEmails)].map((_, idx) => renderEmailBlock(idx + 1, 'base', idx, false))}

                                  {/* Renderizar los emails extra */}
                                  {extras.map((_, idx) => renderEmailBlock(numEmails + idx + 1, 'extra', idx, true))}

                                  {/* Botón agregar extra */}
                                  <button onClick={addExtra} className="w-full p-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 text-blue-600 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4" /> Agregar envío extra
                                  </button>
                                </div>
                              </div>

                              {/* Ejecución */}
                              <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4" /> Ejecución y Checklist</h3>

                                <div className="space-y-2">
                                  <SimpleStep label="1. Pedido de la campaña confirmado" Icon={User} camp={campaign} id="req" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="2. Cantidad de envíos definida" Icon={Hash} camp={campaign} id="num" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="3. Fechas de envío establecidas" Icon={Clock} camp={campaign} id="dates" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="4. Etiqueta BBDD cargada" Icon={Tag} camp={campaign} id="tag" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="5. Contenidos (asuntos, mensajes, CTAs, links) listos" Icon={FileText} camp={campaign} id="contents" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="6. Banners preparados con título y fecha" Icon={Upload} camp={campaign} id="banners" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="7. Dirección de remitente validada" Icon={Mail} camp={campaign} id="sender" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="8. Emails de prueba enviados y revisados" Icon={MailWarning} camp={campaign} id="test" set={toggleStep} color="text-blue-500" />
                                  <SimpleStep label="9. Envíos programados en Mailchimp" Icon={Send} camp={campaign} id="prog" set={toggleStep} color="text-blue-500" />
                                  <div className="bg-white border-2 border-blue-100 rounded-xl p-3">
                                    <SimpleStep label="10. Deals cargados en HubSpot" Icon={Database} camp={campaign} id="hs_deals" set={toggleStep} color="text-blue-500" />
                                    <div className="mt-2 pl-11">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Cantidad de deals creados</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={campaign.dealsCreated ?? ""}
                                        onChange={e => updateCampaign(campaign.id, 'dealsCreated', e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        placeholder="0"
                                        className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                                      />
                                    </div>
                                  </div>
                                  <SimpleStep label="11. BBDD borrada de Mailchimp" Icon={Trash2} camp={campaign} id="bbdd_del" set={toggleStep} color="text-blue-500" />

                                  {/* ── PASO 12: Panel de Reporte al Cliente con métricas + import Mailchimp ── */}
                                  {(() => {
                                    const isReportSent = (campaign.completedSteps || []).includes('client_report');
                                    const metrics = campaign.clientReport || { sent: '', opens: '', clicks: '', conversions: '', notes: '', sentAt: '', mailchimpInfo: null, urls: [], leads: [], hotLeads: [], files: [] };
                                    const upd = (k, v) => updateCampaign(campaign.id, 'clientReport', { ...metrics, [k]: v });
                                    const updMany = (patch) => updateCampaign(campaign.id, 'clientReport', { ...metrics, ...patch });

                                    const totalSent = Number(metrics.sent) || 0;
                                    const totalOpens = Number(metrics.opens) || 0;
                                    const totalClicks = Number(metrics.clicks) || 0;
                                    const totalConv = Number(metrics.conversions) || 0;
                                    const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0.0';
                                    const ctr = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0';
                                    const convRate = totalSent > 0 ? ((totalConv / totalSent) * 100).toFixed(2) : '0.00';

                                    const importMailchimpReport = (file) => {
                                      const reader = new FileReader();
                                      reader.onerror = () => alert('No se pudo leer el archivo. Verificá permisos y reintentá.');
                                      reader.onload = (e) => {
                                        try {
                                          const csvText = e.target.result;
                                          // Validación: ¿es un Email Campaign Report?
                                          if (!csvText.includes('Email Campaign Report') || !csvText.includes('Overall Stats')) {
                                            alert('Este archivo no parece un Email Campaign Report de Mailchimp.\n\nDebería contener las secciones "Email Campaign Report" y "Overall Stats".');
                                            return;
                                          }
                                          const data = parseMailchimpReport(csvText);
                                          // Sanity check: el reporte debería tener al menos recipients o deliveries > 0
                                          if (data.recipients === 0 && data.deliveries === 0) {
                                            alert('El CSV se leyó pero no detectamos métricas. Verificá que el reporte tenga datos.');
                                            return;
                                          }
                                          updMany({
                                            sent: String(data.deliveries || data.recipients || ''),
                                            opens: String(data.opens || ''),
                                            clicks: String(data.clicks || ''),
                                            urls: data.urls || [],
                                            mailchimpInfo: {
                                              title: data.title,
                                              subject: data.subject,
                                              deliveryDate: data.deliveryDate,
                                              recipients: data.recipients,
                                              bounces: data.bounces,
                                              totalOpens: data.totalOpens,
                                              totalClicks: data.totalClicks,
                                              unsubs: data.unsubs,
                                              openRate: data.openRate,
                                              clickRate: data.clickRate,
                                              importedAt: new Date().toISOString()
                                            }
                                          });
                                        } catch (err) {
                                          alert('Error al parsear el CSV. Verificá que sea un Email Campaign Report de Mailchimp.');
                                        }
                                      };
                                      reader.readAsText(file);
                                    };

                                    const importSubscribers = (file) => {
                                      const reader = new FileReader();
                                      reader.onerror = () => alert('No se pudo leer el archivo de subscribers.');
                                      reader.onload = (e) => {
                                        try {
                                          const csvText = e.target.result;
                                          const { leads, hotLeads } = parseMailchimpSubscribers(csvText);
                                          if (leads.length === 0 && hotLeads.length === 0) {
                                            alert('No se detectaron leads. Verificá que el CSV tenga columnas Email Address, Total Opens, Total Clicks.');
                                            return;
                                          }
                                          updMany({ leads, hotLeads });
                                        } catch (err) {
                                          alert('Error al parsear el CSV de subscribers.');
                                        }
                                      };
                                      reader.readAsText(file);
                                    };

                                    const addAttachment = (file) => {
                                      // Defensiva: limitar tamaño (5MB para evitar localStorage overflow)
                                      const MAX_SIZE = 5 * 1024 * 1024;
                                      if (file.size > MAX_SIZE) {
                                        alert(`El archivo "${file.name}" supera los 5MB. Subí archivos más livianos o usá un link.`);
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onerror = () => alert(`No se pudo leer el archivo "${file.name}".`);
                                      reader.onload = (e) => {
                                        const newFiles = [...(metrics.files || []), {
                                          id: Date.now() + Math.floor(Math.random() * 1000),
                                          name: file.name,
                                          size: file.size,
                                          type: file.type || 'application/octet-stream',
                                          dataUrl: e.target.result, // base64 data URL para descarga
                                          addedAt: new Date().toISOString()
                                        }];
                                        upd('files', newFiles);
                                      };
                                      reader.readAsDataURL(file);
                                    };

                                    const removeAttachment = (id) => {
                                      upd('files', (metrics.files || []).filter(f => f.id !== id));
                                    };

                                    const formatBytes = (b) => {
                                      if (b < 1024) return b + ' B';
                                      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
                                      return (b / (1024 * 1024)).toFixed(1) + ' MB';
                                    };

                                    return (
                                      <div className={`border-2 rounded-xl p-4 ${isReportSent ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                                        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isReportSent ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                              {isReportSent ? <CheckCircle2 className="w-4 h-4 text-white" /> : <BarChart3 className="w-4 h-4 text-white" />}
                                            </div>
                                            <div>
                                              <h4 className={`text-xs font-black uppercase tracking-widest ${isReportSent ? 'text-emerald-700' : 'text-blue-700'}`}>
                                                12. Reporte al Cliente
                                              </h4>
                                              {isReportSent && metrics.sentAt && (
                                                <p className="text-[9px] text-emerald-600 font-bold">
                                                  Enviado: {new Date(metrics.sentAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* ── BLOQUE 1: Importar reporte Mailchimp (CSV) ── */}
                                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-amber-200 rounded-lg p-3 mb-3">
                                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                              <Mail className="w-4 h-4 text-amber-700" />
                                              <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Mailchimp Report (CSV)</span>
                                            </div>
                                            <label className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5">
                                              <Upload className="w-3 h-3" />
                                              {metrics.mailchimpInfo ? 'Reimportar' : 'Importar CSV'}
                                              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { if (e.target.files[0]) importMailchimpReport(e.target.files[0]); e.target.value = ''; }} />
                                            </label>
                                          </div>
                                          {metrics.mailchimpInfo ? (
                                            <div className="bg-white border border-amber-100 rounded p-2.5 space-y-1">
                                              <p className="text-[11px] font-black text-slate-800 leading-tight">{metrics.mailchimpInfo.title}</p>
                                              <p className="text-[10px] text-slate-600">📧 {metrics.mailchimpInfo.subject}</p>
                                              <p className="text-[9px] text-slate-400 font-bold uppercase">{metrics.mailchimpInfo.deliveryDate}</p>
                                              <div className="flex items-center gap-2 flex-wrap pt-1.5 mt-1.5 border-t border-slate-100">
                                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black uppercase">📨 {metrics.mailchimpInfo.recipients}</span>
                                                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">{metrics.mailchimpInfo.openRate}% open</span>
                                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">{metrics.mailchimpInfo.clickRate}% CTR</span>
                                                <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black uppercase">{metrics.mailchimpInfo.bounces} bounces</span>
                                                {metrics.mailchimpInfo.unsubs > 0 && (
                                                  <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black uppercase">{metrics.mailchimpInfo.unsubs} unsubs</span>
                                                )}
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-amber-700 font-medium italic">
                                              Subí el "Email Campaign Report" exportado de Mailchimp (.csv) y se autocompletan envíos, opens, clicks y URLs.
                                            </p>
                                          )}
                                        </div>

                                        {/* Inputs métricas */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                          <div>
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5 block">Envíos</label>
                                            <input
                                              type="number" min="0"
                                              value={metrics.sent}
                                              onChange={e => upd('sent', e.target.value)}
                                              placeholder="0"
                                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-700 text-center outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 block">Aperturas</label>
                                            <input
                                              type="number" min="0"
                                              value={metrics.opens}
                                              onChange={e => upd('opens', e.target.value)}
                                              placeholder="0"
                                              className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-black text-emerald-700 text-center outline-none focus:ring-2 focus:ring-emerald-400"
                                            />
                                            <p className="text-[8px] font-black text-emerald-700 text-center mt-0.5">{openRate}%</p>
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5 block">Clicks</label>
                                            <input
                                              type="number" min="0"
                                              value={metrics.clicks}
                                              onChange={e => upd('clicks', e.target.value)}
                                              placeholder="0"
                                              className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-black text-amber-700 text-center outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                            <p className="text-[8px] font-black text-amber-700 text-center mt-0.5">CTR {ctr}%</p>
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-0.5 block">Conversiones</label>
                                            <input
                                              type="number" min="0"
                                              value={metrics.conversions}
                                              onChange={e => upd('conversions', e.target.value)}
                                              placeholder="0"
                                              className="w-full p-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-black text-purple-700 text-center outline-none focus:ring-2 focus:ring-purple-400"
                                            />
                                            <p className="text-[8px] font-black text-purple-700 text-center mt-0.5">{convRate}%</p>
                                          </div>
                                        </div>

                                        {/* ── BLOQUE 2: URLs clickeadas (del CSV de Mailchimp) ── */}
                                        {(metrics.urls || []).length > 0 && (
                                          <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3">
                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                              <Link className="w-3 h-3" /> URLs más clickeadas ({metrics.urls.length})
                                            </p>
                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                              {metrics.urls.map((u, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-[10px] py-1 border-b border-slate-50 last:border-0">
                                                  <span className="bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded shrink-0 w-12 text-center">{u.total}</span>
                                                  <span className="text-slate-400 font-bold shrink-0">/</span>
                                                  <span className="bg-slate-100 text-slate-600 font-black px-1.5 py-0.5 rounded shrink-0 w-12 text-center">{u.unique}</span>
                                                  <a href={u.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate font-medium flex-1">{u.url}</a>
                                                </div>
                                              ))}
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                              Total clicks / Únicos
                                            </p>
                                          </div>
                                        )}

                                        {/* ── BLOQUE 3: Leads y Hot Leads ── */}
                                        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3">
                                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                              <Users className="w-4 h-4 text-purple-600" />
                                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Lista de Leads</span>
                                              {((metrics.leads || []).length + (metrics.hotLeads || []).length) > 0 && (
                                                <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black">
                                                  {(metrics.leads || []).length + (metrics.hotLeads || []).length} totales
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <label className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5">
                                                <Upload className="w-3 h-3" />
                                                Importar Subscribers CSV
                                                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { if (e.target.files[0]) importSubscribers(e.target.files[0]); e.target.value = ''; }} />
                                              </label>
                                              {((metrics.leads || []).length + (metrics.hotLeads || []).length) > 0 && (
                                                <button
                                                  onClick={() => updMany({ leads: [], hotLeads: [] })}
                                                  className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest"
                                                  title="Limpiar lista"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {((metrics.hotLeads || []).length > 0 || (metrics.leads || []).length > 0) ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                              {/* HOT LEADS */}
                                              <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-2">
                                                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                  <Zap className="w-3 h-3 fill-current" /> Hot Leads ({(metrics.hotLeads || []).length})
                                                </p>
                                                <p className="text-[8px] text-red-600 font-medium mb-2">Hicieron click o tienen rating ≥ 4 estrellas</p>
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                  {(metrics.hotLeads || []).length > 0 ? (
                                                    metrics.hotLeads.map((l, idx) => (
                                                      <div key={idx} className="bg-white border border-red-100 rounded p-1.5">
                                                        <p className="text-[10px] font-black text-slate-800 truncate">{l.name}</p>
                                                        <p className="text-[9px] text-slate-500 truncate">{l.email}</p>
                                                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                          {l.company && <span className="text-[8px] bg-slate-100 px-1 rounded font-bold text-slate-600">{l.company}</span>}
                                                          {l.clicks > 0 && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black">{l.clicks} clicks</span>}
                                                          {l.opens > 0 && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded font-black">{l.opens} opens</span>}
                                                          {l.rating > 0 && <span className="text-[8px] bg-purple-100 text-purple-700 px-1 rounded font-black">★{l.rating}</span>}
                                                        </div>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <p className="text-[10px] text-red-400 font-medium italic text-center py-2">Sin hot leads detectados</p>
                                                  )}
                                                </div>
                                              </div>

                                              {/* LEADS COMUNES */}
                                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                  <Eye className="w-3 h-3" /> Leads ({(metrics.leads || []).length})
                                                </p>
                                                <p className="text-[8px] text-blue-600 font-medium mb-2">Abrieron el email pero no clickearon</p>
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                  {(metrics.leads || []).length > 0 ? (
                                                    metrics.leads.map((l, idx) => (
                                                      <div key={idx} className="bg-white border border-blue-100 rounded p-1.5">
                                                        <p className="text-[10px] font-black text-slate-800 truncate">{l.name}</p>
                                                        <p className="text-[9px] text-slate-500 truncate">{l.email}</p>
                                                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                          {l.company && <span className="text-[8px] bg-slate-100 px-1 rounded font-bold text-slate-600">{l.company}</span>}
                                                          {l.opens > 0 && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded font-black">{l.opens} opens</span>}
                                                        </div>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <p className="text-[10px] text-blue-400 font-medium italic text-center py-2">Sin leads comunes</p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-slate-400 font-medium italic">
                                              Importá el CSV de subscribers de Mailchimp con columnas Email, First/Last Name, Total Opens, Total Clicks. Los hot leads (clickeadores) se separan automáticamente.
                                            </p>
                                          )}
                                        </div>

                                        {/* ── BLOQUE 4: Archivos adjuntos múltiples ── */}
                                        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3">
                                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                              <Files className="w-4 h-4 text-emerald-600" />
                                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Archivos del reporte</span>
                                              {(metrics.files || []).length > 0 && (
                                                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black">
                                                  {(metrics.files || []).length}
                                                </span>
                                              )}
                                            </div>
                                            <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5">
                                              <Plus className="w-3 h-3" /> Agregar archivo
                                              <input type="file" multiple className="hidden" onChange={(e) => {
                                                Array.from(e.target.files || []).forEach(f => addAttachment(f));
                                                e.target.value = '';
                                              }} />
                                            </label>
                                          </div>
                                          {(metrics.files || []).length > 0 ? (
                                            <div className="space-y-1">
                                              {metrics.files.map(f => (
                                                <div key={f.id} className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2 group">
                                                  <Files className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-800 truncate">{f.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold">{formatBytes(f.size)} · {((f.type || '').split('/').pop() || 'FILE').toUpperCase()}</p>
                                                  </div>
                                                  <a href={f.dataUrl} download={f.name} className="text-blue-500 hover:text-blue-700 p-1" title="Descargar">
                                                    <Download className="w-3.5 h-3.5" />
                                                  </a>
                                                  <button onClick={() => removeAttachment(f.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-all" title="Eliminar">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-slate-400 font-medium italic">
                                              Subí PDFs, imágenes, screenshots o cualquier archivo adicional. Sin límite de cantidad.
                                            </p>
                                          )}
                                        </div>

                                        {/* Notas opcionales */}
                                        <textarea
                                          rows="2"
                                          placeholder="Notas / highlights del reporte (opcional)..."
                                          value={metrics.notes}
                                          onChange={e => upd('notes', e.target.value)}
                                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 resize-none outline-none focus:ring-2 focus:ring-blue-400 mb-3"
                                        />

                                        {/* Resumen + botón descargar reporte */}
                                        {(() => {
                                          const hasMinData = totalSent > 0 || totalOpens > 0 || totalClicks > 0 || metrics.mailchimpInfo;
                                          const hotLeadsCount = (metrics.hotLeads || []).length;
                                          const leadsCount = (metrics.leads || []).length;

                                          const downloadFullReport = () => {
                                            // Construir HTML completo del reporte
                                            const safe = (s) => (s || '').toString().replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c]));
                                            const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
                                            const mc = metrics.mailchimpInfo || {};
                                            const urls = metrics.urls || [];
                                            const hot = metrics.hotLeads || [];
                                            const leadsList = metrics.leads || [];
                                            const files = metrics.files || [];

                                            const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte ${safe(campaign.name)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; padding: 32px; }
.container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.header { background: linear-gradient(135deg, #1e40af, #6366f1); color: white; padding: 40px; }
.header h1 { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin-bottom: 8px; }
.header .subtitle { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
.header .meta { margin-top: 16px; font-size: 12px; opacity: 0.85; }
.section { padding: 32px 40px; border-bottom: 1px solid #f1f5f9; }
.section h2 { font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.section h2::before { content: ''; display: inline-block; width: 4px; height: 16px; background: #6366f1; border-radius: 2px; }
.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.metric-card { padding: 16px; border-radius: 12px; border: 1px solid; }
.metric-card.sent { background: #f1f5f9; border-color: #e2e8f0; }
.metric-card.opens { background: #ecfdf5; border-color: #a7f3d0; }
.metric-card.clicks { background: #fffbeb; border-color: #fde68a; }
.metric-card.conv { background: #faf5ff; border-color: #e9d5ff; }
.metric-card .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
.metric-card.sent .label { color: #475569; }
.metric-card.opens .label { color: #047857; }
.metric-card.clicks .label { color: #b45309; }
.metric-card.conv .label { color: #6b21a8; }
.metric-card .value { font-size: 32px; font-weight: 900; line-height: 1; }
.metric-card.sent .value { color: #1e293b; }
.metric-card.opens .value { color: #047857; }
.metric-card.clicks .value { color: #b45309; }
.metric-card.conv .value { color: #6b21a8; }
.metric-card .pct { font-size: 11px; font-weight: 900; margin-top: 4px; opacity: 0.8; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-size: 10px; color: #475569; }
td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
td a { color: #2563eb; text-decoration: none; }
.chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
.chip-amber { background: #fef3c7; color: #92400e; }
.chip-slate { background: #f1f5f9; color: #475569; }
.chip-emerald { background: #d1fae5; color: #047857; }
.chip-red { background: #fee2e2; color: #b91c1c; }
.chip-blue { background: #dbeafe; color: #1e40af; }
.chip-purple { background: #ede9fe; color: #6b21a8; }
.lead-row { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; background: #f8fafc; margin-bottom: 6px; }
.lead-row.hot { background: linear-gradient(90deg, #fee2e2, #fef3c7); border-left: 3px solid #ef4444; }
.lead-name { font-weight: 900; font-size: 13px; color: #1e293b; }
.lead-email { font-size: 11px; color: #64748b; }
.lead-meta { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.notes { background: #f1f5f9; padding: 16px; border-radius: 12px; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
.footer { padding: 24px 40px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; background: #f8fafc; }
.empty { text-align: center; padding: 24px; color: #94a3b8; font-style: italic; font-size: 12px; }
.url-row { display: flex; gap: 8px; align-items: center; padding: 10px; border-bottom: 1px solid #f1f5f9; }
.url-row:last-child { border: none; }
.url-stats { display: flex; gap: 4px; flex-shrink: 0; }
.url-stats span { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; min-width: 40px; text-align: center; }
@media print {
  body { padding: 0; background: white; }
  .container { box-shadow: none; border-radius: 0; }
  .section { page-break-inside: avoid; }
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="subtitle">Reporte de Email Marketing</div>
    <h1>${safe(campaign.name)}</h1>
    <div class="meta">
      ${campaign.country ? safe(campaign.country) + ' · ' : ''}${campaign.businessUnit ? safe(campaign.businessUnit) + ' · ' : ''}${campaign.data?.requester ? 'Solicitado por ' + safe(campaign.data.requester) : ''}<br>
      <strong>Fecha del reporte:</strong> ${today}
      ${mc.deliveryDate ? '<br><strong>Fecha de envío:</strong> ' + safe(mc.deliveryDate) : ''}
      ${mc.subject ? '<br><strong>Asunto:</strong> ' + safe(mc.subject) : ''}
    </div>
  </div>

  <div class="section">
    <h2>Métricas principales</h2>
    <div class="metrics-grid">
      <div class="metric-card sent">
        <div class="label">Envíos</div>
        <div class="value">${totalSent.toLocaleString()}</div>
      </div>
      <div class="metric-card opens">
        <div class="label">Aperturas</div>
        <div class="value">${totalOpens.toLocaleString()}</div>
        <div class="pct">${openRate}% open rate</div>
      </div>
      <div class="metric-card clicks">
        <div class="label">Clicks</div>
        <div class="value">${totalClicks.toLocaleString()}</div>
        <div class="pct">CTR ${ctr}%</div>
      </div>
      <div class="metric-card conv">
        <div class="label">Conversiones</div>
        <div class="value">${totalConv.toLocaleString()}</div>
        <div class="pct">${convRate}% conv. rate</div>
      </div>
    </div>
    ${mc.bounces ? '<div style="margin-top:16px;font-size:12px;color:#64748b;">📨 ' + mc.recipients + ' destinatarios · 🔴 ' + mc.bounces + ' bounces · 🟠 ' + (mc.unsubs || 0) + ' unsubs</div>' : ''}
    <div style="margin-top:16px;font-size:13px;font-weight:900;color:#1e293b;">
      💼 Deals creados en HubSpot: <span style="color:#1e40af;">${campaign.dealsCreated || 0}</span>
    </div>
  </div>

  ${urls.length > 0 ? `
  <div class="section">
    <h2>URLs más clickeadas (${urls.length})</h2>
    <table>
      <thead>
        <tr>
          <th style="width:80px;">Total</th>
          <th style="width:80px;">Únicos</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        ${urls.map(u => `
          <tr>
            <td><span class="chip chip-amber">${u.total}</span></td>
            <td><span class="chip chip-slate">${u.unique}</span></td>
            <td><a href="${safe(u.url)}" target="_blank">${safe(u.url)}</a></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${hot.length > 0 ? `
  <div class="section">
    <h2>🔥 Hot Leads (${hot.length})</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">Personas que clickearon o tienen alta engagement</p>
    ${hot.map(l => `
      <div class="lead-row hot">
        <div style="flex:1;min-width:0;">
          <div class="lead-name">${safe(l.name)}</div>
          <div class="lead-email">${safe(l.email)}</div>
          <div class="lead-meta">
            ${l.company ? '<span class="chip chip-slate">' + safe(l.company) + '</span>' : ''}
            ${l.clicks > 0 ? '<span class="chip chip-amber">' + l.clicks + ' clicks</span>' : ''}
            ${l.opens > 0 ? '<span class="chip chip-emerald">' + l.opens + ' opens</span>' : ''}
            ${l.rating > 0 ? '<span class="chip chip-purple">★ ' + l.rating + '</span>' : ''}
          </div>
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${leadsList.length > 0 ? `
  <div class="section">
    <h2>👁️ Leads (${leadsList.length})</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">Abrieron el email pero no clickearon</p>
    ${leadsList.map(l => `
      <div class="lead-row">
        <div style="flex:1;min-width:0;">
          <div class="lead-name">${safe(l.name)}</div>
          <div class="lead-email">${safe(l.email)}</div>
          <div class="lead-meta">
            ${l.company ? '<span class="chip chip-slate">' + safe(l.company) + '</span>' : ''}
            ${l.opens > 0 ? '<span class="chip chip-emerald">' + l.opens + ' opens</span>' : ''}
          </div>
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${(metrics.notes || '').trim() ? `
  <div class="section">
    <h2>Notas y conclusiones</h2>
    <div class="notes">${safe(metrics.notes)}</div>
  </div>
  ` : ''}

  ${files.length > 0 ? `
  <div class="section">
    <h2>Archivos adjuntos (${files.length})</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">Los archivos están adjuntos por separado al envío de este reporte</p>
    <ul style="list-style:none;">
      ${files.map(f => `
        <li style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <span style="font-weight:900;font-size:12px;">📎 ${safe(f.name)}</span>
          <span style="font-size:10px;color:#94a3b8;margin-left:8px;">${(f.size/1024).toFixed(1)} KB · ${((f.type || '').split('/').pop() || 'FILE').toUpperCase()}</span>
        </li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="footer">
    Marcomms Hub · Generado el ${today}<br>
    Para imprimir este reporte como PDF: Cmd/Ctrl + P → Guardar como PDF
  </div>
</div>
</body>
</html>`;

                                            // Crear blob y descargar
                                            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            // Nombre del archivo: reporte_NombreCampaña_fecha.html
                                            const slug = (campaign.name || 'campania').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                                            const dateStr = new Date().toISOString().split('T')[0];
                                            a.download = `reporte_${slug}_${dateStr}.html`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            setTimeout(() => URL.revokeObjectURL(url), 100);

                                            // Marcar el step como done + sentAt
                                            if (!isReportSent) {
                                              upd('sentAt', new Date().toISOString());
                                              toggleStep(campaign, 'client_report');
                                            }
                                          };

                                          return (
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                              <div className="flex items-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-widest">
                                                <span className="bg-white text-slate-600 px-2 py-1 rounded border border-slate-200">
                                                  Deals: {campaign.dealsCreated || 0}
                                                </span>
                                                {totalSent > 0 && (
                                                  <span className="bg-white text-slate-600 px-2 py-1 rounded border border-slate-200">
                                                    {totalSent.toLocaleString()} envíos
                                                  </span>
                                                )}
                                                {hotLeadsCount > 0 && (
                                                  <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">
                                                    {hotLeadsCount} hot leads
                                                  </span>
                                                )}
                                                {leadsCount > 0 && (
                                                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                                    {leadsCount} leads
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {isReportSent && (
                                                  <button
                                                    onClick={() => toggleStep(campaign, 'client_report')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all"
                                                    title="Reabrir el reporte para editarlo"
                                                  >
                                                    <RefreshCw className="w-3 h-3" /> Reabrir
                                                  </button>
                                                )}
                                                <button
                                                  onClick={downloadFullReport}
                                                  disabled={!hasMinData}
                                                  title={hasMinData ? 'Descargar reporte completo y marcar como enviado' : 'Cargá las métricas o importá el CSV de Mailchimp primero'}
                                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${
                                                    !hasMinData
                                                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                      : isReportSent
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                  }`}
                                                >
                                                  <Download className="w-3.5 h-3.5" />
                                                  {isReportSent ? 'Re-descargar reporte' : 'Descargar reporte completo'}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })()}

                                  <SimpleStep label="13. Cargado en Smartsheet (facturación)" Icon={Receipt} camp={campaign} id="smartsheet" set={toggleStep} color="text-blue-500" />
                                </div>
                              </div>

                              {/* Timeline de Comentarios */}
                              <CommentsSection
                                campaignId={campaign.id}
                                comments={campaign.comments}
                                newComment={newComment}
                                setNewComment={setNewComment}
                                addComment={addComment}
                                removeComment={removeComment}
                                accent="blue"
                                title="Comentarios y Notas"
                                placeholder="Anotá feedback, ajustes, pendientes..."
                              />
                            </div>
                          </div>
                        );
                      })()
                    )}
                    </>)}
            </div>
                )) : (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay campañas activas</p>
                  </div>
                )}
              </section>

              {/* Sección 2 — Campañas Completadas / Listas para Facturar */}
              <section className="space-y-6 mt-12">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Campañas Completadas</h2>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Listas para Facturar</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
                    <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Total a facturar</p>
                    <p className="text-lg font-black text-emerald-700">${totalAFacturar.toLocaleString()}</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black border border-emerald-100">
                    {campaignsCompletadas.length} {campaignsCompletadas.length === 1 ? 'CAMPAÑA' : 'CAMPAÑAS'}
                  </span>
                </div>

                {campaignsCompletadas.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaignsCompletadas.map(c => {
                      const s = typeStyles[c.type] || typeStyles.email;
                      const fee = Number(c.budget || 0);
                      const platform = Number(c.platformInvestment || 0);
                      const total = fee + platform;
                      return (
                        <div key={c.id} className={`bg-white rounded-2xl p-5 border-2 ${s.border} hover:shadow-lg transition-all relative group`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                            title="Eliminar campaña"
                            className="absolute top-3 right-3 w-8 h-8 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center border border-red-100 hover:border-red-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-2 mb-3 pr-10">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${s.chip}`}>
                              {s.label}
                            </span>
                            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Listo
                            </span>
                          </div>

                          <h4 className="font-black text-slate-800 text-sm uppercase mb-1 leading-tight">{c.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{c.businessUnit} · {c.country}</p>
                          <div className="mb-2">
                            <QuotationBadge
                              validated={!!c.quotationValidated}
                              onToggle={(next) => toggleQuotation(c.id, next)}
                            />
                          </div>
                          {c.completedAt && (
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" /> Completada: {new Date(c.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}

                          <div className={`${s.bg} rounded-xl p-3 ${c.type === 'paid' ? 'grid grid-cols-3' : 'grid grid-cols-1'} gap-2`}>
                            <div className="text-center">
                              <p className={`text-[8px] font-black uppercase tracking-widest ${s.text}`}>{c.type === 'paid' ? 'Fee' : 'Monto'}</p>
                              <p className={`text-sm font-black ${s.text}`}>${fee.toLocaleString()}</p>
                            </div>
                            {c.type === 'paid' && (
                              <>
                                <div className="text-center border-x border-slate-200">
                                  <p className={`text-[8px] font-black uppercase tracking-widest ${s.text}`}>Plataforma</p>
                                  <p className={`text-sm font-black ${s.text}`}>${platform.toLocaleString()}</p>
                                </div>
                                <div className="text-center">
                                  <p className={`text-[8px] font-black uppercase tracking-widest ${s.text}`}>Total</p>
                                  <p className={`text-sm font-black ${s.text}`}>${total.toLocaleString()}</p>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Desglose editable — toggle "Ver/editar desglose".
                              Los pasos son clickeables: si se destilda uno, la campaña
                              baja de 100% y vuelve automáticamente a "Campañas Activas"
                              (el useEffect limpia completedAt y el filtro la reubica). */}
                          {(() => {
                            const isOpen = expandedCampaigns.has(c.id);
                            const stepDefs = CAMPAIGN_STEPS[c.type] || CAMPAIGN_STEPS.email;
                            const completedSet = new Set(c.completedSteps || []);
                            const doneCount = stepDefs.filter(s => completedSet.has(s.id)).length;
                            return (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(c.id); }}
                                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-2 transition-all"
                                >
                                  <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                  {isOpen ? 'Ocultar desglose' : 'Ver / editar desglose'}
                                </button>
                                {isOpen && (
                                  <div className="mt-3 space-y-1 bg-slate-50/60 border border-slate-100 rounded-xl p-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                      Pasos completados ({doneCount}/{stepDefs.length}) · click para editar
                                    </p>
                                    {stepDefs.map((s) => {
                                      const done = completedSet.has(s.id);
                                      return (
                                        <button
                                          key={s.id}
                                          onClick={(e) => { e.stopPropagation(); toggleStep(c, s.id); }}
                                          className="w-full flex items-center gap-2 py-1 text-left hover:bg-white/60 rounded-md px-1 transition-colors"
                                          title={done ? 'Click para destildar (la campaña volverá a Activas)' : 'Click para marcar como hecho'}
                                        >
                                          {done
                                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                                          <span className={`text-[10px] font-bold ${done ? 'text-slate-600' : 'text-slate-400'}`}>{s.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-emerald-50/30 border-2 border-dashed border-emerald-200 rounded-3xl p-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-1">Sin campañas completadas aún</p>
                    <p className="text-[10px] text-emerald-500 font-medium">Las campañas pasarán acá automáticamente al llegar al 100%</p>
                  </div>
                )}
              </section>
            </>
          );
        })()}
      </main>

      {showBudgetModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  newCampData.type === "paid" ? "bg-amber-100" :
                  newCampData.type === "database" ? "bg-emerald-100" :
                  newCampData.type === "research" ? "bg-purple-100" :
                  "bg-blue-100"
                }`}>
                    <Sparkles className={`w-8 h-8 ${
                      newCampData.type === "paid" ? "text-amber-600" :
                      newCampData.type === "database" ? "text-emerald-600" :
                      newCampData.type === "research" ? "text-purple-600" :
                      "text-blue-600"
                    }`} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {!newCampData.type ? "Iniciar Nueva Campaña" :
                   newCampData.type === "paid" ? "Campaña Paid Media" :
                   newCampData.type === "database" ? "Creación de Base de Datos" :
                   newCampData.type === "research" ? "Investigación de Mercado" :
                   "Campaña Email Marketing"}
                </h2>
                <p className="text-slate-400 text-sm font-medium">
                  {!newCampData.type ? "¿Qué tipo de proyecto querés crear?" : "Completa los datos clave"}
                </p>
              </div>

              {/* PASO 1: Selector de tipo */}
              {!newCampData.type && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setNewCampData({...newCampData, type: "email"})}
                    className="group p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xs uppercase mb-1">Email Marketing</h3>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Mailings, secuencias, reportes y hot leads.</p>
                  </button>

                  <button
                    onClick={() => setNewCampData({...newCampData, type: "paid"})}
                    className="group p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                  >
                    <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xs uppercase mb-1">Paid Media</h3>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">LinkedIn, Meta, Google Ads. Posicionamiento o conversión.</p>
                  </button>

                  <button
                    onClick={() => setNewCampData({...newCampData, type: "database"})}
                    className="group p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
                  >
                    <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Database className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xs uppercase mb-1">Creación de BBDD</h3>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Armado de bases de contactos segmentadas.</p>
                  </button>

                  <button
                    onClick={() => setNewCampData({...newCampData, type: "research"})}
                    className="group p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xs uppercase mb-1">Investigación de Mercado</h3>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Estudios, encuestas y análisis de industria.</p>
                  </button>
                </div>
              )}

              {/* PASO 2: Campos comunes + condicionales */}
              {newCampData.type && (
                <>
                  <button
                    onClick={() => setNewCampData({...newCampData, type: ""})}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Cambiar tipo
                  </button>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {newCampData.type === "paid" ? "Título" : "Nombre"}
                       </label>
                       <input 
                          className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none ${
                            newCampData.type === "paid" ? "focus:ring-2 focus:ring-amber-400" :
                            newCampData.type === "database" ? "focus:ring-2 focus:ring-emerald-400" :
                            newCampData.type === "research" ? "focus:ring-2 focus:ring-purple-400" :
                            "focus:ring-2 focus:ring-blue-400"
                          }`}
                          placeholder="Ej: Lanzamiento Producto X"
                          value={newCampData.name}
                          onChange={(e) => setNewCampData({...newCampData, name: e.target.value})}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">País</label>
                          <select 
                            className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none ${
                              newCampData.type === "paid" ? "focus:ring-2 focus:ring-amber-400" :
                              newCampData.type === "database" ? "focus:ring-2 focus:ring-emerald-400" :
                              newCampData.type === "research" ? "focus:ring-2 focus:ring-purple-400" :
                              "focus:ring-2 focus:ring-blue-400"
                            }`}
                            value={newCampData.country}
                            onChange={(e) => setNewCampData({...newCampData, country: e.target.value, unit: ""})}
                          >
                             <option value="">Seleccionar...</option>
                             {Object.keys(MARKETS).sort().map(c => (
                                <option key={c} value={c}>{c}</option>
                             ))}
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {newCampData.type === "database" ? "Organización" : "Unidad"}
                          </label>
                          {newCampData.type === "database" ? (
                            /* Para BBDD: selector CU / PS, disponible para TODOS los países */
                            <select
                              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                              value={newCampData.unit}
                              onChange={(e) => setNewCampData({...newCampData, unit: e.target.value})}
                            >
                              <option value="">Organización...</option>
                              <option value="Control Union">Control Union (CU)</option>
                              <option value="Peterson">Peterson (PS)</option>
                            </select>
                          ) : (
                            <select
                              className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 disabled:opacity-50 outline-none ${
                                newCampData.type === "paid" ? "focus:ring-2 focus:ring-amber-400" :
                                newCampData.type === "research" ? "focus:ring-2 focus:ring-purple-400" :
                                "focus:ring-2 focus:ring-blue-400"
                              }`}
                              value={newCampData.unit}
                              onChange={(e) => setNewCampData({...newCampData, unit: e.target.value})}
                              disabled={!newCampData.country}
                            >
                               <option value="">Unidad...</option>
                               {newCampData.country && MARKETS[newCampData.country].map(u => (
                                  <option key={u} value={u}>{u}</option>
                               ))}
                            </select>
                          )}
                       </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {newCampData.type === "paid" ? "Fee Marcomms (USD)" : "Monto ($)"}
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input 
                              type="number" 
                              min="0"
                              className={`w-full p-4 pl-8 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black transition-all outline-none ${
                                newCampData.type === "paid" ? "focus:border-amber-500" :
                                newCampData.type === "database" ? "focus:border-emerald-500" :
                                newCampData.type === "research" ? "focus:border-purple-500" :
                                "focus:border-blue-500"
                              }`}
                              placeholder="0.00"
                              value={newCampData.budget}
                              onChange={(e) => setNewCampData({...newCampData, budget: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Campos EXCLUSIVOS de Paid Media: Plataformas, Inversión, Duración */}
                    {newCampData.type === "paid" && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plataformas (1 a 3)</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "google",   label: "Google Ads" },
                              { id: "linkedin", label: "LinkedIn" },
                              { id: "meta",     label: "Meta" }
                            ].map(plat => {
                              const isSelected = (newCampData.platforms || []).includes(plat.id);
                              return (
                                <button
                                  key={plat.id}
                                  onClick={() => {
                                    const current = newCampData.platforms || [];
                                    const next = isSelected
                                      ? current.filter(p => p !== plat.id)
                                      : [...current, plat.id];
                                    setNewCampData({ ...newCampData, platforms: next });
                                  }}
                                  className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${isSelected ? "bg-amber-500 border-amber-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-amber-300"}`}
                                >
                                  {plat.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Oficina (USD)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                              <input
                                type="number"
                                min="0"
                                className="w-full p-3 pl-7 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-amber-500 outline-none"
                                placeholder="0.00"
                                value={newCampData.platformInvestment}
                                onChange={(e) => setNewCampData({ ...newCampData, platformInvestment: e.target.value })}
                              />
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium">Lo que invierte la oficina dentro de la plataforma.</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración</label>
                            <input
                              type="text"
                              className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-amber-500 outline-none"
                              placeholder="Ej: 30 días"
                              value={newCampData.duration}
                              onChange={(e) => setNewCampData({ ...newCampData, duration: e.target.value })}
                            />
                            <p className="text-[9px] text-slate-400 font-medium">Cuánto tiempo dura la campaña.</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Objetivo: SOLO Paid Media */}
                    {newCampData.type === "paid" && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setNewCampData({...newCampData, objective: "posicionamiento"})}
                            className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${newCampData.objective === "posicionamiento" ? "bg-amber-500 border-amber-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-amber-300"}`}
                          >
                            Posicionamiento
                          </button>
                          <button
                            onClick={() => setNewCampData({...newCampData, objective: "conversion"})}
                            className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${newCampData.objective === "conversion" ? "bg-amber-500 border-amber-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-amber-300"}`}
                          >
                            Conversión
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Detalle/Brief: Paid, BBDD e Investigación */}
                    {(newCampData.type === "paid" || newCampData.type === "database" || newCampData.type === "research") && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {newCampData.type === "database" ? "Detalle de la BBDD" :
                           newCampData.type === "research" ? "Detalle de la Investigación" :
                           "Detalle / Brief"}
                        </label>
                        <textarea 
                          rows="4"
                          className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm resize-none outline-none ${
                            newCampData.type === "paid" ? "focus:ring-2 focus:ring-amber-400" :
                            newCampData.type === "database" ? "focus:ring-2 focus:ring-emerald-400" :
                            "focus:ring-2 focus:ring-purple-400"
                          }`}
                          placeholder={
                            newCampData.type === "database" ? "Industria, cargos objetivo, geografía, fuentes..." :
                            newCampData.type === "research" ? "Objetivos, metodología, muestra, timing, deliverables..." :
                            "Plataformas, creatividades, segmentación, fechas..."
                          }
                          value={newCampData.detail}
                          onChange={(e) => setNewCampData({...newCampData, detail: e.target.value})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setShowBudgetModal(false)} className="flex-1 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
                    <button 
                      onClick={createCampaign} 
                      disabled={!newCampData.budget || !newCampData.name || !newCampData.unit || !newCampData.country || (newCampData.type === "paid" && (!newCampData.objective || !newCampData.platforms || newCampData.platforms.length === 0))}
                      className={`flex-1 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 transition-all ${
                        newCampData.type === "paid" ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" :
                        newCampData.type === "database" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" :
                        newCampData.type === "research" ? "bg-purple-600 hover:bg-purple-700 shadow-purple-200" :
                        "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                      }`}
                    >
                      Crear
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">¿Eliminar campaña?</h2>
              <p className="text-slate-500 text-sm font-medium">
                Vas a eliminar <span className="font-black text-slate-800">{confirmDelete.name}</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (onCampaignDeleted) onCampaignDeleted(confirmDelete.id);
                    setCampaigns(campaigns.filter(c => c.id !== confirmDelete.id));
                    setConfirmDelete(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView && (() => {
        const camp = campaigns.find(c => c.id === activeView.campaignId);
        if (!camp) return null;
        const idx = activeView.emailIndex;
        const content = (camp.data?.contents || [])[idx] || {};
        const utmKey = `${activeView.campaignId}_${idx}`;
        const utmName = utmCampaignName[utmKey] !== undefined ? utmCampaignName[utmKey] : (camp.data?.tag || "");
        const handleGenerateUtm = () => {
          if (!content.link || !content.link.trim()) return;
          if (!utmName || !utmName.trim()) {
            alert("Necesito una descripción de campaña (utm_campaign) para generar el link. Completá el campo y reintentá.");
            return;
          }
          const newUrl = buildUtmUrl(content.link, "email", utmName);
          updateContent(activeView.campaignId, idx, 'link', newUrl);
        };
        const linkHasUtm = (content.link || "").includes("utm_source=campaign");

        return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <p className="text-[10px] font-black uppercase opacity-70">Configuración de Envío</p>
                <h2 className="text-xl font-black">Email #{idx + 1}</h2>
              </div>
              <button onClick={() => setActiveView(null)} className="p-2 hover:bg-blue-500 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Fecha de Envío
                  </label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-400 outline-none" value={camp?.data.dates[idx] || ""} onChange={(e) => updateData(activeView.campaignId, 'dates', e.target.value, idx)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Asunto
                  </label>
                  <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Ej: ¡No te pierdas esta oferta!" value={content.subject || ""} onChange={(e) => updateContent(activeView.campaignId, idx, 'subject', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <AlignLeft className="w-3 h-3" /> Mensaje
                  </label>
                  <textarea rows="3" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Escribe el cuerpo del mensaje..." value={content.message || ""} onChange={(e) => updateContent(activeView.campaignId, idx, 'message', e.target.value)} />
                </div>

                {/* BANNER */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Upload className="w-3 h-3" /> Banner (URL de imagen)
                  </label>
                  <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="https://cdn.../banner.jpg" value={content.banner || ""} onChange={(e) => updateContent(activeView.campaignId, idx, 'banner', e.target.value)} />
                  {content.banner && content.banner.trim() !== "" && (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <img src={content.banner} alt="banner preview" className="w-full max-h-40 object-contain rounded-lg" onError={(e) => { e.target.style.display='none'; }} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MousePointer2 className="w-3 h-3" /> Texto CTA</label>
                    <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Ej: Comprar" value={content.cta || ""} onChange={(e) => updateContent(activeView.campaignId, idx, 'cta', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ExternalLink className="w-3 h-3" /> Link CTA</label>
                    <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="https://..." value={content.link || ""} onChange={(e) => updateContent(activeView.campaignId, idx, 'link', e.target.value)} />
                  </div>
                </div>

                {/* GENERADOR DE UTM */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" /> Generador de UTM
                    </p>
                    {linkHasUtm && (
                      <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100">UTM aplicado</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <p className="font-black text-slate-400 uppercase tracking-widest mb-0.5">utm_source</p>
                      <p className="font-bold text-slate-700">campaign</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <p className="font-black text-slate-400 uppercase tracking-widest mb-0.5">utm_medium</p>
                      <p className="font-bold text-blue-600">email</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <p className="font-black text-slate-400 uppercase tracking-widest mb-0.5">utm_campaign</p>
                      <p className="font-bold text-slate-700 truncate">{(utmName || "—").replace(/\s+/g, '_').toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Descripción de campaña (utm_campaign)</label>
                    <input
                      type="text"
                      placeholder="Ej: newsletter_abril"
                      value={utmName}
                      onChange={(e) => setUtmCampaignName({ ...utmCampaignName, [utmKey]: e.target.value })}
                      className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleGenerateUtm}
                    disabled={!content.link || !content.link.trim() || !utmName || !utmName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Aplicar UTM al Link
                  </button>
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                    El link se reescribe agregando los parámetros UTM. Si ya tenía UTMs los reemplaza, si no, los agrega correctamente.
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveView(null)} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Guardar Configuración</button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

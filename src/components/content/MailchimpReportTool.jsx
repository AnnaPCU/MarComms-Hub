// ════════════════════════════════════════════════════════════════════
// MailchimpReportTool — Análisis avanzado de campañas de email
// ════════════════════════════════════════════════════════════════════
// Componente importado del usuario (reporte-email-marketing.jsx).
// Renombres aplicados para evitar colisiones con otros módulos:
//   COLORS → MAILCHIMP_COLORS
//   EMAIL_COLORS → MAILCHIMP_EMAIL_COLORS
//   EMAIL_LABELS → MAILCHIMP_EMAIL_LABELS
//   helpers mc* (parsePercentage, safeInt, etc.)
//
// IA con Claude API: via /api/anthropic (proxy serverless en Vercel).
// ⚠️ NO funciona en producción (CORS + API key exposure).
// Ver BACKEND_PLAN.md "Edge functions" para solución con Supabase.
// ════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import {
  MailOpen, MousePointerClick, AlertTriangle, UserMinus, Flame,
  Upload, Link, Download, ExternalLink, Send, CheckCircle2,
  TrendingUp, FileSpreadsheet, Clock, BookOpen, Target, Users,
  ChevronLeft, ChevronRight, Filter, Globe2, Building2, FileText,
  Loader2, Sparkles, BarChart3, Mail, ChevronDown, ChevronUp,
  Zap, ArrowRight, X, File, PieChart,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart as RechartsPie, Pie, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { MAILCHIMP_COLORS, MAILCHIMP_EMAIL_COLORS, MAILCHIMP_EMAIL_LABELS } from '@/constants/pdf';

/* ─── HELPERS ─── */
function mcParsePercentage(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace('%', '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcSafeInt(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

function mcExtractMetricsFromText(text) {
  const t = text.toLowerCase();
  const metrics = {};

  // Recipients / sent
  let m = t.match(/(?:recipients?|destinatarios?|enviados?|sent)[:\s]*([0-9,.]+)/i);
  if (m) metrics.totalRecipients = mcSafeInt(m[1].replace(/[,.]/g, ''));

  m = t.match(/(?:successful\s*deliver|entregas?\s*exitosas?|delivered)[:\s]*([0-9,.]+)/i);
  if (m) metrics.successfulDeliveries = mcSafeInt(m[1].replace(/[,.]/g, ''));

  m = t.match(/(?:open\s*rate|tasa\s*de\s*apertura)[:\s]*([0-9,.]+%?)/i);
  if (m) metrics.openRate = m[1].includes('%') ? m[1] : m[1] + '%';

  m = t.match(/(?:click\s*rate|tasa\s*de\s*clic)[:\s]*([0-9,.]+%?)/i);
  if (m) metrics.clickRate = m[1].includes('%') ? m[1] : m[1] + '%';

  m = t.match(/(?:bounce\s*rate|tasa\s*de\s*rebote)[:\s]*([0-9,.]+%?)/i);
  if (m) metrics.bounceRate = m[1].includes('%') ? m[1] : m[1] + '%';

  m = t.match(/(?:unsub|cancelaci|desuscri)[a-z]*[:\s]*([0-9,.]+%?)/i);
  if (m) metrics.unsubRate = m[1].includes('%') ? m[1] : m[1] + '%';

  m = t.match(/(?:opens?|aperturas?)[:\s]*([0-9,.]+)(?!\s*%)/i);
  if (m && !metrics.opensCount) metrics.opensCount = mcSafeInt(m[1].replace(/[,.]/g, ''));

  m = t.match(/(?:clicks?|clics?)[:\s]*([0-9,.]+)(?!\s*%)/i);
  if (m && !metrics.clicksCount) metrics.clicksCount = mcSafeInt(m[1].replace(/[,.]/g, ''));

  m = t.match(/(?:bounces?|rebotes?)[:\s]*([0-9,.]+)(?!\s*%)/i);
  if (m) metrics.bouncesCount = mcSafeInt(m[1].replace(/[,.]/g, ''));

  m = t.match(/(?:subject|asunto)[:\s]*[""]?(.+?)[""]?\s*(?:\n|$)/i);
  if (m) metrics.subject = m[1].trim();

  m = t.match(/(?:campaign|campaña|nombre)[:\s]*[""]?(.+?)[""]?\s*(?:\n|$)/i);
  if (m) metrics.campaignName = m[1].trim();

  m = t.match(/(?:sent\s*date|fecha\s*de\s*envío|date)[:\s]*(.+?)(?:\n|$)/i);
  if (m) metrics.sentDate = m[1].trim();

  return metrics;
}

function mcParseCSVorExcel(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(data);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    }
  });
}

function mcExtractLeadsFromRows(rows) {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());
  const emailKey = Object.keys(rows[0]).find(k => k.toLowerCase().includes('email'));
  const clicksKey = Object.keys(rows[0]).find(k => {
    const l = k.toLowerCase();
    return l === 'clicks' || l.includes('clic') || l === 'total clicks';
  });
  const opensKey = Object.keys(rows[0]).find(k => {
    const l = k.toLowerCase();
    return l === 'opens' || l.includes('apertura') || l === 'total opens';
  });
  const companyKey = Object.keys(rows[0]).find(k => {
    const l = k.toLowerCase();
    return l.includes('company') || l.includes('empresa') || l.includes('organization');
  });
  const firstNameKey = Object.keys(rows[0]).find(k => {
    const l = k.toLowerCase();
    return l.includes('first') || l.includes('nombre');
  });
  const lastNameKey = Object.keys(rows[0]).find(k => {
    const l = k.toLowerCase();
    return l.includes('last') || l.includes('apellido');
  });

  if (!emailKey) return [];

  return rows
    .filter(r => r[emailKey] && r[emailKey].includes('@'))
    .map(r => ({
      email: r[emailKey].trim(),
      clicks: mcSafeInt(r[clicksKey]),
      opens: mcSafeInt(r[opensKey]),
      company: r[companyKey] || r[emailKey].split('@')[1]?.split('.')[0] || 'Desconocido',
      firstName: r[firstNameKey] || '',
      lastName: r[lastNameKey] || '',
    }));
}

function mcReadPDFasText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = btoa(
        new Uint8Array(e.target.result).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      resolve(base64);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

/* ─── MAIN COMPONENT ─── */
export default function MailchimpReportTool() {
  const [emails, setEmails] = useState([
    { id: 1, label: 'Email 1', pdf: null, csv: null, pdfName: '', csvName: '', metrics: null, leads: [], analyzing: false, analyzed: false },
    { id: 2, label: 'Email 2', pdf: null, csv: null, pdfName: '', csvName: '', metrics: null, leads: [], analyzing: false, analyzed: false },
    { id: 3, label: 'Email 3', pdf: null, csv: null, pdfName: '', csvName: '', metrics: null, leads: [], analyzing: false, analyzed: false },
  ]);
  const [campaignInsights, setCampaignInsights] = useState(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [activeEmailTab, setActiveEmailTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState({ funnel: true, leads: true, insights: true });
  const [currentPage, setCurrentPage] = useState(1);
  const LEADS_PER_PAGE = 8;
  const fileInputRefs = useRef({});

  const hasAnyData = emails.some(e => e.analyzed);

  const handleFileSelect = useCallback((emailIdx, type, file) => {
    if (!file) return;
    setEmails(prev => {
      const next = [...prev];
      if (type === 'pdf') {
        next[emailIdx] = { ...next[emailIdx], pdf: file, pdfName: file.name };
      } else {
        next[emailIdx] = { ...next[emailIdx], csv: file, csvName: file.name };
      }
      return next;
    });
  }, []);

  const removeFile = useCallback((emailIdx, type) => {
    setEmails(prev => {
      const next = [...prev];
      if (type === 'pdf') {
        next[emailIdx] = { ...next[emailIdx], pdf: null, pdfName: '', metrics: null, analyzed: false };
      } else {
        next[emailIdx] = { ...next[emailIdx], csv: null, csvName: '', leads: [], analyzed: false };
      }
      return next;
    });
  }, []);

  const analyzeEmail = useCallback(async (emailIdx) => {
    const email = emails[emailIdx];
    if (!email.pdf && !email.csv) return;

    setEmails(prev => {
      const next = [...prev];
      next[emailIdx] = { ...next[emailIdx], analyzing: true };
      return next;
    });

    let metrics = {};
    let leads = [];

    // Parse CSV/Excel
    if (email.csv) {
      try {
        const rows = await mcParseCSVorExcel(email.csv);
        leads = mcExtractLeadsFromRows(rows);
      } catch (e) {
        console.error('CSV parse error:', e);
      }
    }

    // Analyze PDF with Claude API
    if (email.pdf) {
      try {
        const base64 = await mcReadPDFasText(email.pdf);
        if (base64) {
          const response = await fetch('/api/anthropic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              max_tokens: 1000,
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                  },
                  {
                    type: 'text',
                    text: `Analiza este reporte de campaña de email marketing y extrae TODOS los datos en formato JSON puro (sin markdown, sin backticks). Campos requeridos:
{
  "campaignName": "nombre de la campaña",
  "subject": "asunto del email",
  "sentDate": "fecha de envío",
  "totalRecipients": número,
  "successfulDeliveries": número,
  "deliveryRate": "porcentaje",
  "openRate": "porcentaje",
  "opensCount": número,
  "clickRate": "porcentaje",
  "clicksCount": número,
  "bounceRate": "porcentaje",
  "bouncesCount": número,
  "unsubRate": "porcentaje",
  "unsubsCount": número,
  "ctor": "porcentaje click-to-open si está disponible",
  "topLinks": [{"url": "url", "label": "descripción", "clicks": número, "uniqueClicks": número}],
  "geoData": [{"country": "país", "opens": número, "percent": "porcentaje"}],
  "hourlyData": [{"time": "hora", "clicks": número}],
  "clientName": "nombre del cliente si aparece"
}
Devuelve SOLO el JSON, nada más.`
                  }
                ]
              }]
            })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || `Error ${response.status} del proxy de IA`);
          const text = data.content?.map(c => c.text || '').join('') || '';
          try {
            const clean = text.replace(/```json|```/g, '').trim();
            metrics = JSON.parse(clean);
          } catch {
            metrics = mcExtractMetricsFromText(text);
          }
        }
      } catch (e) {
        console.error('PDF analysis error:', e);
      }
    }

    // If no PDF metrics, try to derive from CSV
    if (!metrics.totalRecipients && leads.length > 0) {
      const totalClicks = leads.reduce((s, l) => s + l.clicks, 0);
      const totalOpens = leads.reduce((s, l) => s + l.opens, 0);
      metrics.totalRecipients = leads.length;
      metrics.opensCount = totalOpens;
      metrics.clicksCount = totalClicks;
      metrics.openRate = ((totalOpens / leads.length) * 100).toFixed(1) + '%';
      metrics.clickRate = ((totalClicks / leads.length) * 100).toFixed(1) + '%';
    }

    setEmails(prev => {
      const next = [...prev];
      next[emailIdx] = { ...next[emailIdx], metrics, leads, analyzing: false, analyzed: true };
      return next;
    });
  }, [emails]);

  const analyzeAllEmails = useCallback(async () => {
    setAnalyzingAll(true);
    setCampaignInsights(null);

    const toAnalyze = emails.map((e, i) => ({ idx: i, has: !!(e.pdf || e.csv) && !e.analyzed }));
    for (const item of toAnalyze) {
      if (item.has) await analyzeEmail(item.idx);
    }

    // Generate campaign-level insights with Claude
    const analyzedEmails = emails.filter(e => e.analyzed || e.pdf || e.csv);
    if (analyzedEmails.length > 0) {
      try {
        const summaryData = emails.filter(e => e.metrics && Object.keys(e.metrics).length > 0).map((e, i) => ({
          email: `Email ${i + 1}`,
          ...e.metrics,
          leadsCount: e.leads.length,
          hotLeads: e.leads.filter(l => l.clicks > 0).length,
        }));

        if (summaryData.length > 0) {
          const resp = await fetch('/api/anthropic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              max_tokens: 1000,
              messages: [{
                role: 'user',
                content: `Eres un experto en email marketing B2B. Analiza los datos de esta secuencia de ${summaryData.length} emails y genera insights accionables en JSON puro (sin markdown, sin backticks):

Datos: ${JSON.stringify(summaryData)}

Responde SOLO con este JSON:
{
  "overallVerdict": "una frase corta del rendimiento general",
  "deliveryHealth": "análisis de la entregabilidad y salud de la base de datos",
  "engagementTrend": "tendencia de engagement a lo largo de la secuencia",
  "bestPerformer": "cuál email tuvo mejor rendimiento y por qué",
  "actionItems": ["acción 1", "acción 2", "acción 3"],
  "salesRecommendation": "recomendación concreta para el equipo de ventas"
}`
              }]
            })
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || `Error ${resp.status} del proxy de IA`);
          const text = data.content?.map(c => c.text || '').join('') || '';
          try {
            const clean = text.replace(/```json|```/g, '').trim();
            setCampaignInsights(JSON.parse(clean));
          } catch {
            setCampaignInsights({ overallVerdict: 'Análisis completado. Revisa las métricas individuales por email.', actionItems: [] });
          }
        }
      } catch (e) {
        console.error('Insights error:', e);
      }
    }

    setAnalyzingAll(false);
  }, [emails, analyzeEmail]);

  // Aggregated data
  const allLeads = useMemo(() => {
    const map = {};
    emails.forEach((email, eIdx) => {
      email.leads.forEach(lead => {
        if (!map[lead.email]) {
          map[lead.email] = { ...lead, campaigns: 0, emailAppearances: [] };
        }
        map[lead.email].clicks += lead.clicks;
        map[lead.email].opens += lead.opens;
        map[lead.email].campaigns += 1;
        map[lead.email].emailAppearances.push(eIdx + 1);
      });
    });
    return Object.values(map).sort((a, b) => b.clicks - a.clicks || b.opens - a.opens);
  }, [emails]);

  const hotLeads = useMemo(() => allLeads.filter(l => l.clicks > 0), [allLeads]);
  const totalPages = Math.max(1, Math.ceil(hotLeads.length / LEADS_PER_PAGE));
  const currentLeads = hotLeads.slice((currentPage - 1) * LEADS_PER_PAGE, currentPage * LEADS_PER_PAGE);

  const aggregatedMetrics = useMemo(() => {
    const analyzed = emails.filter(e => e.metrics && Object.keys(e.metrics).length > 0);
    if (analyzed.length === 0) return null;
    const totalSent = analyzed.reduce((s, e) => s + (e.metrics.totalRecipients || 0), 0);
    const totalDelivered = analyzed.reduce((s, e) => s + (e.metrics.successfulDeliveries || 0), 0);
    const totalOpens = analyzed.reduce((s, e) => s + (e.metrics.opensCount || 0), 0);
    const totalClicks = analyzed.reduce((s, e) => s + (e.metrics.clicksCount || 0), 0);
    const totalBounces = analyzed.reduce((s, e) => s + (e.metrics.bouncesCount || 0), 0);
    const totalUnsubs = analyzed.reduce((s, e) => s + (e.metrics.unsubsCount || 0), 0);
    return { totalSent, totalDelivered, totalOpens, totalClicks, totalBounces, totalUnsubs, emailCount: analyzed.length };
  }, [emails]);

  const comparisonData = useMemo(() => {
    return emails
      .filter(e => e.metrics && Object.keys(e.metrics).length > 0)
      .map((e, i) => ({
        name: e.metrics.campaignName?.substring(0, 20) || `Email ${i + 1}`,
        aperturas: mcParsePercentage(e.metrics.openRate),
        clics: mcParsePercentage(e.metrics.clickRate),
        rebotes: mcParsePercentage(e.metrics.bounceRate),
        fill: MAILCHIMP_EMAIL_COLORS[i],
      }));
  }, [emails]);

  /* ─── DOWNLOAD: Leads as XLSX or CSV ─── */
  const downloadLeads = useCallback((format = 'xlsx') => {
    const rows = allLeads.map(l => ({
      'Email': l.email,
      'Nombre': `${l.firstName || ''} ${l.lastName || ''}`.trim() || '-',
      'Empresa': l.company,
      'Clics Totales': l.clicks,
      'Aperturas Totales': l.opens,
      'Nº Campañas': l.campaigns || 1,
      'Apareció en Emails': l.emailAppearances?.join(', ') || '-',
      'Prioridad': l.clicks >= 3 ? 'Crítica' : l.clicks >= 2 ? 'Alta' : l.clicks >= 1 ? 'Media' : 'Baja',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 },{ wch: 22 },{ wch: 22 },{ wch: 14 },{ wch: 16 },{ wch: 13 },{ wch: 20 },{ wch: 12 }];

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Leads_Campaña_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hot Leads');
      XLSX.writeFile(wb, `Leads_Campaña_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  }, [allLeads]);

  /* ─── DOWNLOAD: Full KPI Report as multi-sheet XLSX ─── */
  const downloadFullReport = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().split('T')[0];

    // ── Sheet 1: Resumen Ejecutivo ──
    const resumenRows = [];
    resumenRows.push(['RESUMEN EJECUTIVO DE CAMPAÑA', '', '']);
    resumenRows.push(['Fecha del reporte', today, '']);
    resumenRows.push(['', '', '']);

    if (aggregatedMetrics) {
      resumenRows.push(['── KPIs Consolidados ──', '', '']);
      resumenRows.push(['Total Emails Enviados', aggregatedMetrics.totalSent, `En ${aggregatedMetrics.emailCount} emails de la secuencia`]);
      resumenRows.push(['Entregas Exitosas', aggregatedMetrics.totalDelivered, aggregatedMetrics.totalSent > 0 ? `${((aggregatedMetrics.totalDelivered / aggregatedMetrics.totalSent) * 100).toFixed(1)}% delivery rate` : '']);
      resumenRows.push(['Total Aperturas', aggregatedMetrics.totalOpens, aggregatedMetrics.totalDelivered > 0 ? `${((aggregatedMetrics.totalOpens / aggregatedMetrics.totalDelivered) * 100).toFixed(1)}% open rate consolidado` : '']);
      resumenRows.push(['Total Clics', aggregatedMetrics.totalClicks, aggregatedMetrics.totalOpens > 0 ? `${((aggregatedMetrics.totalClicks / aggregatedMetrics.totalOpens) * 100).toFixed(1)}% CTOR consolidado` : '']);
      resumenRows.push(['Total Rebotes', aggregatedMetrics.totalBounces, aggregatedMetrics.totalSent > 0 ? `${((aggregatedMetrics.totalBounces / aggregatedMetrics.totalSent) * 100).toFixed(1)}% bounce rate` : '']);
      resumenRows.push(['Total Cancelaciones', aggregatedMetrics.totalUnsubs, '']);
      resumenRows.push(['Hot Leads Detectados', hotLeads.length, `De ${allLeads.length} contactos con actividad`]);
      resumenRows.push(['', '', '']);
    }

    if (campaignInsights) {
      resumenRows.push(['── Insights Generados por IA ──', '', '']);
      if (campaignInsights.overallVerdict) resumenRows.push(['Veredicto General', campaignInsights.overallVerdict, '']);
      if (campaignInsights.deliveryHealth) resumenRows.push(['Salud de Entregabilidad', campaignInsights.deliveryHealth, '']);
      if (campaignInsights.engagementTrend) resumenRows.push(['Tendencia de Engagement', campaignInsights.engagementTrend, '']);
      if (campaignInsights.bestPerformer) resumenRows.push(['Mejor Email', campaignInsights.bestPerformer, '']);
      if (campaignInsights.salesRecommendation) resumenRows.push(['Recomendación de Ventas', campaignInsights.salesRecommendation, '']);
      resumenRows.push(['', '', '']);
      if (campaignInsights.actionItems?.length > 0) {
        resumenRows.push(['── Plan de Acción ──', '', '']);
        campaignInsights.actionItems.forEach((item, i) => {
          resumenRows.push([`Acción ${i + 1}`, item, '']);
        });
        resumenRows.push(['', '', '']);
      }
    }

    const wsResumen = XLSX.utils.aoa_to_sheet([['Sección', 'Valor', 'Detalle'], ...resumenRows]);
    wsResumen['!cols'] = [{ wch: 30 }, { wch: 65 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');

    // ── Sheet 2: Detalle por Email ──
    const detalleRows = [['Métrica', 'Valor', 'Porcentaje']];
    emails.filter(e => e.analyzed && e.metrics).forEach((em, i) => {
      const m = em.metrics;
      detalleRows.push([`═══ ${m.campaignName || `Email ${i + 1}`} ═══`, '', '']);
      if (m.subject) detalleRows.push(['Asunto', m.subject, '']);
      if (m.sentDate) detalleRows.push(['Fecha de Envío', m.sentDate, '']);
      if (m.clientName) detalleRows.push(['Cliente', m.clientName, '']);
      detalleRows.push(['Destinatarios', m.totalRecipients || 0, '100%']);
      detalleRows.push(['Entregas Exitosas', m.successfulDeliveries || 0, m.deliveryRate || '']);
      detalleRows.push(['Aperturas', m.opensCount || 0, m.openRate || '']);
      detalleRows.push(['Clics', m.clicksCount || 0, m.clickRate || '']);
      detalleRows.push(['CTOR', '', m.ctor || '']);
      detalleRows.push(['Rebotes', m.bouncesCount || 0, m.bounceRate || '']);
      detalleRows.push(['Cancelaciones', m.unsubsCount || 0, m.unsubRate || '']);
      if (m.topLinks?.length > 0) {
        detalleRows.push(['', '', '']);
        detalleRows.push(['── Enlaces más clickeados ──', 'Clics', 'Únicos']);
        m.topLinks.forEach(link => detalleRows.push([link.label || link.url, link.clicks || 0, link.uniqueClicks ?? '']));
      }
      if (m.geoData?.length > 0) {
        detalleRows.push(['', '', '']);
        detalleRows.push(['── Distribución Geográfica ──', 'Aperturas', '%']);
        m.geoData.forEach(geo => detalleRows.push([geo.country, geo.opens, geo.percent || '']));
      }
      detalleRows.push(['', '', '']);
    });
    if (detalleRows.length > 1) {
      const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows);
      wsDetalle['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle por Email');
    }

    // ── Sheet 3: Comparativa ──
    if (comparisonData.length > 1) {
      const compRows = [['Email', 'Tasa Apertura (%)', 'Tasa Clics (%)', 'Tasa Rebotes (%)']];
      comparisonData.forEach(d => compRows.push([d.name, d.aperturas, d.clics, d.rebotes]));
      const wsComp = XLSX.utils.aoa_to_sheet(compRows);
      wsComp['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsComp, 'Comparativa');
    }

    // ── Sheet 4: Hot Leads ──
    if (allLeads.length > 0) {
      const leadsRows = [['Email', 'Nombre', 'Empresa', 'Clics', 'Aperturas', 'Nº Campañas', 'En Emails', 'Prioridad']];
      allLeads.forEach(l => leadsRows.push([
        l.email, `${l.firstName || ''} ${l.lastName || ''}`.trim() || '-', l.company,
        l.clicks, l.opens, l.campaigns || 1, l.emailAppearances?.join(', ') || '-',
        l.clicks >= 3 ? 'Crítica' : l.clicks >= 2 ? 'Alta' : l.clicks >= 1 ? 'Media' : 'Baja',
      ]));
      const wsLeads = XLSX.utils.aoa_to_sheet(leadsRows);
      wsLeads['!cols'] = [{ wch: 35 },{ wch: 22 },{ wch: 22 },{ wch: 10 },{ wch: 12 },{ wch: 13 },{ wch: 16 },{ wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsLeads, 'Hot Leads');
    }

    XLSX.writeFile(wb, `Reporte_Campaña_Completo_${today}.xlsx`);
  }, [emails, aggregatedMetrics, campaignInsights, hotLeads, allLeads, comparisonData]);

  const [showLeadsMenu, setShowLeadsMenu] = useState(false);

  const toggleSection = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const canAnalyze = emails.some(e => (e.pdf || e.csv) && !e.analyzed);

  return (
    <div className="min-h-screen font-sans text-slate-800" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e8eef6 50%, #f1f5f9 100%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;600&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        .pulse-ring::before { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid currentColor; animation: pulse-ring 1.5s ease-out infinite; }
        .upload-zone { border: 2px dashed #cbd5e1; transition: all 0.2s; }
        .upload-zone:hover { border-color: #2563eb; background: #eff6ff; }
        .upload-zone.has-file { border-color: #059669; border-style: solid; background: #f0fdf4; }
        .glass { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* ── HEADER ── */}
        <header className="glass rounded-2xl shadow-lg border border-white/50 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${MAILCHIMP_EMAIL_COLORS[0]}, ${MAILCHIMP_EMAIL_COLORS[1]}, ${MAILCHIMP_EMAIL_COLORS[2]})` }} />
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                REPORTE DE SECUENCIA DE EMAILS
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                Análisis de Campaña
              </h1>
              <p className="text-slate-500 text-sm">
                Carga el PDF de reporte y el CSV/Excel de contactos por cada email de la secuencia.
                La IA analizará los datos y generará insights accionables.
              </p>
            </div>
            {hasAnyData && aggregatedMetrics && (
              <div className="flex gap-3 flex-wrap">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-blue-700 mono">{aggregatedMetrics.totalSent.toLocaleString()}</div>
                  <div className="text-xs text-blue-500 font-medium">Total Enviados</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-emerald-700 mono">{aggregatedMetrics.totalDelivered.toLocaleString()}</div>
                  <div className="text-xs text-emerald-500 font-medium">Entregados</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-amber-700 mono">{aggregatedMetrics.emailCount}</div>
                  <div className="text-xs text-amber-500 font-medium">Emails Analizados</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── UPLOAD ZONE ── */}
        <div className="glass rounded-2xl shadow-lg border border-white/50 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Cargar Archivos de la Secuencia
            </h2>
            <button
              onClick={analyzeAllEmails}
              disabled={!canAnalyze && !emails.some(e => e.pdf || e.csv) || analyzingAll}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: analyzingAll ? '#94a3b8' : `linear-gradient(135deg, ${MAILCHIMP_COLORS.primary}, ${MAILCHIMP_COLORS.primaryDark})`,
                color: 'white',
              }}
            >
              {analyzingAll ? (
                <><Loader2 size={18} className="animate-spin" /> Analizando...</>
              ) : (
                <><Sparkles size={18} /> Analizar con IA</>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emails.map((email, idx) => (
              <div key={email.id} className="rounded-xl border-2 border-slate-100 bg-white/60 p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: MAILCHIMP_EMAIL_COLORS[idx] }} />
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Mail size={16} style={{ color: MAILCHIMP_EMAIL_COLORS[idx] }} />
                    {email.label}
                  </h3>
                  {email.analyzed && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> Listo
                    </span>
                  )}
                  {email.analyzing && (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Loader2 size={12} className="animate-spin" /> Analizando
                    </span>
                  )}
                </div>

                {/* PDF upload */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Reporte PDF</label>
                  {email.pdfName ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                      <FileText size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate flex-1 text-emerald-800 text-xs font-medium">{email.pdfName}</span>
                      <button onClick={() => removeFile(idx, 'pdf')} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="upload-zone rounded-lg px-3 py-3 text-center cursor-pointer relative">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileSelect(idx, 'pdf', e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileText size={20} className="mx-auto text-slate-400 mb-1" />
                      <span className="text-xs text-slate-400">Arrastra o haz clic</span>
                    </div>
                  )}
                </div>

                {/* CSV/Excel upload */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Datos CSV / Excel</label>
                  {email.csvName ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                      <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate flex-1 text-emerald-800 text-xs font-medium">{email.csvName}</span>
                      <button onClick={() => removeFile(idx, 'csv')} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="upload-zone rounded-lg px-3 py-3 text-center cursor-pointer relative">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => handleFileSelect(idx, 'csv', e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileSpreadsheet size={20} className="mx-auto text-slate-400 mb-1" />
                      <span className="text-xs text-slate-400">CSV, XLSX o XLS</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RESULTS (only shown after analysis) ── */}
        {hasAnyData && (
          <div className="space-y-6 fade-in">

            {/* ── DOWNLOAD ACTION BAR ── */}
            <div className="glass rounded-2xl shadow-lg border border-white/50 p-4 md:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                    <Download size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Descargar Reportes</h3>
                    <p className="text-xs text-slate-500">Exporta el análisis completo o solo los leads</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {/* Full Report Button */}
                  <button
                    onClick={downloadFullReport}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all shadow-md hover:shadow-lg active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}
                  >
                    <FileText size={16} />
                    Reporte Completo (.xlsx)
                  </button>

                  {/* Leads dropdown */}
                  <div className="relative flex-1 sm:flex-none">
                    <button
                      onClick={() => setShowLeadsMenu(p => !p)}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
                    >
                      <Users size={16} className="text-emerald-600" />
                      Leads
                      <ChevronDown size={14} className={`transition-transform ${showLeadsMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showLeadsMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 min-w-[180px] fade-in">
                        <button
                          onClick={() => { downloadLeads('xlsx'); setShowLeadsMenu(false); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                        >
                          <FileSpreadsheet size={15} className="text-emerald-600" />
                          Descargar como .xlsx
                        </button>
                        <button
                          onClick={() => { downloadLeads('csv'); setShowLeadsMenu(false); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                        >
                          <FileText size={15} className="text-blue-600" />
                          Descargar como .csv
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content summary pills */}
              {aggregatedMetrics && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">Resumen Ejecutivo + KPIs</span>
                  <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">Detalle por Email</span>
                  {comparisonData.length > 1 && <span className="text-[10px] font-medium bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">Comparativa</span>}
                  {campaignInsights && <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">Insights IA</span>}
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">{allLeads.length} Leads</span>
                </div>
              )}
            </div>
            <div className="glass rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <div className="flex border-b border-slate-200">
                {emails.filter(e => e.analyzed).map((email, i) => {
                  const realIdx = emails.indexOf(email);
                  return (
                    <button
                      key={email.id}
                      onClick={() => setActiveEmailTab(realIdx)}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition-all relative ${activeEmailTab === realIdx ? 'text-slate-900 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Mail size={14} style={{ color: MAILCHIMP_EMAIL_COLORS[realIdx] }} />
                        {email.metrics?.campaignName?.substring(0, 30) || email.label}
                      </span>
                      {activeEmailTab === realIdx && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ background: MAILCHIMP_EMAIL_COLORS[realIdx] }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {emails[activeEmailTab]?.analyzed && emails[activeEmailTab]?.metrics && (() => {
                const em = emails[activeEmailTab];
                const m = em.metrics;
                const color = MAILCHIMP_EMAIL_COLORS[activeEmailTab];

                const metricsCards = [
                  { label: 'Tasa de Apertura', rate: m.openRate || '-', count: m.opensCount || 0, icon: MailOpen, desc: 'aperturas', bg: 'bg-blue-50', tc: 'text-blue-600', border: 'border-blue-100' },
                  { label: 'Tasa de Clics', rate: m.clickRate || '-', count: m.clicksCount || 0, icon: MousePointerClick, desc: 'clics', bg: 'bg-indigo-50', tc: 'text-indigo-600', border: 'border-indigo-100' },
                  { label: 'Tasa de Rebote', rate: m.bounceRate || '-', count: m.bouncesCount || 0, icon: AlertTriangle, desc: 'rebotes', bg: 'bg-orange-50', tc: 'text-orange-600', border: 'border-orange-100' },
                  { label: 'Cancelaciones', rate: m.unsubRate || '-', count: m.unsubsCount || 0, icon: UserMinus, desc: 'desuscripciones', bg: 'bg-slate-50', tc: 'text-slate-600', border: 'border-slate-200' },
                ];

                return (
                  <div className="p-6 space-y-6">
                    {/* Email info header */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{m.campaignName || em.label}</h3>
                        {m.subject && <p className="text-sm text-slate-500 mt-1">Asunto: <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{m.subject}</span></p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                          {m.sentDate && <span className="flex items-center gap-1"><Clock size={12} /> {m.sentDate}</span>}
                          {m.totalRecipients > 0 && <span className="flex items-center gap-1"><Users size={12} /> {m.totalRecipients.toLocaleString()} destinatarios</span>}
                          {m.successfulDeliveries > 0 && (
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle2 size={12} /> {m.successfulDeliveries.toLocaleString()} entregados ({m.deliveryRate})
                            </span>
                          )}
                        </div>
                      </div>
                      {m.clientName && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Building2 size={14} /> <span className="font-semibold text-slate-700">{m.clientName}</span>
                        </div>
                      )}
                    </div>

                    {/* 4 metric cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {metricsCards.map((mc, i) => (
                        <div key={i} className={`rounded-xl border ${mc.border} ${mc.bg} p-4 transition-all hover:shadow-md`}>
                          <div className="flex items-center justify-between mb-2">
                            <mc.icon className={`w-5 h-5 ${mc.tc}`} />
                            <span className="text-xl font-bold text-slate-900 mono">{mc.rate}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium">{mc.label}</div>
                          <div className="text-sm text-slate-700 mt-0.5"><strong className="mono">{typeof mc.count === 'number' ? mc.count.toLocaleString() : mc.count}</strong> {mc.desc}</div>
                        </div>
                      ))}
                    </div>

                    {/* Funnel */}
                    {m.totalRecipients > 0 && (
                      <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-5">
                        <h4 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
                          <Filter size={14} className="text-blue-500" /> Embudo de Conversión
                        </h4>
                        <div className="space-y-2">
                          {[
                            { label: 'Enviados', val: m.totalRecipients, pct: '100%', c: 'bg-slate-200' },
                            { label: 'Entregados', val: m.successfulDeliveries || m.totalRecipients, pct: m.deliveryRate || '~100%', c: 'bg-emerald-400' },
                            { label: 'Abiertos', val: m.opensCount || 0, pct: m.openRate || '0%', c: 'bg-blue-500' },
                            { label: 'Clics', val: m.clicksCount || 0, pct: m.clickRate || '0%', c: 'bg-indigo-600' },
                          ].map((step, si) => (
                            <div key={si} className="flex items-center gap-3">
                              <span className="text-xs font-medium text-slate-600 w-20 text-right">{step.label}</span>
                              <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                                <div className={`${step.c} h-full rounded-full transition-all duration-700`} style={{ width: si === 0 ? '100%' : `${Math.max(2, (step.val / m.totalRecipients) * 100)}%` }} />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 mono">
                                  {typeof step.val === 'number' ? step.val.toLocaleString() : step.val} ({step.pct})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Links */}
                    {m.topLinks && m.topLinks.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-100 p-5">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                          <Link size={14} className="text-blue-500" /> Enlaces Más Clickeados
                        </h4>
                        <div className="space-y-2">
                          {m.topLinks.map((link, li) => (
                            <div key={li} className="flex items-center gap-3 group">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-slate-800 truncate">{link.label || link.url}</div>
                                <div className="text-[10px] text-slate-400 truncate">{link.url}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold text-blue-600 mono">{link.clicks}</span>
                                <span className="text-[10px] text-slate-400 ml-1">clics</span>
                              </div>
                              {link.uniqueClicks != null && (
                                <div className="text-right shrink-0">
                                  <span className="text-xs text-slate-500 mono">{link.uniqueClicks}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">únicos</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Geo + Hourly charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {m.geoData && m.geoData.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-100 p-5">
                          <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                            <Globe2 size={14} className="text-blue-500" /> Distribución Geográfica
                          </h4>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={m.geoData} layout="vertical" margin={{ left: 0, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="country" type="category" width={100} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="opens" radius={[0, 4, 4, 0]} barSize={18}>
                                  {m.geoData.map((_, i) => (
                                    <Cell key={i} fill={i === 0 ? color : '#93c5fd'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {m.hourlyData && m.hourlyData.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-100 p-5">
                          <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                            <TrendingUp size={14} className="text-blue-500" /> Rendimiento por Hora
                          </h4>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={m.hourlyData} margin={{ left: -20, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Line type="monotone" dataKey="clicks" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── COMPARISON CHART ── */}
            {comparisonData.length > 1 && (
              <div className="glass rounded-2xl shadow-lg border border-white/50 p-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Comparativa entre Emails
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        formatter={(v) => [`${v}%`]}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="aperturas" name="Aperturas %" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                      <Bar dataKey="clics" name="Clics %" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                      <Bar dataKey="rebotes" name="Rebotes %" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── HOT LEADS TABLE ── */}
            {allLeads.length > 0 && (
              <div className="glass rounded-2xl shadow-lg border border-white/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                      Ranking de Hot Leads
                      <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{hotLeads.length} leads</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Consolidado de todos los emails. Ordenados por engagement.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={downloadFullReport} className="flex items-center gap-2 bg-white hover:bg-blue-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm" title="Reporte completo con KPIs e insights">
                      <FileText size={14} className="text-blue-600" /> Reporte Completo
                    </button>
                    <button onClick={() => downloadLeads('xlsx')} className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm" title="Solo la hoja de leads">
                      <FileSpreadsheet size={14} className="text-emerald-600" /> Leads .xlsx
                    </button>
                    <button onClick={() => downloadLeads('csv')} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm" title="Solo leads en CSV">
                      <Download size={14} className="text-slate-500" /> .csv
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Contacto</th>
                        <th className="px-4 py-3">Empresa</th>
                        <th className="px-4 py-3 text-center">Clics</th>
                        <th className="px-4 py-3 text-center">Aperturas</th>
                        <th className="px-4 py-3 text-center">Emails</th>
                        <th className="px-4 py-3">Prioridad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentLeads.length > 0 ? currentLeads.map((lead, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                          <td className="px-6 py-3">
                            <a href={`mailto:${lead.email}`} className="font-semibold text-slate-900 text-xs hover:text-blue-600 transition-colors flex items-center gap-1">
                              {lead.email}
                              <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-blue-400" />
                            </a>
                            {(lead.firstName || lead.lastName) && (
                              <div className="text-[10px] text-slate-400">{lead.firstName} {lead.lastName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{lead.company}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${lead.clicks > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                              {lead.clicks}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${lead.opens > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                              {lead.opens}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {[1, 2, 3].map(n => (
                                <div key={n} className={`w-3 h-3 rounded-full ${lead.emailAppearances?.includes(n) ? 'border-2' : 'bg-slate-100'}`}
                                  style={lead.emailAppearances?.includes(n) ? { borderColor: MAILCHIMP_EMAIL_COLORS[n - 1], background: MAILCHIMP_EMAIL_COLORS[n - 1] + '30' } : {}}
                                  title={`Email ${n}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {lead.clicks >= 3 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                <Flame size={11} className="fill-red-500" /> Crítica
                              </span>
                            ) : lead.clicks >= 2 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                <Flame size={11} className="fill-orange-500" /> Alta
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Media
                              </span>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            No hay hot leads con clics registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span>
                      {(currentPage - 1) * LEADS_PER_PAGE + 1}-{Math.min(currentPage * LEADS_PER_PAGE, hotLeads.length)} de {hotLeads.length} leads
                    </span>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <ChevronLeft size={14} />
                      </button>
                      <span className="px-2 font-semibold mono">{currentPage}/{totalPages}</span>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── AI INSIGHTS ── */}
            {campaignInsights && (
              <div className="rounded-2xl shadow-lg border overflow-hidden fade-in" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e40af)' }}>
                <div className="p-6 md:p-8 text-white relative">
                  <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                    <Target size={250} />
                  </div>

                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                    <Sparkles size={24} className="text-amber-400" />
                    Insights Generados por IA
                  </h2>

                  {campaignInsights.overallVerdict && (
                    <div className="bg-white/10 backdrop-blur rounded-xl p-5 mb-5 border border-white/10">
                      <h3 className="text-amber-300 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Zap size={14} /> Veredicto General
                      </h3>
                      <p className="text-white/90 text-base leading-relaxed">{campaignInsights.overallVerdict}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    {campaignInsights.deliveryHealth && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-blue-200 font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> Salud de Entregabilidad
                        </h4>
                        <p className="text-white/80 text-sm leading-relaxed">{campaignInsights.deliveryHealth}</p>
                      </div>
                    )}
                    {campaignInsights.engagementTrend && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-blue-200 font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <TrendingUp size={13} /> Tendencia de Engagement
                        </h4>
                        <p className="text-white/80 text-sm leading-relaxed">{campaignInsights.engagementTrend}</p>
                      </div>
                    )}
                    {campaignInsights.bestPerformer && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-blue-200 font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Target size={13} /> Mejor Email
                        </h4>
                        <p className="text-white/80 text-sm leading-relaxed">{campaignInsights.bestPerformer}</p>
                      </div>
                    )}
                    {campaignInsights.salesRecommendation && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-amber-300 font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Flame size={13} /> Recomendación de Ventas
                        </h4>
                        <p className="text-white/80 text-sm leading-relaxed">{campaignInsights.salesRecommendation}</p>
                      </div>
                    )}
                  </div>

                  {campaignInsights.actionItems && campaignInsights.actionItems.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-xl p-5">
                      <h4 className="text-amber-300 font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                        <ArrowRight size={14} /> Plan de Acción
                      </h4>
                      <div className="space-y-2">
                        {campaignInsights.actionItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-white/90 text-sm">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/30 text-amber-200 flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                            <span className="leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── GLOSSARY ── */}
            <div className="glass rounded-2xl shadow-lg border border-white/50 p-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5 border-b border-slate-100 pb-3">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Glosario de Métricas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {[
                  { icon: CheckCircle2, ic: 'text-emerald-500', title: 'Entregas Exitosas', desc: 'Correos que llegaron efectivamente a la bandeja de entrada.' },
                  { icon: MailOpen, ic: 'text-blue-500', title: 'Tasa de Apertura', desc: 'Porcentaje de destinatarios que abrieron el correo.' },
                  { icon: MousePointerClick, ic: 'text-indigo-500', title: 'CTOR (Click-To-Open)', desc: 'De los que abrieron, cuántos hicieron clic. Mejor métrica de contenido.' },
                  { icon: AlertTriangle, ic: 'text-orange-500', title: 'Tasa de Rebote', desc: 'Correos devueltos sin entregar (casilla llena, inexistente, bloqueados).' },
                  { icon: UserMinus, ic: 'text-slate-500', title: 'Cancelaciones', desc: 'Personas que se dieron de baja. Ayuda a limpiar la base de datos.' },
                  { icon: Flame, ic: 'text-red-500', title: 'Hot Lead', desc: 'Contacto que hizo clic en enlaces comerciales. Prioridad según frecuencia.' },
                ].map((g, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <g.icon size={15} className={`${g.ic} mt-0.5 shrink-0`} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{g.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

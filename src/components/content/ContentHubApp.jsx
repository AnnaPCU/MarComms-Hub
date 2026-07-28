// ════════════════════════════════════════════════════════════════════
// ContentHubApp — Mesa de Contenido y Diseño
// ════════════════════════════════════════════════════════════════════
// 2 tabs principales: Pedidos | Herramientas
//
// Tab Pedidos:
//   - 6 categorías (one_pager, ppt, formulario, branding, landing, video)
//   - 3 vistas (por responsable, estado, proyecto)
//   - Filtros (designer, status, project)
//
// Tab Herramientas (2 sub-tabs):
//   - UTM Builder Marcomms (rosa)
//   - Generador Newsletter (placeholder)
// (El Reporte Mailchimp se movió al sitio de reportes — jul 2026)
//
// Props:
//   onBack — volver al hub
//   webinars / setWebinars / campaigns / setCampaigns / events / setEvents
//   standaloneRequests           — lista (read-only) viniendo de useRequests()
//   requestsLoading, requestsError — estados del hook
//   createRequest / updateRequest / removeRequest         — CRUD Supabase
//   setRequestStatus / setRequestOwner                    — wrappers
//   addRequestComment / removeRequestComment              — overlay local
//   addRequestFile / removeRequestFile                    — overlay local
//   updateRequestContent                                  — overlay local genérico
// ════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Briefcase, Calendar, CheckSquare, Clock,
  ExternalLink, FileText, Files, Filter, Link, Mail, Plus,
  Send, Sparkles, Trash2, User, Video, X, Zap,
} from 'lucide-react';

import { DESIGNERS, PEOPLE } from '@/constants/team';
import { MARKETS } from '@/constants/markets';
import { STANDALONE_CATEGORIES } from '@/constants/standalones';
import { WEBINAR_CONTENT_PIECES } from '@/constants/webinar';
import { EVENT_CONTENT_PIECES } from '@/constants/events';
import { CAMPAIGN_CONTENT_PIECES } from '@/constants/campaigns';
import { calcProgress } from '@/utils/progress';

import MarcommsUtmBuilder from '@/components/shared/MarcommsUtmBuilder';
import ProjectLinks from '@/components/shared/ProjectLinks';
import MentionTextarea from '@/components/shared/MentionTextarea';
import { useConfirm } from '@/hooks/useConfirm';

export default function ContentHubApp({
  onBack,
  webinars,
  setWebinars,
  campaigns,
  setCampaigns,
  events,
  setEvents,
  standaloneRequests,
  requestsLoading,
  requestsError,
  createRequest,
  updateRequest,
  removeRequest,
  setRequestStatus,
  setRequestOwner,
  addRequestComment,
  removeRequestComment,
  addRequestFile,
  removeRequestFile,
  updateRequestContent,
  autoNew,
  onAutoNewDone,
}) {
  const confirm = useConfirm();
  const [viewMode, setViewMode] = useState('responsable'); // responsable | estado | proyecto
  const [mainTab, setMainTab] = useState('pedidos'); // pedidos | herramientas
  const [activeTool, setActiveTool] = useState('utm'); // utm | mailchimp | newsletter
  const [filterDesigner, setFilterDesigner] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterKind, setFilterKind] = useState('all'); // all | wording | design
  const [showCampaignDetail, setShowCampaignDetail] = useState(null); // campaign object cuando se abre el modal de detalle email
  const [showPieceDetail, setShowPieceDetail] = useState(null); // {item} -> abre modal comments + files
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newWordingFile, setNewWordingFile] = useState({ name: '', url: '' });
  const [newDesignFile, setNewDesignFile] = useState({ name: '', url: '' });
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    name: '', category: 'one_pager', country: '', businessUnit: '',
    requester: '', budget: '', detail: '', deadline: ''
  });

  // Abre el modal de "nuevo pedido" cuando se entra desde Acción Rápida
  useEffect(() => {
    if (autoNew) {
      setMainTab('pedidos');
      setShowNewRequest(true);
      if (onAutoNewDone) onAutoNewDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNew]);

  // Helper: leer una pieza de un proyecto
  // El proyecto guarda content[piece.key] = { owner, status }
  // status: 'pending' | 'in_progress' | 'done'
  const getPieceState = (project, piece, sourceType) => {
    const content = project.content || {};
    let stored = content[piece.key];
    let owner = stored?.owner || piece.defaultOwner;
    let status = stored?.status || 'pending';
    const comments = stored?.comments || [];
    // Soporte legacy: si había `files`, los tratamos como designFiles
    const wordingFiles = stored?.wordingFiles || [];
    const designFiles = stored?.designFiles || stored?.files || [];
    const marcommsApproval = !!stored?.marcommsApproval;
    const clientApproval = !!stored?.clientApproval;

    // Doble validación: si ambos están aprobados, status pasa a done automáticamente
    const bothApproved = marcommsApproval && clientApproval;
    const oneApproved = marcommsApproval || clientApproval;

    // Cuando hay syncTask/syncTaskId, el módulo origen es la FUENTE DE VERDAD
    // para el estado "done" — sobrescribe lo que esté guardado.
    if (sourceType === 'webinar' && piece.syncTask) {
      const isDoneInOrigin = !!project[piece.syncTask]?.done;
      if (isDoneInOrigin || bothApproved) {
        status = 'done';
      } else if (status === 'done') {
        status = oneApproved ? 'in_progress' : (stored?.status === 'in_progress' ? 'in_progress' : 'pending');
      } else if (oneApproved && status === 'pending') {
        status = 'in_progress';
      }
    } else if (sourceType === 'event' && piece.syncTaskId) {
      const isDoneInOrigin = !!project.tasks?.[piece.syncTaskId]?.done;
      if (isDoneInOrigin || bothApproved) {
        status = 'done';
      } else if (status === 'done') {
        status = oneApproved ? 'in_progress' : (stored?.status === 'in_progress' ? 'in_progress' : 'pending');
      } else if (oneApproved && status === 'pending') {
        status = 'in_progress';
      }
    } else {
      // Sin syncTask: solo approvals manda
      if (bothApproved) status = 'done';
      else if (oneApproved && status === 'pending') status = 'in_progress';
    }
    return { owner, status, comments, wordingFiles, designFiles, marcommsApproval, clientApproval };
  };

  const updatePieceStatus = (sourceType, projectId, piece, newStatus) => {
    if (sourceType === 'standalone') {
      updateStandaloneStatus(projectId, newStatus);
      return;
    }
    if (sourceType === 'webinar') {
      setWebinars(prev => prev.map(w => {
        if (w.id !== projectId) return w;
        const content = { ...(w.content || {}) };
        const cur = content[piece.key] || {};
        content[piece.key] = { ...cur, status: newStatus };
        let updated = { ...w, content };
        // Sync con tarea del webinar si existe
        if (piece.syncTask) {
          updated[piece.syncTask] = { ...(updated[piece.syncTask] || {}), done: newStatus === 'done' };
        }
        return updated;
      }));
    }
    if (sourceType === 'event') {
      setEvents(prev => prev.map(ev => {
        if (ev.id !== projectId) return ev;
        const content = { ...(ev.content || {}) };
        const cur = content[piece.key] || {};
        content[piece.key] = { ...cur, status: newStatus };
        let updated = { ...ev, content };
        // Sync con tarea del evento si existe
        if (piece.syncTaskId && updated.tasks?.[piece.syncTaskId]) {
          updated.tasks = {
            ...updated.tasks,
            [piece.syncTaskId]: { ...updated.tasks[piece.syncTaskId], done: newStatus === 'done' }
          };
        }
        return updated;
      }));
    }
    if (sourceType === 'campaign') {
      setCampaigns(prev => prev.map(c => {
        if (c.id !== projectId) return c;
        const content = { ...(c.content || {}) };
        const cur = content[piece.key] || {};
        content[piece.key] = { ...cur, status: newStatus };
        return { ...c, content };
      }));
    }
  };

  const updatePieceOwner = (sourceType, projectId, piece, newOwner) => {
    if (sourceType === 'standalone') {
      updateStandaloneOwner(projectId, newOwner);
      return;
    }
    const setter = sourceType === 'webinar' ? setWebinars : sourceType === 'event' ? setEvents : setCampaigns;
    setter(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const content = { ...(p.content || {}) };
      const cur = content[piece.key] || {};
      content[piece.key] = { ...cur, owner: newOwner };
      return { ...p, content };
    }));
  };

  // ─── Doble validación: tildar/destildar Marcomms o Cliente ───
  const togglePieceApproval = (sourceType, projectId, piece, who, newValue) => {
    // who = 'marcomms' | 'client'
    const field = who === 'marcomms' ? 'marcommsApproval' : 'clientApproval';

    if (sourceType === 'standalone') {
      // Aprobaciones de pieza viven en el overlay local de content (no persistido)
      const currentReq = (standaloneRequests || []).find(r => r.id === projectId);
      const cur = currentReq?.content?.[piece.key] || {};

      if (updateRequestContent) {
        updateRequestContent(projectId, (content) => {
          const next = { ...(content || {}) };
          next[piece.key] = { ...(next[piece.key] || {}), [field]: newValue };
          return next;
        });
      }

      // Si ambos quedan aprobados → marcar el pedido entero como done (persiste en Supabase)
      const both = (field === 'marcommsApproval' ? newValue : !!cur.marcommsApproval) &&
                   (field === 'clientApproval' ? newValue : !!cur.clientApproval);
      if (both && currentReq && currentReq.status !== 'done' && setRequestStatus) {
        setRequestStatus(projectId, 'done');
      }
      return;
    }

    const setter = sourceType === 'webinar' ? setWebinars : sourceType === 'event' ? setEvents : setCampaigns;
    setter(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const content = { ...(p.content || {}) };
      const cur = content[piece.key] || {};
      content[piece.key] = { ...cur, [field]: newValue };
      let updated = { ...p, content };

      // Si ambos están aprobados, sincronizar la tarea origen a done
      const both = (field === 'marcommsApproval' ? newValue : !!cur.marcommsApproval) &&
                   (field === 'clientApproval' ? newValue : !!cur.clientApproval);
      if (sourceType === 'webinar' && piece.syncTask) {
        const taskCur = updated[piece.syncTask] || {};
        updated[piece.syncTask] = { ...taskCur, done: both };
      }
      if (sourceType === 'event' && piece.syncTaskId && updated.tasks?.[piece.syncTaskId]) {
        updated.tasks = {
          ...updated.tasks,
          [piece.syncTaskId]: { ...updated.tasks[piece.syncTaskId], done: both }
        };
      }
      return updated;
    }));
  };

  // ─── Comments y files ───
  const addComment = (sourceType, projectId, pieceKey, text, author) => {
    if (!text.trim()) return;
    if (sourceType === 'standalone') {
      addStandaloneComment(projectId, text, author);
      return;
    }
    const setter = sourceType === 'webinar' ? setWebinars : sourceType === 'event' ? setEvents : setCampaigns;
    setter(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const content = { ...(p.content || {}) };
      const cur = content[pieceKey] || {};
      const comments = [...(cur.comments || []), {
        id: Date.now() + Math.floor(Math.random() * 1000),
        author: author || 'Equipo',
        text: text.trim(),
        timestamp: new Date().toISOString()
      }];
      content[pieceKey] = { ...cur, comments };
      return { ...p, content };
    }));
  };

  const removeComment = (sourceType, projectId, pieceKey, commentId) => {
    if (sourceType === 'standalone') {
      removeStandaloneComment(projectId, commentId);
      return;
    }
    const setter = sourceType === 'webinar' ? setWebinars : sourceType === 'event' ? setEvents : setCampaigns;
    setter(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const content = { ...(p.content || {}) };
      const cur = content[pieceKey] || {};
      content[pieceKey] = { ...cur, comments: (cur.comments || []).filter(c => c.id !== commentId) };
      return { ...p, content };
    }));
  };

  const addFile = (sourceType, projectId, pieceKey, file, category = 'design') => {
    // category: 'wording' | 'design'
    const fileKey = category === 'wording' ? 'wordingFiles' : 'designFiles';
    if (sourceType === 'standalone') {
      addStandaloneFile(projectId, file, category);
      return;
    }
    const setter = sourceType === 'webinar' ? setWebinars : sourceType === 'event' ? setEvents : setCampaigns;
    setter(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const content = { ...(p.content || {}) };
      const cur = content[pieceKey] || {};
      const arr = [...(cur[fileKey] || []), {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: file.name,
        url: file.url || '',
        category,
        addedAt: new Date().toISOString()
      }];
      content[pieceKey] = { ...cur, [fileKey]: arr };
      return { ...p, content };
    }));
  };

  const removeFile = (sourceType, projectId, pieceKey, fileId, category = 'design') => {
    const fileKey = category === 'wording' ? 'wordingFiles' : 'designFiles';
    if (sourceType === 'standalone') {
      removeStandaloneFile(projectId, fileId, category);
      return;
    }
    const setter = sourceType === 'webinar' ? setWebinars : sourceType === 'event' ? setEvents : setCampaigns;
    setter(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const content = { ...(p.content || {}) };
      const cur = content[pieceKey] || {};
      content[pieceKey] = { ...cur, [fileKey]: (cur[fileKey] || []).filter(f => f.id !== fileId) };
      return { ...p, content };
    }));
  };

  // ─── Standalone Requests (pedidos independientes) ───
  // Persisten en Supabase (tabla `requests`) vía las acciones del hook useRequests.
  const createStandaloneRequest = async () => {
    if (!newRequest.name.trim() || !newRequest.country) return;
    const cat = STANDALONE_CATEGORIES.find(c => c.id === newRequest.category);
    const payload = {
      name: newRequest.name.trim(),
      category: newRequest.category,
      country: newRequest.country,
      businessUnit: newRequest.businessUnit,
      requester: newRequest.requester.trim(),
      budget: Number(newRequest.budget) || 0,
      detail: newRequest.detail.trim(),
      deadline: newRequest.deadline || null,
      owner: cat?.defaultOwner || 'Agus',
      status: 'pending',
    };
    try {
      if (createRequest) await createRequest(payload);
    } catch (e) {
      console.error('Error creando pedido:', e);
      alert('No se pudo crear el pedido. Revisá la consola.');
      return;
    }
    setNewRequest({ name: '', category: 'one_pager', country: '', businessUnit: '', requester: '', budget: '', detail: '', deadline: '' });
    setShowNewRequest(false);
  };

  const updateStandaloneStatus = async (reqId, newStatus) => {
    // Confirmación al marcar el pedido como entregado/done
    if (newStatus === 'done') {
      const ok = await confirm({
        title: '¿Pedido concretado?',
        message: 'Vas a marcar este pedido como entregado. ¿Confirmás que ya está listo?',
        confirmText: 'Sí, entregado', cancelText: 'Todavía no', tone: 'success',
      });
      if (!ok) return;
    }
    // El hook se encarga del completedAt automáticamente
    if (setRequestStatus) setRequestStatus(reqId, newStatus);
  };

  const updateStandaloneOwner = (reqId, newOwner) => {
    if (setRequestOwner) setRequestOwner(reqId, newOwner);
  };

  const deleteStandalone = async (reqId) => {
    const ok = await confirm({
      title: '¿Eliminar pedido?',
      message: 'Vas a eliminar este pedido del Content Hub. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    if (removeRequest) removeRequest(reqId);
  };

  // Comments y files para standalone (overlay local — no persistido todavía)
  const addStandaloneComment = (reqId, text, author) => {
    if (addRequestComment) addRequestComment(reqId, text, author);
  };

  const removeStandaloneComment = async (reqId, commentId) => {
    const ok = await confirm({
      title: '¿Eliminar comentario?',
      message: 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    if (removeRequestComment) removeRequestComment(reqId, commentId);
  };

  const addStandaloneFile = (reqId, file, category = 'design') => {
    if (addRequestFile) addRequestFile(reqId, file, category);
  };

  const removeStandaloneFile = async (reqId, fileId, category = 'design') => {
    const ok = await confirm({
      title: '¿Eliminar archivo?',
      message: 'Vas a quitar este archivo del pedido.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    if (removeRequestFile) removeRequestFile(reqId, fileId, category);
  };

  // Construir lista plana de todas las piezas de todos los proyectos NO completados
  const buildAllPieces = () => {
    const result = [];

    (webinars || []).forEach(w => {
      // Solo mostrar webinars activos (progreso < 100)
      const prog = calcProgress(w);
      if (prog === 100) return;
      WEBINAR_CONTENT_PIECES.forEach(piece => {
        const state = getPieceState(w, piece, 'webinar');
        result.push({
          id: `w-${w.id}-${piece.key}`,
          sourceType: 'webinar',
          sourceLabel: 'Webinar',
          sourceColor: 'bg-blue-50 text-blue-700 border-blue-200',
          sourceIcon: Video,
          projectId: w.id,
          projectName: w.name,
          projectDate: w.mainDate,
          country: w.pais,
          businessUnit: w.unidadNegocio,
          piece,
          ...state
        });
      });
    });

    (events || []).forEach(ev => {
      const tasks = Object.values(ev.tasks || {});
      const custom = ev.customTasks || [];
      const allTasks = [...tasks, ...custom];
      const doneCount = allTasks.filter(t => t.done).length;
      const prog = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;
      if (prog === 100) return;
      EVENT_CONTENT_PIECES.forEach(piece => {
        const state = getPieceState(ev, piece, 'event');
        result.push({
          id: `e-${ev.id}-${piece.key}`,
          sourceType: 'event',
          sourceLabel: 'Evento',
          sourceColor: 'bg-orange-50 text-orange-700 border-orange-200',
          sourceIcon: Calendar,
          projectId: ev.id,
          projectName: ev.name,
          projectDate: ev.date,
          country: ev.country,
          businessUnit: ev.businessUnit,
          piece,
          ...state
        });
      });
    });

    (campaigns || []).forEach(c => {
      // Solo emails manuales (no la variant webinar) y con progreso < 100
      if (c.type !== 'email' || c.variant === 'webinar') return;
      let total = 13;
      const prog = Math.min(Math.round(((c.completedSteps || []).length / total) * 100), 100);
      if (prog === 100) return;
      CAMPAIGN_CONTENT_PIECES.forEach(piece => {
        const state = getPieceState(c, piece, 'campaign');
        result.push({
          id: `c-${c.id}-${piece.key}`,
          sourceType: 'campaign',
          sourceLabel: 'Campaña Email',
          sourceColor: 'bg-purple-50 text-purple-700 border-purple-200',
          sourceIcon: Mail,
          projectId: c.id,
          projectName: c.name,
          projectDate: null,
          country: c.country,
          businessUnit: c.businessUnit,
          piece,
          campaignData: c, // para poder mostrar asunto/cuerpo/links en el modal
          ...state
        });
      });
    });

    // ─── Standalone Requests (pedidos independientes) ───
    (standaloneRequests || []).forEach(r => {
      if (r.status === 'done') return; // No mostrar los completados (igual que el resto)
      const cat = STANDALONE_CATEGORIES.find(c => c.id === r.category) || STANDALONE_CATEGORIES[0];
      result.push({
        id: `s-${r.id}`,
        sourceType: 'standalone',
        sourceLabel: 'Pedido',
        sourceColor: cat.color,
        sourceIcon: Sparkles,
        projectId: r.id,
        projectName: r.name,
        projectDate: null,
        country: r.country,
        businessUnit: r.businessUnit,
        piece: { key: 'main', label: cat.label, defaultOwner: cat.defaultOwner },
        owner: r.owner,
        status: r.status,
        comments: r.content?.comments || [],
        files: r.content?.files || [],
        standaloneData: r // referencia al request original
      });
    });

    return result;
  };

  const allPieces = buildAllPieces();

  // Aplicar filtros
  const filtered = allPieces.filter(p => {
    if (filterDesigner !== 'all' && p.owner !== filterDesigner) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterProject !== 'all' && `${p.sourceType}-${p.projectId}` !== filterProject) return false;
    if (filterKind !== 'all' && (p.piece.kind || 'design') !== filterKind && (p.piece.kind !== 'mixed')) return false;
    return true;
  });

  // Stats por diseñadora
  const designerStats = DESIGNERS.reduce((acc, d) => {
    const pieces = allPieces.filter(p => p.owner === d);
    acc[d] = {
      total: pieces.length,
      done: pieces.filter(p => p.status === 'done').length,
      pending: pieces.filter(p => p.status !== 'done').length
    };
    return acc;
  }, {});

  // Lista de proyectos únicos (para filtro)
  const uniqueProjects = [];
  const seen = new Set();
  allPieces.forEach(p => {
    const k = `${p.sourceType}-${p.projectId}`;
    if (!seen.has(k)) {
      seen.add(k);
      uniqueProjects.push({ key: k, label: `${p.sourceLabel}: ${p.projectName}`, sourceType: p.sourceType });
    }
  });

  const STATUS_CONFIG = {
    pending:     { label: 'Pendiente',  color: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400',   nextLabel: 'Empezar',         next: 'in_progress' },
    in_progress: { label: 'En proceso', color: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500',   nextLabel: 'Marcar listo',    next: 'done' },
    done:        { label: 'Listo',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', nextLabel: 'Reabrir',     next: 'pending' }
  };

  const renderPieceCard = (item) => {
    const stConfig = STATUS_CONFIG[item.status];
    const SourceIcon = item.sourceIcon;
    const kind = item.piece.kind || 'design';
    const KIND_BADGE = {
      wording: { label: 'Wording', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
      design:  { label: 'Diseño',  cls: 'bg-pink-100 text-pink-700 border-pink-200' },
      mixed:   { label: 'Wording + Diseño', cls: 'bg-gradient-to-r from-violet-100 to-pink-100 text-fuchsia-700 border-fuchsia-200' }
    };
    const kindBadge = KIND_BADGE[kind];
    return (
      <div
        key={item.id}
        className={`bg-white rounded-xl p-4 border-2 hover:shadow-md transition-all ${item.status === 'done' ? 'border-emerald-200' : item.status === 'in_progress' ? 'border-amber-200' : 'border-slate-200'}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${item.sourceColor} flex items-center gap-1`}>
              <SourceIcon className="w-2.5 h-2.5" />
              {item.sourceLabel}
            </span>
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${kindBadge.cls}`}>
              {kindBadge.label}
            </span>
          </div>
        </div>
        <h4 className="font-black text-sm text-slate-800 mb-1 leading-tight">{item.piece.label}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          {item.projectName}
          {item.projectDate ? ` · ${item.projectDate}` : ''}
        </p>

        {/* Doble validación */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mb-3 space-y-1.5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <CheckSquare className="w-2.5 h-2.5" /> Doble validación
          </p>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!item.marcommsApproval}
              onChange={(e) => togglePieceApproval(item.sourceType, item.projectId, item.piece, 'marcomms', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-pink-600 focus:ring-pink-400"
            />
            <span className={`text-[10px] font-black uppercase tracking-wider ${item.marcommsApproval ? 'text-emerald-600' : 'text-slate-500'}`}>
              Marcomms {item.marcommsApproval && '✓'}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!item.clientApproval}
              onChange={(e) => togglePieceApproval(item.sourceType, item.projectId, item.piece, 'client', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
            />
            <span className={`text-[10px] font-black uppercase tracking-wider ${item.clientApproval ? 'text-emerald-600' : 'text-slate-500'}`}>
              Cliente {item.clientApproval && '✓'}
            </span>
          </label>
        </div>

        {/* Badges de comments y files */}
        {((item.comments?.length || 0) > 0 || (item.files?.length || 0) > 0) && (
          <div className="flex items-center gap-2 mb-3">
            {(item.comments?.length || 0) > 0 && (
              <button
                onClick={() => setShowPieceDetail(item)}
                title="Ver comentarios"
                className="flex items-center gap-1 text-[10px] font-black bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 px-2 py-1 rounded transition-colors"
              >
                <Mail className="w-3 h-3" /> {item.comments.length}
              </button>
            )}
            {(item.files?.length || 0) > 0 && (
              <button
                onClick={() => setShowPieceDetail(item)}
                title="Ver archivos"
                className="flex items-center gap-1 text-[10px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-2 py-1 rounded transition-colors"
              >
                <Files className="w-3 h-3" /> {item.files.length}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <select
            value={item.owner}
            onChange={(e) => updatePieceOwner(item.sourceType, item.projectId, item.piece, e.target.value)}
            className="flex-1 text-[10px] font-black bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-blue-400 uppercase tracking-wider"
          >
            {DESIGNERS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={() => setShowPieceDetail(item)}
            title="Comentarios, archivos y detalles"
            className="bg-pink-50 hover:bg-pink-100 text-pink-600 p-1.5 rounded-lg border border-pink-100 transition-colors flex items-center gap-1"
          >
            <Files className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Archivos</span>
          </button>
          {item.sourceType === 'campaign' && (
            <button
              onClick={() => setShowCampaignDetail(item.campaignData)}
              title="Ver asunto, cuerpo y links"
              className="bg-purple-50 hover:bg-purple-100 text-purple-600 p-1.5 rounded-lg border border-purple-100 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* Banner: loading / error de Supabase */}
      {requestsError && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold px-4 py-2 text-center">
          ⚠️ No se pudieron cargar los pedidos. Revisá la consola.
        </div>
      )}
      {requestsLoading && (
        <div className="bg-pink-50 border-b border-pink-100 text-pink-700 text-[11px] font-bold px-4 py-1.5 text-center">
          Cargando pedidos…
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600 to-rose-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white text-pink-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest">CONTENT HUB</div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Mesa de Contenido y Diseño</h1>
                <p className="text-[10px] text-pink-100 font-bold uppercase tracking-widest">{filtered.length} piezas en pipeline</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowNewRequest(true)}
              className="bg-white text-pink-600 hover:bg-pink-50 px-4 py-2 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Nuevo Pedido
            </button>
            <div className="h-8 w-px bg-white/20 mx-1"></div>
            {DESIGNERS.map(d => (
              <div key={d} className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-pink-100">{d}</p>
                <p className="text-sm font-black text-white">{designerStats[d]?.pending || 0}<span className="text-[10px] text-pink-200 font-medium ml-1">/{designerStats[d]?.total || 0}</span></p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* ── Tabs principales: Pedidos / Herramientas ── */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-1.5 inline-flex gap-1 shadow-sm">
          {[
            { id: 'pedidos',      label: 'Pedidos',      icon: Briefcase },
            { id: 'herramientas', label: 'Herramientas', icon: Zap }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── CONTENIDO TAB: HERRAMIENTAS ── */}
        {mainTab === 'herramientas' && (
          <div className="space-y-4">
            {/* Sub-tabs de herramientas */}
            <div className="flex items-center gap-2 border-b border-slate-200 flex-wrap">
              {[
                { id: 'utm',        label: 'UTM Builder',         icon: Link,      activeClass: 'text-pink-600 border-pink-500' },
                { id: 'newsletter', label: 'Generador Newsletter', icon: Mail,     activeClass: 'text-purple-600 border-purple-500' }
              ].map(tool => {
                const ToolIcon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 font-black text-[10px] uppercase tracking-widest transition-all border-b-2 ${
                      isActive
                        ? tool.activeClass
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                    }`}
                  >
                    <ToolIcon className="w-3.5 h-3.5" />
                    {tool.label}
                  </button>
                );
              })}
            </div>

            {/* UTM Builder */}
            {activeTool === 'utm' && (
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-1">
                <MarcommsUtmBuilder accentColor="pink" />
              </div>
            )}

            {/* Newsletter Tool (placeholder) */}
            {activeTool === 'newsletter' && (
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Generador de Newsletter</h3>
                <p className="text-xs text-slate-400 mt-1">Próximamente disponible</p>
              </div>
            )}
          </div>
        )}

        {/* ── CONTENIDO TAB: PEDIDOS (vista original) ── */}
        {mainTab === 'pedidos' && (<>
        {/* Tabs vista */}
        <div className="flex items-center gap-2 border-b border-slate-200 flex-wrap">
          {[
            { id: 'responsable', label: 'Por Responsable', icon: User },
            { id: 'estado',      label: 'Por Estado',      icon: Filter },
            { id: 'proyecto',    label: 'Por Proyecto',    icon: Briefcase }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`px-5 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${isActive ? 'border-pink-600 text-pink-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Filtros adicionales (siempre visibles) */}
          <div className="flex items-center gap-2 py-2">
            <select value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none">
              <option value="all">Todas las diseñadoras</option>
              {DESIGNERS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterKind} onChange={e => setFilterKind(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none">
              <option value="all">Wording + Diseño</option>
              <option value="wording">Solo Wording</option>
              <option value="design">Solo Diseño</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none">
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En proceso</option>
              <option value="done">Listo</option>
            </select>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-700 outline-none max-w-[200px]">
              <option value="all">Todos los proyectos</option>
              {uniqueProjects.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Vista por responsable */}
        {viewMode === 'responsable' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DESIGNERS.map(designer => {
              const designerPieces = filtered.filter(p => p.owner === designer);
              const colorMap = {
                Agus: 'border-t-blue-500 bg-blue-50/30',
                Vicky: 'border-t-purple-500 bg-purple-50/30',
                Fati: 'border-t-orange-500 bg-orange-50/30',
                Delfi: 'border-t-emerald-500 bg-emerald-50/30'
              };
              return (
                <div key={designer} className={`bg-white rounded-2xl border border-slate-200 border-t-4 ${colorMap[designer]} overflow-hidden`}>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 uppercase">{designer}</h3>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{designerPieces.length}</span>
                  </div>
                  <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                    {designerPieces.length > 0 ? (
                      designerPieces.map(item => renderPieceCard(item))
                    ) : (
                      <p className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-8">Sin piezas asignadas</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vista por estado */}
        {viewMode === 'estado' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['pending', 'in_progress', 'done'].map(st => {
              const stPieces = filtered.filter(p => p.status === st);
              const config = STATUS_CONFIG[st];
              return (
                <div key={st} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${config.color}`}>
                    <h3 className="font-black uppercase tracking-wider text-sm">{config.label}</h3>
                    <span className="text-xs font-black px-2 py-1 rounded-full bg-white/60">{stPieces.length}</span>
                  </div>
                  <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                    {stPieces.length > 0 ? (
                      stPieces.map(item => renderPieceCard(item))
                    ) : (
                      <p className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-8">Vacío</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vista por proyecto */}
        {viewMode === 'proyecto' && (
          <div className="space-y-4">
            {uniqueProjects.map(proj => {
              const projPieces = filtered.filter(p => `${p.sourceType}-${p.projectId}` === proj.key);
              if (projPieces.length === 0) return null;
              const first = projPieces[0];
              const SourceIcon = first.sourceIcon;
              return (
                <div key={proj.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${first.sourceColor}`}>
                    <div className="flex items-center gap-3">
                      <SourceIcon className="w-5 h-5" />
                      <div>
                        <h3 className="font-black uppercase tracking-tight text-sm">{first.projectName}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{first.sourceLabel} · {first.country || '—'} · {first.businessUnit || '—'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black bg-white/60 px-3 py-1 rounded-full">
                      {projPieces.filter(p => p.status === 'done').length} / {projPieces.length} listas
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projPieces.map(item => renderPieceCard(item))}
                  </div>
                </div>
              );
            })}
            {uniqueProjects.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin proyectos activos</p>
              </div>
            )}
          </div>
        )}
        </>)}
      </main>

      {/* Modal Nuevo Pedido (standalone request) */}
      {showNewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-6" onClick={() => setShowNewRequest(false)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-pink-50">
              <div>
                <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-600" /> Nuevo Pedido a Diseño
                </h2>
                <p className="text-[10px] text-pink-700 font-bold uppercase tracking-widest mt-1">Independiente de webinar/evento/campaña</p>
              </div>
              <button onClick={() => setShowNewRequest(false)} className="w-8 h-8 rounded-full hover:bg-pink-100 flex items-center justify-center">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Categoría */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                <div className="grid grid-cols-3 gap-2">
                  {STANDALONE_CATEGORIES.map(cat => {
                    const isSelected = newRequest.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setNewRequest({ ...newRequest, category: cat.id })}
                        className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isSelected ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-500 hover:border-pink-300'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${cat.dot}`}></span>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-400 font-medium ml-1">
                  Asignación por defecto: {DESIGNERS.includes((STANDALONE_CATEGORIES.find(c => c.id === newRequest.category) || {}).defaultOwner) ? (STANDALONE_CATEGORIES.find(c => c.id === newRequest.category) || {}).defaultOwner : 'Agus'}
                </p>
              </div>

              {/* Nombre del pedido */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del pedido</label>
                <input
                  type="text"
                  placeholder="Ej: One pager para feria Expoagro 2026"
                  value={newRequest.name}
                  onChange={e => setNewRequest({ ...newRequest, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-pink-400 font-bold text-slate-700 text-sm"
                />
              </div>

              {/* País + Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                  <select
                    value={newRequest.country}
                    onChange={e => setNewRequest({ ...newRequest, country: e.target.value, businessUnit: '' })}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-pink-400 font-bold text-slate-700 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {Object.keys(MARKETS).sort().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad de Negocio</label>
                  <select
                    value={newRequest.businessUnit}
                    onChange={e => setNewRequest({ ...newRequest, businessUnit: e.target.value })}
                    disabled={!newRequest.country}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-pink-400 font-bold text-slate-700 text-sm disabled:opacity-50"
                  >
                    <option value="">Seleccionar...</option>
                    {(MARKETS[newRequest.country] || []).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              {/* Solicitante + Presupuesto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Solicitante (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez — Comercial"
                    value={newRequest.requester}
                    onChange={e => setNewRequest({ ...newRequest, requester: e.target.value })}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-pink-400 font-bold text-slate-700 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Presupuesto (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newRequest.budget}
                      onChange={e => setNewRequest({ ...newRequest, budget: e.target.value })}
                      className="w-full p-3 pl-7 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-pink-400 font-bold text-slate-700 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Deadline (fecha de entrega esperada)
                </label>
                <input
                  type="date"
                  value={newRequest.deadline}
                  onChange={e => setNewRequest({ ...newRequest, deadline: e.target.value })}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-pink-400 font-bold text-slate-700 text-sm"
                />
              </div>

              {/* Brief */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brief / Detalle del pedido</label>
                <textarea
                  rows="4"
                  placeholder="Descripción, especificaciones, deadline, referencias..."
                  value={newRequest.detail}
                  onChange={e => setNewRequest({ ...newRequest, detail: e.target.value })}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-pink-400 font-medium text-slate-700 text-sm resize-none"
                />
              </div>

              <button
                onClick={createStandaloneRequest}
                disabled={!newRequest.name.trim() || !newRequest.country}
                className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Crear Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de pieza: comentarios + archivos */}
      {showPieceDetail && (() => {
        // Re-leer el item desde el state actualizado para tener comments/files frescos
        const refreshed = (() => {
          if (showPieceDetail.sourceType === 'standalone') {
            const fresh = (standaloneRequests || []).find(r => r.id === showPieceDetail.projectId);
            if (!fresh) return showPieceDetail;
            return {
              ...showPieceDetail,
              owner: fresh.owner,
              status: fresh.status,
              comments: fresh.content?.comments || [],
              files: fresh.content?.files || []
            };
          }
          const arr = showPieceDetail.sourceType === 'webinar' ? webinars : showPieceDetail.sourceType === 'event' ? events : campaigns;
          const proj = arr.find(p => p.id === showPieceDetail.projectId);
          if (!proj) return showPieceDetail;
          const state = getPieceState(proj, showPieceDetail.piece, showPieceDetail.sourceType);
          return { ...showPieceDetail, ...state };
        })();
        const SourceIcon = refreshed.sourceIcon;

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[80] flex items-center justify-center p-4" onClick={() => { setShowPieceDetail(null); setNewCommentText(''); setNewCommentAuthor(''); setNewWordingFile({ name: '', url: '' }); setNewDesignFile({ name: '', url: '' }); }}>
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-pink-50 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <SourceIcon className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border ${refreshed.sourceColor}`}>
                        {refreshed.sourceLabel}
                      </span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border bg-white text-slate-700 border-slate-200">
                        {refreshed.owner}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase leading-tight">{refreshed.piece.label}</h2>
                    <p className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">{refreshed.projectName}</p>
                  </div>
                </div>
                <button onClick={() => { setShowPieceDetail(null); setNewCommentText(''); setNewCommentAuthor(''); setNewWordingFile({ name: '', url: '' }); setNewDesignFile({ name: '', url: '' }); }} className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shrink-0">
                  <X className="w-4 h-4 text-slate-700" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Sección Links (Planner + ticket HubSpot) — solo pedidos standalone */}
                {refreshed.sourceType === 'standalone' && (() => {
                  const req = (standaloneRequests || []).find(r => r.id === refreshed.projectId);
                  if (!req) return null;
                  return (
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Link className="w-3.5 h-3.5" /> Links del pedido
                      </h3>
                      <ProjectLinks
                        columns
                        plannerLink={req.plannerLink}
                        hubspotLink={req.hubspotLink}
                        onChange={(field, v) => updateRequest(req.id, { [field]: v })}
                      />
                    </div>
                  );
                })()}

                {/* Sección Archivos — dual cuando es mixed, sólo diseño cuando es design */}
                {(() => {
                  const pieceKind = refreshed.piece.kind || 'design';
                  const showWording = pieceKind === 'mixed' || pieceKind === 'wording';
                  const showDesign  = pieceKind === 'mixed' || pieceKind === 'design';

                  const renderFilesBlock = (category, files, label, helper, accent, newFileState, setNewFileState) => {
                    const isWording = category === 'wording';
                    const accentClasses = isWording ? {
                      heading: 'text-violet-700', icon: 'bg-violet-100 text-violet-600',
                      box: 'bg-violet-50/50 border-violet-200', label: 'text-violet-700',
                      input: 'border-violet-200 focus:ring-violet-400', btn: 'bg-violet-600 hover:bg-violet-700'
                    } : {
                      heading: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600',
                      box: 'bg-emerald-50/50 border-emerald-200', label: 'text-emerald-700',
                      input: 'border-emerald-200 focus:ring-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700'
                    };
                    return (
                      <div className="mb-4">
                        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${accentClasses.heading}`}>
                          <Files className="w-3.5 h-3.5" /> {label} ({files?.length || 0})
                        </h3>
                        {files && files.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {files.map(f => (
                              <div key={f.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 group">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentClasses.icon}`}>
                                  <Files className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-slate-800 truncate">{f.name}</p>
                                  {f.url && (
                                    <a href={f.url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 truncate">
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{f.url}</span>
                                    </a>
                                  )}
                                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                    {new Date(f.addedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeFile(refreshed.sourceType, refreshed.projectId, refreshed.piece.key, f.id, category)}
                                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                  title="Eliminar archivo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={`border-2 border-dashed rounded-xl p-3 ${accentClasses.box}`}>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${accentClasses.label}`}>{helper}</p>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder={isWording ? "Nombre del archivo (ej: Wording PPT v2.docx)" : "Nombre del archivo (ej: PPT Final v2)"}
                              value={newFileState.name}
                              onChange={e => setNewFileState({ ...newFileState, name: e.target.value })}
                              className={`w-full p-2.5 bg-white border rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 ${accentClasses.input}`}
                            />
                            <div className="flex gap-2">
                              <input
                                type="url"
                                placeholder={isWording ? "https://docs.google.com/... (PDF/Word)" : "https://drive.google.com/..."}
                                value={newFileState.url}
                                onChange={e => setNewFileState({ ...newFileState, url: e.target.value })}
                                className={`flex-1 p-2.5 bg-white border rounded-lg text-xs text-slate-700 outline-none focus:ring-2 ${accentClasses.input}`}
                              />
                              <button
                                onClick={() => {
                                  if (!newFileState.name.trim()) return;
                                  addFile(refreshed.sourceType, refreshed.projectId, refreshed.piece.key, newFileState, category);
                                  setNewFileState({ name: '', url: '' });
                                }}
                                disabled={!newFileState.name.trim()}
                                className={`disabled:opacity-40 text-white px-4 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 ${accentClasses.btn}`}
                              >
                                <Plus className="w-3.5 h-3.5" /> Agregar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div>
                      {showWording && renderFilesBlock(
                        'wording',
                        refreshed.wordingFiles,
                        'Archivos de Wording (PDF / Word)',
                        'Agregar archivo de wording — se entrega en PDF o Word',
                        'violet',
                        newWordingFile,
                        setNewWordingFile
                      )}
                      {showDesign && renderFilesBlock(
                        'design',
                        refreshed.designFiles,
                        'Archivos de Diseño',
                        'Agregar archivo de diseño (link a Drive, Figma, Canva...)',
                        'emerald',
                        newDesignFile,
                        setNewDesignFile
                      )}
                    </div>
                  );
                })()}

                {/* Sección Comentarios */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Comentarios ({refreshed.comments?.length || 0})
                  </h3>

                  {refreshed.comments && refreshed.comments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {refreshed.comments.slice().reverse().map(c => (
                        <div key={c.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3 group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
                                {(c.author || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[11px] font-black text-slate-800 uppercase">{c.author}</span>
                              <span className="text-[9px] font-medium text-slate-400">
                                {new Date(c.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button
                              onClick={() => removeComment(refreshed.sourceType, refreshed.projectId, refreshed.piece.key, c.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                              title="Eliminar comentario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form para agregar comentario */}
                  <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-xl p-3">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Nuevo comentario</p>
                    <div className="space-y-2">
                      <select
                        value={newCommentAuthor}
                        onChange={e => setNewCommentAuthor(e.target.value)}
                        className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 uppercase tracking-wider"
                      >
                        <option value="">Tu nombre...</option>
                        {DESIGNERS.map(d => <option key={d} value={d}>{d}</option>)}
                        <option value="Equipo">Equipo Marcomms</option>
                      </select>
                      <MentionTextarea
                        rows={3}
                        placeholder="Escribí un comentario, feedback, o ajuste… usá @ para etiquetar"
                        value={newCommentText}
                        onChange={(text) => setNewCommentText(text)}
                        people={PEOPLE}
                        ringClass="focus:ring-blue-400"
                      />
                      <button
                        onClick={() => {
                          if (!newCommentText.trim() || !newCommentAuthor) return;
                          addComment(refreshed.sourceType, refreshed.projectId, refreshed.piece.key, newCommentText, newCommentAuthor);
                          setNewCommentText('');
                        }}
                        disabled={!newCommentText.trim() || !newCommentAuthor}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Publicar comentario
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal detalle campaña: muestra asunto, cuerpo, CTAs, links */}
      {showCampaignDetail && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[80] flex items-center justify-center p-4" onClick={() => setShowCampaignDetail(null)}>
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 bg-purple-50 flex items-start justify-between">
              <div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-purple-100 text-purple-700 border border-purple-200">Email Marketing</span>
                <h2 className="text-xl font-black text-slate-900 uppercase mt-1">{showCampaignDetail.name}</h2>
                <p className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">{showCampaignDetail.country} · {showCampaignDetail.businessUnit}</p>
              </div>
              <button onClick={() => setShowCampaignDetail(null)} className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(() => {
                const data = showCampaignDetail.data || {};
                const numEmails = showCampaignDetail.numEmails || 1;
                const extras = data.extras || [];
                const emails = [];
                for (let i = 0; i < numEmails; i++) {
                  const c = data.contents?.[i] || {};
                  const date = data.dates?.[i] || '';
                  emails.push({ ...c, date, label: `Email ${i + 1}`, isExtra: false });
                }
                extras.forEach((e, idx) => emails.push({ ...e, label: `Email ${numEmails + idx + 1} (extra)`, isExtra: true }));

                if (emails.length === 0) {
                  return <p className="text-center text-slate-400 font-bold uppercase tracking-widest py-8 text-xs">Sin contenido cargado todavía</p>;
                }

                return emails.map((em, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">{em.label}</span>
                      {em.date && <span className="text-[10px] font-bold text-slate-500 uppercase">{em.date}</span>}
                    </div>
                    {em.subject && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asunto</p>
                        <p className="text-sm font-bold text-slate-800">{em.subject}</p>
                      </div>
                    )}
                    {em.message && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensaje</p>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{em.message}</p>
                      </div>
                    )}
                    {em.cta && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CTA</p>
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-black border border-amber-200 inline-block">{em.cta}</span>
                      </div>
                    )}
                    {em.link && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Link final</p>
                        <a href={em.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 shrink-0" />{em.link}
                        </a>
                      </div>
                    )}
                    {em.banner && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Banner</p>
                        <a href={em.banner} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 shrink-0" />{em.banner}
                        </a>
                      </div>
                    )}
                    {!em.subject && !em.message && !em.cta && !em.link && (
                      <p className="text-[10px] text-slate-400 font-medium italic">Sin contenido cargado para este email</p>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

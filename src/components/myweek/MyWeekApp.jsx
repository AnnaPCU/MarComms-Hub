// ════════════════════════════════════════════════════════════════════
// MyWeekApp — Vista global de tareas (Mi Semana)
// ════════════════════════════════════════════════════════════════════
// Agrega tareas de webinars + campañas + eventos + standalones + assigned.
// 4 KPIs clickeables (Atrasadas / Hoy / Semana / Total).
// Modal "Asignar tarea" entre usuarios.
//
// Props:
//   onBack, currentUser, onNavigate
//   webinars / campaigns / events / standaloneRequests / assignedTasks (+ setters)
//   createAssignedTask, toggleAssignedTaskDone, deleteAssignedTask
//   setRequestStatus(id, status) — standalones ya van por Supabase
// ════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  AlertCircle, ArrowLeft, Briefcase, Calendar, CheckCircle2, ChevronRight,
  Clock, Mail, Plus, Sparkles, Trash2, UserCheck, Video, X,
} from 'lucide-react';

import { DESIGNERS, MARCOMMS, PEOPLE, SERVICE_OWNERS } from '@/constants/team';
import { EVENT_PHASES } from '@/constants/events';
import { formatDate } from '@/utils/date';

export default function MyWeekApp({ onBack, webinars, setWebinars, campaigns, setCampaigns, events, setEvents, standaloneRequests, setRequestStatus, assignedTasks, createAssignedTask, toggleAssignedTaskDone, deleteAssignedTask, currentUser, onNavigate }) {
  const [filterPerson, setFilterPerson] = useState(() => {
    // Por defecto, abrir con el usuario logueado si está en la lista
    if (currentUser && PEOPLE.includes(currentUser.name)) return currentUser.name;
    return PEOPLE[0];
  });
  const [filterCustomPerson, setFilterCustomPerson] = useState('');
  const [filterRange, setFilterRange] = useState('week'); // overdue | today | week | month | all
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '', detail: '', assignedTo: '', deadline: ''
  });
  const [confirmDeleteAssignedId, setConfirmDeleteAssignedId] = useState(null);

  // Construir lista plana de TODAS las tareas con responsable + deadline
  const buildAllTasks = () => {
    const tasks = [];
    const norm = (s) => (s || '').toString().trim().toUpperCase();

    // ── Webinars: cada subtarea con date y owner
    (webinars || []).forEach(w => {
      const taskKeys = ['teamsGroup', 'testDay', 'bbdd', 'hubspot',
        'landingLivestorm', 'ppt', 'onePager',
        'lknAnuncio', 'lknReminder', 'lknHoy', 'lknPost',
        'mailPre1', 'mailPre2', 'mailPre3', 'mailPostAttended', 'mailPostNoShow',
        'bannerInv1', 'bannerInv2', 'bannerInv3', 'bannerPost', 'reporte'];
      const labels = {
        teamsGroup: 'Equipos (Teams/Zoom)', testDay: 'Test Day', bbdd: 'Base de Datos', hubspot: 'HubSpot Sync',
        landingLivestorm: 'Landing Livestorm', ppt: 'PPT', onePager: 'One pager',
        lknAnuncio: 'LKN post "anuncio"', lknReminder: 'LKN post "1 day to go"', lknHoy: 'LKN post "es hoy"', lknPost: 'LKN post "recap"',
        mailPre1: 'Mailing 01: Invitación', mailPre2: 'Mailing 02: Teaser', mailPre3: 'Mailing 03: H-24',
        mailPostAttended: 'Mailing Post — Asistentes', mailPostNoShow: 'Mailing Post — No asistidos',
        bannerInv1: 'Banner email invitación 1', bannerInv2: 'Banner email invitación 2', bannerInv3: 'Banner email invitación 3', bannerPost: 'Banner email post webinar',
        reporte: 'Reporte final'
      };
      taskKeys.forEach(k => {
        const t = w[k];
        if (!t) return;
        tasks.push({
          id: `w-${w.id}-${k}`,
          source: 'Webinar',
          sourceColor: 'bg-blue-50 text-blue-700 border-blue-200',
          sourceIcon: Video,
          projectName: w.name,
          taskLabel: labels[k] || k,
          owner: norm(t.owner),
          date: t.date || w.mainDate,
          done: !!t.done,
          country: w.pais,
          businessUnit: w.unidadNegocio,
          // metadata para acciones
          sourceType: 'webinar',
          projectId: w.id,
          taskKey: k,
          navSection: 'webinar'
        });
      });
    });

    // ── Eventos: tareas standard + custom
    (events || []).forEach(ev => {
      const phaseLabels = {};
      EVENT_PHASES.forEach(p => p.tasks.forEach(t => phaseLabels[t.id] = t.label));
      Object.entries(ev.tasks || {}).forEach(([tid, t]) => {
        tasks.push({
          id: `e-${ev.id}-${tid}`,
          source: 'Evento',
          sourceColor: 'bg-orange-50 text-orange-700 border-orange-200',
          sourceIcon: Calendar,
          projectName: ev.name,
          taskLabel: phaseLabels[tid] || tid,
          owner: norm(t.owner),
          date: t.date || ev.date,
          done: !!t.done,
          country: ev.country,
          businessUnit: ev.businessUnit,
          sourceType: 'event',
          projectId: ev.id,
          taskKey: tid,
          isCustom: false,
          navSection: 'events'
        });
      });
      (ev.customTasks || []).forEach(ct => {
        tasks.push({
          id: `e-${ev.id}-c${ct.id}`,
          source: 'Evento',
          sourceColor: 'bg-orange-50 text-orange-700 border-orange-200',
          sourceIcon: Calendar,
          projectName: ev.name,
          taskLabel: ct.label + ' (custom)',
          owner: norm(ct.owner),
          date: ct.date || ev.date,
          done: !!ct.done,
          country: ev.country,
          businessUnit: ev.businessUnit,
          sourceType: 'event',
          projectId: ev.id,
          taskKey: ct.id,
          isCustom: true,
          navSection: 'events'
        });
      });
    });

    // ── Campañas email manuales: deadlines por step + responsable de la campaña
    // El responsable general (serviceOwner) es quien ve los pasos en Mi Semana.
    (campaigns || []).forEach(c => {
      if (c.type !== 'email' || c.variant === 'webinar') return;
      const completed = new Set(c.completedSteps || []);
      const stepLabels = {
        req: '1. Pedido confirmado', num: '2. Cantidad envíos', dates: '3. Fechas envío', tag: '4. Etiquetas BBDD',
        contents: '5. Contenidos', banners: '6. Banners', sender: '7. Remitente', test: '8. Tests',
        prog: '9. Programar', hs_deals: '10. Deals HubSpot', bbdd_del: '11. BBDD borrada', client_report: '12. Reporte cliente', smartsheet: '13. Smartsheet'
      };
      const ds = c.deadlines || {};
      const byStep = ds.byStep || {};
      const campaignOwner = c.serviceOwner || SERVICE_OWNERS.campaign;
      Object.keys(stepLabels).forEach(sk => {
        if (!byStep[sk]) return; // sin fecha asignada no la mostramos
        tasks.push({
          id: `c-${c.id}-${sk}`,
          source: 'Campaña Email',
          sourceColor: 'bg-purple-50 text-purple-700 border-purple-200',
          sourceIcon: Mail,
          projectName: c.name,
          taskLabel: stepLabels[sk],
          owner: norm(campaignOwner),
          date: byStep[sk],
          done: completed.has(sk),
          country: c.country,
          businessUnit: c.businessUnit,
          sourceType: 'campaign',
          projectId: c.id,
          taskKey: sk,
          navSection: 'campaigns'
        });
      });
    });

    // ── Pedidos standalone (Content Hub)
    (standaloneRequests || []).forEach(r => {
      tasks.push({
        id: `s-${r.id}`,
        source: 'Content Hub',
        sourceColor: 'bg-pink-50 text-pink-700 border-pink-200',
        sourceIcon: Sparkles,
        projectName: r.name,
        taskLabel: 'Pedido de contenido',
        owner: norm(r.owner),
        date: r.deadline || '',
        done: r.status === 'done',
        country: r.country,
        businessUnit: r.businessUnit,
        sourceType: 'standalone',
        projectId: r.id,
        taskKey: null,
        navSection: 'content'
      });
    });

    // ── Tareas asignadas entre usuarios
    (assignedTasks || []).forEach(at => {
      tasks.push({
        id: `at-${at.id}`,
        source: 'Asignada',
        sourceColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        sourceIcon: UserCheck,
        projectName: at.assignedBy ? `Asignada por ${at.assignedBy}` : 'Tarea asignada',
        taskLabel: at.title,
        owner: norm(at.assignedTo),
        date: at.deadline || '',
        done: !!at.done,
        country: '',
        businessUnit: '',
        sourceType: 'assigned',
        projectId: at.id,
        taskKey: null,
        navSection: 'my_week',
        detail: at.detail,
        assignedBy: at.assignedBy
      });
    });

    return tasks;
  };

  const allTasks = buildAllTasks();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split('T')[0];

  // ─── Acciones: completar tarea + navegar al proyecto ───
  const toggleTaskDone = (task, newDone) => {
    if (task.sourceType === 'webinar') {
      setWebinars(prev => prev.map(w => {
        if (w.id !== task.projectId) return w;
        const cur = w[task.taskKey] || {};
        return { ...w, [task.taskKey]: { ...cur, done: newDone } };
      }));
    } else if (task.sourceType === 'event' && !task.isCustom) {
      setEvents(prev => prev.map(ev => {
        if (ev.id !== task.projectId) return ev;
        const cur = ev.tasks?.[task.taskKey] || {};
        return { ...ev, tasks: { ...ev.tasks, [task.taskKey]: { ...cur, done: newDone } } };
      }));
    } else if (task.sourceType === 'event' && task.isCustom) {
      setEvents(prev => prev.map(ev => {
        if (ev.id !== task.projectId) return ev;
        return {
          ...ev,
          customTasks: (ev.customTasks || []).map(ct =>
            ct.id === task.taskKey ? { ...ct, done: newDone } : ct
          )
        };
      }));
    } else if (task.sourceType === 'campaign') {
      setCampaigns(prev => prev.map(c => {
        if (c.id !== task.projectId) return c;
        const completedSteps = c.completedSteps || [];
        const isInList = completedSteps.includes(task.taskKey);
        if (newDone && !isInList) {
          return { ...c, completedSteps: [...completedSteps, task.taskKey] };
        }
        if (!newDone && isInList) {
          return { ...c, completedSteps: completedSteps.filter(s => s !== task.taskKey) };
        }
        return c;
      }));
    } else if (task.sourceType === 'standalone') {
      // Standalones viven en Supabase — delegamos al wrapper del hook,
      // que maneja completedAt automáticamente.
      if (setRequestStatus) {
        setRequestStatus(task.projectId, newDone ? 'done' : 'in_progress');
      }
    } else if (task.sourceType === 'assigned') {
      if (toggleAssignedTaskDone) {
        toggleAssignedTaskDone(task.projectId, newDone);
      }
    }
  };

  const goToTask = (task) => {
    if (onNavigate) onNavigate(task.navSection);
  };

  // Filtros
  const personFilter = (filterPerson === '__OTHER__' ? filterCustomPerson : filterPerson).toUpperCase();
  const inRange = (dIso) => {
    if (!dIso) return false;
    if (filterRange === 'all') return true;
    const d = new Date(dIso + 'T00:00:00');
    if (filterRange === 'overdue') return d < today;
    if (filterRange === 'today') return dIso === todayIso;
    if (filterRange === 'week') {
      const limit = new Date(today); limit.setDate(limit.getDate() + 7);
      return d >= today && d <= limit;
    }
    if (filterRange === 'month') {
      const limit = new Date(today); limit.setDate(limit.getDate() + 30);
      return d >= today && d <= limit;
    }
    return true;
  };

  const filtered = allTasks
    .filter(t => personFilter && t.owner === personFilter)
    .filter(t => inRange(t.date))
    .filter(t => !t.done)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Stats
  const overdue = allTasks.filter(t => personFilter && t.owner === personFilter && t.date && new Date(t.date + 'T00:00:00') < today && !t.done).length;
  const todayCount = allTasks.filter(t => personFilter && t.owner === personFilter && t.date === todayIso && !t.done).length;
  const weekLimit = new Date(today); weekLimit.setDate(weekLimit.getDate() + 7);
  const weekCount = allTasks.filter(t => {
    if (!personFilter || t.owner !== personFilter || t.done || !t.date) return false;
    const d = new Date(t.date + 'T00:00:00');
    return d >= today && d <= weekLimit;
  }).length;
  const totalCount = allTasks.filter(t => personFilter && t.owner === personFilter && !t.done).length;

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    const isOverdue = d < today;
    const isToday = iso === todayIso;
    const dayDiff = Math.round((d - today) / 86400000);
    if (isToday) return 'Hoy';
    if (isOverdue) return `Atrasada ${Math.abs(dayDiff)}d`;
    if (dayDiff === 1) return 'Mañana';
    if (dayDiff <= 7) return `En ${dayDiff} días`;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white text-orange-600 px-3 py-1 rounded-lg font-black text-xs tracking-widest">MI SEMANA</div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Mis Tareas</h1>
                <p className="text-[10px] text-amber-100 font-bold uppercase tracking-widest">Cross webinars · campañas · eventos · content</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterPerson}
              onChange={(e) => {
                if (e.target.value === '__OTHER__') {
                  setFilterPerson('__OTHER__');
                } else {
                  setFilterPerson(e.target.value);
                }
              }}
              className="bg-white/90 border border-white/40 px-3 py-2 rounded-lg font-black text-xs uppercase tracking-widest text-slate-700 outline-none"
            >
              <optgroup label="Comunicación">
                {DESIGNERS.map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
              <optgroup label="Marketing">
                {MARCOMMS.map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
              <option value="__OTHER__">Otro...</option>
            </select>
            {filterPerson === '__OTHER__' && (
              <input
                type="text"
                value={filterCustomPerson}
                onChange={(e) => setFilterCustomPerson(e.target.value.toUpperCase())}
                placeholder="Nombre"
                className="bg-white/90 border border-white/40 px-3 py-2 rounded-lg font-black text-xs uppercase tracking-widest text-slate-700 outline-none w-32"
              />
            )}
            <button
              onClick={() => {
                setNewAssignment({ title: '', detail: '', assignedTo: '', deadline: '' });
                setShowAssignModal(true);
              }}
              className="bg-white text-orange-700 hover:bg-orange-50 px-3 py-2 rounded-lg font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Asignar tarea
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'overdue', label: 'Atrasadas', value: overdue, color: 'bg-red-50 border-red-200 text-red-700', icon: AlertCircle },
            { id: 'today', label: 'Hoy', value: todayCount, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: Clock },
            { id: 'week', label: 'Esta semana', value: weekCount, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Calendar },
            { id: 'all', label: 'Todas activas', value: totalCount, color: 'bg-slate-50 border-slate-200 text-slate-700', icon: Briefcase }
          ].map(kpi => {
            const KpiIcon = kpi.icon;
            const active = filterRange === kpi.id;
            return (
              <button
                key={kpi.id}
                onClick={() => setFilterRange(kpi.id)}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${kpi.color} ${active ? 'ring-2 ring-offset-2 ring-orange-500' : 'hover:shadow-md'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <KpiIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{kpi.label}</span>
                </div>
                <p className="text-3xl font-black">{kpi.value}</p>
              </button>
            );
          })}
        </div>

        {/* Lista de tareas */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-700 uppercase text-sm tracking-wider">
              Tareas para {personFilter || '—'}
            </h3>
            <span className="text-[10px] font-black bg-white text-slate-600 px-2 py-1 rounded-full border border-slate-200">
              {filtered.length} {filtered.length === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>
          {filtered.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filtered.map(t => {
                const SourceIco = t.sourceIcon;
                const isOverdue = t.date && new Date(t.date + 'T00:00:00') < today;
                const isToday = t.date === todayIso;
                return (
                  <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-3 flex-wrap group">
                    {/* Checkbox para completar */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTaskDone(t, !t.done); }}
                      title={t.done ? 'Marcar como pendiente' : 'Marcar como completada'}
                      className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        t.done
                          ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                          : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                      }`}
                    >
                      {t.done && <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    {/* Área clickeable que navega al proyecto */}
                    <button
                      onClick={() => goToTask(t)}
                      className="flex-1 min-w-0 text-left flex items-center gap-3 flex-wrap cursor-pointer"
                    >
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${t.sourceColor} flex items-center gap-1 shrink-0`}>
                        <SourceIco className="w-2.5 h-2.5" /> {t.source}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black leading-tight ${t.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.taskLabel}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                          {t.projectName}
                          {t.country ? ` · ${t.country}` : ''}
                          {t.businessUnit ? ` · ${t.businessUnit}` : ''}
                        </p>
                        {t.detail && t.sourceType === 'assigned' && (
                          <p className="text-[10px] text-slate-500 italic mt-1 truncate normal-case font-medium">
                            "{t.detail}"
                          </p>
                        )}
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest border shrink-0 ${
                        t.done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isOverdue ? 'bg-red-100 text-red-700 border-red-200' :
                        isToday ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {t.done ? 'Listo' : formatDate(t.date)}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {/* Botón eliminar (solo para tareas asignadas creadas por currentUser) */}
                    {t.sourceType === 'assigned' && currentUser && t.assignedBy && t.assignedBy.toUpperCase() === currentUser.name.toUpperCase() && (
                      confirmDeleteAssignedId === t.projectId ? (
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deleteAssignedTask) deleteAssignedTask(t.projectId);
                              setConfirmDeleteAssignedId(null);
                            }}
                            className="text-[9px] font-black uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            Borrar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteAssignedId(null); }}
                            className="text-[9px] font-black uppercase tracking-widest bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteAssignedId(t.projectId);
                          }}
                          className="text-slate-300 hover:text-red-500 p-1 transition-colors shrink-0"
                          title="Eliminar (solo vos podés borrar las que asignaste)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin tareas pendientes</p>
              <p className="text-[10px] text-slate-400 mt-1">¡Listo {personFilter}!</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Asignar Nueva Tarea */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white relative">
              <button
                onClick={() => setShowAssignModal(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Asignar tarea</h2>
                  <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">
                    Asignar desde {currentUser ? currentUser.name : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Título de la tarea *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newAssignment.title}
                  onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  placeholder="Ej: Revisar copy del lanzamiento Q3"
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-cyan-400 font-bold text-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Detalle (opcional)
                </label>
                <textarea
                  rows="3"
                  value={newAssignment.detail}
                  onChange={e => setNewAssignment({ ...newAssignment, detail: e.target.value })}
                  placeholder="Contexto, links, instrucciones..."
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-cyan-400 text-slate-700 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Asignar a *
                  </label>
                  <select
                    value={newAssignment.assignedTo}
                    onChange={e => setNewAssignment({ ...newAssignment, assignedTo: e.target.value })}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-cyan-400 font-bold text-slate-700 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <optgroup label="Comunicación">
                      {DESIGNERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                    <optgroup label="Marketing">
                      {MARCOMMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newAssignment.deadline}
                    onChange={e => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-cyan-400 font-bold text-slate-700 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!newAssignment.title.trim() || !newAssignment.assignedTo) return;
                    if (createAssignedTask) {
                      createAssignedTask({
                        title: newAssignment.title,
                        detail: newAssignment.detail,
                        assignedTo: newAssignment.assignedTo,
                        deadline: newAssignment.deadline,
                        project: null
                      });
                    }
                    setShowAssignModal(false);
                    // Cambiar el filtro a la persona asignada para verla aparecer
                    setFilterPerson(newAssignment.assignedTo);
                  }}
                  disabled={!newAssignment.title.trim() || !newAssignment.assignedTo}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Asignar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// ── MAILCHIMP REPORT TOOL (componente importado del usuario)
// ════════════════════════════════════════════════════════════════════

/* ─── PALETTE ─── */
const MAILCHIMP_COLORS = {
  primary: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#dbeafe',
  accent: '#f59e0b',
  accentDark: '#d97706',
  success: '#059669',
  danger: '#dc2626',
  slate: '#334155',
  bg: '#f1f5f9',
};

const MAILCHIMP_EMAIL_COLORS = ['#2563eb', '#7c3aed', '#059669'];
const MAILCHIMP_EMAIL_LABELS = ['Email 1', 'Email 2', 'Email 3'];

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

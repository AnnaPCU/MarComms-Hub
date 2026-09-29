// ════════════════════════════════════════════════════════════════════
// PROGRAMS UTILS — Armado y resumen de programas (lógica pura)
// ════════════════════════════════════════════════════════════════════
// - buildProgramProjects(form, program) → { webinars, campaigns, events }
//     objetos listos para insertar en cada colección, con programId
// - programItems(program, data)         → pilares del programa con progreso
// - programSummary(items)               → { total, completed, progress, status }
// - defaultPillarName(programName, id)  → nombre por defecto de un pilar
// ════════════════════════════════════════════════════════════════════

import { PILLAR_BY_ID, pillarOfCampaign } from '@/constants/campaigns';
import { makeWebinar } from './webinar';
import { makeEvent } from './events';
import { calcProgress, calcEventProgress, calcCampaignProgress } from './progress';

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const defaultPillarName = (programName, pillarId) => {
  const label = PILLAR_BY_ID[pillarId]?.label || pillarId;
  return programName ? `${programName} · ${label}` : label;
};

const EMAIL_CONTENT = () => ({ subject: '', message: '', cta: '', link: '', banner: '' });

// Campaña mínima por tipo, igual a la que arma CampaignsApp al crear una a mano
const makeCampaign = (type, { name, budget, businessUnit, country, objective, detail, programId }) => {
  const base = { id: uuid(), type, name, budget: Number(budget) || 0, businessUnit, country, completedSteps: [], report: null, programId };
  if (type === 'paid') return { ...base, objective: objective || '', detail: detail || '', platforms: [], platformInvestment: 0, duration: '', comments: [] };
  if (type === 'database' || type === 'research') return { ...base, detail: detail || '' };
  return {
    ...base, type: 'email', numEmails: 1, comments: [],
    data: { requester: '', senderEmail: '', tag: '', dates: ['', '', ''], contents: [EMAIL_CONTENT(), EMAIL_CONTENT(), EMAIL_CONTENT()] },
  };
};

/**
 * form.pillars = { [pillarId]: { enabled, name, date, budget } }
 * program      = el programa ya creado en la DB (con id)
 */
export const buildProgramProjects = (form, program) => {
  const out = { webinars: [], campaigns: [], events: [] };
  const pillars = form.pillars || {};
  const common = { businessUnit: program.businessUnit || form.businessUnit || '', country: program.country || form.country || '', programId: program.id };

  Object.entries(pillars).forEach(([id, cfg]) => {
    if (!cfg || !cfg.enabled) return;
    const name = (cfg.name || '').trim() || defaultPillarName(program.name, id);
    if (id === 'webinars') {
      const w = makeWebinar(name, cfg.date || '', program.client || '', cfg.budget || '', common.country, common.businessUnit);
      out.webinars.push({ ...w, programId: program.id });
    } else if (id === 'eventos') {
      const ev = makeEvent(name, cfg.date || '', common.country, common.businessUnit, program.client || '', cfg.budget || '');
      out.events.push({ ...ev, programId: program.id });
    } else if (['email', 'paid', 'database', 'research'].includes(id)) {
      out.campaigns.push(makeCampaign(id, { name, budget: cfg.budget, objective: program.objective, detail: program.objective, ...common }));
    }
  });
  return out;
};

// Campos obligatorios del wizard → lista de faltantes (vacía = ok)
export const missingProgramFields = (form) => {
  const missing = [];
  if (!(form.name || '').trim()) missing.push('Nombre del programa');
  if (!form.country) missing.push('País');
  if (!form.businessUnit) missing.push('Unidad de negocio');
  const enabled = Object.entries(form.pillars || {}).filter(([, c]) => c && c.enabled);
  if (enabled.length === 0) missing.push('Al menos un pilar');
  enabled.forEach(([id, c]) => {
    if (id === 'webinars' && !c.date) missing.push('Fecha del webinar');
    if (id === 'eventos' && !c.date) missing.push('Fecha del evento');
  });
  return missing;
};

// Pilares de un programa con su progreso. Las campañas auto de webinar
// (variant 'webinar') no se listan: son parte del webinar.
export const programItems = (program, { webinars = [], campaigns = [], events = [] } = {}) => {
  if (!program) return [];
  const pid = String(program.id);
  const items = [];
  webinars.filter((w) => String(w.programId) === pid).forEach((w) => {
    const progress = calcProgress(w);
    items.push({ id: w.id, source: 'webinar', pillar: 'webinars', name: w.name, date: w.mainDate || '', progress, completed: progress === 100 || !!w.completedAt, project: w });
  });
  events.filter((e) => String(e.programId) === pid).forEach((e) => {
    const progress = calcEventProgress(e);
    items.push({ id: e.id, source: 'event', pillar: 'eventos', name: e.name, date: e.date || '', progress, completed: progress === 100 || !!e.completedAt, project: e });
  });
  campaigns.filter((c) => String(c.programId) === pid && c.variant !== 'webinar').forEach((c) => {
    const progress = Math.min(100, calcCampaignProgress(c));
    items.push({ id: c.id, source: 'campaign', pillar: pillarOfCampaign(c), name: c.name, date: '', progress, completed: progress === 100 || !!c.completedAt, project: c });
  });
  const order = ['webinars', 'eventos', 'email', 'paid', 'database', 'research'];
  return items.sort((a, b) => order.indexOf(a.pillar) - order.indexOf(b.pillar) || a.name.localeCompare(b.name));
};

export const programSummary = (items) => {
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const progress = total ? Math.round(items.reduce((acc, i) => acc + i.progress, 0) / total) : 0;
  const status = total === 0 ? 'planned' : completed === total ? 'completed' : progress > 0 ? 'active' : 'planned';
  return { total, completed, progress, status };
};

export const matchesProgramScope = (program, scope) => {
  if (!scope) return true;
  if (scope.countries && scope.countries.length && !scope.countries.includes(program.country)) return false;
  if (scope.units && scope.units.length && program.businessUnit && !scope.units.includes(program.businessUnit)) return false;
  return true;
};

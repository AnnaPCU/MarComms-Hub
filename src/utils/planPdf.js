// ════════════════════════════════════════════════════════════════════
// planPdf — PDF de un plan para un mes (lo mismo que ve el cliente)
// ════════════════════════════════════════════════════════════════════
// Se descarga desde el detalle del plan (vista interna, botón «Descargar
// PDF»), para el mes elegido en la tabla de tareas (o el actual). No se
// actualiza solo: es una foto de ese momento. Mismo contenido que el link
// externo, con la marca del plan (Control Union y Peterson Solutions no se
// mezclan): encabezado con MarComms y el logo de la marca, avance del plan,
// KPIs del mes (solo los que van al link), acciones del mes (sin
// Responsable ni Deadline), iniciativas y pie con la tagline.
//
// jsPDF nativo (sin capturas de pantalla), como src/utils/pdf.js: texto
// nítido y seleccionable. Fuente Helvetica: los caracteres fuera de
// WinAnsi (emojis, flechas) se reemplazan o se sacan (pdfText).
// ════════════════════════════════════════════════════════════════════

import { brandTheme } from '@/constants/brands';
import { CANCELLED_TASK_STATUS, MONTHS_ES } from '@/constants/planTasks';
import { loadJsPdf } from '@/utils/pdf';
import { filterTasks, groupTasksByMonth, monthLabel, planBrand, splitLinks, taskStats } from '@/utils/planTasks';
import { formatKpiChange, formatKpiNumber, initiativeGroups, monthKpiGroups, previousMonthKey } from '@/utils/planKpis';

const MARCOMMS_LOGO = '/logos/marcomms-color.png';
const PAGE_W = 210;
const PAGE_H = 297;
const MX = 14;
const CW = PAGE_W - MX * 2;
const BOTTOM = PAGE_H - 24; // hasta acá llega el contenido; abajo va el pie
const MONTH_RE = /^\d{4}-\d{2}$/;

// Colores de los estados (los mismos de PLAN_TASK_STATUSES, en hex)
const STATUS_COLORS = {
  Pendiente: ['#fffbeb', '#b45309'],
  'En curso': ['#eff6ff', '#1d4ed8'],
  Bloqueado: ['#fef2f2', '#b91c1c'],
  Completado: ['#ecfdf5', '#047857'],
  Cancelado: ['#f1f5f9', '#64748b'],
};
const BORDER = '#e2e8f0';
const UP = '#15803d';
const DOWN = '#b91c1c';

const rgb = (hex) => {
  const h = String(hex || '#000000').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

// Helvetica solo tiene WinAnsi: se reemplazan los caracteres que no entran
export const pdfText = (s) => String(s ?? '')
  .replace(/−/g, '-')
  .replace(/[→➜]/g, '->')
  .replace(/[✓✔✅]/g, '')
  .replace(/[^\n\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g, '');

const slug = (s) => String(s || 'plan').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const planPdfFilename = (plan, monthKey) => `plan-${slug(plan?.name)}-${monthKey}.pdf`;

// Mes del PDF: el elegido si es un mes; si no ('all' / 'none'), el actual
export const planPdfMonth = (monthKey, todayIso) => (MONTH_RE.test(monthKey || '') ? monthKey : todayIso.slice(0, 7));

// Lo que va en el PDF (sin jsPDF, para poder probarlo)
export const planPdfContent = ({ plan, tasks = [], kpiHistory = {}, initiatives = [], monthKey }) => {
  const prevKey = previousMonthKey(monthKey);
  const kpiGroups = monthKpiGroups(tasks, monthKey, kpiHistory[monthKey], kpiHistory[prevKey], kpiHistory)
    .map((g) => ({ ...g, items: g.items.filter((k) => k.visible) }))
    .filter((g) => g.items.length > 0);
  const monthTasks = groupTasksByMonth(filterTasks(tasks, { month: monthKey })).flatMap((g) => g.tasks);
  return {
    theme: brandTheme(planBrand(plan.name)),
    monthLabel: monthLabel(monthKey),
    prevLabel: MONTHS_ES[Number(prevKey.slice(5, 7)) - 1].toLowerCase(),
    stats: taskStats(tasks),
    monthStats: taskStats(monthTasks),
    kpiGroups,
    monthTasks,
    initiativeGroups: initiativeGroups(initiatives),
  };
};

// Logo como PNG achicado (máx. 600 px de ancho): alcanza para imprimir y
// el PDF queda liviano para mandarlo por mail
const LOGO_MAX_PX = 600;
const loadImage = async (src) => {
  try {
    const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    if (!img || !img.naturalWidth) return null;
    const scale = Math.min(1, LOGO_MAX_PX / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
  } catch (_e) {
    return null;
  }
};

// Links de una tarea: un texto seguido de una URL es un link con ese nombre (como TaskLinks)
const taskLinks = (value) => {
  const items = [];
  let n = 0;
  splitLinks(value).forEach((p) => {
    const prev = items[items.length - 1];
    if (p.type === 'url' && prev && !prev.url) prev.url = p.value;
    else if (p.type === 'url') items.push({ label: `Link ${(n += 1)}`, url: p.value });
    else items.push({ label: p.value, url: null });
  });
  return items;
};

export const buildPlanPdf = async ({ plan, tasks = [], kpiHistory = {}, initiatives = [], monthKey }) => {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const data = planPdfContent({ plan, tasks, kpiHistory, initiatives, monthKey });
  const { theme } = data;
  const c = theme.colors;
  const navy = c.dark;
  const [mcLogo, brandLogo] = await Promise.all([loadImage(MARCOMMS_LOGO), theme.logo ? loadImage(theme.logo) : null]);

  // ── Primitivas ──
  const fill = (hex) => pdf.setFillColor(...rgb(hex));
  const stroke = (hex) => pdf.setDrawColor(...rgb(hex));
  const color = (hex) => pdf.setTextColor(...rgb(hex));
  const font = (size, style = 'normal') => { pdf.setFont('helvetica', style); pdf.setFontSize(size); };
  const lines = (txt, w) => pdf.splitTextToSize(pdfText(txt), w);
  const spaced = (txt) => pdfText(txt).toUpperCase();
  const textW = (txt, cs = 0) => pdf.getTextWidth(txt) + cs * Math.max(0, txt.length - 1);
  const logo = (img, x, top, maxW, maxH) => {
    if (!img) return 0;
    let h = maxH; let w = (img.w / img.h) * h;
    if (w > maxW) { w = maxW; h = (img.h / img.w) * w; }
    pdf.addImage(img.dataUrl, 'PNG', x, top, w, h, undefined, 'FAST');
    return w;
  };
  let y = 0;
  const ensure = (h) => { if (y + h > BOTTOM) { pdf.addPage(); y = 16; return true; } return false; };

  const sectionTitle = (title, aside) => {
    ensure(14);
    y += 4;
    font(7.5, 'bold'); color(c.primary);
    const t = spaced(title);
    pdf.text(t, MX, y, { charSpace: 0.3 });
    const tw = textW(t, 0.3);
    let lineEnd = MX + CW;
    if (aside) {
      font(7, 'italic'); color(c.label);
      const a = pdfText(aside);
      pdf.text(a, MX + CW, y, { align: 'right' });
      lineEnd = MX + CW - textW(a) - 3;
    }
    stroke(c.primary); pdf.setLineWidth(0.15);
    pdf.line(MX + tw + 3, y - 1, lineEnd, y - 1);
    y += 5;
  };

  const groupLabel = (label, hollow = false) => {
    font(7, 'bold'); color(navy);
    if (hollow) { stroke(c.primary); pdf.setLineWidth(0.3); pdf.circle(MX + 1, y - 1, 0.9, 'S'); } else { fill(c.primary); pdf.circle(MX + 1, y - 1, 0.9, 'F'); }
    pdf.text(spaced(label), MX + 4, y, { charSpace: 0.2 });
    y += 4;
  };

  // ── 1. Encabezado ──
  fill(c.primary); pdf.rect(0, 0, PAGE_W, 2, 'F');
  y = 9;
  const mcW = logo(mcLogo, MX, y, 52, 7) || 0;
  const brandW = brandLogo ? Math.min(42, (brandLogo.w / brandLogo.h) * 6) : 0;
  if (brandLogo) logo(brandLogo, MX + CW - brandW, y + 0.5, 42, 6);
  const textX = MX + mcW + 7;
  stroke(BORDER); pdf.setLineWidth(0.3); pdf.line(textX - 3.5, y - 0.5, textX - 3.5, y + 7.5);
  const textMax = MX + CW - brandW - 6 - textX;
  font(8.5, 'bold'); color(navy);
  pdf.text(lines(`Plan · ${plan.name}`, textMax)[0] || '', textX, y + 3);
  font(7); color(c.label);
  pdf.text(lines(`Reporte de Marketing Digital · ${data.monthLabel}`, textMax)[0] || '', textX, y + 7);
  y += 13;
  stroke(BORDER); pdf.setLineWidth(0.2); pdf.line(MX, y, MX + CW, y);
  y += 7;
  font(7, 'bold'); color(c.label);
  pdf.text(spaced(theme.title), MX, y, { charSpace: 0.3 });
  y += 7;
  font(18, 'bold'); color(navy);
  lines(plan.name, CW).forEach((l) => { pdf.text(l, MX, y); y += 7.5; });
  font(9); color(c.text);
  lines(theme.intro, CW).forEach((l) => { pdf.text(l, MX, y - 2); y += 4.5; });
  y += 2;

  // ── 2. Avance del plan + mes ──
  const s = data.stats;
  const pct = Math.round((s.pct || 0) * 100);
  fill(c.soft); pdf.roundedRect(MX, y, CW, 24, 3, 3, 'F');
  font(7, 'bold'); color(c.label);
  pdf.text('AVANCE DEL PLAN', MX + 6, y + 6.5, { charSpace: 0.3 });
  font(20, 'bold'); color(navy);
  pdf.text(`${pct}%`, MX + 6, y + 15);
  const pw = textW(`${pct}%`);
  font(8); color(c.text);
  const done = `${s.completed} de ${s.completed + s.open} ${s.completed + s.open === 1 ? 'acción completada' : 'acciones completadas'}${s.cancelled ? ` · ${s.cancelled} ${s.cancelled === 1 ? 'cancelada' : 'canceladas'}` : ''}`;
  pdf.text(pdfText(done), MX + 9 + pw, y + 15);
  fill('#ffffff'); pdf.roundedRect(MX + 6, y + 18, 110, 2, 1, 1, 'F');
  if (pct > 0) { fill(c.primary); pdf.roundedRect(MX + 6, y + 18, Math.max(2, 110 * (pct / 100)), 2, 1, 1, 'F'); }
  font(7, 'bold'); color(c.label);
  pdf.text('MES', MX + CW - 6, y + 9, { align: 'right', charSpace: 0.3 });
  font(12, 'bold'); color(navy);
  pdf.text(pdfText(data.monthLabel), MX + CW - 6, y + 16, { align: 'right' });
  y += 30;

  // ── 3. KPIs del mes ──
  if (data.kpiGroups.length) {
    sectionTitle(`KPIs del mes · ${data.monthLabel}`, 'Operativos, performance e investment');
    const gap = 4;
    const cardW = (CW - gap * 2) / 3;
    data.kpiGroups.forEach((g) => {
      // alto de cada tarjeta según su contenido; la fila toma el mayor
      font(7);
      const prepared = g.items.map((k) => {
        font(6.5, 'bold');
        const labelLines = lines(k.label.toUpperCase(), cardW - 8).slice(0, 2);
        font(7, 'italic');
        const noteLines = k.note ? lines(k.note, cardW - 8).slice(0, 3) : [];
        const h = 8 + (k.kicker ? 3 : 0) + labelLines.length * 3 + 8 + (k.change ? 4.5 : 0) + noteLines.length * 3.2 + (k.tag ? 6 : 0) + 2;
        return { k, labelLines, noteLines, h };
      });
      const rowH = Math.max(24, ...prepared.map((p) => p.h));
      ensure(5 + rowH + 4);
      groupLabel(g.label, g.id === 'performance');
      prepared.forEach(({ k, labelLines, noteLines }, i) => {
        const x = MX + i * (cardW + gap);
        const onNavy = g.id === 'performance';
        if (onNavy) { fill(navy); pdf.roundedRect(x, y, cardW, rowH, 2.5, 2.5, 'F'); } else {
          fill('#ffffff'); stroke(BORDER); pdf.setLineWidth(0.25); pdf.roundedRect(x, y, cardW, rowH, 2.5, 2.5, 'FD');
          if (g.id === 'investment') { fill(navy); pdf.rect(x + 1.5, y, cardW - 3, 1, 'F'); } else { fill(c.primary); pdf.rect(x, y + 1.5, 1, rowH - 3, 'F'); }
        }
        let cy = y + 6;
        if (k.kicker) { font(5.5, 'bold'); color(c.primary); pdf.text(spaced(k.kicker), x + 4, cy, { charSpace: 0.4 }); cy += 3; }
        font(6.5, 'bold'); color(onNavy ? c.primary : c.label);
        labelLines.forEach((l) => { pdf.text(l, x + 4, cy, { charSpace: 0.2 }); cy += 3; });
        cy += 5;
        font(16, 'bold'); color(onNavy ? '#ffffff' : navy);
        const v = formatKpiNumber(k.value);
        pdf.text(v, x + 4, cy);
        if (k.currency) { const vw = textW(v); font(7, 'bold'); pdf.setTextColor(...(onNavy ? [200, 205, 220] : rgb(c.label))); pdf.text(k.currency, x + 5.5 + vw, cy); }
        if (k.change) {
          cy += 4.5;
          const n = Math.round(k.change.pct * 100);
          const col = n > 0 ? (onNavy ? '#4ade80' : UP) : n < 0 ? (onNavy ? '#f87171' : DOWN) : (onNavy ? '#cbd5e1' : '#64748b');
          fill(col);
          if (n > 0) pdf.triangle(x + 4, cy - 0.3, x + 7, cy - 0.3, x + 5.5, cy - 2.8, 'F');
          else if (n < 0) pdf.triangle(x + 4, cy - 2.8, x + 7, cy - 2.8, x + 5.5, cy - 0.3, 'F');
          font(7, 'bold'); color(col);
          pdf.text(pdfText(`${formatKpiChange(k.change.pct)} vs ${data.prevLabel}`), x + 8.5, cy);
        }
        if (noteLines.length) {
          cy += 4.5;
          font(7, 'italic'); pdf.setTextColor(...(onNavy ? [200, 205, 220] : rgb(c.label)));
          noteLines.forEach((l) => { pdf.text(l, x + 4, cy); cy += 3.2; });
          cy -= 3.2;
        }
        if (k.tag) {
          cy += 3;
          font(7, 'bold');
          const tw = textW(pdfText(k.tag)) + 5;
          if (onNavy) pdf.setFillColor(52, 56, 98); else fill(c.soft);
          pdf.roundedRect(x + 4, cy - 0.5, tw, 4.5, 2.2, 2.2, 'F');
          color(onNavy ? c.primary : navy);
          pdf.text(pdfText(k.tag), x + 6.5, cy + 2.7);
        }
      });
      y += rowH + 5;
    });
  }

  // ── 4. Acciones del mes ──
  const ms = data.monthStats;
  sectionTitle(`Acciones · ${data.monthLabel}`, data.monthTasks.length ? `${ms.completed} de ${ms.completed + ms.open} completadas` : '');
  const cols = [
    { key: 'title', label: 'Acción / Tarea', w: 46 },
    { key: 'status', label: 'Estado', w: 24 },
    { key: 'objective', label: 'Objetivo', w: 36 },
    { key: 'result', label: 'Resultado', w: 36 },
    { key: 'detail', label: 'Detalle', w: CW - 46 - 24 - 36 - 36 },
  ];
  const tableHeader = (defs) => {
    fill(navy); pdf.rect(MX, y, CW, 7, 'F');
    font(6.5, 'bold'); color('#ffffff');
    let x = MX;
    defs.forEach((d) => { pdf.text(spaced(d.label), x + 2.5, y + 4.6, { charSpace: 0.2 }); x += d.w; });
    y += 7;
  };
  if (!data.monthTasks.length) {
    ensure(10);
    font(9); color(c.text);
    pdf.text(pdfText(theme.emptyMonth.replace('{mes}', data.monthLabel)), MX, y + 4);
    y += 10;
  } else {
    ensure(20);
    tableHeader(cols);
    data.monthTasks.forEach((t) => {
      const cancelled = t.status === CANCELLED_TASK_STATUS;
      font(7.5, 'bold');
      const titleLines = lines(t.title, cols[0].w - 5);
      const links = taskLinks(t.link);
      font(7.5);
      const cells = ['objective', 'result', 'detail'].map((k, i) => lines(t[k] || '—', cols[i + 2].w - 5));
      const rowH = Math.max(titleLines.length * 3.4 + links.length * 3.4, ...cells.map((l) => l.length * 3.4), 4) + 5;
      if (ensure(rowH)) tableHeader(cols);
      const top = y + 4.5;
      let x = MX;
      font(7.5, 'bold'); color(cancelled ? '#94a3b8' : navy);
      titleLines.forEach((l, i) => pdf.text(l, x + 2.5, top + i * 3.4));
      font(6.5);
      links.forEach((lk, i) => {
        const ly = top + (titleLines.length + i) * 3.4;
        const label = lines(lk.label, cols[0].w - 5)[0] || '';
        if (lk.url) { color(c.link); pdf.textWithLink(label, x + 2.5, ly, { url: lk.url }); } else { color(c.label); pdf.text(label, x + 2.5, ly); }
      });
      x += cols[0].w;
      const [bg, fg] = STATUS_COLORS[t.status] || STATUS_COLORS.Pendiente;
      font(6, 'bold');
      const st = spaced(t.status);
      fill(bg); pdf.roundedRect(x + 2, top - 3, textW(st, 0.2) + 4, 4.4, 2, 2, 'F');
      color(fg); pdf.text(st, x + 4, top - 0.1, { charSpace: 0.2 });
      x += cols[1].w;
      font(7.5); color(cancelled ? '#94a3b8' : c.text);
      cells.forEach((cl, i) => {
        cl.forEach((l, j) => pdf.text(l, x + 2.5, top + j * 3.4));
        x += cols[i + 2].w;
      });
      y += rowH;
      stroke(BORDER); pdf.setLineWidth(0.2); pdf.line(MX, y, MX + CW, y);
    });
    y += 4;
  }

  // ── 5. Iniciativas ──
  if (data.initiativeGroups.length) {
    sectionTitle('Iniciativas', 'En definición o en marcha');
    const icols = [{ label: '#', w: 10 }, { label: 'Iniciativa', w: 62 }, { label: 'Detalle', w: CW - 72 }];
    data.initiativeGroups.forEach((g) => {
      ensure(22);
      if (g.label || data.initiativeGroups.length > 1) groupLabel(`${g.label || 'Otras iniciativas'} · ${g.items.length}`);
      tableHeader(icols);
      g.items.forEach((it, i) => {
        font(7.5, 'bold');
        const tl = lines(it.title, icols[1].w - 5);
        font(7.5);
        const dl = lines(it.detail || '—', icols[2].w - 5);
        const rowH = Math.max(tl.length, dl.length) * 3.4 + 5;
        if (ensure(rowH)) tableHeader(icols);
        const top = y + 4.5;
        font(7.5); color(c.label); pdf.text(String(i + 1), MX + 2.5, top);
        font(7.5, 'bold'); color(navy); tl.forEach((l, j) => pdf.text(l, MX + icols[0].w + 2.5, top + j * 3.4));
        font(7.5); color(c.text); dl.forEach((l, j) => pdf.text(l, MX + icols[0].w + icols[1].w + 2.5, top + j * 3.4));
        y += rowH;
        stroke(BORDER); pdf.setLineWidth(0.2); pdf.line(MX, y, MX + CW, y);
      });
      y += 6;
    });
  }

  // ── 6. Pie en cada página (como el reporte): MarComms + línea Dark Blue + tagline ──
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    pdf.setPage(p);
    const fy = PAGE_H - 16;
    logo(mcLogo, MX, fy - 1, 36, 5);
    fill(navy); pdf.rect(PAGE_W / 2, fy, PAGE_W / 2 - MX, 0.9, 'F');
    if (theme.tagline) {
      font(6.5, 'bold'); color(c.label);
      const tg = spaced(theme.tagline);
      pdf.text(tg, MX + CW - textW(tg, 0.5), fy + 5, { charSpace: 0.5 }); // a la derecha contando el espaciado
    }
    font(6.5); color('#94a3b8');
    pdf.text(`Página ${p} de ${pages}`, MX, fy + 9);
  }
  return pdf;
};

export const downloadPlanPdf = async (args) => {
  const pdf = await buildPlanPdf(args);
  pdf.save(planPdfFilename(args.plan, args.monthKey));
};

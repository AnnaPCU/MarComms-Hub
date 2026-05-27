// ════════════════════════════════════════════════════════════════════
// PDF UTILS — Generación de reportes en PDF con jsPDF nativo
// ════════════════════════════════════════════════════════════════════
// IMPORTANTE: NO usa html2canvas (era inestable, generaba PDFs corruptos).
// Dibuja todo con primitives: text, rect, line, circle, triangle.
// Más rápido, más confiable, no depende de captura del DOM.
//
// Carga jsPDF desde CDN la primera vez (singleton cached).
// ════════════════════════════════════════════════════════════════════

import { PDF_THEMES } from '@/constants/pdf';
import { EVENT_PHASES } from '@/constants/events';
import { formatPdfDate } from './date';

// ── Helpers internos ──

// Devuelve [{ key, label, done, date }] para cada tarea del proyecto
export const getProjectChecklist = (project, type) => {
  if (type === 'webinar') {
    return [
      { key: 'teamsGroup',       label: 'Grupo de Teams creado',       ...(project.teamsGroup       || {}) },
      { key: 'ppt',              label: 'Presentación final aprobada', ...(project.ppt              || {}) },
      { key: 'onePager',         label: 'One pager listo',             ...(project.onePager         || {}) },
      { key: 'landingLivestorm', label: 'Landing Livestorm publicada', ...(project.landingLivestorm || {}) },
      { key: 'testDay',          label: 'Día de prueba técnica',       ...(project.testDay          || {}) },
      { key: 'bbdd',             label: 'Base de datos cargada',       ...(project.bbdd             || {}) },
      { key: 'bannerInv1',       label: 'Banner invitación 1',         ...(project.bannerInv1       || {}) },
      { key: 'bannerInv2',       label: 'Banner invitación 2',         ...(project.bannerInv2       || {}) },
      { key: 'bannerInv3',       label: 'Banner invitación 3',         ...(project.bannerInv3       || {}) },
      { key: 'bannerPost',       label: 'Banner post-evento',          ...(project.bannerPost       || {}) },
      { key: 'lknAnuncio',       label: 'LinkedIn: Anuncio oficial',   ...(project.lknAnuncio       || {}) },
      { key: 'lknReminder',      label: 'LinkedIn: Recordatorio',      ...(project.lknReminder      || {}) },
      { key: 'lknHoy',           label: 'LinkedIn: Última llamada',    ...(project.lknHoy           || {}) },
      { key: 'lknPost',          label: 'LinkedIn: Post evento',       ...(project.lknPost          || {}) },
      { key: 'mailPre1',         label: 'Mailing 01: Invitación',      ...(project.mailPre1         || {}) },
      { key: 'mailPre2',         label: 'Mailing 02: Teaser',          ...(project.mailPre2         || {}) },
      { key: 'mailPre3',         label: 'Mailing 03: Última llamada',  ...(project.mailPre3         || {}) },
      { key: 'mailPostAttended', label: 'Mail post: Asistentes',       ...(project.mailPostAttended || {}) },
      { key: 'mailPostNoShow',   label: 'Mail post: No-show',          ...(project.mailPostNoShow   || {}) },
      { key: 'hubspot',          label: 'Deals creados en HubSpot',    ...(project.hubspot          || {}) },
      { key: 'reporte',          label: 'Reporte final',               ...(project.reporte          || {}) },
    ];
  }
  if (type === 'event') {
    const checklist = [];
    EVENT_PHASES.forEach((phase) => {
      phase.tasks.forEach((taskDef) => {
        const taskData = project.tasks?.[taskDef.id] || {};
        if ((project.removedDefaults || []).includes(taskDef.id)) return;
        checklist.push({
          key: taskDef.id,
          label: `${phase.label}: ${taskDef.label}`,
          done: taskData.done || false,
          date: taskData.date || '',
        });
      });
    });
    (project.customTasks || []).forEach((ct) => {
      checklist.push({
        key: ct.id,
        label: `${EVENT_PHASES.find((p) => p.id === ct.phaseId)?.label || 'Custom'}: ${ct.label}`,
        done: ct.done || false,
        date: ct.date || '',
      });
    });
    return checklist;
  }
  if (type === 'campaign') {
    const completed = new Set(project.completedSteps || []);
    let stepDefs = [];
    if (project.variant === 'webinar') {
      stepDefs = [
        ['mail1_pre',         'Mailing 01: Invitación'],
        ['mail2_teaser',      'Mailing 02: Teaser'],
        ['mail3_h24',         'Mailing 03: Última llamada (H-24)'],
        ['mailpost_attended', 'Mail post: Asistentes'],
        ['mailpost_noshow',   'Mail post: No-show'],
      ];
    } else if (project.type === 'email') {
      stepDefs = [
        ['req',           '1. Pedido confirmado'],
        ['num',           '2. Cantidad de envíos'],
        ['dates',         '3. Fechas de envío'],
        ['tag',           '4. Etiquetas BBDD'],
        ['contents',      '5. Contenidos'],
        ['banners',       '6. Banners'],
        ['sender',        '7. Remitente'],
        ['test',          '8. Tests'],
        ['prog',          '9. Programar'],
        ['hs_deals',      '10. Deals en HubSpot'],
        ['bbdd_del',      '11. BBDD borrada'],
        ['client_report', '12. Reporte al cliente'],
        ['smartsheet',    '13. Smartsheet actualizado'],
      ];
    } else if (project.type === 'paid') {
      stepDefs = [['brief', '1. Brief aprobado'], ['creativities', '2. Creatividades'], ['launch', '3. Lanzamiento']];
    } else if (project.type === 'database') {
      stepDefs = [['brief_db', '1. Brief de la BBDD'], ['extraction', '2. Extracción'], ['delivery', '3. Entrega']];
    } else if (project.type === 'research') {
      stepDefs = [['brief_research', '1. Brief de investigación'], ['fieldwork', '2. Relevamiento'], ['report', '3. Informe final']];
    }
    return stepDefs.map(([key, label]) => ({
      key,
      label,
      done: completed.has(key),
      date: project.deadlines?.byStep?.[key] || '',
    }));
  }
  return [];
};

// Devuelve metadata del proyecto para el header del PDF
export const getProjectMeta = (project, type) => {
  if (type === 'webinar') {
    return {
      name: project.name || 'Webinar',
      date: project.mainDate || '',
      country: project.pais || '',
      businessUnit: project.unidadNegocio || '',
      client: project.client || '',
    };
  }
  if (type === 'event') {
    return {
      name: project.name || 'Evento',
      date: project.date || '',
      country: project.country || '',
      businessUnit: project.businessUnit || '',
      client: project.client || '',
    };
  }
  if (type === 'campaign') {
    return {
      name: project.name || 'Campaña',
      date: project.data?.dates?.[0] || project.deadlines?.finalDelivery || '',
      country: project.country || '',
      businessUnit: project.businessUnit || '',
      client: project.data?.requester || '',
    };
  }
  return { name: '', date: '', country: '', businessUnit: '', client: '' };
};

// ════════════════════════════════════════════════════════════════════
// ── PDF GENERATION - jsPDF NATIVO (sin html2canvas)
// ── Dibuja todo con primitives: text, rect, line, circle
// ── Más rápido, más confiable, no depende de captura DOM
// ════════════════════════════════════════════════════════════════════

// Cache para loader de jsPDF (se carga 1 vez)
let __jsPdfPromise = null;
export const loadJsPdf = () => {
  if (__jsPdfPromise) return __jsPdfPromise;
  __jsPdfPromise = new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => {
      const check = () => {
        if (window.jspdf) resolve();
        else setTimeout(check, 30);
      };
      check();
    };
    s.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
    document.head.appendChild(s);
  });
  return __jsPdfPromise;
};

// Convertir hex (#abcdef) a [r,g,b]
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
};

export const generateProjectPDF = async (project, type) => {
  const theme = PDF_THEMES[type] || PDF_THEMES.webinar;
  const meta = getProjectMeta(project, type);
  const checklist = getProjectChecklist(project, type);
  const totalTasks = checklist.length;
  const doneTasks = checklist.filter(t => t.done).length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const todayLabel = formatPdfDate(new Date().toISOString().split('T')[0]);

  // Estado textual
  let statusLabel = 'En curso';
  let statusColor = [234, 88, 12]; // orange-600
  if (progress === 100) { statusLabel = 'Completado'; statusColor = [5, 150, 105]; }
  else if (progress === 0) { statusLabel = 'No iniciado'; statusColor = [148, 163, 184]; }

  const filename = `${type}-${(meta.name || 'proyecto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.pdf`;

  // Loader visual
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'pdf-loading-indicator';
  loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:24px 40px;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.3);z-index:99999;font-family:-apple-system,sans-serif;font-weight:900;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#0d9488;display:flex;align-items:center;gap:12px;border:2px solid #10b981;';
  loadingDiv.innerHTML = '<div style="width:18px;height:18px;border:3px solid #10b981;border-top-color:transparent;border-radius:50%;animation:pdfspin 0.8s linear infinite;"></div><span>Generando PDF...</span><style>@keyframes pdfspin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(loadingDiv);

  try {
    await loadJsPdf();
    const { jsPDF } = window.jspdf;

    // ─── CONFIG PDF ───
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PAGE_W = 210, PAGE_H = 297;
    const MARGIN_X = 14;
    const CONTENT_W = PAGE_W - (MARGIN_X * 2);

    let y = 14; // cursor vertical actual

    // Colores tema
    const themeColor = hexToRgb(theme.color);
    const themeLight = hexToRgb(theme.colorLight);

    // ─── 1. HEADER (banda pastel con título y badges) ───
    const HEADER_H = 32;
    pdf.setFillColor(themeLight[0], themeLight[1], themeLight[2]);
    pdf.roundedRect(MARGIN_X, y, CONTENT_W, HEADER_H, 4, 4, 'F');

    // Ícono cuadrado blanco a la izquierda
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(MARGIN_X + 5, y + 5, 22, 22, 3, 3, 'F');
    // Ícono "play" simbólico dentro
    pdf.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    if (type === 'webinar') {
      // Triángulo play
      pdf.triangle(MARGIN_X + 13, y + 11, MARGIN_X + 13, y + 21, MARGIN_X + 21, y + 16, 'F');
    } else if (type === 'event') {
      // Calendario cuadrado
      pdf.roundedRect(MARGIN_X + 11, y + 11, 10, 10, 1, 1, 'F');
    } else {
      // Sobre (campaign)
      pdf.roundedRect(MARGIN_X + 10, y + 12, 12, 8, 1, 1, 'F');
    }

    // Badge (pill chico)
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(themeColor[0], themeColor[1], themeColor[2]);
    pdf.setLineWidth(0.2);
    const badgeLabel = `${theme.label}s`.toUpperCase();
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    const badgeW = pdf.getTextWidth(badgeLabel) + 4;
    pdf.roundedRect(MARGIN_X + 32, y + 5, badgeW, 4.5, 1, 1, 'F');
    pdf.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    pdf.text(badgeLabel, MARGIN_X + 34, y + 8.3);

    // Si está completado, badge verde extra
    if (progress === 100) {
      const compLabel = '✓ COMPLETADO';
      const compW = pdf.getTextWidth(compLabel) + 4;
      pdf.setFillColor(16, 185, 129);
      pdf.roundedRect(MARGIN_X + 32 + badgeW + 2, y + 5, compW, 4.5, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.text(compLabel, MARGIN_X + 34 + badgeW + 2, y + 8.3);
    }

    // Título del proyecto
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const title = (meta.name || 'Sin nombre').toUpperCase();
    // Truncar si es muy largo
    const titleMaxW = CONTENT_W - 36;
    let titleClean = title;
    while (pdf.getTextWidth(titleClean) > titleMaxW && titleClean.length > 3) {
      titleClean = titleClean.slice(0, -1);
    }
    if (titleClean !== title) titleClean = titleClean.slice(0, -3) + '...';
    pdf.text(titleClean, MARGIN_X + 32, y + 17);

    // Subtítulo (unidad + fecha)
    const subtitle = `${(meta.businessUnit || '—').toUpperCase()}${meta.date ? '  ·  ' + formatPdfDate(meta.date).toUpperCase() : ''}`;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text(subtitle, MARGIN_X + 32, y + 23);

    y += HEADER_H + 5;

    // ─── 2. PROGRESO ───
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('PROGRESO DEL SERVICIO', MARGIN_X, y + 4);

    const progressText = `${doneTasks} / ${totalTasks} · ${progress}%`;
    const progressTextW = pdf.getTextWidth(progressText);
    pdf.setTextColor(51, 65, 85);
    pdf.text(progressText, MARGIN_X + CONTENT_W - progressTextW, y + 4);

    y += 7;
    // Barra fondo
    pdf.setFillColor(226, 232, 240);
    pdf.roundedRect(MARGIN_X, y, CONTENT_W, 2.5, 1, 1, 'F');
    // Barra fill
    const fillW = (CONTENT_W * progress) / 100;
    if (fillW > 0) {
      pdf.setFillColor(37, 99, 235);
      pdf.roundedRect(MARGIN_X, y, fillW, 2.5, 1, 1, 'F');
    }
    y += 9;

    // ─── 3. CHECKLIST HEADER ───
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(148, 163, 184);
    pdf.text('CHECKLIST DEL SERVICIO', MARGIN_X, y);
    y += 5;

    // ─── 4. TAREAS ───
    const TASK_H = 9;
    const TASK_GAP = 1.5;

    for (let i = 0; i < checklist.length; i++) {
      const task = checklist[i];

      // ¿Cabe la tarea en la página actual? Si no, nueva página
      if (y + TASK_H > PAGE_H - 35) {
        pdf.addPage();
        y = 14;
      }

      // Fondo de la tarea
      if (task.done) {
        pdf.setFillColor(240, 253, 244); // green-50
        pdf.setDrawColor(187, 247, 208); // green-200
      } else {
        pdf.setFillColor(248, 250, 252); // slate-50
        pdf.setDrawColor(241, 245, 249); // slate-100
      }
      pdf.setLineWidth(0.2);
      pdf.roundedRect(MARGIN_X, y, CONTENT_W, TASK_H, 2, 2, 'FD');

      // Círculo check/empty
      const circleX = MARGIN_X + 5;
      const circleY = y + TASK_H / 2;
      if (task.done) {
        // Círculo verde lleno
        pdf.setFillColor(5, 150, 105);
        pdf.circle(circleX, circleY, 2.2, 'F');
        // Tilde blanco
        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(0.5);
        pdf.line(circleX - 1.1, circleY + 0.2, circleX - 0.2, circleY + 1);
        pdf.line(circleX - 0.2, circleY + 1, circleX + 1.2, circleY - 0.7);
      } else {
        // Círculo gris vacío
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.4);
        pdf.circle(circleX, circleY, 2.2, 'S');
      }

      // Label
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(task.done ? 20 : 30, task.done ? 83 : 41, task.done ? 45 : 59);

      // Truncar si la fecha está y consume espacio
      let labelText = task.label;
      const dateText = task.date ? formatPdfDate(task.date) : '';
      const dateW = dateText ? pdf.getTextWidth(dateText) + 6 : 0;
      const labelMaxW = CONTENT_W - 14 - dateW;
      while (pdf.getTextWidth(labelText) > labelMaxW && labelText.length > 5) {
        labelText = labelText.slice(0, -1);
      }
      if (labelText !== task.label) labelText = labelText.slice(0, -2) + '…';
      pdf.text(labelText, MARGIN_X + 11, y + 5.5);

      // Fecha (chip blanco a la derecha)
      if (dateText) {
        const chipW = pdf.getTextWidth(dateText) + 4;
        const chipX = MARGIN_X + CONTENT_W - chipW - 3;
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(chipX, y + 2, chipW, 5, 1, 1, 'FD');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        pdf.text(dateText, chipX + 2, y + 5.5);
      }

      y += TASK_H + TASK_GAP;
    }

    // ─── 5. FOOTER INFO (KPIs en grid) ───
    if (y + 22 > PAGE_H - 18) {
      pdf.addPage();
      y = 14;
    } else {
      y += 4;
    }

    const FOOTER_H = 18;
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(MARGIN_X, y, CONTENT_W, FOOTER_H, 3, 3, 'F');

    // KPIs según tipo
    let kpis = [];
    if (type === 'webinar') {
      kpis = [
        { label: 'FEE',     value: `$${(project.monto || 0).toLocaleString()}`, color: [30, 41, 59] },
        { label: 'DEALS HS', value: `${project.dealsCreated || 0}`,            color: [37, 99, 235] },
        { label: 'UNIDAD',  value: meta.businessUnit || '—',                   color: [30, 41, 59] },
        { label: 'ESTADO',  value: statusLabel,                                 color: statusColor },
      ];
    } else if (type === 'event') {
      kpis = [
        { label: 'FEE',    value: `$${(project.fee || 0).toLocaleString()}`, color: [30, 41, 59] },
        { label: 'UNIDAD', value: meta.businessUnit || '—',                   color: [30, 41, 59] },
        { label: 'ESTADO', value: statusLabel,                                 color: statusColor },
      ];
    } else {
      kpis = [
        { label: 'PRESUPUESTO', value: `$${(project.budget || 0).toLocaleString()}`, color: [30, 41, 59] },
        { label: 'UNIDAD',      value: meta.businessUnit || '—',                       color: [30, 41, 59] },
        { label: 'ESTADO',      value: statusLabel,                                     color: statusColor },
      ];
    }

    const kpiW = CONTENT_W / kpis.length;
    kpis.forEach((kpi, i) => {
      const cx = MARGIN_X + (i * kpiW) + (kpiW / 2);
      // Label
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(148, 163, 184);
      const labelW = pdf.getTextWidth(kpi.label);
      pdf.text(kpi.label, cx - labelW / 2, y + 6);
      // Value
      pdf.setFontSize(11);
      pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      let valueText = String(kpi.value);
      // Truncar
      while (pdf.getTextWidth(valueText) > kpiW - 4 && valueText.length > 3) {
        valueText = valueText.slice(0, -1);
      }
      if (valueText !== String(kpi.value)) valueText = valueText.slice(0, -2) + '…';
      const valueW = pdf.getTextWidth(valueText);
      pdf.text(valueText, cx - valueW / 2, y + 13);
    });

    y += FOOTER_H + 5;

    // ─── 6. PAGE FOOTER ───
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    pdf.text('MARCOMMS HUB · CONTROL UNION', MARGIN_X, y);

    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    const genText = `Generado el ${todayLabel}`;
    const genW = pdf.getTextWidth(genText);
    pdf.text(genText, MARGIN_X + CONTENT_W - genW, y);

    // ─── DESCARGA ───
    pdf.save(filename);

    const loader = document.getElementById('pdf-loading-indicator');
    if (loader) loader.remove();
  } catch (err) {
    console.error('Error generando PDF:', err);
    const loader = document.getElementById('pdf-loading-indicator');
    if (loader) loader.remove();
    alert('Hubo un error al generar el PDF: ' + (err.message || 'desconocido') + '\nIntentá nuevamente.');
  }
};

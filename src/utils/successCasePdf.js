// ════════════════════════════════════════════════════════════════════
// SUCCESS CASE PDF — Caso de éxito con identidad de marca Control Union
// ════════════════════════════════════════════════════════════════════
// Brand System (Control Union Style Guide v2.0):
//   Primary 1 : CU Grey       #799495
//   Primary 2 : CU Cyan       #3eb2ed
//   Support   : CU Dark Blue  #1b1e42
//   Body text : CU Dark Grey  #4f6566
//   Graphic device top    : barra cyan full-width
//   Graphic device bottom : barra dark blue right-aligned
//   Tagline   : "The Proof to Your Promise" (al pie, nunca junto al logo)
//   Fuente    : Sansa Pro → fallback Helvetica en PDF
// ════════════════════════════════════════════════════════════════════

import { loadJsPdf } from './pdf';

const CYAN   = [62, 178, 237];   // #3eb2ed
const DBLUE  = [27, 30, 66];     // #1b1e42
const GREY   = [121, 148, 149];  // #799495
const DGREY  = [79, 101, 102];   // #4f6566
const CYAN_BG = [233, 247, 253]; // cyan muy claro para cajas
const BORDER = [216, 226, 227];  // #d8e2e3

const SERVICE_LABELS = {
  webinar: 'Webinar',
  campaign: 'Campaña',
  event: 'Evento',
  content: 'Content',
  otro: 'Otro',
};

// Detecta la organización a partir de la unidad de negocio / cliente.
// 'peterson' | 'cu' (default).
const detectOrg = (sc) => {
  const hay = `${sc.businessUnit || ''} ${sc.client || ''}`.toLowerCase();
  if (hay.includes('peterson')) return 'peterson';
  return 'cu';
};

const LOGO_PATHS = {
  cu:       '/logos/control-union.png',
  peterson: '/logos/peterson-solutions.png',
};

// Carga una imagen de /public como dataURL. null si no existe (404).
const loadImageDataURL = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch (_e) {
    return null;
  }
};

// Dimensiones naturales de un dataURL de imagen.
const imageRatio = (dataURL) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 4);
    img.onerror = () => resolve(4);
    img.src = dataURL;
  });

/**
 * Genera y descarga el PDF del caso de éxito con branding Control Union.
 */
export const generateSuccessCasePDF = async (sc) => {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pageW - margin * 2;

  // ── Graphic device superior: barra cyan full-width ──
  doc.setFillColor(...CYAN);
  doc.rect(0, 0, pageW, 8, 'F');

  // ── Header con logo de la organización (Control Union / Peterson) ──
  const org = detectOrg(sc);
  let y = 50;
  const logoData = await loadImageDataURL(LOGO_PATHS[org]);
  if (logoData) {
    // Logo real desde /public/logos
    const ratio = await imageRatio(logoData);
    const logoH = 26;
    const logoW = Math.min(logoH * ratio, 200);
    try {
      doc.addImage(logoData, 'PNG', margin, y - 16, logoW, logoH);
    } catch (_e) { /* si el formato no es PNG válido, ignorar */ }
    y += logoH;
  } else {
    // Fallback textual de marca
    doc.setTextColor(...(org === 'peterson' ? DBLUE : GREY));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(org === 'peterson' ? 'PETERSON SOLUTIONS' : 'CONTROL UNION', margin, y);
    y += 6;
    doc.setDrawColor(...CYAN);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + 46, y);
    y += 8;
  }

  doc.setTextColor(...GREY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MARKETING & COMUNICACIONES', margin, y);

  y += 28;
  doc.setTextColor(...DBLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CASO DE ÉXITO', margin, y);

  y += 26;
  doc.setTextColor(...DBLUE);
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(sc.title || 'Caso de éxito', contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24 + 6;

  // ── Chips de metadata (cliente / país / unidad / servicio) ──
  const meta = [
    sc.client,
    sc.country,
    sc.businessUnit,
    SERVICE_LABELS[sc.serviceType] || sc.serviceType,
  ].filter(Boolean);

  if (meta.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    let cx = margin;
    const chipH = 18;
    meta.forEach((txt) => {
      const w = doc.getTextWidth(txt.toUpperCase()) + 16;
      if (cx + w > pageW - margin) { cx = margin; y += chipH + 6; }
      doc.setFillColor(...CYAN_BG);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(cx, y, w, chipH, 4, 4, 'FD');
      doc.setTextColor(...DGREY);
      doc.text(txt.toUpperCase(), cx + 8, y + 12);
      cx += w + 8;
    });
    y += chipH + 22;
  } else {
    y += 10;
  }

  // ── Secciones de texto ──
  const section = (heading, body) => {
    if (!body) return;
    if (y > pageH - 130) { doc.addPage(); y = margin; }

    // Heading con barrita cyan a la izquierda
    doc.setFillColor(...CYAN);
    doc.rect(margin, y - 9, 3, 13, 'F');
    doc.setTextColor(...DBLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(heading.toUpperCase(), margin + 10, y + 1);
    y += 18;

    doc.setTextColor(...DGREY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(String(body), contentW);
    lines.forEach((line) => {
      if (y > pageH - 70) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 15;
    });
    y += 16;
  };

  section('Situación / Desafío', sc.challenge);
  section('Solución aplicada', sc.solution);
  section('Resultados', sc.results);

  // ── Métricas: caja destacada cyan ──
  if (sc.metrics) {
    if (y > pageH - 120) { doc.addPage(); y = margin; }
    const mLines = doc.splitTextToSize(String(sc.metrics), contentW - 28);
    const boxH = mLines.length * 14 + 34;
    doc.setFillColor(...DBLUE);
    doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'F');
    doc.setTextColor(...CYAN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('MÉTRICAS CLAVE', margin + 14, y + 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    let my = y + 34;
    mLines.forEach((line) => { doc.text(line, margin + 14, my); my += 14; });
    y += boxH + 20;
  }

  // ── Testimonio: quote con comilla grande cyan ──
  if (sc.testimonial) {
    if (y > pageH - 120) { doc.addPage(); y = margin; }
    const qLines = doc.splitTextToSize(`"${sc.testimonial}"`, contentW - 40);
    const boxH = qLines.length * 16 + 30;
    doc.setFillColor(...CYAN_BG);
    doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'F');
    doc.setFillColor(...CYAN);
    doc.rect(margin, y, 3, boxH, 'F');
    doc.setTextColor(...DBLUE);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11.5);
    let qy = y + 22;
    qLines.forEach((line) => { doc.text(line, margin + 18, qy); qy += 16; });
    y += boxH + 18;
  }

  // ── Footer en todas las páginas: tagline + graphic device inferior ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    // Graphic device inferior: barra dark blue alineada a la derecha
    doc.setFillColor(...DBLUE);
    doc.rect(pageW - 180, pageH - 6, 180, 6, 'F');
    // Tagline + crédito
    doc.setTextColor(...GREY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('The Proof to Your Promise', margin, pageH - 24);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DGREY);
    const orgName = org === 'peterson' ? 'Peterson Solutions' : 'Control Union LATAM';
    const stamp = sc.author ? `Armado por ${sc.author}` : '';
    doc.text(`MarComms Hub · ${orgName}   ${stamp}`, margin, pageH - 12);
    // Número de página
    doc.setTextColor(...GREY);
    doc.text(`${p} / ${pageCount}`, pageW - margin - 20, pageH - 12);
  }

  const slug = (sc.title || 'caso_exito').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  doc.save(`caso_exito_${slug}.pdf`);
};

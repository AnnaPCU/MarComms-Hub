// ════════════════════════════════════════════════════════════════════
// SUCCESS CASE PDF — Genera un PDF de un caso de éxito con jsPDF
// ════════════════════════════════════════════════════════════════════

import { loadJsPdf } from './pdf';

const ROSE = [225, 29, 72];      // rose-600
const SLATE = [51, 65, 85];      // slate-700
const LIGHT = [241, 245, 249];   // slate-100

const SERVICE_LABELS = {
  webinar: 'Webinar',
  campaign: 'Campaña',
  event: 'Evento',
  content: 'Content',
  otro: 'Otro',
};

/**
 * Genera y descarga un PDF del caso de éxito.
 */
export const generateSuccessCasePDF = async (sc) => {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header banda ──
  doc.setFillColor(...ROSE);
  doc.rect(0, 0, pageW, 110, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CASO DE ÉXITO · MARCOMMS', margin, 44);
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(sc.title || 'Caso de éxito', contentW);
  doc.text(titleLines, margin, 70);

  y = 140;

  // ── Metadatos (cliente / país / unidad / servicio) ──
  const meta = [
    ['Cliente', sc.client],
    ['País', sc.country],
    ['Unidad de negocio', sc.businessUnit],
    ['Servicio', SERVICE_LABELS[sc.serviceType] || sc.serviceType],
  ].filter(([, v]) => v);

  doc.setFontSize(9);
  meta.forEach(([label, value]) => {
    doc.setTextColor(...ROSE);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, y);
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), margin + 140, y);
    y += 20;
  });

  y += 10;

  // ── Secciones de texto ──
  const section = (heading, body) => {
    if (!body) return;
    if (y > pageH - 120) { doc.addPage(); y = margin; }
    doc.setFillColor(...LIGHT);
    doc.rect(margin, y - 12, contentW, 22, 'F');
    doc.setTextColor(...ROSE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(heading.toUpperCase(), margin + 8, y + 3);
    y += 26;

    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(String(body), contentW);
    lines.forEach((line) => {
      if (y > pageH - 60) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 15;
    });
    y += 14;
  };

  section('Situación / Desafío', sc.challenge);
  section('Solución aplicada', sc.solution);
  section('Resultados', sc.results);
  section('Métricas clave', sc.metrics);

  // ── Testimonio (estilo quote) ──
  if (sc.testimonial) {
    if (y > pageH - 120) { doc.addPage(); y = margin; }
    doc.setFillColor(253, 242, 248); // rose-50
    const quoteLines = doc.splitTextToSize(`“${sc.testimonial}”`, contentW - 24);
    const boxH = quoteLines.length * 15 + 28;
    doc.rect(margin, y - 4, contentW, boxH, 'F');
    doc.setTextColor(...ROSE);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    let qy = y + 16;
    quoteLines.forEach((line) => { doc.text(line, margin + 12, qy); qy += 15; });
    y += boxH + 14;
  }

  // ── Footer ──
  const footerY = pageH - 30;
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const stamp = sc.author ? `Armado por ${sc.author}` : '';
  doc.text(`MarComms Hub · Control Union LATAM   ${stamp}`, margin, footerY);

  const slug = (sc.title || 'caso_exito').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  doc.save(`caso_exito_${slug}.pdf`);
};

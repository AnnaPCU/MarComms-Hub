// ════════════════════════════════════════════════════════════════════
// Tests para utils/planPdf — PDF de un plan (parte pura, sin jsPDF)
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { pdfText, planPdfContent, planPdfFilename, planPdfMonth } from './planPdf';

describe('PDF del plan', () => {
  it('mes: el elegido; con «Todos» o «Sin mes», el actual', () => {
    expect(planPdfMonth('2026-09', '2026-10-26')).toBe('2026-09');
    expect(planPdfMonth('all', '2026-10-26')).toBe('2026-10');
    expect(planPdfMonth('none', '2026-10-26')).toBe('2026-10');
    expect(planPdfFilename({ name: 'Control Union Estados Unidos Orgánico' }, '2026-10')).toBe('plan-control-union-estados-unidos-organico-2026-10.pdf');
  });
  it('texto: lo que Helvetica no tiene se reemplaza o se saca', () => {
    expect(pdfText('−27 % → listo ✅ 🎉 «ñ» – “ok”')).toBe('-27 % -> listo   «ñ» – “ok”');
  });
  it('contenido: KPIs con valor, acciones del mes en orden e iniciativas', () => {
    const tasks = [
      { id: 'b', monthKey: '2026-10', title: 'Segunda', status: 'En curso', position: 2 },
      { id: 'a', monthKey: '2026-10', title: 'Primera', status: 'Completado', position: 1 },
      { id: 'c', monthKey: '2026-09', title: 'De septiembre', status: 'Completado', position: 0 },
    ];
    const d = planPdfContent({
      plan: { name: 'Control Union Estados Unidos Orgánico' },
      tasks,
      kpiHistory: { '2026-08': { planFee: { value: 1500, currency: 'USD' } }, '2026-10': { deals: { value: 26 }, contacts: { value: 0 } } },
      initiatives: [{ id: 'i', category: 'Generación de demanda', title: 'Webinars', position: 0 }],
      monthKey: '2026-10',
    });
    expect(d.theme.name).toBe('Control Union');
    expect(d.monthLabel).toBe('Octubre 2026');
    expect(d.monthTasks.map((t) => t.title)).toEqual(['Primera', 'Segunda']);
    expect(d.kpiGroups.flatMap((g) => g.items.map((k) => k.id))).toEqual(['deliverables', 'deals', 'planFee']);
    expect(d.initiativeGroups[0].items).toHaveLength(1);
  });
});

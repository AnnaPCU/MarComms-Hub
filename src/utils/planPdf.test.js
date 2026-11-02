// ════════════════════════════════════════════════════════════════════
// Tests para utils/planPdf — PDF de un plan (parte pura, sin jsPDF)
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { pdfText, planPdfContent, planPdfFilename, planPdfMonth, planPdfMonthOptions } from './planPdf';

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
  it('varios meses: KPIs sumados, acciones por mes y nombre del archivo', () => {
    const tasks = [
      { id: 'b', monthKey: '2026-10', title: 'Octubre', status: 'Completado', position: 1 },
      { id: 'c', monthKey: '2026-09', title: 'Septiembre', status: 'Completado', position: 0 },
      { id: 'd', monthKey: '2026-08', title: 'Agosto (no va)', status: 'Completado', position: 0 },
    ];
    const d = planPdfContent({
      plan: { name: 'Peterson Solutions Argentina' },
      tasks,
      kpiHistory: { '2026-09': { deals: { value: 15 }, mqls: { value: 100, currency: 'USD', count: 2 } }, '2026-10': { deals: { value: 26 }, mqls: { value: 50, currency: 'USD', count: 1 } } },
      monthKey: '2026-10',
      months: ['2026-10', '2026-09'],
    });
    expect(d.multi).toBe(true);
    expect(d.monthLabel).toBe('Septiembre 2026 + Octubre 2026');
    expect(d.taskGroups.map((g) => [g.label, g.tasks.map((t) => t.title)])).toEqual([['Septiembre 2026', ['Septiembre']], ['Octubre 2026', ['Octubre']]]);
    const by = Object.fromEntries(d.kpiGroups.flatMap((g) => g.items).map((k) => [k.id, k]));
    expect(by.deals.value).toBe(41);
    expect(by.mqls).toMatchObject({ value: 150, tag: '3 MQLs', change: null });
    expect(planPdfFilename({ name: 'Peterson Solutions Argentina' }, '2026-10', ['2026-10', '2026-09'])).toBe('plan-peterson-solutions-argentina-2026-09_2026-10.pdf');
    expect(planPdfFilename({ name: 'X' }, '2026-10', ['2026-07', '2026-08', '2026-09', '2026-10'])).toBe('plan-x-2026-07_a_2026-10.pdf');
    // un solo mes en `months` = como antes
    expect(planPdfContent({ plan: { name: 'X' }, tasks, months: ['2026-09'] })).toMatchObject({ multi: false, monthLabel: 'Septiembre 2026' });
  });
  it('meses para elegir: con acciones o KPIs, más el actual', () => {
    const opts = planPdfMonthOptions([{ monthKey: '2026-09' }, { monthKey: null }], { '2026-08': { planFee: { value: 1 } }, '2026-07': {} }, '2026-11-02');
    expect(opts.map((o) => o.value)).toEqual(['2026-08', '2026-09', '2026-11']);
    expect(opts[2]).toMatchObject({ label: 'Noviembre 2026', current: true });
  });
});

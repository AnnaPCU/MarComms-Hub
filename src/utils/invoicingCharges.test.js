// ════════════════════════════════════════════════════════════════════
// Tests para utils/invoicingCharges — cargos de Variables
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { chargeRemove, chargeSummary, chargeWrite, variablesViewData, viewCellPatch } from './invoicingCharges';
import { variableCharges } from './invoicing';

const legacy = { pais: 'Estados Unidos', empresa: 'Certificaciones', campanasDetalle: 'Envio de email', campanasCc: 'campañas', campanasPrecio: '70', bbddDetalle: 'bbdd RSPO', bbddCc: 'campañas', bbddPrecio: '70' };
const apply = (data, { patch, remove }) => { const d = { ...data, ...patch }; remove.forEach((k) => delete d[k]); return d; };

describe('escribir cargos', () => {
  it('la primera edición convierte las claves del Excel en cargos', () => {
    const w = chargeWrite(legacy, { id: 'legacy:campanas', precio: '80' });
    const d = apply(legacy, w);
    expect(Object.keys(d).filter((k) => k.startsWith('cargo:'))).toHaveLength(2);
    expect(d.campanasPrecio).toBeUndefined();
    expect(d.bbddDetalle).toBeUndefined();
    const ch = variableCharges(d);
    expect(ch.map((c) => [c.cat, c.detalle, c.precio])).toEqual([['campanas', 'Envio de email', '80'], ['bbdd', 'bbdd RSPO', '70']]);
    expect(d.pais).toBe('Estados Unidos');
  });
  it('agrega un segundo cargo en la misma categoría y lo quita', () => {
    const d1 = apply(legacy, chargeWrite(legacy, { cat: 'campanas', detalle: 'Otro envío', cc: 'campañas', precio: '30' }));
    expect(variableCharges(d1).filter((c) => c.cat === 'campanas')).toHaveLength(2);
    const second = variableCharges(d1).find((c) => c.detalle === 'Otro envío');
    const d2 = apply(d1, chargeRemove(d1, second.id));
    expect(variableCharges(d2).map((c) => c.detalle)).toEqual(['Envio de email', 'bbdd RSPO']);
  });
  it('un cargo que queda vacío se borra', () => {
    const d = { 'cargo:a': { cat: 'otros', cc: 'otros', pos: 0 } };
    const w = chargeWrite(d, { id: 'a', cc: '' });
    expect(w.patch).toEqual({});
    expect(w.remove).toEqual(['cargo:a']);
    expect(chargeSummary({ cat: 'campanas', detalle: 'Paid', precio: '175' })).toBe('Campañas · Paid · 175');
  });
});

describe('tabla tipo Excel', () => {
  it('una celda por columna; con 2 cargos muestra el resumen', () => {
    const d = { pais: 'España', 'cargo:a': { cat: 'campanas', detalle: 'Paid', cc: 'campañas', precio: '175', pos: 0 }, 'cargo:b': { cat: 'campanas', detalle: 'ISO', precio: '440', pos: 1 }, 'cargo:c': { cat: 'content', detalle: 'Presentación', precio: '50', pos: 2 } };
    const v = variablesViewData(d);
    expect(v.pais).toBe('España');
    expect(v['cargo:a']).toBeUndefined();
    expect(v.campanasDetalle).toBe('2 cargos: Paid + ISO');
    expect(v.campanasCc).toBe('campañas');
    expect(v.campanasPrecio).toBe('615');
    expect(v.contentPrecio).toBe('50');
    expect(v._multi).toEqual({ campanas: 2 });
  });
  it('editar una celda crea o cambia el cargo', () => {
    const empty = { pais: 'Chile' };
    const w = viewCellPatch(empty, 'eventosPrecio', '500');
    const d = apply(empty, w);
    expect(variableCharges(d)).toMatchObject([{ cat: 'eventos', cc: 'events', precio: '500' }]);
    const w2 = viewCellPatch(d, 'eventosDetalle', 'Webinar');
    expect(variableCharges(apply(d, w2))[0].detalle).toBe('Webinar');
    expect(viewCellPatch(d, 'pais', 'x')).toBeNull(); // no es una celda de cargo
    expect(viewCellPatch(empty, 'eventosPrecio', '')).toEqual({ patch: {}, remove: [] });
    const two = { 'cargo:a': { cat: 'eventos', precio: '1' }, 'cargo:b': { cat: 'eventos', precio: '2' } };
    expect(viewCellPatch(two, 'eventosPrecio', '9')).toBeNull(); // 2+ cargos: se edita en la lista
  });
});

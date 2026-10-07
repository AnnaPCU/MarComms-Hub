// ════════════════════════════════════════════════════════════════════
// Tests para utils/hubspotBilling — lectura del Excel y cálculos
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { workbookToGrids } from './xlsxGrid';
import {
  parseBillingWorkbook, parseLicenses, parseUsers, monthTotals, latestBilledMonth, previousMonth,
  expectedPrice, priceCheck, totalCheck, userLicenseCheck, monthOf, diffImport,
} from './hubspotBilling';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const buildWorkbook = ({ summary = true } = {}) => {
  const rows = [
    ['TOTAL', 'Filter', 'Detalle', 'CU Cert Argentina', 'PS Argentina', 'CU Ecuador'],
    [null, 'Yes', 'Entidad', '538 - Control Union Argentina S.A.', '592 - Peterson Consultancy S.A.', '566 - Control Union Ecuador'],
    [null, 'Yes', 'Manager', 'Juan Gebbie', 'Martin Dacharry', 'Wilson Mieles'],
    [null, 'Yes', 'Usuarios', '°Martin\n°Tomas', '-Usuario Compartido\n°Simon', '-Xavier\n-Lissette'],
  ];
  MONTHS.forEach((m) => {
    const data = {
      Septiembre: [[290, 265, 240], ['2 Licencias Sales Pro', '1 Licencias Sales Pro\n1 Licencias Core', '2 Licencias Core'], 555],
      Octubre: [[290, 500, 240], ['2 Licencias Sales Pro', '1 Licencias Sales Pro\n1 Licencias Core', '2 Licencias Core + Trainings'], 790],
    }[m];
    rows.push([data ? data[2] : 0, 'No', `${m} - Precio`, ...(data ? data[0] : [0, 0, 0])]);
    rows.push([null, 'No', `${m} - Detalle`, ...(data ? data[1] : [])]);
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Facturacion HUBSPOT');
  if (summary) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Licencia Sales Pro', 145], ['Licencia Core', 120], ['CU Cert Arg', 290], ['PCU Ecuador', 240], ['Otra', 1]]), 'Summary');
  return wb;
};
const parse = (opts) => parseBillingWorkbook(workbookToGrids(XLSX, buildWorkbook(opts)));

describe('lectura del Excel', () => {
  it('lee entidades, manager, usuarios y meses', () => {
    const { entities } = parse();
    expect(entities.map((e) => e.key)).toEqual(['CU Cert Argentina', 'PS Argentina', 'CU Ecuador']);
    expect(entities[1]).toMatchObject({ legalEntity: '592 - Peterson Consultancy S.A.', manager: 'Martin Dacharry' });
    expect(entities[1].users).toEqual([{ name: 'Usuario Compartido', license: 'core' }, { name: 'Simon', license: 'salesPro' }]);
    expect(monthOf(entities[0], 'Octubre')).toMatchObject({ price: 290, detail: '2 Licencias Sales Pro' });
    expect(monthOf(entities[0], 'Enero').price).toBe(0);
  });

  it('lee tarifas y precios de Summary, emparejando nombres parecidos', () => {
    const { meta, warnings } = parse();
    expect(meta.unitPrices).toEqual({ salesPro: 145, core: 120 });
    expect(meta.summaryPrices.find((p) => p.label === 'CU Cert Arg').entityKey).toBe('CU Cert Argentina');
    expect(meta.summaryPrices.find((p) => p.label === 'PCU Ecuador').entityKey).toBe('CU Ecuador');
    expect(warnings.some((w) => w.includes('«Otra» no coincide'))).toBe(true);
    expect(parse({ summary: false }).meta.unitPrices).toEqual({ salesPro: 145, core: 120 });
  });

  it('avisa si el TOTAL del Excel no suma todas las entidades', () => {
    const { warnings } = parse();
    expect(warnings.some((w) => w.startsWith('Septiembre: el TOTAL del Excel dice $555 pero las entidades suman $795 (no incluye CU Ecuador)'))).toBe(true);
    expect(warnings.some((w) => w.startsWith('Octubre'))).toBe(true);
  });
});

describe('licencias y usuarios', () => {
  it('parsea licencias y otros conceptos del detalle', () => {
    expect(parseLicenses('2 Licencias Sales Pro\n3 Licencias Core + Trainings')).toEqual({ salesPro: 2, core: 3, extras: ['Trainings'] });
    expect(parseLicenses('1 Licencia Core')).toEqual({ salesPro: 0, core: 1, extras: [] });
    expect(parseLicenses('Implementacion CRM')).toEqual({ salesPro: 0, core: 0, extras: ['Implementacion CRM'] });
    expect(parseLicenses('0 Licencias Core')).toEqual({ salesPro: 0, core: 0, extras: [] });
  });
  it('° es Sales Pro y - es Core', () => {
    expect(parseUsers('°Ana\n-Juan\nSin marca')).toEqual([{ name: 'Ana', license: 'salesPro' }, { name: 'Juan', license: 'core' }, { name: 'Sin marca', license: '' }]);
  });
});

describe('cálculos', () => {
  it('totales por mes con la suma real y último mes facturado', () => {
    const { entities, meta } = parse();
    const t = monthTotals(entities);
    expect(t.find((x) => x.month === 'Octubre')).toMatchObject({ total: 1030, billed: 3 });
    expect(latestBilledMonth(entities)).toBe('Octubre');
    expect(previousMonth('Octubre')).toBe('Septiembre');
    expect(totalCheck(entities, meta, 'Octubre')).toEqual({ excel: 790, computed: 1030, diff: 240, missing: ['CU Ecuador'] });
  });

  it('precio esperado = licencias × tarifa; otros conceptos explican la diferencia', () => {
    const { entities, meta } = parse();
    const ps = monthOf(entities[1], 'Octubre');
    expect(expectedPrice(ps, meta.unitPrices)).toBe(265);
    expect(priceCheck(ps, meta.unitPrices)).toMatchObject({ expected: 265, diff: 235, explained: false });
    expect(priceCheck(monthOf(entities[2], 'Octubre'), meta.unitPrices)).toMatchObject({ diff: 0, explained: true });
    expect(priceCheck(monthOf(entities[0], 'Enero'), meta.unitPrices)).toBeNull();
  });

  it('usuarios vs licencias del mes', () => {
    const { entities } = parse();
    expect(userLicenseCheck(entities[1], monthOf(entities[1], 'Octubre')).ok).toBe(true);
    expect(userLicenseCheck(entities[0], { detail: '1 Licencias Sales Pro' }).ok).toBe(false);
  });

  it('diffImport: nuevas, actualizadas con meses cambiados y borradas', () => {
    const { entities } = parse();
    const changed = { ...entities[0], months: entities[0].months.map((m) => (m.month === 'Octubre' ? { ...m, price: 435 } : m)) };
    const d = diffImport([entities[0], entities[1], { key: 'Vieja', months: [] }], [changed, entities[1], entities[2]]);
    expect(d.added).toEqual([{ key: 'CU Ecuador' }]);
    expect(d.updated).toEqual([{ key: 'CU Cert Argentina', changedMonths: ['Octubre'], otherChanged: false }]);
    expect(d.unchanged.map((x) => x.key)).toEqual(['PS Argentina']);
    expect(d.removed).toEqual(['Vieja']);
  });
});

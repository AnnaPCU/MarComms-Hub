// ════════════════════════════════════════════════════════════════════
// xlsxGrid — Workbook de SheetJS → grillas simples por hoja
// ════════════════════════════════════════════════════════════════════
// Recibe el módulo `xlsx` (se carga con import dinámico, así no pesa en el
// bundle principal) y el workbook leído. Devuelve { [hoja]: filas[][] } con
// coordenadas absolutas: grid[0][0] es A1. Los valores son los guardados
// por Excel (en las fórmulas, el último resultado calculado).
// ════════════════════════════════════════════════════════════════════

export const workbookToGrids = (XLSX, workbook) => {
  const grids = {};
  (workbook.SheetNames || []).forEach((name) => {
    const ws = workbook.Sheets[name];
    const grid = [];
    Object.keys(ws || {}).forEach((ref) => {
      if (ref[0] === '!') return;
      const cell = ws[ref];
      if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return;
      const { r, c } = XLSX.utils.decode_cell(ref);
      if (!grid[r]) grid[r] = [];
      grid[r][c] = cell.v instanceof Date ? cell.v : cell.v;
    });
    grids[name] = grid;
  });
  return { sheetNames: [...(workbook.SheetNames || [])], grids };
};

// Lee un File/ArrayBuffer de Excel en el navegador
export const readExcelFile = async (file) => {
  const XLSX = await import('xlsx');
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  return workbookToGrids(XLSX, workbook);
};

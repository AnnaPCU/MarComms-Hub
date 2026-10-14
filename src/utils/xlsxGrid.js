// ════════════════════════════════════════════════════════════════════
// xlsxGrid — Workbook de SheetJS → grillas simples por hoja
// ════════════════════════════════════════════════════════════════════
// Recibe el módulo `xlsx` (se carga con import dinámico, así no pesa en el
// bundle principal) y el workbook leído. Devuelve { [hoja]: filas[][] } con
// coordenadas absolutas: grid[0][0] es A1. Los valores son los guardados
// por Excel (en las fórmulas, el último resultado calculado).
// Aparte, `links` trae la URL de las celdas con hipervínculo (mismas
// coordenadas): en el Excel el texto visible puede ser "Reporte.html" y
// la URL estar solo en el vínculo.
// ════════════════════════════════════════════════════════════════════

// SheetJS deja el destino del vínculo con las entidades del XML (&amp;)
const decodeXml = (s) => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export const workbookToGrids = (XLSX, workbook) => {
  const grids = {};
  const links = {};
  (workbook.SheetNames || []).forEach((name) => {
    const ws = workbook.Sheets[name];
    const grid = [];
    const linkGrid = [];
    Object.keys(ws || {}).forEach((ref) => {
      if (ref[0] === '!') return;
      const cell = ws[ref];
      if (!cell) return;
      const { r, c } = XLSX.utils.decode_cell(ref);
      const target = cell.l && cell.l.Target;
      if (target && /^https?:\/\//i.test(target)) {
        if (!linkGrid[r]) linkGrid[r] = [];
        linkGrid[r][c] = decodeXml(target);
      }
      if (cell.v === undefined || cell.v === null || cell.v === '') return;
      if (!grid[r]) grid[r] = [];
      grid[r][c] = cell.v;
    });
    grids[name] = grid;
    links[name] = linkGrid;
  });
  return { sheetNames: [...(workbook.SheetNames || [])], grids, links };
};

// Lee un File/ArrayBuffer de Excel en el navegador
export const readExcelFile = async (file) => {
  const XLSX = await import('xlsx');
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  return workbookToGrids(XLSX, workbook);
};

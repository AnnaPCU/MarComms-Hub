// ════════════════════════════════════════════════════════════════════
// InvoicingSheets — Las vistas de cada hoja del Excel de Facturación
// ════════════════════════════════════════════════════════════════════
//   FijoSheet       «Fijo y facturas -CARGA ADMIN»
//   VariablesSheet  «Variables (todos)» (lista de cargos o tabla tipo Excel)
//   MktSheet        «MKT Plan (Felo)» (tabla + zona libre)
//   CrmSheet        «CRM (Ale)» (licencias + conceptos y totales)
//   OfficesSheet    «Entidades» (no depende del mes)
//
// Todas reciben: month, rows (todas las filas), api (useInvoicing), run
// (corre una escritura y muestra el error si falla), askDelete(row) →
// Promise<bool>, filters ({ q, brand }), compact, changes ({ cells,
// added } de «Qué cambió», o null), prevLabel, focusRow (id para
// resaltar), people (equipo, para etiquetar con @ en las notas) y,
// Variables, varView ('lista' | 'tabla').
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  CRM_COLUMNS, FIJO_COLUMNS, FIJO_HEADER_GROUPS, FIJO_ROW_KINDS, MKT_COLUMNS, OFFICES_COLUMNS, PENDING_STATUS, VARIABLE_CATEGORIES,
  variablesColumns, variablesHeaderGroups,
} from '@/constants/invoicing';
import { crmLicenses, formatAmount, isBillable } from '@/utils/invoicing';
import { variablesViewData, viewCellPatch } from '@/utils/invoicingCharges';
import { sheetRows, useInvoicingSheet } from '@/hooks/useInvoicingSheet';
import InvoiceGrid from './InvoiceGrid';
import ChargesList from './ChargesList';
import FreeGrid from './FreeGrid';
import CrmExtraTable from './CrmExtraTable';
import SheetNotes from './SheetNotes';
import StatusBar from './StatusBar';

export const CUENTAS_LIST_ID = 'invoicing-cuentas';

const Hint = ({ children }) => (
  <p className="flex items-start gap-1.5 text-[11px] font-bold text-slate-500"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" /><span>{children}</span></p>
);
const Internal = () => (
  <span className="inline-block rounded-md bg-yellow-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-800">Para control interno</span>
);
const real = (r) => r?.raw || r;

// Acciones comunes de una grilla de un mes
const gridHandlers = ({ month, sheet, api, run, askDelete }) => ({
  onPatch: (row, patch, remove) => run(() => api.patchCell(real(row), patch, remove)),
  onStatus: (row, next) => run(() => (next === PENDING_STATUS ? api.patchCell(real(row), {}, ['estado']) : api.patchCell(real(row), { estado: next }))),
  onAddRow: (after) => run(() => api.addRow(month, sheet, real(after))),
  onMoveRow: (row, dir) => run(() => api.moveRow(real(row), dir)),
  onDeleteRow: async (row) => { if (await askDelete(real(row))) run(() => api.removeRow(real(row))); },
});

// Resalta y muestra la fila pedida desde «Qué cambió» o «Para revisar»
const useFocusRow = (focusRow) => {
  useEffect(() => {
    if (!focusRow) return undefined;
    const el = document.querySelector(`[data-row-id="${focusRow}"]`);
    if (!el) return undefined;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-400');
    const t = setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2500);
    return () => clearTimeout(t);
  }, [focusRow]);
};

function Notes({ month, rows, sheet, api, run, people }) {
  const notes = sheetRows(rows, month, 'notas')[0]?.data || {};
  return <SheetNotes people={people} value={notes[sheet] || ''} onSave={(text) => run(() => (text ? api.patchSingleton(month, 'notas', { [sheet]: text }) : api.patchSingleton(month, 'notas', {}, [sheet])))} />;
}

export function FijoSheet(props) {
  const { month, rows, api, run, filters, compact, changes, prevLabel, focusRow } = props;
  const sh = useInvoicingSheet({ rows, month, sheet: 'fijo', columns: FIJO_COLUMNS, filters });
  useFocusRow(focusRow);
  return (
    <div className="space-y-3">
      <StatusBar stats={sh.stats} picked={sh.statusPick} onPick={sh.setStatusPick} />
      <InvoiceGrid
        grid="fijo"
        sheet="fijo"
        columns={FIJO_COLUMNS}
        headerGroups={FIJO_HEADER_GROUPS}
        rows={sh.visible}
        ctxById={sh.ctxById}
        compact={compact}
        groupBy="pais"
        collapsed={sh.collapsed}
        onToggleGroup={sh.toggleGroup}
        changes={changes}
        prevLabel={prevLabel}
        totals={sh.totals}
        totalsLabel={sh.filtered ? 'Total (lo filtrado)' : 'Total a cobrar'}
        listFor={{ cuenta: CUENTAS_LIST_ID }}
        isBillable={(r) => isBillable('fijo', r.data, sh.ctxById[r.id])}
        rowClass={(r) => (r.data?.kind === FIJO_ROW_KINDS.group ? 'bg-slate-100 font-black' : '')}
        rowActions={(r) => [r.data?.kind === FIJO_ROW_KINDS.group
          ? { label: 'Pasar a fila normal (suma al total)', onClick: () => run(() => api.patchCell(r, {}, ['kind'])) }
          : { label: 'Pasar a fila gris (grupo, no suma)', onClick: () => run(() => api.patchCell(r, { kind: FIJO_ROW_KINDS.group }, ['totalManual', 'estado'])) }]}
        emptyText={sh.filtered ? 'Ninguna fila coincide con el filtro.' : 'Todavía no hay filas.'}
        {...gridHandlers({ ...props, sheet: 'fijo' })}
      />
      <Hint>Total a cobrar = Valor + Country Website + Valor Plan MKT. Las filas grises son de grupo (el valor que se reparte entre las de abajo) y no suman. Las filas que las siguen usan <span className="font-mono">=grupo/3</span> (ƒ celeste): si cambia la fila gris, se actualizan solas; para fijar un número, escribilo en la celda. También valen cuentas como <span className="font-mono">=350/4*3</span>.</Hint>
      <Notes {...props} sheet="fijo" />
    </div>
  );
}

function CategoryTotals({ totals }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Totales por categoría">
      {VARIABLE_CATEGORIES.map((c) => (
        <span key={c.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-black ${c.chip}`}>
          {c.short} <span className="font-mono tabular-nums">{formatAmount(totals[`${c.id}Precio`] ?? 0)}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">Total <span className="font-mono tabular-nums">{formatAmount(totals.total ?? 0)}</span></span>
    </div>
  );
}

export function VariablesSheet(props) {
  const { month, rows, api, run, filters, compact, changes, prevLabel, focusRow, varView = 'lista' } = props;
  const columns = useMemo(() => variablesColumns(), []);
  const sh = useInvoicingSheet({ rows, month, sheet: 'variables', columns, filters });
  useFocusRow(focusRow);
  const viewRows = useMemo(() => sh.visible.map((r) => ({ ...r, data: variablesViewData(r.data), raw: r })), [sh.visible]);
  const handlers = gridHandlers({ ...props, sheet: 'variables' });
  // Una celda de la tabla tipo Excel → cargo
  const onPatchView = (viewRow, patch = {}, remove = []) => {
    const row = real(viewRow); const out = { patch: {}, remove: [] };
    const apply = (k, raw) => { const p = viewCellPatch(row.data, k, raw); if (p) { Object.assign(out.patch, p.patch); out.remove.push(...p.remove); } else if (raw === '') out.remove.push(k); else out.patch[k] = raw; };
    Object.entries(patch).forEach(([k, v]) => apply(k, v));
    remove.forEach((k) => apply(k, ''));
    return run(() => api.patchCell(row, out.patch, out.remove));
  };
  return (
    <div className="space-y-3">
      <StatusBar stats={sh.stats} picked={sh.statusPick} onPick={sh.setStatusPick} />
      {varView === 'tabla' ? (
        <InvoiceGrid
          grid="variables"
          sheet="variables"
          columns={columns}
          headerGroups={variablesHeaderGroups()}
          rows={viewRows}
          compact={compact}
          groupBy="pais"
          collapsed={sh.collapsed}
          onToggleGroup={sh.toggleGroup}
          changes={changes}
          prevLabel={prevLabel}
          totals={sh.totals}
          totalsLabel={sh.filtered ? 'Total (lo filtrado)' : 'Total'}
          listFor={{ cuenta: CUENTAS_LIST_ID }}
          isBillable={(r) => isBillable('variables', r.data)}
          cellReadOnly={(r, col) => !!(col.cat && r.data?._multi?.[col.cat])}
          emptyText={sh.filtered ? 'Ninguna fila coincide con el filtro.' : 'Todavía no hay filas.'}
          {...handlers}
          onPatch={onPatchView}
        />
      ) : (
        <>
          <CategoryTotals totals={sh.totals} />
          <ChargesList
            grid="variables"
            rows={sh.visible}
            collapsed={sh.collapsed}
            onToggleGroup={sh.toggleGroup}
            compact={compact}
            changes={changes}
            prevLabel={prevLabel}
            listFor={{ cuenta: CUENTAS_LIST_ID }}
            onPatch={handlers.onPatch}
            onStatus={handlers.onStatus}
            onAddRow={handlers.onAddRow}
            onDeleteRow={handlers.onDeleteRow}
          />
        </>
      )}
      <Hint>{varView === 'tabla' ? 'La tabla como en el Excel. Una categoría con dos o más cargos muestra la suma y se edita desde la vista de lista.' : 'Cada entidad con sus cargos del mes; puede haber varios por categoría. El total de la entidad suma todos sus cargos.'} Si un país repite el de arriba, se ve en gris (como las celdas combinadas del Excel).</Hint>
      <Notes {...props} sheet="variables" />
    </div>
  );
}

export function MktSheet(props) {
  const { month, rows, api, run, filters, compact, changes, prevLabel, focusRow, people } = props;
  const sh = useInvoicingSheet({ rows, month, sheet: 'mkt', columns: MKT_COLUMNS, filters });
  useFocusRow(focusRow);
  const free = sheetRows(rows, month, 'mkt_libre')[0]?.data || {};
  return (
    <div className="space-y-4">
      <Internal />
      <InvoiceGrid
        grid="mkt"
        sheet="mkt"
        columns={MKT_COLUMNS}
        rows={sh.visible}
        compact={compact}
        changes={changes}
        prevLabel={prevLabel}
        totals={sh.totals}
        {...gridHandlers({ ...props, sheet: 'mkt' })}
      />
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Notas y cuentas de la hoja <span className="normal-case tracking-normal font-bold text-slate-400">· con @ etiquetás a alguien del equipo y le llega un aviso</span></p>
        <FreeGrid grid="mkt-libre" data={free} people={people} onPatch={(patch, remove) => run(() => api.patchSingleton(month, 'mkt_libre', patch, remove))} />
      </div>
    </div>
  );
}

export function CrmSheet(props) {
  const { month, rows, api, run, askDelete, filters, compact, changes, prevLabel, focusRow } = props;
  const sh = useInvoicingSheet({ rows, month, sheet: 'crm', columns: CRM_COLUMNS, filters });
  useFocusRow(focusRow);
  const extra = sheetRows(rows, month, 'crm_extra');
  const licenses = crmLicenses(sh.all);
  return (
    <div className="space-y-4">
      <Internal />
      <StatusBar stats={sh.stats} picked={sh.statusPick} onPick={sh.setStatusPick} />
      <InvoiceGrid
        grid="crm"
        sheet="crm"
        columns={CRM_COLUMNS}
        rows={sh.visible}
        compact={compact}
        changes={changes}
        prevLabel={prevLabel}
        totals={{ monto: sh.totals.monto }}
        totalsLabel={sh.filtered ? 'Total (lo filtrado)' : 'TOTAL (USD)'}
        isBillable={(r) => isBillable('crm', r.data)}
        {...gridHandlers({ ...props, sheet: 'crm' })}
      />
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Conceptos y totales de abajo</p>
        <CrmExtraTable
          grid="crm-extra"
          rows={extra}
          licenses={licenses}
          onPatch={(row, patch, remove) => run(() => api.patchCell(row, patch, remove))}
          onAdd={(data) => run(() => api.addRow(month, 'crm_extra', null, data))}
          onMove={(row, dir) => run(() => api.moveRow(row, dir))}
          onDelete={async (row) => { if (await askDelete(row)) run(() => api.removeRow(row)); }}
        />
      </div>
      <Notes {...props} sheet="crm" />
    </div>
  );
}

export function OfficesSheet(props) {
  const { rows, filters, compact } = props;
  const sh = useInvoicingSheet({ rows, month: null, sheet: 'entidades', columns: OFFICES_COLUMNS, filters });
  return (
    <div className="space-y-3">
      <span className="text-[11px] font-bold text-slate-400">{sh.visible.length} de {sh.all.length} entidades · no depende del mes</span>
      <InvoiceGrid
        grid="entidades"
        sheet="entidades"
        columns={OFFICES_COLUMNS}
        rows={sh.visible}
        compact={compact}
        canMove={!sh.filtered}
        emptyText={sh.filtered ? 'No hay entidades que coincidan.' : 'Todavía no hay entidades.'}
        {...gridHandlers({ ...props, month: null, sheet: 'entidades' })}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// InvoicingSheets — Las vistas de cada hoja del Excel de Facturación
// ════════════════════════════════════════════════════════════════════
//   FijoSheet       «Fijo y facturas -CARGA ADMIN»
//   VariablesSheet  «Variables (todos)»
//   MktSheet        «MKT Plan (Felo)» (tabla + zona libre)
//   CrmSheet        «CRM (Ale)» (licencias + conceptos y totales)
//   OfficesSheet    «Entidades» (no depende del mes)
//
// Todas reciben: month, rows (todas las filas), api (useInvoicing), run
// (corre una escritura y muestra el error si falla), askDelete(row) →
// Promise<bool>.
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { Info, Search } from 'lucide-react';
import {
  CRM_COLUMNS, FIJO_COLUMNS, FIJO_HEADER_GROUPS, FIJO_ROW_KINDS, MKT_COLUMNS, OFFICES_COLUMNS,
  variablesColumns, variablesHeaderGroups,
} from '@/constants/invoicing';
import { crmLicenses, sheetTotals, sortRows } from '@/utils/invoicing';
import InvoiceGrid from './InvoiceGrid';
import FreeGrid from './FreeGrid';
import CrmExtraTable from './CrmExtraTable';
import SheetNotes from './SheetNotes';

export const CUENTAS_LIST_ID = 'invoicing-cuentas';

const of = (rows, month, sheet) => sortRows(rows.filter((r) => (r.month || null) === (month || null) && r.sheet === sheet));

const Hint = ({ children }) => (
  <p className="flex items-start gap-1.5 text-[11px] font-bold text-slate-500"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />{children}</p>
);
const Internal = () => (
  <span className="inline-block rounded-md bg-yellow-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-800">Para control interno</span>
);

// Acciones comunes de una grilla de un mes
const gridHandlers = ({ month, sheet, api, run, askDelete }) => ({
  onPatch: (row, patch, remove) => run(() => api.patchCell(row, patch, remove)),
  onAddRow: (after) => run(() => api.addRow(month, sheet, after)),
  onMoveRow: (row, dir) => run(() => api.moveRow(row, dir)),
  onDeleteRow: async (row) => { if (await askDelete(row)) run(() => api.removeRow(row)); },
});

function Notes({ month, rows, sheet, api, run }) {
  const notes = of(rows, month, 'notas')[0]?.data || {};
  return <SheetNotes value={notes[sheet] || ''} onSave={(text) => run(() => (text ? api.patchSingleton(month, 'notas', { [sheet]: text }) : api.patchSingleton(month, 'notas', {}, [sheet])))} />;
}

export function FijoSheet(props) {
  const { month, rows } = props;
  const list = of(rows, month, 'fijo');
  return (
    <div className="space-y-3">
      <InvoiceGrid
        grid="fijo"
        sheet="fijo"
        columns={FIJO_COLUMNS}
        headerGroups={FIJO_HEADER_GROUPS}
        rows={list}
        totals={sheetTotals('fijo', list, FIJO_COLUMNS)}
        totalsLabel="Total a cobrar"
        listFor={{ cuenta: CUENTAS_LIST_ID }}
        rowClass={(r) => (r.data?.kind === FIJO_ROW_KINDS.group ? 'bg-slate-100 font-black' : '')}
        rowActions={(r) => [r.data?.kind === FIJO_ROW_KINDS.group
          ? { label: 'Pasar a fila normal (suma al total)', onClick: () => props.run(() => props.api.patchCell(r, {}, ['kind'])) }
          : { label: 'Pasar a fila de grupo (no suma)', onClick: () => props.run(() => props.api.patchCell(r, { kind: FIJO_ROW_KINDS.group }, ['totalManual'])) }]}
        {...gridHandlers({ ...props, sheet: 'fijo' })}
      />
      <Hint>Total a cobrar = Valor + Country Website + Valor Plan MKT. Las filas en gris son de grupo (el valor que se reparte entre las de abajo) y no suman. En los números se puede escribir una cuenta, como en el Excel: =350/4*3.</Hint>
      <Notes {...props} sheet="fijo" />
    </div>
  );
}

export function VariablesSheet(props) {
  const { month, rows } = props;
  const list = of(rows, month, 'variables');
  const columns = useMemo(() => variablesColumns(), []);
  return (
    <div className="space-y-3">
      <InvoiceGrid
        grid="variables"
        sheet="variables"
        columns={columns}
        headerGroups={variablesHeaderGroups()}
        rows={list}
        totals={sheetTotals('variables', list, columns)}
        listFor={{ cuenta: CUENTAS_LIST_ID }}
        {...gridHandlers({ ...props, sheet: 'variables' })}
      />
      <Hint>El Total de cada fila suma los seis precios. Si un país repite el de arriba, se ve en gris (como las celdas combinadas del Excel).</Hint>
      <Notes {...props} sheet="variables" />
    </div>
  );
}

export function MktSheet(props) {
  const { month, rows, api, run } = props;
  const list = of(rows, month, 'mkt');
  const free = of(rows, month, 'mkt_libre')[0]?.data || {};
  return (
    <div className="space-y-4">
      <Internal />
      <InvoiceGrid
        grid="mkt"
        sheet="mkt"
        columns={MKT_COLUMNS}
        rows={list}
        totals={sheetTotals('mkt', list, MKT_COLUMNS)}
        {...gridHandlers({ ...props, sheet: 'mkt' })}
      />
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Notas y cuentas de la hoja</p>
        <FreeGrid grid="mkt-libre" data={free} onPatch={(patch, remove) => run(() => api.patchSingleton(month, 'mkt_libre', patch, remove))} />
      </div>
    </div>
  );
}

export function CrmSheet(props) {
  const { month, rows, api, run, askDelete } = props;
  const list = of(rows, month, 'crm');
  const extra = of(rows, month, 'crm_extra');
  const licenses = crmLicenses(list);
  return (
    <div className="space-y-4">
      <Internal />
      <InvoiceGrid
        grid="crm"
        sheet="crm"
        columns={CRM_COLUMNS}
        rows={list}
        totals={{ monto: licenses }}
        totalsLabel="TOTAL (USD)"
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
  const { rows } = props;
  const [q, setQ] = useState('');
  const all = of(rows, null, 'entidades');
  const term = q.trim().toLowerCase();
  const list = term ? all.filter((r) => Object.values(r.data || {}).some((v) => String(v).toLowerCase().includes(term))) : all;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar oficina, cuenta o responsable" className="w-72 max-w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-300" />
        </label>
        <span className="text-[11px] font-bold text-slate-400">{list.length} de {all.length} · no depende del mes</span>
      </div>
      <InvoiceGrid
        grid="entidades"
        sheet="entidades"
        columns={OFFICES_COLUMNS}
        rows={list}
        canMove={!term}
        emptyText={term ? 'No hay entidades que coincidan.' : 'Todavía no hay entidades.'}
        {...gridHandlers({ ...props, month: null, sheet: 'entidades' })}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// LicensesPanel — Licencias de HubSpot de una entidad y si se usan
// ════════════════════════════════════════════════════════════════════
// Nov 2026 (migration 0079): en la ficha del Weekly / Global check.
// Los usuarios salen del CRM (global, nov 2026): cada usuario activo de
// HubSpot va a la entidad de la mayoría de sus deals. Arriba, el resumen
// (usuarios, activos / inactivos y tipo de licencia cuando se conoce: el
// API de owners no lo da, sale de Facturación HubSpot, solo Americas).
// Debajo, una fila por usuario con su licencia, el estado y la última
// actividad. Activo = creó o editó un deal, contacto o empresa en los
// últimos 30 días.
// Botón «Update»: usuarios y después contactos / empresas (refreshCrm).
//
// Props: users (hubspotUsers), code, sync (crmSync), onRefresh, color,
//   unit / onUnit (unidad de negocio elegida, compartida con New in HubSpot)
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ACTIVE_DAYS, daysSince, entityLicenses, licenseLabel, nameTokens, userStatus } from '@/utils/crmWeeklyCrm';

const STATUS = {
  active:   { label: 'Active',                  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactive',                cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  archived: { label: 'Deactivated in HubSpot',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  notFound: { label: 'Not found in HubSpot',    cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  shared:   { label: 'Shared user',             cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

function lastActivityText(u) {
  const st = userStatus(u);
  if (st === 'shared') return 'Shared account: activity cannot be tracked';
  if (st === 'notFound') return 'This name does not match any HubSpot user';
  if (!u.lastActivityAt) return `No activity in the last ${ACTIVE_DAYS} days`;
  const d = daysSince(u.lastActivityAt);
  return `Last activity ${fmtDate(u.lastActivityAt)} (${d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`})`;
}

function UserRow({ u }) {
  const st = STATUS[userStatus(u)];
  return (
    <li className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black text-slate-800 truncate">
          {u.name}
          {u.hubspotName && nameTokens(u.hubspotName).join(' ') !== nameTokens(u.name).join(' ') && <span className="ml-1.5 font-bold text-slate-400">({u.hubspotName} in HubSpot)</span>}
        </p>
        <p className="text-[10px] font-bold text-slate-400 truncate">{lastActivityText(u)}</p>
      </div>
      {u.license && (
        <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">{licenseLabel(u.license)}</span>
      )}
      <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest border rounded-md px-1.5 py-0.5 ${st.cls}`}>{st.label}</span>
    </li>
  );
}

const chipCls = (on) => `px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${on ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300'}`;

export default function LicensesPanel({ users = [], code, sync = {}, onRefresh, color, unit = '', onUnit }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { users: list, units, summary } = entityLicenses(users, code, unit);
  const chips = unit && !units.includes(unit) ? [...units, unit] : units;
  const usersSync = sync.users || {};
  const failed = [sync.users, sync.objects].find((x) => x && x.ok === false);

  const refresh = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await onRefresh();
      if (r?.skipped) setMsg(r.message);
    } catch (e) {
      setMsg(e?.message || 'Could not update. Please try again in a while.');
    } finally { setBusy(false); }
  };

  return (
    <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>HubSpot licenses</p>
        <span className="text-[10px] font-bold text-slate-400">{usersSync.lastOkAt ? `Updated ${fmtDateTime(usersSync.lastOkAt)}` : 'No data yet'} · active = used HubSpot in the last {ACTIVE_DAYS} days («Last Active»)</span>
        {onRefresh && (
          <button onClick={refresh} disabled={busy} className="ml-auto bg-white border border-slate-200 hover:border-sky-300 hover:text-sky-700 text-slate-600 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50" title="Fetch the HubSpot users, their activity and the contacts / companies created (takes about two minutes)">
            <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Updating…' : 'Update'}
          </button>
        )}
      </div>
      {failed && (
        <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-[11px] font-bold flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>The last update failed ({fmtDateTime(failed.lastRunAt)}): {failed.error} The data shown is from the last successful run.</span>
        </p>
      )}
      {msg && <p className="text-[11px] font-bold text-slate-500">{msg}</p>}
      {onUnit && chips.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Business unit">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">Business unit</span>
          <button onClick={() => onUnit('')} aria-pressed={!unit} className={chipCls(!unit)}>All</button>
          {chips.map((u) => <button key={u} onClick={() => onUnit(u)} aria-pressed={unit === u} className={chipCls(unit === u)}>{u}</button>)}
        </div>
      )}

      {list.length > 0 ? (
        <>
          <div className="flex items-end gap-6 flex-wrap">
            <div>
              <p className="font-mono text-4xl font-black text-slate-900 leading-none">{summary.total}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5">HubSpot users</p>
            </div>
            <p className="text-[11px] font-bold text-slate-500">
              <span className="text-emerald-700">{summary.active} active</span> · <span className="text-amber-800">{summary.inactive} inactive</span>
            </p>
            <p className="text-[11px] font-bold text-slate-500">
              {summary.paid} paid license{summary.paid === 1 ? '' : 's'}{Object.keys(summary.bySeat).length ? ` (${Object.entries(summary.bySeat).map(([k, n]) => `${n} ${licenseLabel(k)}`).join(' · ')})` : ''}
              {summary.viewOnly ? ` · ${summary.viewOnly} view-only` : ''}{summary.noType ? ` · ${summary.noType} without seat data` : ''}
            </p>
          </div>
          <p className="text-[10px] font-medium text-slate-400">Users come from HubSpot: each user counts for the entity of their main team (the business unit is the team). Seat and «Last Active» come from HubSpot too.</p>
          <ul>{list.map((u) => <UserRow key={u.id} u={u} />)}</ul>
        </>
      ) : (
        <p className="text-[11px] font-bold text-slate-400">{unit ? `No HubSpot user has «${unit}» as main team in this entity.` : 'No HubSpot user has this entity as main team.'}</p>
      )}
    </section>
  );
}

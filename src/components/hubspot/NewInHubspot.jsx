// ════════════════════════════════════════════════════════════════════
// NewInHubspot — Deals, contactos y empresas nuevos de una entidad
// ════════════════════════════════════════════════════════════════════
// Nov 2026 (migration 0079): en la ficha del Weekly / Global check, una
// sección con pestañas Deals / Contacts / Companies. Las tres usan el
// mismo DealsPanel («Last 8 weeks» / «Since January»). Contactos y
// empresas se asignan a la entidad por el owner (o quien lo creó) y salen
// de crm_weekly_object_counts (objectsAsDeals les da la forma de los
// deals). Sin la 0079 (crmReady = false) queda solo Deals.
//
// Props: dealCounts, dealMonths, objectCounts, crmReady, code, dark, color,
//   unit / onUnit (unidad de negocio elegida, compartida con Licenses)
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { DealsPanel } from './DealsSpark';
import { objectsAsDeals } from '@/utils/crmWeeklyCrm';

const TABS = [
  { id: 'deals', label: 'Deals' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'companies', label: 'Companies' },
];

const tabCls = (on) => `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${on ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`;

export default function NewInHubspot({ dealCounts = [], dealMonths = [], objectCounts = [], crmReady = false, code, dark = false, color, unit = '', onUnit }) {
  const [tab, setTab] = useState('deals');
  const tabs = crmReady ? TABS : TABS.slice(0, 1);
  const active = tabs.some((t) => t.id === tab) ? tab : 'deals';
  const objects = useMemo(() => {
    if (active === 'deals') return null;
    return { counts: objectsAsDeals(objectCounts, active, 'week'), months: objectsAsDeals(objectCounts, active, 'month') };
  }, [objectCounts, active]);

  return (
    <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>New in HubSpot</p>
        {tabs.length > 1 && (
          <div className="flex gap-1" role="tablist" aria-label="Object">
            {tabs.map((t) => <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setTab(t.id)} className={tabCls(active === t.id)}>{t.label}</button>)}
          </div>
        )}
      </div>
      {active === 'deals' ? (
        <DealsPanel key={`deals-${code}`} counts={dealCounts} months={dealMonths} code={code} dark={dark} unit={unit} onUnit={onUnit} />
      ) : (
        <>
          <DealsPanel key={`${active}-${code}`} counts={objects.counts} months={objects.months} code={code} dark={dark} noun={active} unit={unit} onUnit={onUnit} />
          <p className="mt-2 text-[10px] font-medium text-slate-400">
            {active === 'contacts' ? 'Contacts' : 'Companies'} have no «PCU Entity»: each one counts for the entity and business unit of the main team of who created it (or, if unknown, of its owner). Imports are excluded.
          </p>
        </>
      )}
    </section>
  );
}

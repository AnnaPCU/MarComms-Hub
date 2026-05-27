// ════════════════════════════════════════════════════════════════════
// FacturacionApp — Módulo de Facturación
// ════════════════════════════════════════════════════════════════════
// Matriz mensual con 6 categorías. Selector mes/año.
// 4 vistas: Matriz / Por País / Por Unidad / Por Servicio.
// Export CSV con totales.
//
// Props:
//   onBack — volver al hub
//   webinars / campaigns / events / standaloneRequests — arrays globales
//   onNavigate(section) — navegar a otra sección
// ════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, BarChart3, Building2, DollarSign, Download, Globe,
  Plus, Receipt, Trash2, TrendingUp, Video, X,
} from 'lucide-react';

import { MARKETS } from '@/constants/markets';
import { STANDALONE_TO_CATEGORY } from '@/constants/standalones';

export default function FacturacionApp({ onBack, webinars, campaigns, events, standaloneRequests, onNavigate }) {
  // Mes seleccionado por defecto = mes actual
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [viewMode, setViewMode] = useState('matriz'); // matriz | pais | unidad | servicio
  const [manualItems, setManualItems] = useState([]);
  const [showAddManual, setShowAddManual] = useState(false);
  const [newManual, setNewManual] = useState({
    country: "", businessUnit: "", category: "content", detail: "", price: "", cc: ""
  });

  // Mapeo: categorías del Excel = columnas de la matriz
  const CATEGORIES = [
    { id: "campanas",    label: "Campañas",              short: "CC: Campañas",           color: "bg-purple-50 text-purple-700 border-purple-200",  accent: "purple" },
    { id: "bbdd",        label: "Campañas BBDD",         short: "CC: Campañas (BBDD)",    color: "bg-emerald-50 text-emerald-700 border-emerald-200", accent: "emerald" },
    { id: "eventos",     label: "Eventos",               short: "CC: Eventos",            color: "bg-orange-50 text-orange-700 border-orange-200",  accent: "orange" },
    { id: "content",     label: "Content",               short: "CC: Content",            color: "bg-blue-50 text-blue-700 border-blue-200",        accent: "blue" },
    { id: "social",      label: "Social & Websites",     short: "CC: Social Media & Websites", color: "bg-pink-50 text-pink-700 border-pink-200",    accent: "pink" },
    { id: "otros",       label: "Otros",                 short: "Otros",                  color: "bg-slate-50 text-slate-700 border-slate-200",     accent: "slate" }
  ];

  // Helper: ¿un item (con completedAt) cayó en el mes seleccionado?
  const isInMonth = (isoDate, monthKey) => {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === monthKey;
  };

  // Convertir items de los hubs en "rows" de facturación
  const buildRows = () => {
    const rows = [];

    // Webinars completados → Campañas
    (webinars || []).forEach(w => {
      if (!w.completedAt || !isInMonth(w.completedAt, selectedMonth)) return;
      if (!w.monto || Number(w.monto) === 0) return;
      rows.push({
        id: `w-${w.id}`,
        source: "webinar",
        country: w.pais || "—",
        businessUnit: w.unidadNegocio || "—",
        category: "campanas",
        detail: `Webinar: ${w.name}`,
        price: Number(w.monto) || 0,
        cc: "Campaña",
        completedAt: w.completedAt,
        linkTo: 'webinar'
      });
    });

    // Campañas completadas → según tipo
    (campaigns || []).forEach(c => {
      if (!c.completedAt || !isInMonth(c.completedAt, selectedMonth)) return;
      const fee = Number(c.budget || 0);
      if (fee === 0) return;
      const catMap = {
        email: "campanas",
        paid: "campanas",
        research: "campanas",
        database: "bbdd"
      };
      const typeLabel = {
        email: "Email Marketing",
        paid: "Paid Media",
        research: "Investigación",
        database: "BBDD"
      };
      rows.push({
        id: `c-${c.id}`,
        source: "campaign",
        country: c.country || "—",
        businessUnit: c.businessUnit || "—",
        category: catMap[c.type] || "campanas",
        detail: `${typeLabel[c.type] || c.type}: ${c.name}`,
        price: fee,
        cc: "Campaña",
        completedAt: c.completedAt,
        linkTo: 'campaigns'
      });
    });

    // Eventos completados → Eventos
    (events || []).forEach(ev => {
      if (!ev.completedAt || !isInMonth(ev.completedAt, selectedMonth)) return;
      const fee = Number(ev.fee || 0);
      if (fee === 0) return;
      rows.push({
        id: `e-${ev.id}`,
        source: "event",
        country: ev.country || "—",
        businessUnit: ev.businessUnit || "—",
        category: "eventos",
        detail: `Evento: ${ev.name}`,
        price: fee,
        cc: "Eventos",
        completedAt: ev.completedAt,
        linkTo: 'events'
      });
    });

    // Pedidos standalone (Content Hub) — solo los completados en el mes
    const STANDALONE_TO_CATEGORY = {
      one_pager:  'content',
      ppt:        'content',
      landing:    'content',
      video:      'content',
      formulario: 'otros',
      branding:   'otros'
    };
    const STANDALONE_LABELS = {
      one_pager:  'One pager',
      ppt:        'PPT',
      landing:    'Landing page',
      video:      'Video',
      formulario: 'Formulario',
      branding:   'Branding'
    };
    (standaloneRequests || []).forEach(r => {
      if (r.status !== 'done' || !r.completedAt || !isInMonth(r.completedAt, selectedMonth)) return;
      const fee = Number(r.budget || 0);
      if (fee === 0) return;
      const cat = STANDALONE_TO_CATEGORY[r.category] || 'otros';
      const catLabel = STANDALONE_LABELS[r.category] || r.category;
      rows.push({
        id: `s-${r.id}`,
        source: "standalone",
        country: r.country || "—",
        businessUnit: r.businessUnit || "—",
        category: cat,
        detail: `${catLabel}: ${r.name}`,
        price: fee,
        cc: "Content Hub",
        completedAt: r.completedAt,
        linkTo: 'content'
      });
    });

    // Items manuales del mes seleccionado
    manualItems.forEach(m => {
      if (!isInMonth(m.completedAt, selectedMonth)) return;
      rows.push(m);
    });

    return rows;
  };

  const rows = buildRows();

  // Lista de países únicos + unidades de negocio para la matriz
  const uniqueCountries = [...new Set(rows.map(r => r.country))].sort();
  const unitsForCountry = (country) => [...new Set(rows.filter(r => r.country === country).map(r => r.businessUnit))].sort();

  // Función para obtener items que caen en (country, bu, category)
  const getCellItems = (country, bu, category) => {
    return rows.filter(r => r.country === country && r.businessUnit === bu && r.category === category);
  };

  // Totales
  const totalMes = rows.reduce((acc, r) => acc + Number(r.price || 0), 0);
  const totalByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = rows.filter(r => r.category === cat.id).reduce((s, r) => s + Number(r.price || 0), 0);
    return acc;
  }, {});
  const totalByCountry = {};
  uniqueCountries.forEach(c => {
    totalByCountry[c] = rows.filter(r => r.country === c).reduce((s, r) => s + Number(r.price || 0), 0);
  });

  // Lista de meses navegables (últimos 12 + próximos 3)
  const monthOptions = [];
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    monthOptions.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  const addManualItem = () => {
    if (!newManual.detail || !newManual.price || !newManual.country) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const completedAt = new Date(year, month - 1, 15).toISOString();
    setManualItems([...manualItems, {
      id: `m-${Date.now()}`,
      source: "manual",
      country: newManual.country,
      businessUnit: newManual.businessUnit,
      category: newManual.category,
      detail: newManual.detail,
      price: Number(newManual.price) || 0,
      cc: newManual.cc,
      completedAt
    }]);
    setNewManual({ country: "", businessUnit: "", category: "content", detail: "", price: "", cc: "" });
    setShowAddManual(false);
  };

  const removeManualItem = (id) => {
    setManualItems(manualItems.filter(m => m.id !== id));
  };

  const exportCSV = () => {
    const lines = [];
    lines.push(['País', 'Unidad de Negocio', 'Categoría', 'Detalle', 'Precio', 'CC', 'Fuente'].join(';'));
    rows.forEach(r => {
      const cat = CATEGORIES.find(c => c.id === r.category)?.label || r.category;
      lines.push([r.country, r.businessUnit, cat, `"${r.detail}"`, r.price, r.cc || '', r.source].join(';'));
    });
    lines.push([].join(';'));
    lines.push(['TOTAL', '', '', '', totalMes, '', ''].join(';'));
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturacion_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMonthLabel = monthOptions.find(m => m.key === selectedMonth)?.label || selectedMonth;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-6 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded text-emerald-600 font-black text-xs">$$</div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Facturación</h1>
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest">{currentMonthLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-white text-emerald-700 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md outline-none border-0"
            >
              {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <button onClick={exportCSV} className="bg-white text-emerald-600 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button onClick={() => setShowAddManual(true)} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md">
              <Plus className="w-4 h-4" /> Item Manual
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* KPIs del mes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total del mes</p>
            </div>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">${totalMes.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{rows.length} items facturables</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Países</p>
            </div>
            <p className="text-3xl font-black text-blue-600 tracking-tight">{uniqueCountries.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">con facturación activa</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicios</p>
            </div>
            <p className="text-3xl font-black text-purple-600 tracking-tight">{CATEGORIES.filter(c => totalByCategory[c.id] > 0).length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">de {CATEGORIES.length} categorías</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket promedio</p>
            </div>
            <p className="text-3xl font-black text-amber-600 tracking-tight">${rows.length ? Math.round(totalMes / rows.length).toLocaleString() : 0}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">por item</p>
          </div>
        </div>

        {/* Totales por categoría (barra visual) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-4">Totales por Servicio</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const total = totalByCategory[cat.id] || 0;
              const pct = totalMes > 0 ? Math.round((total / totalMes) * 100) : 0;
              return (
                <div key={cat.id} className={`p-4 rounded-xl border ${cat.color}`}>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">{cat.label}</p>
                  <p className="text-xl font-black mb-1">${total.toLocaleString()}</p>
                  <p className="text-[9px] font-bold opacity-60">{pct}% del total</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs vista */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {[
            { id: 'matriz',   label: 'Matriz Completa', icon: LayoutDashboard },
            { id: 'pais',     label: 'Por País',        icon: Globe },
            { id: 'unidad',   label: 'Por Unidad',      icon: Building2 },
            { id: 'servicio', label: 'Por Servicio',    icon: Tag }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`px-5 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${isActive ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Vista: Matriz */}
        {viewMode === 'matriz' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 min-w-[180px]">País / Unidad</th>
                    {CATEGORIES.map(cat => (
                      <th key={cat.id} className="text-right p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest min-w-[140px]">
                        <div className={`inline-block px-2 py-1 rounded border ${cat.color}`}>{cat.label}</div>
                      </th>
                    ))}
                    <th className="text-right p-3 font-black text-[10px] text-slate-500 uppercase tracking-widest min-w-[100px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueCountries.length > 0 ? uniqueCountries.map(country => {
                    const units = unitsForCountry(country);
                    return (
                      <React.Fragment key={country}>
                        {/* Fila país (header) */}
                        <tr className="bg-slate-100/60 border-b border-slate-100">
                          <td className="p-3 font-black text-sm text-slate-800 uppercase sticky left-0 bg-slate-100/60 z-10">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-slate-500" />
                              {country}
                            </div>
                          </td>
                          {CATEGORIES.map(cat => {
                            const total = rows.filter(r => r.country === country && r.category === cat.id).reduce((s, r) => s + r.price, 0);
                            return <td key={cat.id} className="p-3 text-right font-black text-slate-600">{total > 0 ? `$${total.toLocaleString()}` : '—'}</td>;
                          })}
                          <td className="p-3 text-right font-black text-emerald-600">${totalByCountry[country].toLocaleString()}</td>
                        </tr>
                        {/* Filas por UN dentro de este país */}
                        {units.map(bu => {
                          const unTotal = rows.filter(r => r.country === country && r.businessUnit === bu).reduce((s, r) => s + r.price, 0);
                          return (
                            <tr key={`${country}-${bu}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="p-3 pl-10 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10 hover:bg-slate-50/50">
                                <span className="text-slate-300 mr-2">↳</span>{bu}
                              </td>
                              {CATEGORIES.map(cat => {
                                const items = getCellItems(country, bu, cat.id);
                                const total = items.reduce((s, r) => s + r.price, 0);
                                if (items.length === 0) return <td key={cat.id} className="p-3 text-right text-slate-300">—</td>;
                                return (
                                  <td key={cat.id} className="p-3 text-right">
                                    <div className="font-black text-slate-800">${total.toLocaleString()}</div>
                                    <div className="text-[9px] text-slate-400 font-medium mt-0.5">{items.length} {items.length === 1 ? 'item' : 'items'}</div>
                                  </td>
                                );
                              })}
                              <td className="p-3 text-right font-black text-emerald-600">${unTotal.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={CATEGORIES.length + 2} className="p-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-bold uppercase tracking-widest">No hay items facturables en {currentMonthLabel}</p>
                        <p className="text-[11px] font-medium mt-1">Los items aparecen cuando un webinar, campaña o evento se completa al 100%.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                {uniqueCountries.length > 0 && (
                  <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                    <tr>
                      <td className="p-3 font-black text-sm text-emerald-800 uppercase tracking-widest sticky left-0 bg-emerald-50 z-10">Total</td>
                      {CATEGORIES.map(cat => (
                        <td key={cat.id} className="p-3 text-right font-black text-emerald-800">
                          {totalByCategory[cat.id] > 0 ? `$${totalByCategory[cat.id].toLocaleString()}` : '—'}
                        </td>
                      ))}
                      <td className="p-3 text-right font-black text-emerald-900 text-lg">${totalMes.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Vista: Por País (cards) */}
        {viewMode === 'pais' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueCountries.length > 0 ? uniqueCountries.map(country => {
              const countryRows = rows.filter(r => r.country === country);
              const countryTotal = totalByCountry[country];
              return (
                <div key={country} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <h4 className="font-black text-sm text-slate-800 uppercase">{country}</h4>
                    </div>
                    <span className="text-sm font-black text-emerald-600">${countryTotal.toLocaleString()}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {countryRows.map(r => {
                      const cat = CATEGORIES.find(c => c.id === r.category);
                      return (
                        <div key={r.id} className="p-3 flex items-start gap-3 hover:bg-slate-50 group">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border mt-0.5 ${cat?.color}`}>
                            {cat?.label || r.category}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{r.detail}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{r.businessUnit}</p>
                          </div>
                          <span className="text-xs font-black text-slate-800 shrink-0">${r.price.toLocaleString()}</span>
                          {r.source === 'manual' && (
                            <button onClick={() => removeManualItem(r.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin facturación este mes</p>
              </div>
            )}
          </div>
        )}

        {/* Vista: Por Unidad de Negocio */}
        {viewMode === 'unidad' && (() => {
          const allBUs = [...new Set(rows.map(r => `${r.country}||${r.businessUnit}`))];
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allBUs.length > 0 ? allBUs.map(key => {
                const [country, bu] = key.split('||');
                const buRows = rows.filter(r => r.country === country && r.businessUnit === bu);
                const buTotal = buRows.reduce((s, r) => s + r.price, 0);
                return (
                  <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{country}</p>
                        <h4 className="font-black text-sm text-slate-800 uppercase">{bu}</h4>
                      </div>
                      <span className="text-lg font-black text-emerald-600">${buTotal.toLocaleString()}</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {buRows.map(r => {
                        const cat = CATEGORIES.find(c => c.id === r.category);
                        return (
                          <div key={r.id} className="p-3 flex items-center gap-3">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${cat?.color}`}>{cat?.label}</span>
                            <p className="flex-1 text-xs font-bold text-slate-700 truncate">{r.detail}</p>
                            <span className="text-xs font-black text-slate-800">${r.price.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin facturación este mes</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Vista: Por Servicio */}
        {viewMode === 'servicio' && (
          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const catRows = rows.filter(r => r.category === cat.id);
              const catTotal = totalByCategory[cat.id];
              if (catRows.length === 0) return null;
              return (
                <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${cat.color}`}>
                    <h4 className="font-black text-sm uppercase tracking-widest">{cat.label}</h4>
                    <span className="font-black">${catTotal.toLocaleString()} · {catRows.length} items</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {catRows.map(r => (
                      <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{r.detail}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{r.country} · {r.businessUnit}</p>
                        </div>
                        <span className="text-sm font-black text-slate-800 shrink-0">${r.price.toLocaleString()}</span>
                        {r.source === 'manual' && (
                          <button onClick={() => removeManualItem(r.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin facturación este mes</p>
              </div>
            )}
          </div>
        )}

        {/* Info sobre origen de datos */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" /> Origen de los datos
          </p>
          <p className="text-xs text-emerald-700 font-medium leading-relaxed">
            Los items aparecen automáticamente cuando un <strong>Webinar, Campaña o Evento</strong> se completa al 100%. La fecha de completado determina el mes de facturación. Los ítems de <strong>Content, Social Media y Otros</strong> se agregan manualmente con el botón "Item Manual".
          </p>
        </div>
      </main>

      {/* Modal Item Manual */}
      {showAddManual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Agregar Item Manual</h2>
              <button onClick={() => setShowAddManual(false)} className="w-8 h-8 rounded-full hover:bg-emerald-100 flex items-center justify-center">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                  <select value={newManual.country} onChange={e => setNewManual({...newManual, country: e.target.value, businessUnit: ''})} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-slate-700 text-sm">
                    <option value="">Seleccionar...</option>
                    {Object.keys(MARKETS).sort().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad de Negocio</label>
                  <select value={newManual.businessUnit} onChange={e => setNewManual({...newManual, businessUnit: e.target.value})} disabled={!newManual.country} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-slate-700 text-sm disabled:opacity-50">
                    <option value="">Seleccionar...</option>
                    {(MARKETS[newManual.country] || []).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                <select value={newManual.category} onChange={e => setNewManual({...newManual, category: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-slate-700 text-sm">
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalle</label>
                <input type="text" placeholder="Ej: SOP Master template" value={newManual.detail} onChange={e => setNewManual({...newManual, detail: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-slate-700 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input type="number" min="0" placeholder="0" value={newManual.price} onChange={e => setNewManual({...newManual, price: e.target.value})} className="w-full p-3 pl-7 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-slate-700 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CC (opcional)</label>
                  <input type="text" placeholder="Ej: Content" value={newManual.cc} onChange={e => setNewManual({...newManual, cc: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-slate-700 text-sm" />
                </div>
              </div>
              <button
                onClick={addManualItem}
                disabled={!newManual.country || !newManual.detail || !newManual.price}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
              >
                Agregar a Facturación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

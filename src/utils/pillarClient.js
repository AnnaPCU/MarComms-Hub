// ════════════════════════════════════════════════════════════════════
// pillarClient — Cliente de un pilar a partir de país + unidad
// ════════════════════════════════════════════════════════════════════
// El cliente de un pilar NO se escribe a mano (oct 2026): sale de la
// unidad y el país que paga ("Control Union España", "Peterson Solutions
// Argentina", "PCU Mexico"), así no aparecen dos clientes distintos por
// una diferencia de tipeo.
// Un pilar puede apuntar a varios países: `country` es el que paga (el
// que cuenta para inversión, facturación y planes) y `extraCountries`
// los demás.
// ════════════════════════════════════════════════════════════════════

// "Peterson" es el nombre viejo de la unidad Peterson Solutions
export const normalizeUnit = (unit) => (unit === 'Peterson' ? 'Peterson Solutions' : (unit || ''));

export const clientLabel = (country, businessUnit) => [normalizeUnit(businessUnit), country || ''].filter(Boolean).join(' ');

// Otros países sin repetidos ni el país que paga
export const cleanExtraCountries = (country, extra) => [...new Set((extra || []).filter((c) => c && c !== country))];

// Todos los países del pilar: primero el que paga
export const pillarCountries = (country, extra) => [country, ...cleanExtraCountries(country, extra)].filter(Boolean);

// "Peru + Chile, Ecuador" (el que paga primero)
export const countriesLabel = (country, extra) => {
  const others = cleanExtraCountries(country, extra);
  if (!country) return others.join(', ');
  return others.length ? `${country} + ${others.join(', ')}` : country;
};

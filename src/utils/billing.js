// ════════════════════════════════════════════════════════════════════
// billing — Modo de cobro de un pilar: USD o cubierto por un plan
// ════════════════════════════════════════════════════════════════════
// Cada pilar (webinar, campaña, evento) tiene:
//   billing — 'usd' (se cobra aparte, con monto) | 'plan' (lo cubre un plan)
//   planId  — id del plan que lo cubre (tabla billing_plans) o null
// Lo cubierto por un plan no suma a la inversión ni a la facturación.
// ════════════════════════════════════════════════════════════════════

export const USD_VALUE = 'usd';
export const NEW_PLAN_VALUE = '__new_plan__';
const PLAN_PREFIX = 'plan:';

export const isPlanCovered = (item) => item?.billing === 'plan';

// Valor del <select> de BudgetInput: 'usd' | 'plan:<id>' | 'plan:' (sin plan)
export const billingSelectValue = (billing, planId) =>
  billing === 'plan' ? `${PLAN_PREFIX}${planId || ''}` : USD_VALUE;

// Inversa de billingSelectValue → patch { billing, planId }
export const parseBillingSelect = (value) => {
  if (typeof value === 'string' && value.startsWith(PLAN_PREFIX)) {
    return { billing: 'plan', planId: value.slice(PLAN_PREFIX.length) || null };
  }
  return { billing: 'usd', planId: null };
};

// Monto que cuenta para inversión / facturación (0 si lo cubre un plan)
export const chargedAmount = (amount, billing) =>
  billing === 'plan' ? 0 : (Number(amount) || 0);

export const UNASSIGNED_PLAN_LABEL = 'Sin especificar';

// Nombre del plan de un pilar ('' si se cobra en USD)
export const planNameOf = (item, planById) => {
  if (!isPlanCovered(item)) return '';
  const plan = item.planId && planById ? planById.get(String(item.planId)) : null;
  return plan ? plan.name : UNASSIGNED_PLAN_LABEL;
};

const normalize = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Busca un plan por nombre sin importar mayúsculas ni espacios de más
export const findPlanByName = (plans, name) =>
  (plans || []).find((p) => normalize(p.name) === normalize(name)) || null;

export const cleanPlanName = (name) => String(name || '').trim().replace(/\s+/g, ' ');

// Agrupa ítems del Portal por plan. Devuelve:
//   { groups: [{ id, name, items }], usdItems }
// Los grupos salen en el orden de `plans` (los sin ítems también, para que
// se vea qué plan no tiene pilares en el período) y al final, si hay, el de
// pilares en 'plan' sin plan asignado.
export const groupItemsByPlan = (items, plans) => {
  const byPlan = new Map((plans || []).map((p) => [String(p.id), []]));
  const unassigned = [];
  const usdItems = [];
  (items || []).forEach((item) => {
    if (!isPlanCovered(item)) { usdItems.push(item); return; }
    const key = item.planId ? String(item.planId) : null;
    if (key && byPlan.has(key)) byPlan.get(key).push(item);
    else unassigned.push(item);
  });
  const groups = (plans || []).map((p) => ({ id: String(p.id), name: p.name, items: byPlan.get(String(p.id)) }));
  if (unassigned.length) groups.push({ id: 'unassigned', name: UNASSIGNED_PLAN_LABEL, items: unassigned });
  return { groups, usdItems };
};

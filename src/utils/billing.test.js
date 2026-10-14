import { describe, it, expect } from 'vitest';
import {
  billingSelectValue, parseBillingSelect, chargedAmount, planNameOf,
  findPlanByName, cleanPlanName, isPlanCovered, UNASSIGNED_PLAN_LABEL,
  normalizeCountryNames,
} from './billing';

const PLANS = [
  { id: 'a', name: 'Control Union Argentina' },
  { id: 'b', name: 'Peterson Solutions Argentina' },
];
const planById = new Map(PLANS.map((p) => [p.id, p]));

describe('valor del selector', () => {
  it('ida y vuelta entre billing/planId y el valor del select', () => {
    expect(billingSelectValue('usd', 'a')).toBe('usd');
    expect(billingSelectValue('plan', 'a')).toBe('plan:a');
    expect(billingSelectValue('plan', null)).toBe('plan:');
    expect(parseBillingSelect('plan:a')).toEqual({ billing: 'plan', planId: 'a' });
    expect(parseBillingSelect('plan:')).toEqual({ billing: 'plan', planId: null });
    expect(parseBillingSelect('usd')).toEqual({ billing: 'usd', planId: null });
  });
});

describe('montos y nombres', () => {
  it('lo cubierto por un plan no suma', () => {
    expect(chargedAmount(500, 'plan')).toBe(0);
    expect(chargedAmount('500', 'usd')).toBe(500);
    expect(chargedAmount('', undefined)).toBe(0);
  });
  it('nombre del plan de un pilar', () => {
    expect(planNameOf({ billing: 'plan', planId: 'b' }, planById)).toBe('Peterson Solutions Argentina');
    expect(planNameOf({ billing: 'plan', planId: 'zz' }, planById)).toBe(UNASSIGNED_PLAN_LABEL);
    expect(planNameOf({ billing: 'usd', planId: 'a' }, planById)).toBe('');
    expect(isPlanCovered({ billing: 'plan' })).toBe(true);
  });
  it('busca planes por nombre sin importar mayúsculas ni espacios', () => {
    expect(findPlanByName(PLANS, '  control union   ARGENTINA ')?.id).toBe('a');
    expect(findPlanByName(PLANS, 'Otro')).toBeNull();
    expect(cleanPlanName('  Plan   nuevo ')).toBe('Plan nuevo');
  });
  it('usa los nombres de país del Hub (como el Portal Cliente)', () => {
    expect(cleanPlanName('Control Union USA Orgánico')).toBe('Control Union Estados Unidos Orgánico');
    expect(cleanPlanName('control union EE.UU. orgánico')).toBe('control union Estados Unidos orgánico');
    expect(cleanPlanName('Peterson Solutions México')).toBe('Peterson Solutions Mexico');
    expect(cleanPlanName('CU Estados Unidos de América')).toBe('CU Estados Unidos');
    expect(normalizeCountryNames('Control Union Estados Unidos')).toBe('Control Union Estados Unidos');
    expect(normalizeCountryNames('Plan Peruano')).toBe('Plan Peruano'); // no toca palabras que contienen el alias
    expect(normalizeCountryNames('Plan Usuarios')).toBe('Plan Usuarios');
  });
});

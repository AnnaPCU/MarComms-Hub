import { describe, it, expect } from 'vitest';
import { clientLabel, cleanExtraCountries, countriesLabel, normalizeUnit, pillarCountries } from './pillarClient';
import { unitsForCountry } from '@/constants/markets';

describe('pillarClient', () => {
  it('arma el cliente con unidad + país que paga', () => {
    expect(clientLabel('España', 'Control Union')).toBe('Control Union España');
    expect(clientLabel('Argentina', 'Peterson')).toBe('Peterson Solutions Argentina');
    expect(clientLabel('Mexico', 'PCU')).toBe('PCU Mexico');
    expect(clientLabel('', '')).toBe('');
    expect(normalizeUnit(undefined)).toBe('');
  });

  it('limpia otros países: sin repetidos ni el que paga', () => {
    expect(cleanExtraCountries('Peru', ['Chile', 'Peru', 'Chile', '', 'Ecuador'])).toEqual(['Chile', 'Ecuador']);
    expect(pillarCountries('Peru', ['Chile'])).toEqual(['Peru', 'Chile']);
    expect(countriesLabel('Peru', ['Chile', 'Ecuador'])).toBe('Peru + Chile, Ecuador');
    expect(countriesLabel('Peru', [])).toBe('Peru');
  });

  it('PCU está en todos los países salvo Ptech', () => {
    expect(unitsForCountry('Argentina')).toContain('PCU');
    expect(unitsForCountry('España')).toContain('PCU');
    expect(unitsForCountry('Ptech')).toEqual(['Peterson Solutions']);
  });
});

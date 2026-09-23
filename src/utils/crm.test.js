// ════════════════════════════════════════════════════════════════════
// Tests para utils/crm — resúmenes de entrenamientos y adopción
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  trainingsSummary, entityTrainingStats, pendingBillingTrainings, upcomingTrainings,
  adoptionScore, sortTrainings, trainingYears, matchesTrainingYear, monthKeyLabel,
} from './crm';
import { DEFAULT_CRM_ENTITIES, ADOPTION_CHECK_IDS, TRAINING_TYPE_BY_ID, TRAINING_STATUS_BY_ID } from '@/constants/crm';

const T = (over) => ({ id: over.id || Math.random().toString(36), entityId: 'e1', type: 'comercial', status: 'realizado', date: '', billedMonth: '', amount: null, ...over });

describe('crm — resúmenes', () => {
  it('trainingsSummary cuenta por estado y suma montos', () => {
    const s = trainingsSummary([
      T({ status: 'cobrado', amount: 150 }), T({ status: 'cobrado', amount: 250 }),
      T({ status: 'realizado', amount: 150 }), T({ status: 'planificado' }), T({ status: 'bonificado' }),
    ]);
    expect(s.total).toBe(5);
    expect(s.cobrado).toBe(2);
    expect(s.realizado).toBe(1);
    expect(s.amountBilled).toBe(400);
    expect(s.amountPending).toBe(150);
  });

  it('entityTrainingStats filtra por entidad', () => {
    const s = entityTrainingStats('e2', [T({ entityId: 'e1' }), T({ entityId: 'e2', status: 'cobrado' })]);
    expect(s.total).toBe(1);
    expect(s.cobrado).toBe(1);
  });

  it('pendingBillingTrainings: realizados hace más de 30 días sin cobrar', () => {
    const list = [
      T({ id: 'old', date: '2026-08-01' }),               // 53 días → pendiente
      T({ id: 'recent', date: '2026-09-10' }),            // 13 días → todavía no
      T({ id: 'paid', date: '2026-07-01', status: 'cobrado' }),
      T({ id: 'nodate' }),                                // sin fecha → no se puede saber
    ];
    expect(pendingBillingTrainings(list, '2026-09-23').map((t) => t.id)).toEqual(['old']);
  });

  it('upcomingTrainings: planificados de hoy en adelante, ordenados', () => {
    const list = [T({ id: 'b', status: 'planificado', date: '2026-10-05' }), T({ id: 'a', status: 'planificado', date: '2026-09-30' }), T({ id: 'past', status: 'planificado', date: '2026-09-01' })];
    expect(upcomingTrainings(list, '2026-09-23').map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('sortTrainings: fecha desc y sin fecha al final por mes de cobro', () => {
    const list = [T({ id: 'nodate-mar', billedMonth: '2026-03' }), T({ id: 'sep', date: '2026-09-01' }), T({ id: 'nodate-may', billedMonth: '2026-05' }), T({ id: 'oct', date: '2026-10-01' })];
    expect(sortTrainings(list).map((t) => t.id)).toEqual(['oct', 'sep', 'nodate-may', 'nodate-mar']);
  });

  it('trainingYears y matchesTrainingYear miran fecha o mes de cobro', () => {
    const list = [T({ date: '2025-11-03' }), T({ billedMonth: '2026-03' })];
    expect(trainingYears(list)).toEqual(['2026', '2025']);
    expect(matchesTrainingYear(list[1], '2026')).toBe(true);
    expect(matchesTrainingYear(list[1], '2025')).toBe(false);
    expect(matchesTrainingYear(list[1], 'all')).toBe(true);
  });

  it('monthKeyLabel', () => {
    expect(monthKeyLabel('2026-03')).toBe('marzo 2026');
    expect(monthKeyLabel('')).toBe('');
  });
});

describe('crm — entidades por defecto', () => {
  it('claves únicas, unidad válida y checks completos', () => {
    const keys = DEFAULT_CRM_ENTITIES.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    DEFAULT_CRM_ENTITIES.forEach((e) => {
      expect(['cu', 'ps', 'ptech']).toContain(e.unit);
      ADOPTION_CHECK_IDS.forEach((id) => expect(typeof e.checks[id]).toBe('boolean'));
    });
  });

  it('adoptionScore: PTech tiene todo, PS Textile nada', () => {
    const ptech = DEFAULT_CRM_ENTITIES.find((e) => e.key === 'ptech-global');
    const textile = DEFAULT_CRM_ENTITIES.find((e) => e.key === 'ps-textile');
    expect(adoptionScore(ptech)).toEqual({ done: 9, total: 9, ratio: 1 });
    expect(adoptionScore(textile).done).toBe(0);
  });

  it('tipos y estados tienen los ids que usa el seed', () => {
    ['comercial', 'super_admin', 'implementacion'].forEach((id) => expect(TRAINING_TYPE_BY_ID[id]).toBeTruthy());
    ['planificado', 'realizado', 'cobrado', 'bonificado'].forEach((id) => expect(TRAINING_STATUS_BY_ID[id]).toBeTruthy());
  });
});

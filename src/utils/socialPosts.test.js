// ════════════════════════════════════════════════════════════════════
// Tests para utils/socialPosts — semanas del mes y avisos de posteo faltante
// ════════════════════════════════════════════════════════════════════
// Calendario 2026: septiembre arranca martes 1. Semanas (lunes) con jueves
// en septiembre: 31/08, 07/09, 14/09, 21/09. La del 28/09 tiene jueves 1/10
// → es de octubre.
// ════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  mondayOf, monthKeyOfWeek, weeksOfMonth, weekLabel, expectedPostsBy,
  accountMonthSummary, missingPostAlerts, competitionReviewActive,
} from './socialPosts';
import { nextPostStatus, DEFAULT_SOCIAL_ACCOUNTS, ACCOUNT_GROUPS } from '@/constants/socialPosts';

const ACTIVE = { id: 'a1', name: 'Peru', plan: 'active', active: true };
const SEMI = { id: 'a2', name: 'Chile', plan: 'semi_active', active: true };
const NONE = { id: 'a3', name: 'Brasil', plan: 'none', active: true };
const post = (accountId, weekStart, extra = {}) => ({ id: `${accountId}-${weekStart}`, accountId, weekStart, title: 'x', status: 'listo', ...extra });

describe('semanas del mes', () => {
  it('mondayOf devuelve el lunes de la semana', () => {
    expect(mondayOf('2026-09-18')).toBe('2026-09-14'); // viernes → lunes
    expect(mondayOf('2026-09-14')).toBe('2026-09-14');
    expect(mondayOf('2026-09-20')).toBe('2026-09-14'); // domingo → lunes anterior
  });

  it('monthKeyOfWeek usa el jueves', () => {
    expect(monthKeyOfWeek('2026-08-31')).toBe('2026-09');
    expect(monthKeyOfWeek('2026-09-28')).toBe('2026-10');
  });

  it('weeksOfMonth: septiembre 2026 tiene 4 semanas, octubre 5', () => {
    const sep = weeksOfMonth(2026, 9);
    expect(sep.map((w) => w.start)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21']);
    expect(sep[0].label).toBe('31 ago–6 sep');
    expect(sep[1].label).toBe('7–13 sep');
    const oct = weeksOfMonth(2026, 10);
    expect(oct.map((w) => w.start)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
  });

  it('weekLabel', () => {
    expect(weekLabel('2026-09-07', '2026-09-13')).toBe('7–13 sep');
  });
});

describe('esperado por plan', () => {
  it('active: 1 por semana acumulado', () => {
    expect([1, 2, 3, 4].map((k) => expectedPostsBy('active', k, 4))).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4, 5].map((k) => expectedPostsBy('active', k, 5))).toEqual([1, 2, 3, 4, 4]);
  });
  it('semi_active: 2 por mes', () => {
    expect([1, 2, 3, 4].map((k) => expectedPostsBy('semi_active', k, 4))).toEqual([1, 1, 2, 2]);
  });
  it('sin plan: nunca se espera nada', () => {
    expect(expectedPostsBy('none', 4, 4)).toBe(0);
    expect(expectedPostsBy(undefined, 4, 4)).toBe(0);
  });
});

describe('resumen por cuenta', () => {
  it('cuenta posteos del mes y lo que falta', () => {
    const weeks = weeksOfMonth(2026, 9);
    const posts = [post('a1', '2026-08-31'), post('a1', '2026-09-07'), post('a1', '2026-09-07')];
    const s = accountMonthSummary(ACTIVE, posts, weeks);
    expect(s.count).toBe(3);
    expect(s.expected).toBe(4);
    expect(s.missing).toBe(1);
    expect(s.byWeek.map((a) => a.length)).toEqual([1, 2, 0, 0]);
  });
});

describe('avisos de posteo faltante', () => {
  // Semana 07–13/09 cierra dom 13/09 → +3 hábiles = mié 16/09
  it('no avisa antes del margen y sí después', () => {
    const posts = [post('a1', '2026-08-31')]; // solo semana 1
    expect(missingPostAlerts([ACTIVE], posts, '2026-09-15').filter((a) => a.week.start === '2026-09-07')).toHaveLength(0);
    const alerts = missingPostAlerts([ACTIVE], posts, '2026-09-16');
    const a = alerts.find((x) => x.week.start === '2026-09-07');
    expect(a).toBeTruthy();
    expect(a.expected).toBe(2);
    expect(a.actual).toBe(1);
    expect(a.account.name).toBe('Peru');
  });

  it('un posteo de más en una semana compensa la siguiente (mira el acumulado)', () => {
    const posts = [post('a1', '2026-08-31'), post('a1', '2026-08-31')];
    expect(missingPostAlerts([ACTIVE], posts, '2026-09-16').filter((a) => a.week.start === '2026-09-07')).toHaveLength(0);
  });

  it('semi_active no avisa en la semana 2 si ya tiene 1', () => {
    const posts = [post('a2', '2026-08-31')];
    const sep = (iso) => missingPostAlerts([SEMI], posts, iso).filter((a) => a.monthKey === '2026-09');
    expect(sep('2026-09-16')).toHaveLength(0);
    // Semana 3 (14–20) cierra 20/09 → aviso mié 23/09: espera 2 acumulados
    const a = sep('2026-09-23').find((x) => x.week.start === '2026-09-14');
    expect(a).toBeTruthy();
    expect(a.expected).toBe(2);
  });

  it('cuentas sin plan o inactivas no generan avisos', () => {
    expect(missingPostAlerts([NONE, { ...ACTIVE, active: false }], [], '2026-09-30')).toHaveLength(0);
  });

  it('ordena del más reciente al más viejo y cubre el mes anterior', () => {
    const alerts = missingPostAlerts([ACTIVE], [], '2026-09-16');
    expect(alerts.length).toBeGreaterThan(2); // agosto entero + 2 semanas de sep
    expect(alerts[0].week.start).toBe('2026-09-07');
    for (let i = 1; i < alerts.length; i++) expect(alerts[i].week.start <= alerts[i - 1].week.start).toBe(true);
  });
});

describe('otros', () => {
  it('competitionReviewActive: lunes y martes', () => {
    expect(competitionReviewActive('2026-09-14')).toBe(true);  // lunes
    expect(competitionReviewActive('2026-09-15')).toBe(true);  // martes
    expect(competitionReviewActive('2026-09-16')).toBe(false); // miércoles
  });

  it('nextPostStatus rota los 4 estados', () => {
    expect(nextPostStatus('en_proceso')).toBe('listo');
    expect(nextPostStatus('programado')).toBe('en_proceso');
  });

  it('las cuentas por defecto tienen keys únicas y grupos válidos', () => {
    const keys = DEFAULT_SOCIAL_ACCOUNTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    DEFAULT_SOCIAL_ACCOUNTS.forEach((a) => expect(ACCOUNT_GROUPS).toContain(a.group));
  });
});

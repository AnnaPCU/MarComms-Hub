// ════════════════════════════════════════════════════════════════════
// Tests para utils/progress — tareas opcionales del webinar
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { calcProgress, WEBINAR_TASK_KEYS } from './progress';
import { OPTIONAL_WEBINAR_TASKS, webinarTaskApplies } from '@/constants/webinar';

const allDone = (extra = {}) => Object.fromEntries(WEBINAR_TASK_KEYS.map((k) => [k, { done: true, ...(extra[k] || {}) }]));

describe('calcProgress — PPT y one pager "si aplica"', () => {
  it('sin marcar "aplica", PPT y one pager no cuentan: 15 tareas hechas = 100%', () => {
    const w = allDone({ ppt: { done: false }, onePager: { done: false } });
    expect(calcProgress(w)).toBe(100);
  });
  it('si aplica y no está hecho, sí baja el porcentaje', () => {
    const w = allDone({ ppt: { done: false, applies: true }, onePager: { done: false } });
    expect(calcProgress(w)).toBe(Math.round((15 / 16) * 100));
  });
  it('si aplica y está hecho, suma normal', () => {
    const w = allDone({ ppt: { done: true, applies: true }, onePager: { done: true, applies: true } });
    expect(calcProgress(w)).toBe(100);
  });
  it('webinar vacío = 0% y las opcionales son exactamente ppt y onePager', () => {
    expect(calcProgress({})).toBe(0);
    expect(OPTIONAL_WEBINAR_TASKS).toEqual(['ppt', 'onePager']);
    expect(webinarTaskApplies({ ppt: { applies: true } }, 'ppt')).toBe(true);
    expect(webinarTaskApplies({ ppt: { done: true } }, 'ppt')).toBe(false);
    expect(webinarTaskApplies({}, 'reporte')).toBe(true);
  });
});

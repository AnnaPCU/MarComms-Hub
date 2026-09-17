// ════════════════════════════════════════════════════════════════════
// Tests para utils/date (días hábiles) y utils/worldDays
// ════════════════════════════════════════════════════════════════════
// Corré con: npm test
// Referencia de calendario 2026:
//   lun 01/06 · mar 02/06 · mié 03/06 · jue 04/06 · vie 05/06 · sáb 06/06 · dom 07/06 · lun 08/06
// ════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { addBusinessDays, subtractBusinessDays, isBusinessDay, toIsoDate } from './date';
import {
  resolveWorldDayDate,
  nextOccurrence,
  noticeDateFor,
  upcomingWorldDays,
  activeWorldDayNotices,
  groupByMonth,
} from './worldDays';
import { WORLD_DAYS, WORLD_DAY_THEMES, WORLD_DAY_THEME_BY_ID } from '@/constants/worldDays';

describe('date — días hábiles', () => {
  it('toIsoDate no pasa por UTC', () => {
    expect(toIsoDate(new Date(2026, 5, 5))).toBe('2026-06-05');
  });

  it('isBusinessDay: lun–vie true, sáb/dom false', () => {
    expect(isBusinessDay('2026-06-05')).toBe(true);  // viernes
    expect(isBusinessDay('2026-06-06')).toBe(false); // sábado
    expect(isBusinessDay('2026-06-07')).toBe(false); // domingo
    expect(isBusinessDay('2026-06-08')).toBe(true);  // lunes
  });

  it('restar 3 hábiles a un viernes da el martes', () => {
    expect(subtractBusinessDays('2026-06-05', 3)).toBe('2026-06-02');
  });

  it('restar 3 hábiles a un lunes salta el fin de semana', () => {
    expect(subtractBusinessDays('2026-06-08', 3)).toBe('2026-06-03');
  });

  it('restar 3 hábiles a un domingo no cuenta sáb/dom', () => {
    expect(subtractBusinessDays('2026-06-07', 3)).toBe('2026-06-03');
  });

  it('sumar hábiles funciona en sentido inverso', () => {
    expect(addBusinessDays('2026-06-03', 3)).toBe('2026-06-08');
  });

  it('devuelve "" con fecha inválida', () => {
    expect(subtractBusinessDays('', 3)).toBe('');
    expect(subtractBusinessDays('no-fecha', 3)).toBe('');
  });
});

describe('worldDays — constantes', () => {
  it('todos los días tienen temática válida y fecha resolvible', () => {
    WORLD_DAYS.forEach((d) => {
      expect(WORLD_DAY_THEME_BY_ID[d.theme], `temática de ${d.id}`).toBeTruthy();
      expect(resolveWorldDayDate(d, 2026), `fecha de ${d.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('los ids son únicos', () => {
    const ids = WORLD_DAYS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada temática tiene al menos un día', () => {
    WORLD_DAY_THEMES.forEach((t) => {
      expect(WORLD_DAYS.some((d) => d.theme === t.id), t.id).toBe(true);
    });
  });
});

describe('worldDays — fechas', () => {
  const AGUA = WORLD_DAYS.find((d) => d.id === 'agua');           // 22 mar
  const CALIDAD = WORLD_DAYS.find((d) => d.id === 'calidad');     // 2° jueves nov
  const AMBIENTE = WORLD_DAYS.find((d) => d.id === 'medio-ambiente'); // 5 jun

  it('resuelve un día fijo', () => {
    expect(resolveWorldDayDate(AGUA, 2026)).toBe('2026-03-22');
  });

  it('resuelve el segundo jueves de noviembre', () => {
    expect(resolveWorldDayDate(CALIDAD, 2026)).toBe('2026-11-12');
    expect(resolveWorldDayDate(CALIDAD, 2025)).toBe('2025-11-13');
  });

  it('nextOccurrence: este año si todavía no pasó, si no el que viene', () => {
    expect(nextOccurrence(AGUA, '2026-03-01')).toBe('2026-03-22');
    expect(nextOccurrence(AGUA, '2026-03-22')).toBe('2026-03-22'); // hoy cuenta
    expect(nextOccurrence(AGUA, '2026-03-23')).toBe('2027-03-22');
  });

  it('noticeDateFor: 3 hábiles antes', () => {
    expect(noticeDateFor('2026-06-05')).toBe('2026-06-02');
  });

  it('upcomingWorldDays ordena por fecha y decora', () => {
    const list = upcomingWorldDays('2026-06-02', { months: 1 });
    expect(list[0].id).toBe('medio-ambiente');
    expect(list[0].date).toBe('2026-06-05');
    expect(list[0].noticeDate).toBe('2026-06-02');
    expect(list[0].daysLeft).toBe(3);
    expect(list[0].noticeActive).toBe(true);
    expect(list[0].themeInfo.label).toBe('Sustentabilidad');
    for (let i = 1; i < list.length; i++) expect(list[i].date >= list[i - 1].date).toBe(true);
  });

  it('upcomingWorldDays filtra por temática', () => {
    const list = upcomingWorldDays('2026-01-01', { theme: 'textil' });
    expect(list.length).toBeGreaterThan(0);
    list.forEach((d) => expect(d.theme).toBe('textil'));
  });

  it('activeWorldDayNotices: vigente desde el aviso hasta el día', () => {
    const ids = (iso) => activeWorldDayNotices(iso).map((d) => d.id);
    expect(ids('2026-06-01')).not.toContain('medio-ambiente'); // un día antes del aviso
    expect(ids('2026-06-02')).toContain('medio-ambiente');     // aviso (T-3 hábiles)
    expect(ids('2026-06-05')).toContain('medio-ambiente');     // el día mismo
    expect(ids('2026-06-06')).not.toContain('medio-ambiente'); // ya pasó
    // Océanos (lun 08/06): aviso recién el mié 03/06
    expect(ids('2026-06-02')).not.toContain('oceanos');
    expect(ids('2026-06-03')).toContain('oceanos');
  });

  it('activeWorldDayNotices cruza fin de año', () => {
    // Educación Ambiental: lun 26/01/2027 → aviso mié 21/01/2027
    expect(activeWorldDayNotices('2027-01-21').map((d) => d.id)).toContain('educacion-ambiental');
    expect(activeWorldDayNotices('2027-01-20').map((d) => d.id)).not.toContain('educacion-ambiental');
    expect(AMBIENTE).toBeTruthy();
  });

  it('groupByMonth agrupa manteniendo el orden', () => {
    const groups = groupByMonth(upcomingWorldDays('2026-06-01', { months: 2 }));
    expect(groups[0].key).toBe('2026-06');
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });
});

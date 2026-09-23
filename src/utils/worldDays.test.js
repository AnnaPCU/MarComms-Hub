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
  worldDaysInMonth,
  monthGrid,
  isGlobalWorldDay,
  worldDayCountries,
  worldDayCountriesText,
  accountsForWorldDay,
} from './worldDays';
import { WORLD_DAYS, WORLD_DAY_THEMES, WORLD_DAY_THEME_BY_ID, WORLD_DAY_COUNTRIES } from '@/constants/worldDays';
import { MARKETS } from '@/constants/markets';

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

  it('todos los días tienen nombre corto para la grilla', () => {
    WORLD_DAYS.forEach((d) => expect(typeof d.short === 'string' && d.short.length > 0, d.id).toBe(true));
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

describe('worldDays — grilla mensual', () => {
  it('worldDaysInMonth devuelve las fechas del mes en ese año, ordenadas', () => {
    const list = worldDaysInMonth(2026, 6, '2026-06-02');
    expect(list.map((d) => d.id)).toContain('medio-ambiente');
    expect(list.every((d) => d.date.startsWith('2026-06'))).toBe(true);
    for (let i = 1; i < list.length; i++) expect(list[i].date >= list[i - 1].date).toBe(true);
    const amb = list.find((d) => d.id === 'medio-ambiente');
    expect(amb.noticeDate).toBe('2026-06-02');
    expect(amb.noticeActive).toBe(true);
  });

  it('worldDaysInMonth incluye fechas ya pasadas del mes (es una vista, no una agenda)', () => {
    const list = worldDaysInMonth(2026, 6, '2026-06-20');
    const amb = list.find((d) => d.id === 'medio-ambiente');
    expect(amb).toBeTruthy();
    expect(amb.daysLeft).toBeLessThan(0);
    expect(amb.noticeActive).toBe(false);
  });

  it('worldDaysInMonth filtra por temática y resuelve reglas', () => {
    const nov = worldDaysInMonth(2026, 11, '2026-01-01', { theme: 'calidad' });
    expect(nov.map((d) => d.id)).toEqual(['calidad']);
    expect(nov[0].date).toBe('2026-11-12');
  });

  it('monthGrid arranca en lunes y cubre el mes en 6 filas', () => {
    const grid = monthGrid(2026, 6); // junio 2026 empieza lunes
    expect(grid.length).toBe(6);
    expect(grid[0][0]).toEqual({ iso: '2026-06-01', day: 1, inMonth: true });
    expect(grid[4][1].iso).toBe('2026-06-30');
    expect(grid[4][2].inMonth).toBe(false); // 1 de julio
  });

  it('monthGrid rellena con días del mes anterior cuando no empieza en lunes', () => {
    const grid = monthGrid(2026, 9); // septiembre 2026 empieza martes
    expect(grid[0][0].iso).toBe('2026-08-31');
    expect(grid[0][0].inMonth).toBe(false);
    expect(grid[0][1].iso).toBe('2026-09-01');
  });
});

describe('worldDays — países y cuentas', () => {
  const byId = Object.fromEntries(WORLD_DAYS.map((d) => [d.id, d]));
  const ACCOUNTS = [
    { id: 'a1', name: 'Peru', group: 'CU Latinoamérica', plan: 'active' },
    { id: 'a2', name: 'Brasil', group: 'CU Latinoamérica', plan: 'none' },
    { id: 'a3', name: 'España', group: 'CU España', plan: 'active' },
    { id: 'a4', name: 'Certificaciones', group: 'CU Latinoamérica', plan: 'active' },
    { id: 'a5', name: 'Argentina', group: 'PS Iberia & America', plan: 'none', active: false },
  ];

  it('todo día tiene countries (lista) y las claves de WORLD_DAY_COUNTRIES existen y son países de MARKETS', () => {
    WORLD_DAYS.forEach((d) => expect(Array.isArray(d.countries)).toBe(true));
    Object.entries(WORLD_DAY_COUNTRIES).forEach(([id, list]) => {
      expect(byId[id], `id desconocido: ${id}`).toBeTruthy();
      list.forEach((c) => expect(MARKETS[c], `país desconocido: ${c} en ${id}`).toBeTruthy());
    });
  });

  it('un día sin países es global', () => {
    expect(isGlobalWorldDay(byId['medio-ambiente'])).toBe(true);
    expect(worldDayCountries(byId['medio-ambiente'])).toEqual([]);
    expect(worldDayCountriesText(byId['medio-ambiente'])).toBe('Todos los países');
  });

  it('café repercute en países cafeteros y muestra el nombre de RD completo', () => {
    const cafe = byId['cafe'];
    expect(isGlobalWorldDay(cafe)).toBe(false);
    expect(worldDayCountries(cafe)).toContain('Brasil');
    expect(worldDayCountries(cafe)).toContain('Rep. Dominicana');
    expect(worldDayCountriesText(cafe, 2)).toMatch(/^Brasil, Colombia \+\d+$/);
  });

  it('accountsForWorldDay: global → todas las activas; con países → solo las de esos países', () => {
    const all = accountsForWorldDay(byId['medio-ambiente'], ACCOUNTS);
    expect(all.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']); // a5 está inactiva
    const cafe = accountsForWorldDay(byId['cafe'], ACCOUNTS);
    expect(cafe.map((a) => a.name)).toEqual(['Peru', 'Brasil']);
    const olivo = accountsForWorldDay(byId['olivo'], ACCOUNTS);
    expect(olivo.map((a) => a.name)).toEqual(['Peru', 'España']);
  });
});

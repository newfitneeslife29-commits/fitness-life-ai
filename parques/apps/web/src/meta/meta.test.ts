import { describe, expect, it } from 'vitest';
import { DAILY_REWARDS, ROULETTE, TABLES, dailyStatus, daysBetween, levelFromXp, matchRewards, spinRoulette, xpForLevel, type MatchSummary } from './economy';
import { advanceMissions, DAILY_POOL, pickMissions, WEEKLY_POOL } from './missions';
import { ACHIEVEMENTS, EMPTY_STATS, newlyUnlocked } from './achievements';
import { activeSeason, isActive, nextSeason, SEASONS } from './seasons';
import { DEFAULT_EQUIPPED, ITEMS, item } from './catalog';

const base: MatchSummary = { place: 0, players: 4, won: true, captures: 2, captured: 1, crowned: 4, soplos: 1, pairs: 5, triplePenalties: 0, mode: 'ai', table: 'barrio' };

describe('niveles y XP', () => {
  it('la XP necesaria crece con el nivel', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(160);
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelFromXp(260)).toEqual({ level: 3, into: 0, need: 220 });
  });
});

describe('mesas y premios', () => {
  it('cuatro mesas con entrada y premio crecientes', () => {
    expect(TABLES.map((t) => t.name)).toEqual(['Barrio', 'Ciudad', 'Capital', 'Leyenda']);
    for (let i = 1; i < TABLES.length; i++) {
      expect(TABLES[i]!.entry).toBeGreaterThan(TABLES[i - 1]!.entry);
      expect(TABLES[i]!.minLevel).toBeGreaterThan(TABLES[i - 1]!.minLevel);
    }
  });
  it('el 1º se lleva el premio de la mesa; el último nada', () => {
    expect(matchRewards(base).coins).toBe(150);
    expect(matchRewards({ ...base, place: 3, won: false }).coins).toBe(0);
    expect(matchRewards(base).xp).toBe(60 + 2 * 5 + 4 * 3 + 4);
  });
});

describe('recompensa diaria', () => {
  it('racha de 7 días y reinicio si se salta un día', () => {
    expect(dailyStatus(null, 0, '2026-11-11')).toEqual({ canClaim: true, day: 1 });
    expect(dailyStatus('2026-11-11', 1, '2026-11-11')).toEqual({ canClaim: false, day: 1 });
    expect(dailyStatus('2026-11-11', 3, '2026-11-12')).toEqual({ canClaim: true, day: 4 });
    expect(dailyStatus('2026-11-11', 7, '2026-11-12')).toEqual({ canClaim: true, day: 1 });
    expect(dailyStatus('2026-11-09', 3, '2026-11-12')).toEqual({ canClaim: true, day: 1 });
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(DAILY_REWARDS).toHaveLength(7);
  });
  it('la ruleta siempre cae en un sector válido', () => {
    for (let r = 0; r < 1; r += 0.01) expect(spinRoulette(r)).toBeLessThan(ROULETTE.length);
    expect(spinRoulette(0)).toBe(0);
    expect(spinRoulette(0.9999)).toBe(ROULETTE.length - 1);
  });
});

describe('misiones', () => {
  it('se eligen 3 distintas de forma determinista por día', () => {
    const a = pickMissions(DAILY_POOL, '2026-11-11', 3);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    expect(pickMissions(DAILY_POOL, '2026-11-11', 3)).toEqual(a);
    expect(pickMissions(WEEKLY_POOL, '2026-W46', 3)).toHaveLength(3);
  });
  it('el progreso avanza con cada partida y avisa al completarse', () => {
    const list = [{ id: 'd-cap5', progress: 4, claimed: false }, { id: 'd-games3', progress: 0, claimed: false }];
    const r = advanceMissions(list, base);
    expect(r.list[0]!.progress).toBe(5);
    expect(r.list[1]!.progress).toBe(1);
    expect(r.completed.map((m) => m.id)).toEqual(['d-cap5']);
  });
});

describe('logros', () => {
  it('se desbloquean una sola vez', () => {
    const ctx = { stats: { ...EMPTY_STATS, games: 1, wins: 1 }, level: 1, owned: 5, dailyStreak: 1 };
    const first = newlyUnlocked(ctx, {});
    expect(first.map((a) => a.id)).toEqual(['first-game', 'first-win']);
    expect(newlyUnlocked(ctx, { 'first-game': 1, 'first-win': 1 })).toEqual([]);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
  });
});

describe('temporadas y tienda', () => {
  it('Navidad cruza el año; Carnaval y Feria en sus meses', () => {
    const nav = SEASONS.find((s) => s.id === 'navidad')!;
    expect(isActive(nav, new Date(2026, 11, 24))).toBe(true);
    expect(isActive(nav, new Date(2027, 0, 5))).toBe(true);
    expect(isActive(nav, new Date(2026, 5, 1))).toBe(false);
    expect(activeSeason(new Date(2026, 1, 20))?.id).toBe('carnaval');
    expect(activeSeason(new Date(2026, 7, 7))?.id).toBe('feria');
    expect(activeSeason(new Date(2026, 4, 1))).toBeNull();
    expect(nextSeason(new Date(2026, 4, 1)).season.id).toBe('feria');
  });
  it('cada categoría tiene un objeto gratis equipado por defecto y skins de temporada', () => {
    for (const id of Object.values(DEFAULT_EQUIPPED)) expect(item(id).price).toBe(0);
    for (const s of SEASONS) expect(ITEMS.some((i) => i.season === s.id)).toBe(true);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });
});

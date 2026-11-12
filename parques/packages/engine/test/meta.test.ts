import { describe, expect, it } from 'vitest';
import { TABLES } from '../src';
import { DAILY_REWARDS, ROULETTE, dailyStatus, daysBetween, matchRewards, spinRoulette, type MatchSummary } from '../src/meta/rewards';
import { advanceMissions, DAILY_POOL, pickMissions, WEEKLY_POOL } from '../src/meta/missions';
import { ACHIEVEMENTS, CATEGORIES, EMPTY_STATS, newlyUnlocked, roman } from '../src/meta/achievements';
import { activeSeason, seasonActive, nextSeason, SEASONS } from '../src/meta/seasons';
import { DEFAULT_EQUIPPED, EMOTES, ITEMS, item } from '../src/meta/catalog';
import { PASS_TIERS, freeReward, premiumReward, tierFromXp, PASS_XP_PER_TIER } from '../src/meta/battlepass';
import { ITEM_PRICES_USD } from '../src';

const base: MatchSummary = { place: 0, players: 4, won: true, teams: false, captures: 2, captured: 1, crowned: 4, soplos: 1, pairs: 5, triplePenalties: 0, mode: 'ai', table: 'barrio', entry: 200 };

describe('premios de una partida', () => {
  it('mesa de 200 con 4: 1º recibe 500 (su entrada + 75 % de dos rivales), 50 XP y 5 gemas', () => {
    expect(matchRewards(base)).toEqual({ coins: 500, xp: 50, gems: 5 });
  });
  it('2º recupera su entrada; 3º y 4º nada, sin gemas', () => {
    expect(matchRewards({ ...base, place: 1, won: false })).toEqual({ coins: 200, xp: 40, gems: 0 });
    expect(matchRewards({ ...base, place: 3, won: false })).toMatchObject({ coins: 0, gems: 0 });
  });
  it('6 jugadores: 1º, 2º y 3º cobran', () => {
    expect(matchRewards({ ...base, players: 6 }).coins).toBe(500);
    expect(matchRewards({ ...base, players: 6, place: 1, won: false }).coins).toBe(350);
    expect(matchRewards({ ...base, players: 6, place: 2, won: false }).coins).toBe(200);
    expect(matchRewards({ ...base, players: 6, place: 3, won: false }).coins).toBe(0);
  });
  it('partida sin apuesta: sin monedas ni gemas', () => {
    expect(matchRewards({ ...base, entry: 0, table: null })).toEqual({ coins: 0, xp: 10, gems: 0 });
  });
  it('las mesas más caras dan más XP', () => {
    expect(matchRewards({ ...base, table: 'capital', entry: 5000 }).xp).toBeGreaterThan(matchRewards(base).xp);
    expect(TABLES.map((t) => t.id)).toEqual(['barrio', 'ciudad', 'capital', 'leyenda', 'elite', 'top']);
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
    expect(DAILY_REWARDS.every((r) => r.coins > 0)).toBe(true);
  });
  it('la ruleta siempre cae en un sector válido', () => {
    for (let r = 0; r < 1; r += 0.01) expect(spinRoulette(r)).toBeLessThan(ROULETTE.length);
  });
});

describe('misiones', () => {
  it('3 distintas por día, deterministas, y avanzan con la partida', () => {
    const a = pickMissions(DAILY_POOL, '2026-11-11', 3);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    expect(pickMissions(DAILY_POOL, '2026-11-11', 3)).toEqual(a);
    expect(pickMissions(WEEKLY_POOL, '2026-W46', 3)).toHaveLength(3);
    const r = advanceMissions([{ id: 'd-cap5', progress: 4, claimed: false }], base);
    expect(r.completed.map((m) => m.id)).toEqual(['d-cap5']);
  });
});

describe('más de 1.000 logros', () => {
  it('hay más de 1.000 logros con ids únicos', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(1000);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const c of CATEGORIES) for (let i = 1; i < c.thresholds.length; i++) expect(c.thresholds[i]!).toBeGreaterThan(c.thresholds[i - 1]!);
  });
  it('se desbloquean por niveles y una sola vez', () => {
    const ctx = { stats: { ...EMPTY_STATS, games: 3, wins: 1, tableWins: { barrio: 1 } }, level: 1, owned: 5, passTiers: 0 };
    const first = newlyUnlocked(ctx, {}).map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(['games-1', 'games-2', 'games-3', 'wins-1', 'w-barrio-1']));
    const unlocked = Object.fromEntries(first.map((id) => [id, 1]));
    expect(newlyUnlocked(ctx, unlocked)).toEqual([]);
    expect(roman(49)).toBe('XLIX');
  });
});

describe('pase de batalla', () => {
  it('50 niveles; premium trae los tableros exclusivos', () => {
    expect(PASS_TIERS).toBe(50);
    expect(tierFromXp(PASS_XP_PER_TIER * 3 + 10)).toBe(3);
    expect(tierFromXp(10 ** 9)).toBe(50);
    expect(premiumReward(50).itemId).toBe('board-galaxia');
    expect(premiumReward(40).itemId).toBe('board-esmeralda');
    expect(freeReward(1).coins).toBeGreaterThan(0);
    for (let t = 1; t <= 50; t++) {
      const id = premiumReward(t).itemId;
      if (id) expect(item(id).currency).toBe('pass');
    }
  });
});

describe('temporadas y tienda', () => {
  it('Navidad cruza el año; Carnaval y Feria en sus meses', () => {
    const nav = SEASONS.find((s) => s.id === 'navidad')!;
    expect(seasonActive(nav, new Date(2026, 11, 24))).toBe(true);
    expect(seasonActive(nav, new Date(2027, 0, 5))).toBe(true);
    expect(activeSeason(new Date(2026, 1, 20))?.id).toBe('carnaval');
    expect(activeSeason(new Date(2026, 4, 1))).toBeNull();
    expect(nextSeason(new Date(2026, 4, 1)).season.id).toBe('feria');
  });
  it('la mayoría de tableros se pagan con dinero real y pocos con monedas', () => {
    const boards = ITEMS.filter((i) => i.category === 'board');
    const usd = boards.filter((b) => b.currency === 'usd').length;
    const coins = boards.filter((b) => b.currency === 'coins').length;
    expect(usd).toBeGreaterThan(coins);
    expect(coins).toBeGreaterThanOrEqual(1);
    for (const b of boards.filter((x) => x.currency === 'usd')) expect(ITEM_PRICES_USD[b.id]).toBeGreaterThan(0);
  });
  it('cada categoría tiene un objeto gratis equipado y los emotes cuestan gemas', () => {
    for (const id of Object.values(DEFAULT_EQUIPPED)) expect(item(id).currency).toBe('free');
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    expect(EMOTES.every((e) => e.gems >= 1)).toBe(true);
  });
});

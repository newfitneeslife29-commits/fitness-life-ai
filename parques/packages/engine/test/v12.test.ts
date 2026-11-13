import { describe, expect, it } from 'vitest';
import {
  advanceStory,
  applyMatch,
  claimChallenge,
  claimDaily,
  claimWinChest,
  dailyChallenge,
  DAY_MS,
  divisionOf,
  doubleLastWin,
  grantProduct,
  isVip,
  newProfile,
  nextDivision,
  saveStreak,
  STORY,
  STREAK_SAVE_GEMS,
  dayKey,
  ITEMS,
  DEFAULT_EQUIPPED,
  item,
} from '../src';
import type { MatchSummary } from '../src';

const now = new Date('2026-03-10T15:00:00Z');
const win = (over: Partial<MatchSummary> = {}): MatchSummary => ({
  place: 0, players: 4, won: true, teams: false, captures: 0, captured: 0, crowned: 4, soplos: 0, pairs: 0, triplePenalties: 0, mode: 'ai', table: 'barrio', entry: 200, ...over,
});

describe('v1.2: cofre por victorias', () => {
  it('cada 3 victorias queda un cofre listo; se abre una vez', () => {
    let p = newProfile('A', now);
    for (let i = 0; i < 3; i++) p = applyMatch(p, win(), now).profile;
    expect(p.winChest).toEqual({ wins: 0, ready: 1 });
    const r = claimWinChest(p, 0.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.winChest.ready).toBe(0);
    expect(r.profile.coins).toBeGreaterThanOrEqual(p.coins + r.coins);
    expect(claimWinChest(r.profile).ok).toBe(false);
  });
  it('las derrotas no llenan el cofre', () => {
    const p = applyMatch(newProfile('A', now), win({ won: false, place: 3 }), now).profile;
    expect(p.winChest.wins).toBe(0);
  });
});

describe('v1.2: Pase VIP', () => {
  it('da 30 días, marco VIP, y dobla la recompensa diaria; con VIP el cofre pide 2 victorias', () => {
    const g = grantProduct(newProfile('A', now), 'vip-30', 'g1', now);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(isVip(g.profile.vipUntil, now.getTime())).toBe(true);
    expect(g.profile.vipUntil).toBe(now.getTime() + 30 * DAY_MS);
    expect(g.profile.owned).toContain('frame-vip');
    const d = claimDaily(g.profile, now);
    expect(d.ok && d.coins).toBe(200); // 100 del día 1 × 2
    let p = g.profile;
    for (let i = 0; i < 2; i++) p = applyMatch(p, win(), now).profile;
    expect(p.winChest.ready).toBe(1);
    // renovar suma 30 días más
    const g2 = grantProduct(p, 'vip-30', 'g2', now);
    expect(g2.ok && g2.profile.vipUntil).toBe(now.getTime() + 60 * DAY_MS);
  });
  it('el marco VIP no se vende', () => {
    expect(item('frame-vip').currency).toBe('vip');
  });
});

describe('v1.2: duplicar premio con anuncio', () => {
  it('solo la última ganancia, una vez', () => {
    const r = applyMatch(newProfile('A', now), win({ matchId: 'm1' }), now);
    const net = r.outcome.coins - 200;
    expect(r.profile.lastWin).toEqual({ id: 'm1', net, doubled: false });
    const d = doubleLastWin(r.profile, 'm1');
    expect(d.ok && d.profile.coins).toBe(r.profile.coins + net);
    if (!d.ok) return;
    expect(doubleLastWin(d.profile, 'm1').ok).toBe(false);
    expect(doubleLastWin(r.profile, 'otra').ok).toBe(false);
  });
});

describe('v1.2: salvar la racha', () => {
  it('si faltaste un día y pagas gemas, la racha sigue', () => {
    const before = new Date(now.getTime() - 2 * DAY_MS);
    const p = { ...newProfile('A', now), gems: 50, daily: { lastClaim: dayKey(before), streak: 4, lastSpin: null } };
    const s = saveStreak(p, now);
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.profile.gems).toBe(50 - STREAK_SAVE_GEMS);
    const d = claimDaily(s.profile, now);
    expect(d.ok && d.profile.daily.streak).toBe(5);
  });
  it('no aplica si no faltaste o si faltaste más de un día', () => {
    const p = { ...newProfile('A', now), gems: 50, daily: { lastClaim: dayKey(new Date(now.getTime() - DAY_MS)), streak: 4, lastSpin: null } };
    expect(saveStreak(p, now).ok).toBe(false);
    const q = { ...p, daily: { ...p.daily, lastClaim: dayKey(new Date(now.getTime() - 4 * DAY_MS)) } };
    expect(saveStreak(q, now).ok).toBe(false);
  });
});

describe('v1.2: retos del día e Historia', () => {
  it('el reto cambia por día y se cobra una vez', () => {
    const c = dailyChallenge(dayKey(now));
    const r = claimChallenge(newProfile('A', now), now);
    expect(r.ok && r.coins).toBe(c.coins);
    if (!r.ok) return;
    expect(claimChallenge(r.profile, now).ok).toBe(false);
  });
  it('la Historia avanza en orden y entrega sus premios', () => {
    let p = newProfile('A', now);
    expect(advanceStory(p, 1).ok).toBe(false);
    const r = advanceStory(p, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    p = r.profile;
    expect(p.story).toBe(1);
    for (const id of STORY[0]!.reward.itemIds) expect(p.owned).toContain(id);
    expect(advanceStory(p, 0).ok).toBe(false);
    for (const st of STORY) for (const id of st.reward.itemIds) expect(ITEMS.some((i) => i.id === id)).toBe(true);
  });
});

describe('v1.2: ligas', () => {
  it('divisiones por trofeos', () => {
    expect(divisionOf(1000).id).toBe('bronce');
    expect(divisionOf(1300).id).toBe('oro');
    expect(divisionOf(5000).id).toBe('leyenda');
    expect(nextDivision(1250)).toEqual({ div: expect.objectContaining({ id: 'oro' }), missing: 50 });
    expect(nextDivision(9999)).toBeNull();
  });
  it('categoría de victorias con un objeto gratis por defecto', () => {
    expect(item(DEFAULT_EQUIPPED.victory).currency).toBe('free');
  });
});

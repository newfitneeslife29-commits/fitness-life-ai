import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS, AD_COINS, AD_DAILY_LIMIT, CHESTS, COIN_ITEMS, claimAd, claimEventTier, claimMission, buyDeal, dailyDeals, dayKey,
  eventAt, EVENTS, exchangeGems, grantProduct, item, ITEMS, newProfile, openChest, payTournament, grantTournamentPrize,
  rankPrize, tournamentPrizes, applyMatch, DAILY_POOL, WEEKLY_POOL, productFor, storeProductId,
} from '../src';
import type { MatchSummary } from '../src';

const now = new Date('2026-11-12T15:00:00Z');
const match = (o: Partial<MatchSummary> = {}): MatchSummary => ({
  place: 0, players: 4, won: true, teams: false, captures: 4, captured: 0, crowned: 4, soplos: 1, pairs: 3, triplePenalties: 0, mode: 'online', table: 'barrio', entry: 200, ...o,
});

describe('v0.9: logros y misiones', () => {
  it('hay muchos más logros (más de 2.000) con ids únicos', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(2000);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it('más misiones; se muestran 4 diarias y 4 semanales; las misiones dan gemas', () => {
    expect(DAILY_POOL.length).toBeGreaterThanOrEqual(20);
    expect(WEEKLY_POOL.length).toBeGreaterThanOrEqual(15);
    const p = newProfile('A', now);
    expect(p.missions.daily).toHaveLength(4);
    expect(p.missions.weekly).toHaveLength(4);
    const id = p.missions.daily[0]!.id;
    const done = { ...p, missions: { ...p.missions, daily: p.missions.daily.map((m) => (m.id === id ? { ...m, progress: 999 } : m)) } };
    const r = claimMission(done, id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile.stats.missionsDone).toBe(1);
  });
  it('una partida perfecta cuenta para logros nuevos y para el evento', () => {
    const r = applyMatch(newProfile('A', now), match({ captures: 3 }), now);
    expect(r.profile.stats.perfectWins).toBe(1);
    expect(r.profile.stats.bigCaptureGames).toBe(1);
    expect(r.profile.stats.tableGames.barrio).toBe(1);
  });
});

describe('anuncios con premio', () => {
  it('solo con pocas monedas, con espera y límite diario', () => {
    const rich = newProfile('A', now);
    expect(claimAd({ ...rich, coins: 5000 }, now).ok).toBe(false);
    let p = { ...rich, coins: 0 };
    const r1 = claimAd(p, now);
    expect(r1.ok && r1.profile.coins).toBe(AD_COINS + 50); // + logro "Rebuscador I"
    if (!r1.ok) return;
    expect(claimAd(r1.profile, new Date(now.getTime() + 1000)).ok).toBe(false);
    p = { ...r1.profile, coins: 0 };
    let t = now.getTime();
    for (let i = 1; i < AD_DAILY_LIMIT; i++) {
      t += 30_000;
      const r = claimAd({ ...p, coins: 0 }, new Date(t));
      expect(r.ok).toBe(true);
      if (r.ok) p = r.profile;
    }
    expect(claimAd({ ...p, coins: 0 }, new Date(t + 30_000)).ok).toBe(false);
  });
});

describe('eventos cada 15 días', () => {
  it('el evento cambia cada 15 días y sus objetos existen en el catálogo', () => {
    const a = eventAt(now.getTime());
    const b = eventAt(a.endsAt + 1);
    expect(b.period).not.toBe(a.period);
    expect(a.endsAt - a.startsAt).toBe(15 * 86400000);
    for (const e of EVENTS) {
      const last = e.tiers[e.tiers.length - 1]!;
      expect(item(last.itemId!).id).toBe(last.itemId);
      expect(item(last.itemId!).currency).toBe('event');
    }
  });
  it('se reclaman niveles con los puntos del evento', () => {
    const p0 = newProfile('A', now);
    const ev = eventAt(now.getTime()).def;
    expect(claimEventTier(p0, 0, now).ok).toBe(false);
    const p = { ...p0, event: { ...p0.event, points: 99999 } };
    const last = ev.tiers.length - 1;
    const r = claimEventTier(p, last, now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.owned).toContain(ev.tiers[last]!.itemId);
      expect(claimEventTier(r.profile, last, now).ok).toBe(false);
    }
  });
});

describe('tienda mejorada', () => {
  it('3 ofertas del día con descuento, solo una vez', () => {
    const deals = dailyDeals(dayKey(now));
    expect(deals).toHaveLength(3);
    for (const d of deals) expect(d.price).toBeLessThan(d.was);
    const p = { ...newProfile('A', now), coins: 1_000_000 };
    const r = buyDeal(p, deals[0]!.itemId, now);
    expect(r.ok).toBe(true);
    if (r.ok) expect(buyDeal(r.profile, deals[0]!.itemId, now).ok).toBe(false);
  });
  it('los cofres dan un objeto que no tienes y, si tienes todo, monedas', () => {
    const p = { ...newProfile('A', now), gems: 1000 };
    const r = openChest(p, CHESTS[0]!.id, 0.5, 0.5);
    expect(r.ok && r.itemId).toBeTruthy();
    const full = { ...p, owned: [...p.owned, ...COIN_ITEMS.map((i) => i.id)] };
    const r2 = openChest(full, CHESTS[0]!.id, 0.5, 0.5);
    expect(r2.ok && r2.itemId).toBe(null);
    expect(r2.ok && r2.coins).toBeGreaterThan(0);
    expect(openChest({ ...p, gems: 0 }, CHESTS[0]!.id).ok).toBe(false);
  });
  it('cambio de gemas por monedas', () => {
    const r = exchangeGems({ ...newProfile('A', now), gems: 10 }, 10);
    expect(r.ok && r.profile.coins).toBe(1000 + 2000);
  });
  it('los paquetes entregan monedas, gemas y objetos; todos los productos tienen id válido para las tiendas', () => {
    const r = grantProduct(newProfile('A', now), 'bundle-inicio', 'g1', now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.coins).toBeGreaterThanOrEqual(26000); // + logros desbloqueados
      expect(r.profile.owned).toContain('board-playa');
      expect(r.profile.bundles).toContain('bundle-inicio');
    }
    for (const it of ITEMS.filter((i) => i.currency === 'usd')) expect(productFor(`item:${it.id}`), it.id).toBeTruthy();
    for (const id of ['bundle-inicio', 'gems-xl']) expect(storeProductId(id)).toMatch(/^[a-z0-9_]+$/);
  });
});

describe('ranking y torneos', () => {
  it('premios por puesto: global > país > amigos', () => {
    expect(rankPrize('global', 1)!.coins).toBeGreaterThan(rankPrize('country', 1)!.coins);
    expect(rankPrize('country', 1)!.coins).toBeGreaterThan(rankPrize('friends', 1)!.coins);
    expect(rankPrize('global', 101)).toBeNull();
    expect(rankPrize('friends', 4)).toBeNull();
  });
  it('el bote se reparte sin pasarse', () => {
    const p = tournamentPrizes(100000, 25);
    expect(p).toHaveLength(10);
    expect(p.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100000);
    expect(p[0]).toBeGreaterThan(p[1]!);
    expect(tournamentPrizes(1000, 2)).toHaveLength(2);
  });
  it('inscripción y premio de torneo actualizan las estadísticas', () => {
    const p = newProfile('A', now);
    expect(payTournament(p, 5000).ok).toBe(false);
    const r = payTournament(p, 1000);
    expect(r.ok && r.profile.coins).toBe(50); // + logro "Competidor I"
    const w = grantTournamentPrize(p, 1, 30000, 30);
    expect(w.profile.stats.tournamentWins).toBe(1);
    expect(w.profile.stats.tournamentCoins).toBe(30000);
  });
});

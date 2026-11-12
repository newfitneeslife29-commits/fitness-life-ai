import { describe, expect, it } from 'vitest';
import { applyMatch, buyWithCoins, claimDaily, claimMission, claimPass, equip, grantProduct, newProfile, payEntry, setIdentity, spendEmote, spin, summaryFor } from '../src';

const now = new Date(2026, 10, 11, 12);
const win = summaryFor({ place: 0, players: 4, won: true, teams: false, stats: { captures: 3, captured: 1, crowned: 4, soplosHechos: 1, pairs: 5, tripleParCastigos: 0 }, mode: 'ai', table: 'barrio', entry: 200 });

describe('perfil (operaciones del servidor)', () => {
  it('cuenta nueva: 1.000 monedas', () => {
    expect(newProfile('ABCD1234', now).coins).toBe(1000);
  });

  it('cobra la entrada y paga el premio al ganador (+5 gemas)', () => {
    let p = newProfile('A', now);
    const paid = payEntry(p, 200);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    p = paid.profile;
    expect(p.coins).toBe(800);
    const r = applyMatch(p, win, now);
    expect(r.outcome).toMatchObject({ coins: 500, xp: 50, gems: 5 });
    expect(r.profile.coins).toBeGreaterThanOrEqual(1300);
    expect(r.profile.gems).toBe(15);
    expect(r.profile.stats.tableWins.barrio).toBe(1);
    expect(r.outcome.achievements.length).toBeGreaterThan(0);
  });

  it('no deja entrar sin monedas suficientes', () => {
    expect(payEntry({ ...newProfile('A', now), coins: 100 }, 200).ok).toBe(false);
  });

  it('compras con monedas solo de objetos de monedas; las de dinero real se entregan una vez', () => {
    const p = { ...newProfile('A', now), coins: 20000 };
    expect(buyWithCoins(p, 'board-caribe', now).ok).toBe(false); // es de dinero real
    const ok = buyWithCoins(p, 'board-cafetero', now);
    expect(ok.ok && ok.profile.equipped.board).toBe('board-cafetero');
    const g = grantProduct(p, 'item:board-oro', 'cs_1', now);
    expect(g.ok && g.profile.owned).toContain('board-oro');
    if (!g.ok) return;
    expect(grantProduct(g.profile, 'item:board-oro', 'cs_1', now).ok).toBe(false);
    const coins = grantProduct(p, 'coins-m', 'cs_2', now);
    expect(coins.ok && coins.profile.coins).toBe(50000 + 50) // + logro "Mecenas I";
    expect(equip(p, 'board-oro').ok).toBe(false);
  });

  it('emotes con gemas; los del pase necesitan Premium', () => {
    const p = newProfile('A', now);
    const r = spendEmote(p, 'e-risa');
    expect(r.ok && r.profile.gems).toBe(9);
    expect(spendEmote(p, 'e-trofeo').ok).toBe(false);
    expect(spendEmote({ ...p, gems: 0 }, 'e-risa').ok).toBe(false);
  });

  it('recompensa diaria, ruleta y misiones solo una vez', () => {
    const p = newProfile('A', now);
    const d = claimDaily(p, now);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(claimDaily(d.profile, now).ok).toBe(false);
    const s = spin(d.profile, now, 0);
    expect(s.ok && s.coins).toBe(50);
    if (!s.ok) return;
    expect(spin(s.profile, now).ok).toBe(false);
    const id = p.missions.daily[0]!.id;
    expect(claimMission(p, id).ok).toBe(false);
  });

  it('pase: premios por nivel; Premium con compra', () => {
    let p = { ...newProfile('A', now), pass: { ...newProfile('A', now).pass, xp: 150 * 10 } };
    const f = claimPass(p, 1, 'free', now);
    expect(f.ok).toBe(true);
    expect(claimPass(p, 1, 'premium', now).ok).toBe(false);
    const g = grantProduct(p, 'pass-premium', 'cs_3', now);
    if (!g.ok) throw new Error();
    p = g.profile;
    const pr = claimPass(p, 10, 'premium', now);
    expect(pr.ok && pr.profile.owned).toContain('pieces-corona');
    expect(claimPass(p, 11, 'free', now).ok).toBe(false);
  });

  it('valida nombre, foto y país', () => {
    const p = newProfile('A', now);
    expect(setIdentity(p, { photo: 'javascript:alert(1)' }).ok).toBe(false);
    const r = setIdentity(p, { name: '  Sebastián el mejor jugador  ', country: 'co' });
    expect(r.ok && r.profile.name.length).toBeLessThanOrEqual(14);
    expect(r.ok && r.profile.country).toBe('CO');
  });
});

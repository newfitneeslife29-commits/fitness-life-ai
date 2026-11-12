import { describe, expect, it } from 'vitest';
import { Store } from '../src/store';

describe('Store (SQLite)', () => {
  it('crea cuentas de invitado y solo entra con el token correcto', () => {
    const s = new Store(null);
    const a = s.createAccount();
    expect(a.profile.coins).toBe(1000);
    expect(s.auth(a.id, a.token)?.id).toBe(a.id);
    expect(s.auth(a.id, 'otro')).toBeNull();
    expect(s.auth('NOEXISTE', a.token)).toBeNull();
  });

  it('actualiza el perfil en transacción', () => {
    const s = new Store(null);
    const a = s.createAccount();
    const r = s.update(a.id, (p) => ({ ok: true, profile: { ...p, coins: p.coins - 200 } }));
    expect(r.ok).toBe(true);
    expect(s.getProfile(a.id)!.coins).toBe(800);
    expect(s.update('NOEXISTE', (p) => ({ ok: true, profile: p })).ok).toBe(false);
  });

  it('ranking, torneo y premio de la semana pasada (una sola vez)', () => {
    const s = new Store(null);
    const ids = [1, 2, 3, 4].map(() => s.createAccount().id);
    s.recordMatch(ids);
    s.recordMatch([ids[0]!, ids[2]!, ids[1]!, ids[3]!]);
    const g = s.ranking('global');
    expect(g[0]!.playerId).toBe(ids[0]);
    expect(g[0]!.rating).toBe(1050);
    expect(s.rankOf(ids[0]!)).toBe(1);
    expect(s.tournament().rows[0]).toMatchObject({ playerId: ids[0], points: 20 });
    const s2 = new Store(null);
    const b = [1, 2, 3, 4].map(() => s2.createAccount().id);
    s2.recordMatch(b, new Date(Date.now() - 7 * 86400000));
    const c = s2.claimLastWeek(b[0]!);
    expect(c).toMatchObject({ ok: true, place: 1, coins: 5000 });
    expect(s2.getProfile(b[0]!)!.coins).toBe(6000);
    expect(s2.claimLastWeek(b[0]!).ok).toBe(false);
    expect(s2.claimLastWeek(b[3]!).ok).toBe(false);
  });

  it('una compra verificada se registra una sola vez', () => {
    const s = new Store(null);
    const a = s.createAccount();
    expect(s.recordPurchase('cs_1', a.id, 'coins-s')).toBe(true);
    expect(s.recordPurchase('cs_1', a.id, 'coins-s')).toBe(false);
  });
});

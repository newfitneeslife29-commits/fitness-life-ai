import { describe, expect, it } from 'vitest';
import { Store } from '../src/store';

describe('Store (Postgres / PGlite)', () => {
  it('crea cuentas de invitado y solo entra con el token correcto', async () => {
    const s = new Store();
    const a = await s.createAccount();
    expect(a.profile.coins).toBe(1000);
    expect((await s.auth(a.id, a.token))?.id).toBe(a.id);
    expect(await s.auth(a.id, 'otro')).toBeNull();
    expect(await s.auth('NOEXISTE', a.token)).toBeNull();
    await s.close();
  });

  it('actualiza el perfil en transacción, también con operaciones simultáneas', async () => {
    const s = new Store();
    const a = await s.createAccount();
    const r = await s.update(a.id, (p) => ({ ok: true, profile: { ...p, coins: p.coins - 200 } }));
    expect(r.ok).toBe(true);
    expect((await s.getProfile(a.id))!.coins).toBe(800);
    expect((await s.update('NOEXISTE', (p) => ({ ok: true, profile: p }))).ok).toBe(false);
    await Promise.all(Array.from({ length: 8 }, () => s.update(a.id, (p) => ({ ok: true, profile: { ...p, coins: p.coins + 10 } }))));
    expect((await s.getProfile(a.id))!.coins).toBe(880);
    await s.close();
  });

  it('ranking, torneo y premio de la semana pasada (una sola vez)', async () => {
    const s = new Store();
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await s.createAccount()).id);
    await s.recordMatch(ids);
    await s.recordMatch([ids[0]!, ids[2]!, ids[1]!, ids[3]!]);
    const g = await s.ranking('global');
    expect(g[0]!.playerId).toBe(ids[0]);
    expect(g[0]!.rating).toBe(1050);
    expect(await s.rankOf(ids[0]!)).toBe(1);
    expect((await s.ranking('friends', undefined, [ids[1]!])).map((r) => r.playerId)).toEqual([ids[1]]);
    expect((await s.tournament()).rows[0]).toMatchObject({ playerId: ids[0], points: 20 });

    const b: string[] = [];
    for (let i = 0; i < 4; i++) b.push((await s.createAccount()).id);
    await s.recordMatch(b, new Date(Date.now() - 7 * 86400000));
    expect(await s.claimLastWeek(b[0]!)).toMatchObject({ ok: true, place: 1, coins: 5000 });
    expect((await s.getProfile(b[0]!))!.coins).toBe(6000);
    expect((await s.claimLastWeek(b[0]!)).ok).toBe(false);
    expect((await s.claimLastWeek(b[3]!)).ok).toBe(false);
    await s.close();
  });

  it('una compra verificada se entrega una sola vez', async () => {
    const s = new Store();
    const a = await s.createAccount();
    const give = (p: import('@parques/engine').Profile) => ({ ok: true, profile: { ...p, gems: p.gems + 20 } });
    expect(await s.creditPurchase('cs_1', a.id, 'gems-s', 'stripe', give)).toBe(true);
    expect(await s.creditPurchase('cs_1', a.id, 'gems-s', 'stripe', give)).toBe(false);
    const gems = (await s.getProfile(a.id))!.gems;
    expect(await s.creditPurchase('cs_2', 'NOEXISTE', 'gems-s', 'stripe', give)).toBe(false);
    expect(await s.creditPurchase('cs_2', a.id, 'gems-s', 'stripe', give)).toBe(true);
    expect((await s.getProfile(a.id))!.gems).toBe(gems + 20);
    await s.close();
  });
});

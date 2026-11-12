import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { startServer } from '../src/server';
import { StorePurchases } from '../src/payments';

let srv: ReturnType<typeof startServer>;
let url = '';
const sockets: Socket[] = [];

// RevenueCat simulado: el usuario tiene una compra de 30.000 monedas en Google Play.
const fakeRc = new StorePurchases('sk_rc_test_123456', (async () => ({
  ok: true,
  json: async () => ({ subscriber: { non_subscriptions: { coins_m: [{ id: 'gpa.1', store: 'play_store' }] } } }),
})) as unknown as typeof fetch);

beforeAll(async () => {
  srv = startServer({
    matchWaitMs: 200,
    timing: { turnMs: 30, soploMs: 20, botDelayMs: 2, graceMs: 100 },
    storePurchases: fakeRc,
    // Apple / Google simulados: el token "apple:<sub>" es válido.
    verifyIdentity: async (provider, token) => (token.startsWith(`${provider}:`) ? { sub: token.slice(provider.length + 1), email: null } : null),
  });
  await new Promise<void>((r) => srv.http.listen(0, r));
  url = `http://localhost:${(srv.http.address() as AddressInfo).port}`;
});
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await srv.close();
  srv.http.close();
});

interface Client {
  s: Socket;
  id: string;
  token: string;
}

async function client(existing?: { id: string; token: string }): Promise<Client> {
  const s = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(s);
  await new Promise<void>((r) => s.on('connect', () => r()));
  const r = await new Promise<any>((res) => s.emit('auth', existing ?? {}, res));
  expect(r.ok).toBe(true);
  return { s, id: r.id, token: existing?.token ?? r.token };
}
const once = <T>(s: Socket, ev: string) => new Promise<T>((r) => s.once(ev, (x: T) => r(x)));
const op = (c: Client, o: unknown) => new Promise<any>((r) => c.s.emit('profile_op', o, r));

describe('servidor online (autoridad)', () => {
  it('crea la cuenta, entra con el token y rechaza tokens falsos', async () => {
    const a = await client();
    expect(a.token.length).toBeGreaterThan(20);
    const again = await client({ id: a.id, token: a.token });
    expect(again.id).toBe(a.id);
    const s = connect(url, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await new Promise<void>((r) => s.on('connect', () => r()));
    const bad = await new Promise<any>((r) => s.emit('auth', { id: a.id, token: 'falso' }, r));
    expect(bad.ok).toBe(false);
  });

  it('las monedas las maneja el servidor: compras con monedas, emotes con gemas, recompensa diaria', async () => {
    const a = await client();
    expect((await op(a, { op: 'buy', itemId: 'board-cafetero' })).error).toBe('Te faltan monedas');
    expect((await op(a, { op: 'buy', itemId: 'board-oro' })).ok).toBe(false); // es de dinero real
    const d = await op(a, { op: 'daily' });
    expect(d.ok).toBe(true);
    expect(d.profile.coins).toBe(1100 + 50); // + logro "Constante I"
    expect((await op(a, { op: 'daily' })).ok).toBe(false);
    const e = await op(a, { op: 'emote', emoteId: 'e-risa' });
    expect(e.profile.gems).toBe(9);
  });

  it('contra la máquina en el servidor: cobra la entrada y paga el premio al terminar', async () => {
    const a = await client();
    const sync = once<any>(a.s, 'sync');
    const result = once<any>(a.s, 'match_result');
    const r = await new Promise<any>((res) => a.s.emit('play_ai', { table: 'barrio', players: 4 }, res));
    expect(r.ok).toBe(true);
    const sy = await sync;
    expect(sy.room.entry).toBe(200);
    expect(sy.room.mode).toBe('ai');
    // El temporizador juega por el humano hasta el final.
    const res = await result;
    expect(res.outcome.entry).toBe(200);
    expect(res.profile.stats.games).toBe(1);
    expect(res.profile.coins).toBe(1000 - 200 + res.outcome.coins + res.outcome.levelCoins + res.outcome.achievements.reduce((t: number, x: any) => t + x.coins, 0));
    // Contra la máquina no cuenta para el ranking.
    const rows = await new Promise<any[]>((res2) => a.s.emit('ranking', { scope: 'global' }, res2));
    expect(rows.find((x) => x.playerId === a.id)).toBeUndefined();
  }, 40000);

  it('no deja jugar mesas sin monedas ni salas sin nivel', async () => {
    const a = await client();
    const r1 = await new Promise<any>((res) => a.s.emit('play_ai', { table: 'ciudad', players: 4 }, res));
    expect(r1.error).toBe('Necesitas nivel 5');
    const r2 = await new Promise<any>((res) => a.s.emit('quick_match', 'elite', res));
    expect(r2.ok).toBe(false);
    const r3 = await new Promise<any>((res) => a.s.emit('quick_match', 'top', res));
    expect(r3.ok).toBe(false);
  });

  it('partida rápida online entre personas: empareja, termina y suma ranking y torneo', async () => {
    const a = await client();
    const b = await client();
    const ra = once<any>(a.s, 'match_result');
    a.s.emit('quick_match', 'barrio', () => {});
    b.s.emit('quick_match', 'barrio', () => {});
    const res = await ra;
    expect(res.profile.stats.onlineGames).toBe(1);
    await new Promise((r) => setTimeout(r, 50));
    const rows = await new Promise<any[]>((r) => a.s.emit('ranking', { scope: 'global' }, r));
    expect(rows.map((x) => x.playerId)).toEqual(expect.arrayContaining([a.id, b.id]));
    const tour = await new Promise<any>((r) => a.s.emit('tournament', r));
    expect(tour.rows.map((x: any) => x.playerId)).toEqual(expect.arrayContaining([a.id, b.id]));
  }, 40000);

  it('mesa privada con código: crear, unirse y empezar', async () => {
    const host = await client();
    const guest = await client();
    const created = await new Promise<any>((r) => host.s.emit('create_private', { seats: 2, rules: {} }, r));
    expect(created.code).toMatch(/^[A-Z0-9]{5}$/);
    expect((await new Promise<any>((r) => guest.s.emit('join_private', created.code, r))).ok).toBe(true);
    expect((await new Promise<any>((r) => guest.s.emit('start_private', r))).ok).toBe(false);
    const sync = once<any>(guest.s, 'sync');
    expect((await new Promise<any>((r) => host.s.emit('start_private', r))).ok).toBe(true);
    expect((await sync).mySeat).toBe(1);
  }, 15000);

  it('compras de Google Play / App Store (RevenueCat) se acreditan una sola vez', async () => {
    const a = await client();
    const post = (body: unknown) => fetch(`${url}/api/iap/verify`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json() as Promise<any>);
    expect((await post({ id: a.id, token: 'falso' })).ok).toBe(false);
    const r1 = await post({ id: a.id, token: a.token });
    expect(r1.granted).toEqual(['coins-m']);
    expect(r1.profile.coins).toBe(31000 + 50) // + logro "Mecenas I";
    const r2 = await post({ id: a.id, token: a.token });
    expect(r2.granted).toEqual([]);
    expect(r2.profile.coins).toBe(31000 + 50);
  });
});

describe('v0.9 en el servidor', () => {
  it('buscar un jugador por su código, ver si está conectado e invitarlo a una mesa', async () => {
    const a = await client();
    const b = await client();
    const found = await new Promise<any>((r) => a.s.emit('find_player', b.id.toLowerCase(), r));
    expect(found).toMatchObject({ id: b.id, online: true, level: 1 });
    expect(await new Promise<any>((r) => a.s.emit('find_player', 'NOEXISTE', r))).toBeNull();
    const online = await new Promise<string[]>((r) => a.s.emit('friends_online', [b.id, 'NOEXISTE'], r));
    expect(online).toEqual([b.id]);
    const got = once<any>(b.s, 'invited');
    expect((await new Promise<any>((r) => a.s.emit('invite', { to: b.id, code: 'ABCDE' }, r))).ok).toBe(true);
    expect(await got).toMatchObject({ code: 'ABCDE', from: { id: a.id } });
  });

  it('anuncios con premio solo sin monedas; ofertas del día y cofres', async () => {
    const a = await client();
    expect((await op(a, { op: 'ad' })).ok).toBe(false); // tiene 1.000 monedas
    const chest = await op(a, { op: 'chest', chestId: 'cofre-bronce' });
    expect(chest.error).toBe('Te faltan gemas');
    const ex = await op(a, { op: 'exchange', gems: 10 });
    expect(ex.ok).toBe(true);
    expect(ex.profile.coins).toBe(3000);
  });

  it('copas: inscribirse cobra la inscripción una vez; el cierre de semana paga el bote', async () => {
    const a = await client();
    expect((await op(a, { op: 'cup_join', tier: 'oro' })).error).toBe('Necesitas nivel 40');
    const j = await op(a, { op: 'cup_join', tier: 'bronce' });
    expect(j.error).toBe('Necesitas nivel 3');
    // Nivel suficiente: se sube el nivel en la base para la prueba.
    await srv.store.update(a.id, (p) => ({ ok: true, profile: { ...p, xp: 1000, coins: 5000 } }));
    const ok = await op(a, { op: 'cup_join', tier: 'bronce' });
    expect(ok.ok).toBe(true);
    expect(ok.profile.coins).toBeLessThan(5000); // pagó la inscripción (y ganó el logro "Competidor I")
    expect((await op(a, { op: 'cup_join', tier: 'bronce' })).error).toBe('Ya estás inscrito');
    const cups = await new Promise<any[]>((r) => a.s.emit('cups', r));
    const bronce = cups.find((c) => c.tier === 'bronce');
    expect(bronce).toMatchObject({ joined: true, players: 1 });
    expect(bronce.pool).toBeGreaterThan(10000);
    // Una partida de copa suma puntos.
    await srv.store.recordCup('bronce', [a.id]);
    const before = (await srv.store.getProfile(a.id))!.coins;
    const { weekKey } = await import('@parques/engine');
    const paid = await srv.store.settleCups(weekKey(new Date()));
    expect(paid.find((x) => x.playerId === a.id && x.tier === 'bronce')).toMatchObject({ place: 1 });
    expect((await srv.store.getProfile(a.id))!.coins).toBeGreaterThan(before);
    expect(await srv.store.settleCups(weekKey(new Date()))).toEqual([]); // una sola vez
    const hall = await new Promise<any>((r) => a.s.emit('hall_of_fame', r));
    expect(hall.wins.some((w: any) => w.playerId === a.id)).toBe(true);
  });

  it('premios del ranking: el cierre paga al top una sola vez', async () => {
    const { weekKey } = await import('@parques/engine');
    const wk = `${weekKey(new Date())}-test`;
    const paid = await srv.store.settleRanking(wk);
    expect(paid.length).toBeGreaterThan(0);
    expect(paid[0]).toMatchObject({ scope: 'global', place: 1 });
    expect(await srv.store.settleRanking(wk)).toEqual([]);
  });

  it('Apple / Google: vincula la cuenta actual y luego entra a ella desde otro celular', async () => {
    const a = await client();
    const bad = await new Promise<any>((r) => a.s.emit('auth_provider', { provider: 'apple', idToken: 'malo', link: true }, r));
    expect(bad.ok).toBe(false);
    const link = await new Promise<any>((r) => a.s.emit('auth_provider', { provider: 'apple', idToken: 'apple:sub-1', link: true }, r));
    expect(link).toMatchObject({ ok: true, id: a.id, linked: true });
    expect(link.profile.linked).toContain('apple');
    // Otro celular (cuenta de invitado nueva) entra con la misma cuenta de Apple → recibe la cuenta original.
    const b = await client();
    const login = await new Promise<any>((r) => b.s.emit('auth_provider', { provider: 'apple', idToken: 'apple:sub-1', link: false }, r));
    expect(login).toMatchObject({ ok: true, id: a.id });
    expect(login.token).toBeTruthy();
    const again = await client({ id: a.id, token: login.token });
    expect(again.id).toBe(a.id);
    // Una cuenta de Google nueva sin sesión crea su propia cuenta.
    const s = connect(url, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await new Promise<void>((r) => s.on('connect', () => r()));
    const g = await new Promise<any>((r) => s.emit('auth_provider', { provider: 'google', idToken: 'google:g-1', name: 'Ana', link: false }, r));
    expect(g.ok).toBe(true);
    expect(g.profile.name).toBe('Ana');
  });
});

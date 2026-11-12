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
  srv = startServer({ matchWaitMs: 200, timing: { turnMs: 30, soploMs: 20, botDelayMs: 2, graceMs: 100 }, storePurchases: fakeRc });
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
    expect(d.profile.coins).toBe(1100);
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
    expect(r1.profile.coins).toBe(31000);
    const r2 = await post({ id: a.id, token: a.token });
    expect(r2.granted).toEqual([]);
    expect(r2.profile.coins).toBe(31000);
  });
});

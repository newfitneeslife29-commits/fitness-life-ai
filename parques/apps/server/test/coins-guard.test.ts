import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { startServer } from '../src/server';

let srv: ReturnType<typeof startServer>;
let url = '';
const sockets: Socket[] = [];
beforeAll(async () => {
  process.env.PARQUES_ADMIN_TOKEN = 'clave-admin-de-prueba';
  srv = startServer({ matchWaitMs: 150, flashWaitMs: 150, timing: { turnMs: 30, soploMs: 20, botDelayMs: 2, graceMs: 100 } });
  await new Promise<void>((r) => srv.http.listen(0, r));
  url = `http://localhost:${(srv.http.address() as AddressInfo).port}`;
});
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await srv.close();
  srv.http.close();
});
const emit = (s: Socket, ev: string, ...a: unknown[]) => new Promise<any>((r) => (s.emit as any)(ev, ...a, r));

describe('sin monedas no se juega', () => {
  it('ninguna partida con premio empieza si no alcanza para la entrada', async () => {
    const s = connect(url, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await new Promise<void>((r) => s.on('connect', () => r()));
    const me = await emit(s, 'auth', {});
    await fetch(`${url}/api/admin/grant`, { method: 'POST', headers: { 'x-admin-token': 'clave-admin-de-prueba', 'content-type': 'application/json' }, body: JSON.stringify({ id: me.id, coins: -950, gems: 0 }) });
    let synced = false;
    s.on('sync', () => (synced = true));
    const cases: [string, unknown[]][] = [
      ['play_ai', [{ table: 'barrio', players: 4 }]],
      ['play_ai', [{ table: null, players: 4 }]],
      ['play_ai', [{ table: 'nada', players: 2 }]],
      ['play_ai', [{ table: null, players: 4, story: 0 }]],
      ['play_ai', [{ table: null, players: 4, challenge: true }]],
      ['play_ai', [{ table: 'barrio', players: 2, quick: true }]],
      ['play_ai', [{ table: 'barrio', players: 4, teams: true }]],
      ['quick_match', ['barrio']],
      ['flash_join', []],
      ['create_private', [{ seats: 4, rules: {}, table: 'barrio' }]],
    ];
    for (const [ev, args] of cases) {
      const r = await emit(s, ev, ...args);
      expect(r, `${ev} ${JSON.stringify(args)}`).toEqual({ ok: false, error: 'Te faltan monedas' });
    }
    await new Promise((r) => setTimeout(r, 500));
    expect(synced).toBe(false);
    expect((await emit(s, 'profile_op', { op: 'get' })).profile.coins).toBe(50);
  }, 30000);
});

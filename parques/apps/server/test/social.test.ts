import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { CLUB_COST, REFERRAL } from '@parques/engine';
import { startServer } from '../src/server';
import { Social } from '../src/social';

let srv: ReturnType<typeof startServer>;
let url = '';
const sockets: Socket[] = [];

beforeAll(async () => {
  process.env.PARQUES_ADMIN_TOKEN = 'clave-admin-de-prueba';
  srv = startServer({ matchWaitMs: 150, flashWaitMs: 150, flashFinalDelayMs: 20, timing: { turnMs: 30, soploMs: 20, botDelayMs: 2, graceMs: 100 } });
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
}
async function client(): Promise<Client> {
  const s = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(s);
  await new Promise<void>((r) => s.on('connect', () => r()));
  const r = await new Promise<any>((res) => s.emit('auth', {}, res));
  expect(r.ok).toBe(true);
  return { s, id: r.id };
}
const emit = <T = any>(c: Client, ev: string, ...args: unknown[]) => new Promise<T>((r) => (c.s.emit as any)(ev, ...args, r));
const op = (c: Client, o: unknown) => emit(c, 'profile_op', o);
const admin = async (path: string, body?: unknown, token = 'clave-admin-de-prueba') => {
  const r = await fetch(`${url}/api/admin/${path}`, { method: body ? 'POST' : 'GET', headers: { 'x-admin-token': token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: (await r.json()) as any };
};

describe('v1.2 social', () => {
  it('referidos: el nuevo y quien invita ganan una sola vez', async () => {
    const a = await client();
    const b = await client();
    const r = await op(b, { op: 'referral', code: a.id });
    expect(r.ok).toBe(true);
    expect(r.profile.coins).toBe(1000 + REFERRAL.newCoins);
    expect((await op(b, { op: 'referral', code: a.id })).ok).toBe(false);
    expect((await op(a, { op: 'referral', code: a.id })).ok).toBe(false); // a sí mismo no
    const pa = await op(a, { op: 'get' });
    expect(pa.profile.coins).toBe(1000 + REFERRAL.coins);
    expect(pa.profile.referrals).toBe(1);
  });

  it('mensajes solo entre amigos y bloqueo', async () => {
    const a = await client();
    const b = await client();
    expect((await emit(a, 'dm', { to: b.id, text: 'hola' })).ok).toBe(false);
    await op(a, { op: 'friend_add', friend: { id: b.id, name: '', avatar: '' } });
    const got = new Promise<any>((r) => b.s.once('dm', r));
    const sent = await emit(a, 'dm', { to: b.id, text: 'hola gonorrea, ¿jugamos?' });
    expect(sent.ok).toBe(true);
    expect((await got).text).toBe('hola ********, ¿jugamos?');
    expect((await emit<any[]>(b, 'dm_history', a.id)).length).toBe(1);
    await op(b, { op: 'block', id: a.id });
    expect((await emit(a, 'dm', { to: b.id, text: 'otra' })).ok).toBe(false);
  });

  it('clubes: crear, unirse, chat, victorias y cofre', async () => {
    const a = await client();
    const b = await client();
    expect((await emit(a, 'club_create', { name: 'Los Parceros', emoji: '🦜' })).error).toBe('Te faltan monedas');
    await admin('grant', { id: a.id, coins: CLUB_COST, gems: 0 });
    const c = await emit(a, 'club_create', { name: 'Los Parceros', emoji: '🦜' });
    expect(c.ok).toBe(true);
    expect(c.profile.coins).toBe(1000);
    const list = await emit<any[]>(b, 'club_list', 'parce');
    expect(list[0].name).toBe('Los Parceros');
    expect((await emit(b, 'club_join', list[0].id)).ok).toBe(true);
    const msg = new Promise<any>((r) => a.s.once('club_chat', r));
    await emit(b, 'club_chat', '¡Vamos parche!');
    expect((await msg).text).toBe('¡Vamos parche!');
    const info = await emit<any>(a, 'club_info');
    expect(info.members).toBe(2);
    expect(info.rows.find((r: any) => r.id === a.id).role).toBe('owner');
    expect((await op(b, { op: 'club_chest', tier: 0 })).ok).toBe(false);
    const social = new Social(srv.store);
    for (let i = 0; i < 10; i++) await social.clubWin(b.id);
    const chest = await op(b, { op: 'club_chest', tier: 0 });
    expect(chest.ok).toBe(true);
    expect((await op(b, { op: 'club_chest', tier: 0 })).ok).toBe(false);
    expect((await emit(a, 'club_kick', b.id)).ok).toBe(true);
    expect((await emit(a, 'club_leave')).ok).toBe(true);
    expect(await emit(a, 'club_info')).toBe(null);
  });

  it('reportes y suspensión desde el panel de administración', async () => {
    const a = await client();
    const b = await client();
    expect((await emit(a, 'report', { playerId: b.id, reason: 'groserías' })).ok).toBe(true);
    expect((await emit(a, 'report', { playerId: b.id, reason: 'groserías' })).ok).toBe(false);
    expect((await admin('stats', undefined, 'mala')).status).toBe(401);
    const st = await admin('stats');
    expect(st.body.openReports).toBeGreaterThan(0);
    const reps = await admin('reports');
    expect(reps.body.some((r: any) => r.target === b.id)).toBe(true);
    expect((await admin('find?q=' + b.id)).body[0].id).toBe(b.id);
    await admin('ban', { id: b.id, hours: 2, reason: 'prueba' });
    const s = connect(url, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await new Promise<void>((r) => s.on('connect', () => r()));
    const page = await fetch(`${url}/admin`);
    expect(await page.text()).toContain('Administración');
    const redirect = await fetch(`${url}/r/${a.id}`, { redirect: 'manual' });
    expect(redirect.headers.get('location')).toBe(`/?ref=${a.id}`);
  });

  it('torneo relámpago: semifinal contra la máquina y final', async () => {
    const a = await client();
    const done = new Promise<any>((resolve) => {
      a.s.on('flash', (m: any) => {
        if (m.bracket?.stage === 'done') resolve(m.bracket);
      });
    });
    expect((await emit(a, 'flash_join')).ok).toBe(true);
    const b = await done;
    expect(b.semis).toHaveLength(4);
    expect(b.final.names).toHaveLength(4);
    expect(['champion', 'done', 'out']).toContain(b.me);
  }, 60000);

  it('2 vs 2: la pareja de la mesa privada busca rivales y juega del mismo equipo', async () => {
    const a = await client();
    const b = await client();
    const created = await emit(a, 'create_private', { seats: 4, rules: { teams: true } });
    expect(created.ok).toBe(true);
    expect((await emit(a, 'duo_match')).ok).toBe(false); // falta el compañero
    expect((await emit(b, 'join_private', created.code)).ok).toBe(true);
    const sync = new Promise<any>((r) => a.s.once('sync', r));
    expect((await emit(a, 'duo_match')).ok).toBe(true);
    const m = await sync;
    const seatA = m.mySeat;
    const seatB = m.room.seats.findIndex((s: any) => s.playerId === b.id);
    expect(Math.abs(seatA - seatB)).toBe(2);
    expect(m.state.rules.teams).toBe(true);
  }, 20000);

  it('abandonar 3 partidas online seguidas deja sin online un rato', async () => {
    const a = await client();
    for (let i = 0; i < 3; i++) {
      const sync = new Promise<any>((r) => a.s.once('sync', r));
      expect((await emit(a, 'quick_match', 'barrio')).ok).toBe(true);
      await sync;
      a.s.emit('leave');
      await new Promise((r) => setTimeout(r, 80));
    }
    const p = await op(a, { op: 'get' });
    expect(p.profile.penaltyUntil).toBeGreaterThan(Date.now());
    const r = await emit(a, 'quick_match', 'barrio');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Abandonaste');
  }, 20000);
});

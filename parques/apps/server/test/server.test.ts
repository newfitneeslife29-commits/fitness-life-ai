import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { startServer } from '../src/server';

let srv: ReturnType<typeof startServer>;
let url = '';
const sockets: Socket[] = [];

beforeAll(async () => {
  srv = startServer({ matchWaitMs: 200, timing: { turnMs: 40, soploMs: 20, botDelayMs: 2, graceMs: 100 } });
  await new Promise<void>((r) => srv.http.listen(0, r));
  url = `http://localhost:${(srv.http.address() as AddressInfo).port}`;
});
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await srv.close();
  srv.http.close();
});

async function client(id: string, level = 1): Promise<Socket> {
  const s = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(s);
  await new Promise<void>((r) => s.on('connect', () => r()));
  await new Promise<void>((r) => s.emit('hello', { playerId: id, name: id, avatar: '🙂', country: 'CO', level }, () => r()));
  return s;
}
const once = <T>(s: Socket, ev: string) => new Promise<T>((r) => s.once(ev, (x: T) => r(x)));

describe('servidor Socket.IO', () => {
  it('partida rápida: empareja, completa con bots y termina registrando ranking y torneo', async () => {
    const a = await client('QUICK1');
    const b = await client('QUICK2');
    const syncA = once<any>(a, 'sync');
    const syncB = once<any>(b, 'sync');
    a.emit('quick_match', 'barrio', () => {});
    b.emit('quick_match', 'barrio', () => {});
    const [sa, sb] = await Promise.all([syncA, syncB]);
    expect(sa.room.roomId).toBe(sb.room.roomId);
    expect(new Set([sa.mySeat, sb.mySeat]).size).toBe(2);
    expect(sa.state.rng).toBe(0);
    // Nadie juega: el temporizador hace que la IA juegue por ellos hasta el final.
    await new Promise<void>((resolve) => {
      a.on('update', (m: any) => m.state.phase === 'over' && resolve());
    });
    await new Promise((r) => setTimeout(r, 50));
    const rows = await new Promise<any[]>((r) => a.emit('ranking', { scope: 'global' }, r));
    expect(rows.map((x) => x.playerId).sort()).toEqual(['QUICK1', 'QUICK2']);
    const tour = await new Promise<any>((r) => a.emit('tournament', r));
    expect(tour.rows).toHaveLength(2);
  }, 30000);

  it('mesa privada con código: crear, unirse, empezar y jugar una acción válida', async () => {
    const host = await client('HOST01');
    const guest = await client('GUEST1');
    const created = await new Promise<any>((r) => host.emit('create_private', { seats: 2, rules: {} }, r));
    expect(created.ok).toBe(true);
    expect(created.code).toMatch(/^[A-Z0-9]{5}$/);
    const bad = await new Promise<any>((r) => guest.emit('join_private', 'ZZZZZ', r));
    expect(bad.ok).toBe(false);
    const roomUpdate = once<any>(host, 'room');
    expect((await new Promise<any>((r) => guest.emit('join_private', created.code, r))).ok).toBe(true);
    expect((await roomUpdate).seats.filter((s: any) => s.playerId)).toHaveLength(2);
    const notHost = await new Promise<any>((r) => guest.emit('start_private', r));
    expect(notHost.ok).toBe(false);
    const sync = once<any>(host, 'sync');
    expect((await new Promise<any>((r) => host.emit('start_private', r))).ok).toBe(true);
    const s = await sync;
    expect(s.mySeat).toBe(0);
    const res = await new Promise<any>((r) => host.emit('action', { type: 'ROLL', player: 0 }, r));
    expect(res.ok).toBe(true);
    const wrong = await new Promise<any>((r) => guest.emit('action', { type: 'ROLL', player: 1 }, r));
    expect(wrong.ok).toBe(false);
  }, 15000);

  it('reconexión: un cliente nuevo con el mismo jugador retoma la mesa', async () => {
    const host = await client('RECON1');
    const created = await new Promise<any>((r) => host.emit('create_private', { seats: 2, rules: {} }, r));
    const sync = once<any>(host, 'sync');
    host.emit('start_private', () => {});
    const first = await sync;
    host.disconnect();
    const again = await client('RECON1');
    const resync = once<any>(again, 'sync');
    const ack = await new Promise<any>((r) => again.emit('resume', first.room.roomId, r));
    expect(ack.ok).toBe(true);
    expect((await resync).mySeat).toBe(0);
    expect(created.ok).toBe(true);
  }, 15000);

  it('salas con requisitos: Élite pide nivel 100 y Top Leyendas el top del ranking', async () => {
    const low = await client('LOWLVL', 3);
    const r1 = await new Promise<any>((r) => low.emit('quick_match', 'elite', r));
    expect(r1.ok).toBe(false);
    expect(r1.error).toContain('100');
    const high = await client('HIGHLV', 150);
    const r2 = await new Promise<any>((r) => high.emit('quick_match', 'elite', r));
    expect(r2.ok).toBe(true);
    high.emit('cancel_match');
    // Sin partidas no está en el ranking: no entra a Top Leyendas.
    const r3 = await new Promise<any>((r) => high.emit('quick_match', 'top', r));
    expect(r3.ok).toBe(false);
    // QUICK1 jugó en la primera prueba: está en el top y tiene nivel suficiente.
    const ranked = await client('QUICK1', 120);
    const r4 = await new Promise<any>((r) => ranked.emit('quick_match', 'top', r));
    expect(r4.ok).toBe(true);
    ranked.emit('cancel_match');
  }, 15000);
});

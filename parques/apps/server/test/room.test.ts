import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hello } from '@parques/engine';
import { Room, type Conn } from '../src/room';

type Msg = { event: string; args: unknown[] };
function fakeConn() {
  const msgs: Msg[] = [];
  const conn: Conn = { emit: (event, ...args) => msgs.push({ event, args }) };
  return { conn, msgs, last: (ev: string) => [...msgs].reverse().find((m) => m.event === ev)?.args[0] as any };
}
const hello = (id: string): Hello => ({ playerId: id, name: id, avatar: '🙂', country: 'CO' });
const timing = { turnMs: 50, soploMs: 30, botDelayMs: 5, graceMs: 200 };

describe('Room (servidor autoritativo)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('completa con bots, empieza y manda el estado sin la semilla', () => {
    const room = new Room({ kind: 'quick', seats: 4, timing });
    const a = fakeConn();
    expect(room.addPlayer(hello('AAAA'), a.conn)).toBe(0);
    room.start();
    const sync = a.last('sync');
    expect(sync.mySeat).toBe(0);
    expect(sync.state.rng).toBe(0);
    expect(room.info().seats.filter((s) => s.kind === 'bot')).toHaveLength(3);
    room.destroy();
  });

  it('rechaza jugadas fuera de turno, acciones de sistema y jugadores ajenos', () => {
    const room = new Room({ kind: 'private', seats: 2, timing });
    const a = fakeConn();
    const b = fakeConn();
    room.addPlayer(hello('AAAA'), a.conn);
    room.addPlayer(hello('BBBB'), b.conn);
    room.start();
    expect(room.handleAction('BBBB', { type: 'ROLL', player: 1 }).ok).toBe(false);
    expect(room.handleAction('AAAA', { type: 'DISMISS_SOPLO' }).ok).toBe(false);
    expect(room.handleAction('AAAA', { type: 'TIME_UP' }).ok).toBe(false);
    expect(room.handleAction('ZZZZ', { type: 'ROLL', player: 0 }).ok).toBe(false);
    expect(room.handleAction('AAAA', { type: 'ROLL', player: 0 }).ok).toBe(true);
    room.destroy();
  });

  it('nunca acepta los dados que manda el cliente', () => {
    let notForced = 0;
    for (let i = 0; i < 20; i++) {
      const room = new Room({ kind: 'quick', seats: 2, timing });
      const a = fakeConn();
      room.addPlayer(hello('AAAA'), a.conn);
      room.start();
      room.handleAction('AAAA', { type: 'ROLL', player: 0, dice: [6, 6] });
      const dice = room.state!.dice ?? a.last('update').events[0].dice;
      if (dice[0] !== 6 || dice[1] !== 6) notForced++;
      room.destroy();
    }
    expect(notForced).toBeGreaterThan(0);
  });

  it('si el jugador no juega, la IA juega por él y la partida termina con su puesto', () => {
    const onEnd = vi.fn();
    const room = new Room({ kind: 'quick', seats: 4, timing, onEnd });
    const a = fakeConn();
    room.addPlayer(hello('AAAA'), a.conn);
    room.start();
    for (let i = 0; i < 4000 && room.status === 'playing'; i++) vi.advanceTimersByTime(60);
    expect(room.status).toBe('over');
    expect(onEnd.mock.calls[0]![1].map((r: { playerId: string }) => r.playerId)).toEqual(['AAAA']);
    expect(a.last('update').state.phase).toBe('over');
  });

  it('desconexión: espera el tiempo de gracia y luego queda fuera de la partida online', () => {
    const room = new Room({ kind: 'private', seats: 2, timing });
    const a = fakeConn();
    const b = fakeConn();
    room.addPlayer(hello('AAAA'), a.conn);
    room.addPlayer(hello('BBBB'), b.conn);
    room.start();
    room.detach('BBBB');
    expect(room.info().seats[1]!.replaced).toBe(false);
    vi.advanceTimersByTime(250);
    expect(room.info().seats[1]!.replaced).toBe(true);
    expect(a.msgs.some((m) => m.event === 'notice' && String((m.args[0] as { text: string }).text).includes('salió de la partida'))).toBe(true);
    room.destroy();
  });

  it('reconexión dentro del tiempo de gracia: vuelve a su silla con el estado completo', () => {
    const room = new Room({ kind: 'private', seats: 2, timing });
    const a = fakeConn();
    const b = fakeConn();
    room.addPlayer(hello('AAAA'), a.conn);
    room.addPlayer(hello('BBBB'), b.conn);
    room.start();
    room.detach('BBBB');
    vi.advanceTimersByTime(100);
    const b2 = fakeConn();
    expect(room.attach('BBBB', b2.conn)).toBe(true);
    expect(b2.last('sync').mySeat).toBe(1);
    vi.advanceTimersByTime(300);
    expect(room.info().seats[1]!.replaced).toBe(false);
    room.destroy();
  });

  it('abandono: la IA toma su lugar; si se van todos los humanos la mesa se cierra', () => {
    const onEnd = vi.fn();
    const room = new Room({ kind: 'private', seats: 3, timing, onEnd });
    const a = fakeConn();
    const b = fakeConn();
    room.addPlayer(hello('AAAA'), a.conn);
    room.addPlayer(hello('BBBB'), b.conn);
    room.start();
    room.leave('AAAA');
    expect(room.info().seats[0]!.replaced).toBe(true);
    expect(room.status).toBe('playing');
    room.leave('BBBB');
    expect(room.status).toBe('over');
    expect(onEnd).toHaveBeenCalledWith(room, []);
  });

  it('online: quien se va queda fuera (sin máquina) y los demás siguen jugando', () => {
    const room = new Room({ kind: 'private', seats: 3, timing });
    const a = fakeConn();
    const b = fakeConn();
    const c = fakeConn();
    room.addPlayer(hello('AAAA'), a.conn);
    room.addPlayer(hello('BBBB'), b.conn);
    room.addPlayer(hello('CCCC'), c.conn);
    room.start();
    room.leave('BBBB');
    expect(room.status).toBe('playing');
    const st = b.last('update') ?? a.last('update');
    expect(st.state.players[1].left).toBe(true);
    expect(st.events.some((e: { type: string }) => e.type === 'PLAYER_LEFT')).toBe(true);
    // No puede volver a sentarse.
    expect(room.attach('BBBB', fakeConn().conn)).toBe(false);
    room.destroy();
  });

  it('el chat llega a todos con el número de silla', () => {
    const room = new Room({ kind: 'private', seats: 2, timing });
    const a = fakeConn();
    const b = fakeConn();
    room.addPlayer(hello('AAAA'), a.conn);
    room.addPlayer(hello('BBBB'), b.conn);
    room.chat('BBBB', '¡Pilas pues!');
    expect(a.last('chat')).toEqual({ seat: 1, text: '¡Pilas pues!' });
    room.destroy();
  });

  it('parejas: siempre 4 sillas', () => {
    const room = new Room({ kind: 'private', seats: 2, rules: { teams: true }, timing });
    expect(room.info().seats).toHaveLength(4);
  });
});

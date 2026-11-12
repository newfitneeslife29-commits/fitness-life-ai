import { describe, expect, it } from 'vitest';
import { getLegalMoves, moveCaptures } from '../src';
import { JAIL, move, newGame, progressAt, roll, setup, step, sum, types } from './helpers';

describe('capturas', () => {
  it('caer en la casilla de un rival (fuera de seguro) lo manda a la cárcel', () => {
    // J0 en progreso 2 (casilla 7). Rival J1 en casilla 10 (no seguro).
    const s = setup(newGame(), [[2, JAIL, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [3, 5]).state, step(0, 0, 0));
    expect(r.state.players[1]!.pieces[0]).toBe(JAIL);
    expect(types(r.events)).toContain('CAPTURED');
    expect(r.state.players[0]!.stats.captures).toBe(1);
    expect(r.state.players[1]!.stats.captured).toBe(1);
  });

  it('en un seguro no se captura y ambas fichas conviven', () => {
    // Casilla 12 es seguro.
    const rival = progressAt(1, 12);
    const s = setup(newGame(), [[2, JAIL, JAIL, JAIL], [rival, JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [5, 1]).state, step(0, 0, 0));
    expect(r.state.players[0]!.pieces[0]).toBe(7);
    expect(r.state.players[1]!.pieces[0]).toBe(rival);
    expect(types(r.events)).not.toContain('CAPTURED');
  });

  it('en la salida de un rival tampoco se captura al moverse', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL], [0, JAIL, JAIL, JAIL]]); // J1 en su salida (casilla 22)
    const r = move(roll(s, [3, 4]).state, step(0, 0, 0));
    const r2 = move(r.state, step(0, 0, 1));
    expect(r2.state.players[0]!.pieces[0]).toBe(17); // casilla 22 = salida de J1
    expect(r2.state.players[1]!.pieces[0]).toBe(0);
  });

  it('captura todas las fichas rivales en la casilla', () => {
    const p = progressAt(1, 10);
    const s = setup(newGame(), [[2, JAIL, JAIL, JAIL], [p, p, JAIL, JAIL]]);
    const r = move(roll(s, [3, 5]).state, step(0, 0, 0));
    expect(r.state.players[1]!.pieces).toEqual([JAIL, JAIL, JAIL, JAIL]);
    expect(r.state.players[0]!.stats.captures).toBe(2);
  });

  it('con la suma de los dados solo se captura en la casilla final', () => {
    // Rival en casilla 8 (intermedia) y en casilla 10 (destino de 1+2 desde la casilla 7).
    const s = setup(newGame(), [[2, JAIL, JAIL, JAIL], [progressAt(1, 8), progressAt(1, 10), JAIL, JAIL]]);
    const r = move(roll(s, [1, 2]).state, sum(0, 0));
    expect(r.state.players[0]!.pieces[0]).toBe(5);
    expect(r.state.players[1]!.pieces[0]).toBe(progressAt(1, 8));
    expect(r.state.players[1]!.pieces[1]).toBe(JAIL);
  });

  it('suma que cae en un rival lo captura', () => {
    const s = setup(newGame(), [[2, JAIL, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [1, 2]).state, sum(0, 0));
    expect(r.state.players[1]!.pieces[0]).toBe(JAIL);
  });

  it('no se captura a un compañero en parejas', () => {
    const mate = progressAt(2, 10);
    const s = setup(newGame({ teams: true }), [[2, JAIL, JAIL, JAIL], [], [mate, JAIL, JAIL, JAIL]]);
    expect(moveCaptures(roll(s, [3, 5]).state, step(0, 0, 0))).toBe(false);
    const r = move(roll(s, [3, 5]).state, step(0, 0, 0));
    expect(r.state.players[2]!.pieces[0]).toBe(mate);
  });

  it('en el pasillo propio no hay capturas', () => {
    const s = setup(newGame(), [[60, JAIL, JAIL, JAIL]]);
    const r = roll(s, [5, 1]);
    expect(getLegalMoves(r.state).some((m) => moveCaptures(r.state, m))).toBe(false);
    const m = move(r.state, step(0, 0, 0));
    expect(m.state.players[0]!.pieces[0]).toBe(65);
  });
});

describe('capturar da otra tirada', () => {
  it('al capturar, el mismo jugador vuelve a tirar (sin par)', () => {
    const s = setup(newGame(), [[2, JAIL, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
    const r1 = move(roll(s, [3, 5]).state, step(0, 0, 0));
    const r2 = move(r1.state, step(0, 0, 1));
    const extra = r2.events.find((e) => e.type === 'EXTRA_TURN');
    expect(extra).toMatchObject({ player: 0, reason: 'capture' });
    expect(r2.state.current).toBe(0);
    expect(r2.state.phase).toBe('roll');
    expect(r2.state.pairStreak).toBe(0);
  });

  it('sin captura y sin par, pasa el turno', () => {
    const s = setup(newGame(), [[2, JAIL, JAIL, JAIL], [progressAt(1, 30), JAIL, JAIL, JAIL]]);
    const r1 = move(roll(s, [3, 5]).state, step(0, 0, 0));
    const r2 = move(r1.state, step(0, 0, 1));
    expect(types(r2.events)).not.toContain('EXTRA_TURN');
    expect(r2.state.current).toBe(1);
  });

  it('se puede desactivar como regla de la casa', () => {
    const s = setup(newGame({ captureBonus: false }), [[2, JAIL, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
    const r1 = move(roll(s, [3, 5]).state, step(0, 0, 0));
    const r2 = move(r1.state, step(0, 0, 1));
    expect(r2.state.current).toBe(1);
  });
});

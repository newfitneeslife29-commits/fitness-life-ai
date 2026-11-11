import { describe, expect, it } from 'vitest';
import { getLegalMoves } from '../src';
import { exit, JAIL, move, newGame, progressAt, roll, setup, types } from './helpers';

describe('salida de la cárcel', () => {
  it('todas las fichas empiezan en la cárcel', () => {
    const g = newGame();
    for (const p of g.players) expect(p.pieces).toEqual([JAIL, JAIL, JAIL, JAIL]);
  });

  it('sin par no sale; tiene 3 intentos y luego pasa el turno', () => {
    let s = newGame();
    let r = roll(s, [1, 2]);
    expect(types(r.events)).toContain('JAIL_ATTEMPT_FAILED');
    expect(r.state.current).toBe(0);
    r = roll(r.state, [3, 4]);
    expect(r.state.current).toBe(0);
    r = roll(r.state, [5, 6]);
    expect(r.state.current).toBe(1);
    expect(types(r.events)).toContain('TURN_CHANGED');
    s = r.state;
    expect(s.players[0]!.pieces.every((p) => p === JAIL)).toBe(true);
  });

  it('el número de intentos es configurable (reglas de la casa)', () => {
    const r = roll(newGame({ jailAttempts: 1 }), [1, 2]);
    expect(r.state.current).toBe(1);
  });

  it('con par salen todas las fichas a la salida y da turno extra', () => {
    const r = roll(newGame(), [4, 4]);
    expect(r.state.players[0]!.pieces).toEqual([0, 0, 0, 0]);
    expect(types(r.events)).toEqual(['ROLLED', 'EXITED_JAIL', 'EXTRA_TURN']);
    expect(r.state.current).toBe(0);
    expect(r.state.phase).toBe('roll');
  });

  it('variante: con par salen solo 2 fichas', () => {
    const r = roll(newGame({ exitAll: false, exitCount: 2 }), [2, 2]);
    expect(r.state.players[0]!.pieces).toEqual([0, 0, JAIL, JAIL]);
  });

  it('con fichas en juego solo hay un tiro (no 3 intentos)', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL]]);
    const r = roll(s, [1, 2]);
    expect(r.state.phase).toBe('move');
    const after = move(move(r.state, { type: 'step', piece: { owner: 0, index: 0 }, die: 0 }).state, {
      type: 'step',
      piece: { owner: 0, index: 0 },
      die: 1,
    });
    expect(after.state.current).toBe(1);
  });

  it('con fichas en juego, un par permite sacar las de la cárcel como jugada', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL]]);
    const r = roll(s, [3, 3]);
    expect(getLegalMoves(r.state)).toContainEqual(exit);
    const m = move(r.state, exit);
    expect(m.state.players[0]!.pieces).toEqual([10, 0, 0, 0]);
    expect(types(m.events)).toContain('EXTRA_TURN');
  });

  it('salir con la salida ocupada por un rival lo captura (aunque sea seguro)', () => {
    // Rival 1 parado en la salida del jugador 0 (casilla 5).
    const rivalPos = progressAt(1, 5);
    const s = setup(newGame(), [[JAIL, JAIL, JAIL, JAIL], [rivalPos, JAIL, JAIL, JAIL]]);
    const r = roll(s, [6, 6]);
    expect(r.state.players[1]!.pieces[0]).toBe(JAIL);
    expect(types(r.events)).toContain('CAPTURED');
    expect(r.state.players[0]!.stats.captures).toBe(1);
  });

  it('un compañero en la salida no es capturado (parejas)', () => {
    const s = setup(newGame({ teams: true }), [[JAIL, JAIL, JAIL, JAIL], [], [progressAt(2, 5), JAIL, JAIL, JAIL]]);
    const r = roll(s, [6, 6]);
    expect(r.state.players[2]!.pieces[0]).toBe(progressAt(2, 5));
  });
});

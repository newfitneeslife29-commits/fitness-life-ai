import { describe, expect, it } from 'vitest';
import { getLegalMoves } from '../src';
import { exit, JAIL, move, newGame, progressAt, roll, setup, step, types } from './helpers';

const exitCounts = (s: Parameters<typeof getLegalMoves>[0]) =>
  getLegalMoves(s).flatMap((m) => (m.type === 'exit' ? [m.count] : []));

describe('salida de la cárcel', () => {
  it('todas las fichas empiezan en la cárcel', () => {
    const g = newGame();
    for (const p of g.players) expect(p.pieces).toEqual([JAIL, JAIL, JAIL, JAIL]);
  });

  it('sin par no sale; tiene 3 intentos y luego pasa el turno', () => {
    let r = roll(newGame(), [1, 2]);
    expect(types(r.events)).toContain('JAIL_ATTEMPT_FAILED');
    expect(r.state.current).toBe(0);
    r = roll(r.state, [3, 4]);
    expect(r.state.current).toBe(0);
    r = roll(r.state, [5, 6]);
    expect(r.state.current).toBe(1);
    expect(types(r.events)).toContain('TURN_CHANGED');
    expect(r.state.players[0]!.pieces.every((p) => p === JAIL)).toBe(true);
  });

  it('el número de intentos es configurable (reglas de la casa)', () => {
    const r = roll(newGame({ jailAttempts: 1 }), [1, 2]);
    expect(r.state.current).toBe(1);
  });

  it('doble 6 o doble 1: pueden salir todas', () => {
    for (const d of [1, 6]) {
      const r = roll(newGame(), [d, d]);
      expect(exitCounts(r.state)).toEqual([1, 2, 4]);
      const m = move(r.state, exit(4));
      expect(m.state.players[0]!.pieces).toEqual([0, 0, 0, 0]);
      expect(types(m.events)).toEqual(['EXITED_JAIL', 'EXTRA_TURN']);
      expect(m.state.current).toBe(0);
      expect(m.state.phase).toBe('roll');
    }
  });

  it('otro par (2 a 5): salen 1 o 2, no todas', () => {
    for (const d of [2, 3, 4, 5]) {
      const r = roll(newGame(), [d, d]);
      expect(exitCounts(r.state)).toEqual([1, 2]);
    }
    const m = move(roll(newGame(), [3, 3]).state, exit(2));
    expect(m.state.players[0]!.pieces).toEqual([0, 0, JAIL, JAIL]);
    expect(m.state.phase).toBe('roll'); // turno extra por el par
  });

  it('si saca solo una, el otro dado se juega', () => {
    // Doble 2: sale una ficha y se mueve 2 con el dado que queda.
    let r = roll(newGame(), [2, 2]);
    r = move(r.state, exit(1));
    expect(r.state.players[0]!.pieces).toEqual([0, JAIL, JAIL, JAIL]);
    expect(r.state.phase).toBe('move');
    expect(getLegalMoves(r.state)).toContainEqual(step(0, 0, 1));
    r = move(r.state, step(0, 0, 1));
    expect(r.state.players[0]!.pieces[0]).toBe(2);
    expect(types(r.events)).toContain('EXTRA_TURN');
  });

  it('con el dado que queda también se puede sacar otra ficha', () => {
    let r = roll(newGame(), [4, 4]);
    r = move(r.state, exit(1));
    expect(exitCounts(r.state)).toEqual([1]);
    r = move(r.state, exit(1));
    expect(r.state.players[0]!.pieces).toEqual([0, 0, JAIL, JAIL]);
  });

  it('si en la cárcel quedan menos de 2, el máximo es lo que hay', () => {
    const s = setup(newGame(), [[10, 71, 71, JAIL]]);
    expect(exitCounts(roll(s, [6, 6]).state)).toEqual([1]);
  });

  it('el máximo con otros pares es configurable', () => {
    expect(exitCounts(roll(newGame({ pairExitMax: 1 }), [3, 3]).state)).toEqual([1]);
    expect(exitCounts(roll(newGame({ allOutDoubles: [1, 2, 3, 4, 5, 6] }), [3, 3]).state)).toEqual([1, 2, 4]);
  });

  it('con fichas en juego solo hay un tiro (no 3 intentos)', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL]]);
    let r = roll(s, [1, 2]);
    expect(r.state.phase).toBe('move');
    r = move(r.state, step(0, 0, 0));
    r = move(r.state, step(0, 0, 1));
    expect(r.state.current).toBe(1);
  });

  it('con fichas en juego, un par permite sacar fichas de la cárcel', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL]]);
    const r = roll(s, [6, 6]);
    expect(exitCounts(r.state)).toEqual([1, 2, 3]);
    const m = move(r.state, exit(3));
    expect(m.state.players[0]!.pieces).toEqual([10, 0, 0, 0]);
    expect(types(m.events)).toContain('EXTRA_TURN');
  });

  it('salir con la salida ocupada por un rival lo captura (aunque sea seguro)', () => {
    const rivalPos = progressAt(1, 5); // rival en la salida de J0 (casilla 5)
    const s = setup(newGame(), [[JAIL, JAIL, JAIL, JAIL], [rivalPos, JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [3, 3]).state, exit(1));
    expect(r.state.players[1]!.pieces[0]).toBe(JAIL);
    expect(types(r.events)).toContain('CAPTURED');
    expect(r.state.players[0]!.stats.captures).toBe(1);
  });

  it('un compañero en la salida no es capturado (parejas)', () => {
    const s = setup(newGame({ teams: true }), [[JAIL, JAIL, JAIL, JAIL], [], [progressAt(2, 5), JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [6, 6]).state, exit(4));
    expect(r.state.players[2]!.pieces[0]).toBe(progressAt(2, 5));
  });
});

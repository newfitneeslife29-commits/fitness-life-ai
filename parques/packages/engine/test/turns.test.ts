import { describe, expect, it } from 'vitest';
import { applyAction, getLegalMoves } from '../src';
import { JAIL, move, newGame, roll, setup, step, tryAction } from './helpers';

describe('turnos y validaciones', () => {
  it('sin par pasa al siguiente jugador tras usar los dos dados', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL]]);
    let r = roll(s, [2, 5]);
    r = move(r.state, step(0, 0, 1));
    expect(r.state.current).toBe(0);
    r = move(r.state, step(0, 0, 0));
    expect(r.state.current).toBe(1);
    expect(r.state.players[0]!.pieces[0]).toBe(17);
  });

  it('cada dado puede mover una ficha distinta', () => {
    const s = setup(newGame(), [[10, 20, JAIL, JAIL]]);
    let r = roll(s, [2, 5]);
    r = move(r.state, step(0, 0, 0));
    r = move(r.state, step(0, 1, 1));
    expect(r.state.players[0]!.pieces.slice(0, 2)).toEqual([12, 25]);
  });

  it('rechaza tirar fuera de turno o dos veces', () => {
    const s = newGame();
    expect(tryAction(s, { type: 'ROLL', player: 1 }).ok).toBe(false);
    const r = roll(setup(s, [[10, JAIL, JAIL, JAIL]]), [1, 2]);
    expect(tryAction(r.state, { type: 'ROLL', player: 0 }).ok).toBe(false);
  });

  it('rechaza jugadas ilegales', () => {
    const r = roll(setup(newGame(), [[10, JAIL, JAIL, JAIL], [10]]), [1, 2]);
    expect(tryAction(r.state, { type: 'MOVE', player: 0, move: step(0, 1, 0) }).ok).toBe(false); // ficha en la cárcel
    expect(tryAction(r.state, { type: 'MOVE', player: 0, move: step(1, 0, 0) }).ok).toBe(false); // ficha rival
    expect(tryAction(r.state, { type: 'MOVE', player: 1, move: step(0, 0, 0) }).ok).toBe(false); // fuera de turno
    expect(tryAction(r.state, { type: 'MOVE', player: 0, move: { type: 'exit' } }).ok).toBe(false); // sin par
  });

  it('no se puede usar el mismo dado dos veces', () => {
    let r = roll(setup(newGame(), [[10, 20, JAIL, JAIL]]), [1, 2]);
    r = move(r.state, step(0, 0, 0));
    expect(tryAction(r.state, { type: 'MOVE', player: 0, move: step(0, 1, 0) }).ok).toBe(false);
  });

  it('con par no se ofrece el mismo movimiento dos veces', () => {
    const r = roll(setup(newGame(), [[10, JAIL, JAIL, JAIL]]), [3, 3]);
    const moves = getLegalMoves(r.state).filter((m) => m.type === 'step');
    expect(moves).toHaveLength(1);
  });

  it('no muta el estado original (reducer puro)', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL]]);
    const snapshot = JSON.stringify(s);
    roll(s, [1, 2]);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('los dados son deterministas con la misma semilla', () => {
    const a = applyAction(newGame(), { type: 'ROLL', player: 0 });
    const b = applyAction(newGame(), { type: 'ROLL', player: 0 });
    expect(a.ok && b.ok && a.state.dice).toEqual(b.ok && b.state.dice);
  });

  it('el estado es serializable a JSON (online / guardado)', () => {
    const s = roll(newGame(), [2, 2]).state;
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

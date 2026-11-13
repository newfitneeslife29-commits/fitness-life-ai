import { describe, expect, it } from 'vitest';
import { applyOrThrow } from '../src';
import { newGame, setup, tryAction } from './helpers';

/** Partida online: quien abandona queda fuera y los demás siguen jugando. */
describe('abandonar (RESIGN)', () => {
  it('sus fichas vuelven a la cárcel, sus turnos se saltan y la partida sigue', () => {
    let g = setup(newGame(), [[10, -1, -1, -1], [20, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]], 0);
    const r = applyOrThrow(g, { type: 'RESIGN', player: 1 });
    g = r.state;
    expect(g.players[1]!.left).toBe(true);
    expect(g.players[1]!.pieces.every((p) => p === -1)).toBe(true);
    expect(r.events.some((e) => e.type === 'PLAYER_LEFT' && e.player === 1)).toBe(true);
    expect(g.phase).not.toBe('over');
    // Turno de 0 → al pasar el turno se salta al 1.
    g = { ...g, current: 0 };
    const pass = applyOrThrow({ ...g, phase: 'roll' }, { type: 'ROLL', player: 0, dice: [1, 2] });
    // Tras mover (o sin jugadas) el turno nunca cae en el jugador que se fue.
    const turns = pass.events.filter((e) => e.type === 'TURN_CHANGED').map((e) => (e as { player: number }).player);
    expect(turns).not.toContain(1);
  });

  it('si era su turno, pasa al siguiente jugador', () => {
    const g = setup(newGame(), [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]], 2);
    const r = applyOrThrow(g, { type: 'RESIGN', player: 2 });
    expect(r.state.current).toBe(3);
  });

  it('si solo queda uno, gana y los que se fueron quedan últimos', () => {
    let g = newGame();
    g = applyOrThrow(g, { type: 'RESIGN', player: 1 }).state;
    g = applyOrThrow(g, { type: 'RESIGN', player: 2 }).state;
    expect(g.phase).not.toBe('over');
    const r = applyOrThrow(g, { type: 'RESIGN', player: 0 });
    expect(r.state.phase).toBe('over');
    expect(r.state.ranking[0]).toBe(3);
    expect(r.state.ranking.slice(1).sort()).toEqual([0, 1, 2]);
  });

  it('en parejas no se permite', () => {
    const g = newGame({ teams: true });
    expect(tryAction(g, { type: 'RESIGN', player: 0 }).ok).toBe(false);
  });
});

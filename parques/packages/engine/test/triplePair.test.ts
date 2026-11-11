import { describe, expect, it } from 'vitest';
import { JAIL, move, newGame, ref, roll, setup, step, types } from './helpers';

/** Usa los dos dados con la ficha 0 de J0 y deja la partida lista para volver a tirar. */
function playPair(s: ReturnType<typeof newGame>, d: number) {
  let r = roll(s, [d, d]);
  r = move(r.state, step(0, 0, 0));
  r = move(r.state, step(0, 0, 1));
  return r;
}

describe('tres pares seguidos', () => {
  it('el par da turno extra', () => {
    const s = setup(newGame(), [[10, 20, JAIL, JAIL]]);
    const r = playPair(s, 2);
    expect(r.state.current).toBe(0);
    expect(r.state.phase).toBe('roll');
    expect(types(r.events)).toContain('EXTRA_TURN');
    expect(r.state.pairStreak).toBe(1);
  });

  it('al tercer par la ficha más adelantada va a la cárcel y termina el turno', () => {
    let s = setup(newGame(), [[10, 30, JAIL, JAIL]]);
    s = playPair(s, 1).state; // ficha 0 → 12
    s = playPair(s, 2).state; // ficha 0 → 16
    expect(s.pairStreak).toBe(2);
    const r = roll(s, [3, 3]);
    expect(types(r.events)).toEqual(['ROLLED', 'TRIPLE_PAIR', 'TURN_CHANGED']);
    const ev = r.events.find((e) => e.type === 'TRIPLE_PAIR');
    expect(ev).toMatchObject({ piece: ref(0, 1) }); // la de 30 estaba más adelante
    expect(r.state.players[0]!.pieces).toEqual([16, JAIL, JAIL, JAIL]);
    expect(r.state.current).toBe(1);
    expect(r.state.pairStreak).toBe(0);
    expect(r.state.players[0]!.stats.tripleParCastigos).toBe(1);
  });

  it('una ficha en el pasillo también cuenta como "más cerca de la meta"', () => {
    let s = setup(newGame(), [[10, 66, JAIL, JAIL]]);
    s = playPair(s, 1).state;
    s = playPair(s, 1).state;
    const r = roll(s, [4, 4]);
    expect(r.state.players[0]!.pieces[1]).toBe(JAIL);
  });

  it('las fichas coronadas no se castigan', () => {
    let s = setup(newGame(), [[10, 71, JAIL, JAIL]]);
    s = playPair(s, 1).state;
    s = playPair(s, 1).state;
    const r = roll(s, [4, 4]);
    expect(r.state.players[0]!.pieces).toEqual([JAIL, 71, JAIL, JAIL]);
  });

  it('con la regla desactivada el tercer par se juega normal', () => {
    let s = setup(newGame({ triplePairPenalty: false }), [[10, 30, JAIL, JAIL]]);
    s = playPair(s, 1).state;
    s = playPair(s, 1).state;
    const r = roll(s, [3, 3]);
    expect(r.state.phase).toBe('move');
    expect(r.state.pairStreak).toBe(3);
  });

  it('un tiro sin par termina el turno y reinicia el contador', () => {
    let s = setup(newGame(), [[10, 30, JAIL, JAIL]]);
    s = playPair(s, 1).state;
    let r = roll(s, [1, 2]);
    r = move(r.state, step(0, 0, 0));
    r = move(r.state, step(0, 0, 1));
    expect(r.state.current).toBe(1);
    expect(r.state.pairStreak).toBe(0);
  });

  it('los pares para salir de la cárcel también cuentan', () => {
    let s = newGame();
    s = roll(s, [1, 1]).state; // salen todas (par 1)
    expect(s.pairStreak).toBe(1);
    s = playPair(s, 2).state; // par 2
    const r = roll(s, [5, 5]); // par 3
    expect(types(r.events)).toContain('TRIPLE_PAIR');
    expect(r.state.current).toBe(1);
  });
});

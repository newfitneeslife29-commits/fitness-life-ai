import { describe, expect, it } from 'vitest';
import { applyAction, getLegalMoves } from '../src';
import { JAIL, move, newGame, roll, setup, step, sum, types } from './helpers';

const H = 71;

describe('llegada al cielo', () => {
  it('se entra al cielo con el número exacto', () => {
    const s = setup(newGame(), [[66, 10, JAIL, JAIL]]);
    const r = roll(s, [5, 6]);
    const moves = getLegalMoves(r.state);
    expect(moves).toContainEqual(step(0, 0, 0)); // 66 + 5 = 71 ✔
    expect(moves).not.toContainEqual(step(0, 0, 1)); // 66 + 6 = 72 ✘
    expect(moves).not.toContainEqual(sum(0, 0));
    const m = move(r.state, step(0, 0, 0));
    expect(m.state.players[0]!.pieces[0]).toBe(H);
    expect(types(m.events)).toContain('CROWNED');
  });

  it('si ningún dado sirve, se pierden los dados', () => {
    const s = setup(newGame(), [[69, H, H, H]]);
    const r = roll(s, [5, 6]);
    expect(types(r.events)).toContain('DICE_FORFEITED');
    expect(r.state.current).toBe(1);
  });

  it('se puede coronar con la suma exacta', () => {
    const s = setup(newGame(), [[64, 10, JAIL, JAIL]]);
    const m = move(roll(s, [3, 4]).state, sum(0, 0));
    expect(m.state.players[0]!.pieces[0]).toBe(H);
  });

  it('al coronar las 4 fichas queda 1º y la partida sigue', () => {
    const s = setup(newGame(), [[70, H, H, H], [10], [10], [10]]);
    const r = roll(s, [1, 2]);
    const m = move(r.state, step(0, 0, 0));
    expect(m.state.ranking).toEqual([0]);
    expect(m.state.players[0]!.finished).toBe(true);
    expect(m.state.phase).toBe('roll');
    expect(m.state.current).toBe(1); // el dado sobrante se pierde
  });

  it('el jugador terminado ya no recibe turnos', () => {
    let s = setup(newGame(), [[H, H, H, H], [10, JAIL, JAIL, JAIL], [JAIL, JAIL, JAIL, JAIL], [JAIL, JAIL, JAIL, JAIL]], 3);
    s.players[0]!.finished = true;
    s.ranking = [0];
    const r = roll(s, [1, 2]);
    // J3 agota 1 intento (quedan 2). Tras 3 intentos pasa a J1, saltando a J0.
    const st = roll(roll(r.state, [1, 2]).state, [1, 2]).state;
    expect(st.current).toBe(1);
  });

  it('se juega hasta definir 1º, 2º, 3º y 4º', () => {
    let s = setup(newGame(), [[H, H, H, H], [70, H, H, H], [70, H, H, H], [10, JAIL, JAIL, JAIL]], 1);
    s.players[0]!.finished = true;
    s.ranking = [0];
    s = move(roll(s, [1, 2]).state, step(1, 0, 0)).state;
    expect(s.ranking).toEqual([0, 1]);
    expect(s.current).toBe(2);
    const last = move(roll(s, [1, 3]).state, step(2, 0, 0));
    expect(last.state.ranking).toEqual([0, 1, 2, 3]);
    expect(last.state.phase).toBe('over');
    expect(types(last.events)).toContain('GAME_OVER');
    expect(applyAction(last.state, { type: 'ROLL', player: 3 }).ok).toBe(false);
  });

  it('TIME_UP (Modo Rápido) ordena por avance', () => {
    const s = setup(newGame({ piecesPerPlayer: 2 }), [[40, 50], [H, 10], [JAIL, JAIL], [5, 5]]);
    const r = applyAction(s, { type: 'TIME_UP' });
    expect(r.ok && r.state.ranking).toEqual([1, 0, 3, 2]);
  });

  it('Modo Rápido: 2 fichas por jugador', () => {
    expect(newGame({ piecesPerPlayer: 2 }).players[0]!.pieces).toEqual([JAIL, JAIL]);
  });
});

describe('parejas 2 vs 2', () => {
  it('compañeros en lados opuestos', () => {
    const g = newGame({ teams: true });
    expect(g.players.map((p) => p.team)).toEqual([0, 1, 0, 1]);
  });

  it('quien ya coronó todo mueve las fichas de su compañero', () => {
    const s = setup(newGame({ teams: true }), [[70, H, H, H], [10], [20, JAIL, JAIL, JAIL], [10]]);
    const r = move(roll(s, [1, 3]).state, step(0, 0, 0));
    expect(r.state.players[0]!.finished).toBe(true);
    expect(r.state.ranking).toEqual([]); // la pareja aún no termina
    const moves = getLegalMoves(r.state);
    expect(moves).toEqual([{ type: 'step', piece: { owner: 2, index: 0 }, die: 1 }]);
    const m = move(r.state, moves[0]!);
    expect(m.state.players[2]!.pieces[0]).toBe(23);
  });

  it('gana la pareja que corona sus 8 fichas', () => {
    const s = setup(newGame({ teams: true }), [[70, H, H, H], [10], [H, H, H, H], [10]]);
    s.players[2]!.finished = true;
    const r = move(roll(s, [1, 3]).state, step(0, 0, 0));
    expect(r.state.phase).toBe('over');
    expect(r.state.ranking.slice(0, 2).sort()).toEqual([0, 2]);
  });

  it('exige compañero en el lado opuesto', () => {
    expect(() => newGame({ teams: true }, 4, 3)).toThrow();
  });
});

describe('6 jugadores', () => {
  it('crea 6 colores y el cielo está en 105', () => {
    const g = newGame({}, 6);
    expect(g.players.map((p) => p.color)).toEqual(['amarillo', 'naranja', 'rojo', 'verde', 'azul', 'morado']);
    const s = setup(g, [[100, 10, JAIL, JAIL]]);
    const m = move(roll(s, [5, 1]).state, step(0, 0, 0));
    expect(m.state.players[0]!.pieces[0]).toBe(105);
    expect(types(m.events)).toContain('CROWNED');
  });
});

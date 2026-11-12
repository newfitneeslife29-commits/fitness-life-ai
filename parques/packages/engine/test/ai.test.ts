import { describe, expect, it } from 'vitest';
import { autoAction, chooseMove, dangerAt, getLegalMoves, HIT_PROB, moveCaptures, shouldSoplar } from '../src';
import { JAIL, move, newGame, progressAt, roll, setup, step } from './helpers';
import { seededRandom, simulate } from './sim';

describe('IA', () => {
  it('probabilidades de impacto con dos dados son correctas', () => {
    expect(HIT_PROB[1]).toBeCloseTo(11 / 36);
    expect(HIT_PROB[12]).toBeCloseTo(1 / 36);
    expect(HIT_PROB[7]).toBeCloseTo(6 / 36);
  });

  it('una ficha con un rival justo detrás está en peligro; en seguro no', () => {
    const s = setup(newGame(), [[10], [progressAt(1, 13)]]);
    expect(dangerAt(s, 0, 15)).toBeGreaterThan(0.3);
    expect(dangerAt(s, 0, 17)).toBe(0); // casilla 17 = offset 0 → seguro
  });

  it('Normal y Experto capturan cuando pueden', () => {
    const s = setup(newGame(), [[2, 30, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
    const r = roll(s, [3, 4]);
    for (const lvl of ['normal', 'expert'] as const) {
      const m = chooseMove(r.state, lvl, seededRandom(1))!;
      expect(moveCaptures(r.state, m)).toBe(true);
    }
  });

  it('Experto corona en vez de avanzar otra ficha', () => {
    const s = setup(newGame(), [[66, 20, JAIL, JAIL]]);
    const r = roll(s, [5, 2]);
    const m = chooseMove(r.state, 'expert', seededRandom(2))!;
    expect(m).toEqual(step(0, 0, 0));
  });

  it('siempre elige una jugada legal', () => {
    const s = setup(newGame(), [[5, 20, 40, 60], [10, 30, JAIL, JAIL]]);
    const r = roll(s, [6, 1]);
    for (const lvl of ['easy', 'normal', 'expert'] as const) {
      for (let i = 0; i < 20; i++) {
        const m = chooseMove(r.state, lvl, seededRandom(i))!;
        expect(getLegalMoves(r.state)).toContainEqual(m);
      }
    }
  });

  it('autoAction tira en fase de tiro y mueve en fase de movimiento (turno vencido)', () => {
    const s = setup(newGame(), [[10, JAIL, JAIL, JAIL]]);
    expect(autoAction(s)).toEqual({ type: 'ROLL', player: 0 });
    const r = roll(s, [1, 2]);
    expect(autoAction(r.state, 'normal')?.type).toBe('MOVE');
  });

  it('Experto siempre sopla cuando puede', () => {
    let r = roll(setup(newGame(), [[2, 30, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]), [3, 4]);
    r = move(r.state, step(0, 1, 0));
    r = move(r.state, step(0, 1, 1));
    expect(shouldSoplar(r.state, 2, 'expert')).toBe(true);
    expect(shouldSoplar(r.state, 0, 'expert')).toBe(false);
  });
});

describe('simulaciones completas (bots)', () => {
  it('100 partidas de 4 jugadores terminan con ranking completo y sin jugadas ilegales', () => {
    const levels = ['easy', 'normal', 'expert', 'normal'] as const;
    for (let seed = 1; seed <= 100; seed++) {
      const { state } = simulate(
        { sides: 4, players: [0, 1, 2, 3].map((side) => ({ name: `B${side}`, side })) },
        [...levels],
        seed,
      );
      expect(state.phase).toBe('over');
      expect([...state.ranking].sort()).toEqual([0, 1, 2, 3]);
    }
  }, 60000);

  it('partidas por parejas, 6 jugadores y Modo Rápido también terminan', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const teams = simulate(
        { sides: 4, rules: { teams: true }, players: [0, 1, 2, 3].map((side) => ({ name: `B${side}`, side })) },
        ['normal', 'normal', 'normal', 'normal'],
        seed,
      );
      expect(teams.state.ranking).toHaveLength(4);
      const six = simulate(
        { sides: 6, players: [0, 1, 2, 3, 4, 5].map((side) => ({ name: `B${side}`, side })) },
        Array(6).fill('easy'),
        seed,
      );
      expect(six.state.ranking).toHaveLength(6);
      const quick = simulate(
        { sides: 4, rules: { piecesPerPlayer: 2, jailAttempts: 1, soplar: false, triplePairPenalty: false }, players: [{ name: 'A', side: 0 }, { name: 'B', side: 2 }] },
        ['expert', 'easy'],
        seed,
      );
      expect(quick.state.ranking).toHaveLength(2);
    }
  }, 60000);

  it('Experto le gana a Fácil la mayoría de las veces (1 vs 1)', () => {
    let expertWins = 0;
    const games = 80;
    for (let seed = 1; seed <= games; seed++) {
      // Alterna quién empieza para no sesgar.
      const expertSide = seed % 2 === 0 ? 0 : 2;
      const { state } = simulate(
        { sides: 4, players: [{ name: 'E', side: expertSide }, { name: 'F', side: 2 - expertSide }] },
        expertSide === 0 ? ['expert', 'easy'] : ['easy', 'expert'],
        seed,
      );
      const winner = state.players[state.ranking[0]!]!;
      if (winner.name === 'E') expertWins++;
    }
    expect(expertWins / games).toBeGreaterThan(0.6);
  }, 60000);
});

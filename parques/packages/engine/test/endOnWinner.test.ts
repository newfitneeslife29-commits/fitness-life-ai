import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../src';
import { JAIL, move, newGame, roll, setup, step, types } from './helpers';

// Regla: cuando alguien gana se acaba la partida; los demás puestos van por fichas coronadas y avance.
describe('la partida termina con el primer ganador', () => {
  const rules = { endOnWinner: true };

  it('al coronar la última ficha termina y ordena al resto por coronadas y avance', () => {
    // J0 corona su última ficha. J2 tiene 1 coronada; J1 va más adelantado que J3.
    const s = setup(newGame(rules), [
      [71, 71, 71, 68],
      [40, 20, JAIL, JAIL],
      [71, 5, JAIL, JAIL],
      [10, JAIL, JAIL, JAIL],
    ]);
    const r = move(roll(s, [3, 5]).state, step(0, 3, 0));
    expect(types(r.events)).toContain('GAME_OVER');
    expect(r.state.phase).toBe('over');
    expect(r.state.ranking).toEqual([0, 2, 1, 3]);
  });

  it('desactivada, la partida sigue para definir el 2º puesto', () => {
    const s = setup(newGame({ endOnWinner: false }), [[71, 71, 71, 68], [40, JAIL, JAIL, JAIL], [30, JAIL, JAIL, JAIL], [10, JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [3, 5]).state, step(0, 3, 0));
    expect(r.state.phase).not.toBe('over');
    expect(r.state.ranking).toEqual([0]);
  });

  it('viene activa por defecto', () => {
    expect(DEFAULT_RULES.endOnWinner).toBe(true);
  });
});

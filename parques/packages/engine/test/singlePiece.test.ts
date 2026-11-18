import { describe, expect, it } from 'vitest';
import { getLegalMoves } from '../src';
import { JAIL, move, newGame, progressAt, roll, setup, step, sum, types } from './helpers';

// Regla: con UNA sola ficha en juego se mueve la suma completa de los dos dados.
describe('una sola ficha: se mueve la suma de los dos dados', () => {
  const rules = { singlePieceSum: true };

  it('solo se ofrece la suma (no un dado solo)', () => {
    const s = setup(newGame(rules), [[2, JAIL, JAIL, JAIL], [30, JAIL, JAIL, JAIL]]);
    const legal = getLegalMoves(roll(s, [3, 5]).state);
    expect(legal).toEqual([sum(0, 0)]);
  });

  it('no puede capturar con un solo dado: avanza la suma completa', () => {
    // Rival a 3 casillas (capturaría con el 3), pero tiene que mover 3+5 = 8.
    const s = setup(newGame(rules), [[2, JAIL, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
    const r = roll(s, [3, 5]);
    expect(getLegalMoves(r.state).some((m) => m.type === 'step')).toBe(false);
    const m = move(r.state, sum(0, 0));
    expect(types(m.events)).not.toContain('CAPTURED');
    expect(m.state.players[0]!.pieces[0]).toBe(10);
  });

  it('sí captura si la suma cae sobre el rival', () => {
    const s = setup(newGame(rules), [[2, JAIL, JAIL, JAIL], [progressAt(1, 15), JAIL, JAIL, JAIL]]);
    const m = move(roll(s, [3, 5]).state, sum(0, 0));
    expect(types(m.events)).toContain('CAPTURED');
  });

  it('cerca de la llegada, si la suma no cabe, puede jugar un dado', () => {
    const s = setup(newGame(rules), [[68, JAIL, JAIL, JAIL], [30, JAIL, JAIL, JAIL]]);
    const legal = getLegalMoves(roll(s, [3, 5]).state);
    expect(legal).toContainEqual(step(0, 0, 0));
  });

  it('con dos o más fichas en juego se puede mover cada dado por separado', () => {
    const s = setup(newGame(rules), [[2, 20, JAIL, JAIL], [30, JAIL, JAIL, JAIL]]);
    const legal = getLegalMoves(roll(s, [3, 5]).state);
    expect(legal.some((m) => m.type === 'step')).toBe(true);
  });

  it('con par y fichas en la cárcel, puede sacar fichas en vez de mover la suma', () => {
    const s = setup(newGame(rules), [[2, JAIL, JAIL, JAIL], [30, JAIL, JAIL, JAIL]]);
    const legal = getLegalMoves(roll(s, [4, 4]).state);
    expect(legal.some((m) => m.type === 'exit')).toBe(true);
    expect(legal.some((m) => m.type === 'sum')).toBe(true);
    expect(legal.some((m) => m.type === 'step')).toBe(false);
  });

  it('viene activa por defecto', async () => {
    const { DEFAULT_RULES } = await import('../src');
    expect(DEFAULT_RULES.singlePieceSum).toBe(true);
  });
});

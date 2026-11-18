import { describe, expect, it } from 'vitest';
import { JAIL, move, newGame, roll, setup, step, types } from './helpers';

// Regla: coronar una ficha (llevarla a la llegada) da otra tirada, como capturar.
describe('tirada extra al coronar', () => {
  it('llevar una ficha a la llegada da otra tirada', () => {
    // Ficha en 68 (pasillo); con 3 llega a 71 (cielo). El 5 no se puede usar.
    const s = setup(newGame(), [[68, JAIL, JAIL, JAIL], [30, JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [3, 5]).state, step(0, 0, 0));
    expect(types(r.events)).toContain('CROWNED');
    const extra = r.events.find((e) => e.type === 'EXTRA_TURN');
    expect(extra).toMatchObject({ player: 0, reason: 'crown' });
    expect(r.state.current).toBe(0);
    expect(r.state.phase).toBe('roll');
    expect(r.state.pairStreak).toBe(0);
  });

  it('también cuando la corona es con el primer dado y el segundo mueve otra ficha', () => {
    const s = setup(newGame(), [[68, 10, JAIL, JAIL], [30, JAIL, JAIL, JAIL]]);
    const r1 = move(roll(s, [3, 5]).state, step(0, 0, 0));
    expect(types(r1.events)).not.toContain('EXTRA_TURN');
    const r2 = move(r1.state, step(0, 1, 1));
    expect(r2.events.find((e) => e.type === 'EXTRA_TURN')).toMatchObject({ reason: 'crown' });
    expect(r2.state.current).toBe(0);
  });

  it('si con esa ficha termina todas, no hay tirada extra (ya terminó)', () => {
    const s = setup(newGame({ piecesPerPlayer: 1 }), [[68], [30]]);
    const r = move(roll(s, [3, 5]).state, step(0, 0, 0));
    expect(types(r.events)).not.toContain('EXTRA_TURN');
  });

  it('se puede desactivar como regla de la casa', () => {
    const s = setup(newGame({ crownBonus: false }), [[68, JAIL, JAIL, JAIL], [30, JAIL, JAIL, JAIL]]);
    const r = move(roll(s, [3, 5]).state, step(0, 0, 0));
    expect(types(r.events)).not.toContain('EXTRA_TURN');
    expect(r.state.current).toBe(1);
  });
});

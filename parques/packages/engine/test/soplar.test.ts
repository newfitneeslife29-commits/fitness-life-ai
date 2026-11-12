import { describe, expect, it } from 'vitest';
import { applyAction } from '../src';
import { JAIL, move, newGame, progressAt, ref, roll, setup, step, tryAction, types } from './helpers';

// J0: ficha 0 en progreso 2 (casilla 7) puede capturar a J1 en casilla 10 con un 3.
// Ficha 1 en progreso 30 sirve para "no capturar".
function scenario(rules = {}) {
  return setup(newGame(rules), [[2, 30, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
}

function skipCapture(rules = {}) {
  let r = roll(scenario(rules), [3, 4]);
  r = move(r.state, step(0, 1, 0)); // mueve la otra ficha con el 3
  r = move(r.state, step(0, 1, 1)); // y con el 4
  return r;
}

describe('soplar', () => {
  it('si podía capturar y no lo hizo, queda disponible el soplo', () => {
    const r = skipCapture();
    expect(types(r.events)).toContain('SOPLO_AVAILABLE');
    expect(r.state.pendingSoplo).toEqual({ offender: 0, piece: ref(0, 0) });
  });

  it('un rival sopla y la ficha que podía capturar va a la cárcel', () => {
    const r = skipCapture();
    const s = applyAction(r.state, { type: 'SOPLAR', player: 2 });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.state.players[0]!.pieces[0]).toBe(JAIL);
    expect(types(s.events)).toEqual(['SOPLADO']);
    expect(s.state.players[2]!.stats.soplosHechos).toBe(1);
    expect(s.state.players[0]!.stats.soplosRecibidos).toBe(1);
    expect(s.state.pendingSoplo).toBeNull();
  });

  it('el infractor no se puede soplar a sí mismo', () => {
    const r = skipCapture();
    expect(tryAction(r.state, { type: 'SOPLAR', player: 0 }).ok).toBe(false);
  });

  it('en parejas el compañero no puede soplar', () => {
    const s = setup(newGame({ teams: true }), [[2, 30, JAIL, JAIL], [progressAt(1, 10), JAIL, JAIL, JAIL]]);
    let r = roll(s, [3, 4]);
    r = move(r.state, step(0, 1, 0));
    r = move(r.state, step(0, 1, 1));
    expect(tryAction(r.state, { type: 'SOPLAR', player: 2 }).ok).toBe(false);
    expect(tryAction(r.state, { type: 'SOPLAR', player: 1 }).ok).toBe(true);
  });

  it('si captura con el otro dado, no hay soplo', () => {
    let r = roll(scenario(), [4, 3]);
    r = move(r.state, step(0, 1, 0)); // primero mueve la otra ficha (había captura posible)
    r = move(r.state, step(0, 0, 1)); // luego captura con el 3
    expect(types(r.events)).toContain('CAPTURED');
    expect(r.state.pendingSoplo).toBeNull();
  });

  it('el soplo expira cuando el siguiente jugador tira', () => {
    const r = skipCapture();
    const next = roll(r.state, [1, 2], 1);
    expect(types(next.events)).toContain('SOPLO_EXPIRED');
    expect(next.state.pendingSoplo).toBeNull();
  });

  it('se puede descartar (temporizador de la UI vencido)', () => {
    const r = skipCapture();
    const d = applyAction(r.state, { type: 'DISMISS_SOPLO' });
    expect(d.ok && d.state.pendingSoplo).toBeNull();
  });

  it('con la regla desactivada no hay soplo', () => {
    const r = skipCapture({ soplar: false });
    expect(r.state.pendingSoplo).toBeNull();
    expect(tryAction(r.state, { type: 'SOPLAR', player: 1 }).ok).toBe(false);
  });

  it('no aplica si no había captura posible', () => {
    const s = setup(newGame(), [[2, 30, JAIL, JAIL], [progressAt(1, 40), JAIL, JAIL, JAIL]]);
    let r = roll(s, [3, 4]);
    r = move(r.state, step(0, 1, 0));
    r = move(r.state, step(0, 1, 1));
    expect(r.state.pendingSoplo).toBeNull();
  });
});

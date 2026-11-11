import { applyAction, autoAction, createGame, getLegalMoves, homeFor, nextRandom, shouldSoplar } from '../src';
import type { AiLevel, GameConfig, GameState } from '../src';

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    const [v, next] = nextRandom(s);
    s = next;
    return v;
  };
}

export interface SimResult {
  state: GameState;
  actions: number;
}

/** Juega una partida completa entre bots, validando invariantes en cada paso. */
export function simulate(config: GameConfig, levels: AiLevel[], seed: number, maxActions = 20000): SimResult {
  let state = createGame({ ...config, seed });
  const rand = seededRandom(seed ^ 0x9e3779b9);
  const home = homeFor(state.sides);
  const piecesPer = state.rules.piecesPerPlayer;
  let actions = 0;
  while (state.phase !== 'over') {
    if (actions++ > maxActions) throw new Error(`La partida no terminó (semilla ${seed})`);
    // Los bots rivales pueden soplar.
    if (state.pendingSoplo) {
      const soplador = state.players.findIndex((_, i) => shouldSoplar(state, i, levels[i]!, rand));
      if (soplador >= 0) {
        const r = applyAction(state, { type: 'SOPLAR', player: soplador });
        if (!r.ok) throw new Error(r.error);
        state = r.state;
        continue;
      }
    }
    const action = autoAction(state, levels[state.current]!, rand);
    if (!action) throw new Error(`Sin acción en fase ${state.phase} (semilla ${seed})`);
    if (action.type === 'MOVE' && getLegalMoves(state).length === 0) throw new Error('MOVE sin jugadas legales');
    const r = applyAction(state, action);
    if (!r.ok) throw new Error(`${r.error} (semilla ${seed})`);
    state = r.state;
    for (const p of state.players) {
      if (p.pieces.length !== piecesPer) throw new Error('Número de fichas cambió');
      for (const pos of p.pieces) if (!Number.isInteger(pos) || pos < -1 || pos > home) throw new Error(`Posición inválida ${pos}`);
    }
  }
  return { state, actions };
}

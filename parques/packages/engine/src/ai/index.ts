/**
 * IA con 3 niveles:
 *  - easy:   casi siempre al azar, a veces la jugada obvia. Sopla poco.
 *  - normal: mejor jugada inmediata según la heurística (con algo de ruido).
 *  - expert: busca la mejor combinación de los dos dados (2 jugadas) y siempre sopla.
 */
import { getLegalMoves } from '../moves';
import { applyAction } from '../reducer';
import { canSoplar } from '../rules/soplar';
import type { Action, GameState, Move } from '../types';
import { evaluate } from './evaluate';

export type AiLevel = 'easy' | 'normal' | 'expert';
export type RandomFn = () => number;

function simulate(state: GameState, move: Move): GameState | null {
  const r = applyAction(state, { type: 'MOVE', player: state.current, move });
  return r.ok ? r.state : null;
}

function bestFollowUp(state: GameState, player: number): number {
  if (state.phase !== 'move' || state.current !== player) return evaluate(state, player);
  let best = -Infinity;
  for (const m of getLegalMoves(state)) {
    const next = simulate(state, m);
    if (next) best = Math.max(best, evaluate(next, player));
  }
  return best === -Infinity ? evaluate(state, player) : best;
}

export function chooseMove(state: GameState, level: AiLevel = 'normal', random: RandomFn = Math.random): Move | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0]!;
  const player = state.current;

  if (level === 'easy' && random() < 0.65) {
    return moves[Math.floor(random() * moves.length)]!;
  }

  let best: Move = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves) {
    const next = simulate(state, m);
    if (!next) continue;
    let score = level === 'expert' ? bestFollowUp(next, player) : evaluate(next, player);
    if (level === 'normal') score += (random() - 0.5) * 6;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** ¿Este bot debe soplar ahora? */
export function shouldSoplar(state: GameState, player: number, level: AiLevel = 'normal', random: RandomFn = Math.random): boolean {
  if (canSoplar(state, player) !== null) return false;
  const chance = level === 'easy' ? 0.35 : level === 'normal' ? 0.8 : 1;
  return random() < chance;
}

/**
 * Acción automática para el jugador en turno (bots y turno vencido por tiempo).
 * Devuelve null si la partida terminó.
 */
export function autoAction(state: GameState, level: AiLevel = 'normal', random: RandomFn = Math.random): Action | null {
  if (state.phase === 'over') return null;
  if (state.phase === 'roll') return { type: 'ROLL', player: state.current };
  const move = chooseMove(state, level, random);
  return move ? { type: 'MOVE', player: state.current, move } : null;
}

export { evaluate } from './evaluate';

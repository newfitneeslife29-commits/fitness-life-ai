/** Generación de jugadas legales: única fuente de verdad para UI, IA y servidor. */
import { entryFor, homeFor, isActive, isSafeSquare, squareOf } from './board';
import { controlledPlayer, jailPieces, posOf, rivalsOnSquare } from './state';
import type { GameState, Move, PieceRef } from './types';

export function dieValueOf(state: GameState, move: Move): number {
  const dice = state.dice!;
  if (move.type === 'step') return dice[move.die];
  if (move.type === 'sum') return dice[0] + dice[1];
  return 0;
}

export function isPairRoll(state: GameState): boolean {
  return !!state.dice && state.dice[0] === state.dice[1];
}

export function getLegalMoves(state: GameState): Move[] {
  if (state.phase !== 'move' || !state.dice) return [];
  const [d0, d1] = state.dice;
  const [u0, u1] = state.diceUsed;
  const owner = controlledPlayer(state, state.current);
  const home = homeFor(state.sides);
  const moves: Move[] = [];

  const jailCount = jailPieces(state, owner).length;
  if (d0 === d1 && jailCount > 0) {
    const counts = new Set<number>();
    if (!u0 || !u1) counts.add(1);
    if (!u0 && !u1) {
      counts.add(Math.min(state.rules.pairExitMax, jailCount));
      if (state.rules.allOutDoubles.includes(d0)) counts.add(jailCount);
    }
    for (const count of [...counts].sort((a, b) => a - b)) moves.push({ type: 'exit', count });
  }
  const pieces = state.players[owner]!.pieces;
  pieces.forEach((pos, index) => {
    if (!isActive(state.sides, pos)) return;
    // Fichas en la misma casilla son equivalentes: solo se ofrece la primera.
    if (pieces.findIndex((p) => p === pos) !== index) return;
    const piece: PieceRef = { owner, index };
    if (!u0 && pos + d0 <= home) moves.push({ type: 'step', piece, die: 0 });
    if (!u1 && pos + d1 <= home && !(d0 === d1 && !u0)) moves.push({ type: 'step', piece, die: 1 });
    if (!u0 && !u1 && pos + d0 + d1 <= home) moves.push({ type: 'sum', piece });
  });
  return moves;
}

export function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'exit') return a.count === (b as Extract<Move, { type: 'exit' }>).count;
  const bp = (b as Exclude<Move, { type: 'exit' }>).piece;
  if (a.piece.owner !== bp.owner || a.piece.index !== bp.index) return false;
  return a.type === 'sum' || a.die === (b as Extract<Move, { type: 'step' }>).die;
}

export function isLegalMove(state: GameState, move: Move): boolean {
  return getLegalMoves(state).some((m) => sameMove(m, move));
}

/** Progreso destino de una jugada de ficha. */
export function targetOf(state: GameState, move: Exclude<Move, { type: 'exit' }>): number {
  return posOf(state, move.piece) + dieValueOf(state, move);
}

/** ¿Esta jugada captura alguna ficha rival? (no aplica a salir de la cárcel) */
export function moveCaptures(state: GameState, move: Move): boolean {
  if (move.type === 'exit') return false;
  const to = targetOf(state, move);
  if (to > entryFor(state.sides)) return false;
  const side = state.players[move.piece.owner]!.side;
  const square = squareOf(state.sides, side, to)!;
  if (isSafeSquare(square)) return false;
  return rivalsOnSquare(state, move.piece.owner, square).length > 0;
}

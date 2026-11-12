/** TRES PARES SEGUIDOS: la ficha más adelantada (no coronada) va a la cárcel. */
import { isActive } from '../board';
import { controlledPlayer, setPos } from '../state';
import type { GameEvent, GameState, PieceRef } from '../types';
import { JAIL } from '../types';

export function mostAdvancedPiece(state: GameState, owner: number): PieceRef | null {
  let best: PieceRef | null = null;
  let bestPos = -Infinity;
  state.players[owner]!.pieces.forEach((pos, index) => {
    if (isActive(state.sides, pos) && pos > bestPos) {
      bestPos = pos;
      best = { owner, index };
    }
  });
  return best;
}

export function applyTriplePairPenalty(state: GameState, events: GameEvent[]): void {
  const player = state.current;
  const piece = mostAdvancedPiece(state, controlledPlayer(state, player));
  if (piece) setPos(state, piece, JAIL);
  state.players[player]!.stats.tripleParCastigos++;
  events.push({ type: 'TRIPLE_PAIR', player, piece });
}

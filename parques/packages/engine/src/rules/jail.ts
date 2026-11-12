/**
 * SALIDA DE LA CÁRCEL (requiere par):
 *  - Doble 1 o doble 6 (`allOutDoubles`): pueden salir todas.
 *  - Cualquier par: salen 1 o 2 (`pairExitMax`).
 *  - Si sale solo 1, se gasta un dado y el otro se mueve normal.
 */
import { exitSquare } from '../board';
import { jailPieces, setPos } from '../state';
import type { GameEvent, GameState, PieceRef } from '../types';
import { captureAt } from './capture';

export function exitJail(state: GameState, owner: number, count: number, events: GameEvent[]): PieceRef[] {
  const leaving = jailPieces(state, owner).slice(0, count);
  if (leaving.length === 0) return [];
  for (const ref of leaving) setPos(state, ref, 0);
  events.push({ type: 'EXITED_JAIL', player: owner, pieces: leaving });
  // Salida ocupada por un rival: lo captura aunque la salida sea seguro.
  captureAt(state, leaving[0]!, exitSquare(state.players[owner]!.side), events, true);
  return leaving;
}

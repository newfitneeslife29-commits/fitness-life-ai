/** SALIDA DE LA CÁRCEL: con par salen las fichas (todas o `exitCount`). */
import { exitSquare } from '../board';
import { jailPieces, setPos } from '../state';
import type { GameEvent, GameState, PieceRef } from '../types';
import { captureAt } from './capture';

export function exitJail(state: GameState, owner: number, events: GameEvent[]): PieceRef[] {
  const jailed = jailPieces(state, owner);
  const count = state.rules.exitAll ? jailed.length : Math.min(state.rules.exitCount, jailed.length);
  const leaving = jailed.slice(0, count);
  if (leaving.length === 0) return [];
  for (const ref of leaving) setPos(state, ref, 0);
  events.push({ type: 'EXITED_JAIL', player: owner, pieces: leaving });
  // Salida ocupada por un rival: lo captura aunque la salida sea seguro.
  captureAt(state, leaving[0]!, exitSquare(state.players[owner]!.side), events, true);
  return leaving;
}

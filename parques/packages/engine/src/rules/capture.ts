/** CAPTURA: caer en la casilla de un rival fuera de seguro lo manda a la cárcel. */
import { isSafeSquare } from '../board';
import { areTeammates, rivalsOnSquare, setPos } from '../state';
import type { GameEvent, GameState, PieceRef } from '../types';
import { JAIL } from '../types';

/**
 * Envía a la cárcel a los rivales en `square`. Con `ignoreSafe` se captura
 * aunque sea seguro (caso: salir de la cárcel sobre la salida propia ocupada).
 */
export function captureAt(
  state: GameState,
  by: PieceRef,
  square: number,
  events: GameEvent[],
  ignoreSafe = false,
): PieceRef[] {
  if (!ignoreSafe && isSafeSquare(square)) return [];
  const victims = rivalsOnSquare(state, by.owner, square);
  if (victims.length === 0) return [];
  for (const v of victims) {
    setPos(state, v, JAIL);
    state.players[v.owner]!.stats.captured++;
  }
  // La captura se le acredita al jugador que movió (puede ser el compañero en parejas).
  const mover = state.current;
  const credit = areTeammates(state, mover, by.owner) ? mover : by.owner;
  state.players[credit]!.stats.captures += victims.length;
  state.capturedThisRoll = true;
  events.push({ type: 'CAPTURED', by, victims });
  return victims;
}

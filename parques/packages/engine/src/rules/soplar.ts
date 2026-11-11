/**
 * SOPLAR: si en una tirada el jugador pudo capturar y no capturó a nadie,
 * cualquier rival puede "soplar" y mandar a la cárcel la ficha que podía capturar.
 * El temporizador de segundos lo maneja la UI/servidor; el motor mantiene
 * el soplo disponible hasta que otro jugador tira o se descarta (DISMISS_SOPLO).
 */
import { isActive } from '../board';
import { getLegalMoves, moveCaptures } from '../moves';
import { areTeammates, posOf, setPos } from '../state';
import type { GameEvent, GameState, Move } from '../types';
import { JAIL } from '../types';

/** Llamar ANTES de aplicar una jugada: registra si había captura posible y no se eligió. */
export function trackMissedCapture(state: GameState, chosen: Move): void {
  if (!state.rules.soplar || state.missedCapture) return;
  if (moveCaptures(state, chosen)) return;
  const capturing = getLegalMoves(state).find((m) => moveCaptures(state, m));
  if (capturing && capturing.type !== 'exit') state.missedCapture = { ...capturing.piece };
}

/** Al terminar la tirada: abre la ventana de soplo si corresponde. */
export function finalizeSoplo(state: GameState, events: GameEvent[]): void {
  if (state.rules.soplar && state.missedCapture && !state.capturedThisRoll) {
    const piece = state.missedCapture;
    if (isActive(state.sides, posOf(state, piece))) {
      state.pendingSoplo = { offender: state.current, piece };
      events.push({ type: 'SOPLO_AVAILABLE', offender: state.current, piece });
    }
  }
  state.missedCapture = null;
  state.capturedThisRoll = false;
}

export function canSoplar(state: GameState, player: number): string | null {
  if (!state.rules.soplar) return 'La regla de soplar está desactivada';
  const s = state.pendingSoplo;
  if (!s) return 'No hay nada que soplar';
  if (player < 0 || player >= state.players.length) return 'Jugador inválido';
  if (areTeammates(state, player, s.offender)) return 'No puedes soplar a tu propio equipo';
  if (!isActive(state.sides, posOf(state, s.piece))) return 'La ficha ya no está en juego';
  return null;
}

export function applySoplo(state: GameState, player: number, events: GameEvent[]): void {
  const s = state.pendingSoplo!;
  setPos(state, s.piece, JAIL);
  state.players[player]!.stats.soplosHechos++;
  state.players[s.offender]!.stats.soplosRecibidos++;
  state.pendingSoplo = null;
  events.push({ type: 'SOPLADO', by: player, offender: s.offender, piece: s.piece });
}

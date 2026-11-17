/**
 * Duración de las animaciones de la partida (ms). La usa la app para animar y el servidor para
 * esperar a que se vean antes de la siguiente jugada de la máquina y antes de arrancar el reloj
 * del turno de una persona (así el reloj nunca corre mientras el celular todavía está animando).
 */
import type { GameEvent } from './types';

export const ANIM_MS = {
  roll: 460,
  step: 125,
  stepFast: 78,
  exit: 330,
  capture: 560,
  crown: 600,
  triple: 1800,
  soplo: 1300,
  turn: 180,
  forfeit: 400,
  jailFail: 180,
  left: 900,
  finished: 500,
};

/** Un paso de casilla: más rápido en recorridos largos. */
export function stepMs(pathLength: number): number {
  return pathLength > 7 ? ANIM_MS.stepFast : ANIM_MS.step;
}

/** Cuánto tarda la app en mostrar estos eventos (igual que `animate` de gameStore). */
export function animDuration(events: GameEvent[]): number {
  let ms = 0;
  for (const e of events) {
    switch (e.type) {
      case 'ROLLED':
        ms += ANIM_MS.roll;
        break;
      case 'JAIL_ATTEMPT_FAILED':
        ms += ANIM_MS.jailFail;
        break;
      case 'EXITED_JAIL':
        ms += ANIM_MS.exit;
        break;
      case 'PIECE_MOVED':
        ms += e.path.length * stepMs(e.path.length);
        break;
      case 'EXTRA_TURN':
        if (e.reason === 'capture') ms += ANIM_MS.turn;
        break;
      case 'CAPTURED':
        ms += ANIM_MS.capture;
        break;
      case 'CROWNED':
        ms += ANIM_MS.crown;
        break;
      case 'TRIPLE_PAIR':
        ms += ANIM_MS.triple;
        break;
      case 'SOPLADO':
        ms += ANIM_MS.soplo * 0.6;
        break;
      case 'DICE_FORFEITED':
        ms += ANIM_MS.forfeit;
        break;
      case 'PLAYER_LEFT':
        ms += ANIM_MS.left;
        break;
      case 'PLAYER_FINISHED':
        ms += ANIM_MS.finished;
        break;
      case 'TURN_CHANGED':
        ms += ANIM_MS.turn;
        break;
      default:
        break;
    }
  }
  return Math.round(ms);
}

/**
 * Duración de las animaciones de la partida (ms). La usa la app para animar y el servidor para
 * esperar a que se vean antes de la siguiente jugada de la máquina y antes de arrancar el reloj
 * del turno de una persona (así el reloj nunca corre mientras el celular todavía está animando).
 */
import type { GameEvent } from './types';

export const ANIM_MS = {
  roll: 400,
  step: 100,
  stepFast: 62,
  exit: 280,
  capture: 480,
  crown: 600,
  triple: 1800,
  soplo: 1300,
  turn: 120,
  forfeit: 400,
  /** Intento fallido de salir de la cárcel (se ve el resultado y cuántos quedan). */
  jailFail: 650,
  /** Último intento fallido: aviso "sin par" antes de pasar el turno. */
  jailOut: 1300,
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
        ms += e.attemptsLeft > 0 ? ANIM_MS.jailFail : ANIM_MS.jailOut;
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

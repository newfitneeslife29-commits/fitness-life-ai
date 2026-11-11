/**
 * Topología del tablero (independiente del dibujo).
 *
 * Cada lado tiene 17 casillas del recorrido común. Numeradas por lado:
 *   offset 0  → entrada al pasillo del dueño del lado (SEGURO)
 *   offset 5  → SALIDA del dueño del lado (SEGURO)
 *   offset 12 → SEGURO
 *
 * Una ficha sale en su casilla de salida (progreso 0), da la vuelta
 * completa (63 casillas) hasta la entrada de su pasillo (progreso 63),
 * recorre 7 casillas de pasillo (64..70) y llega al cielo con 71 exacto
 * (valores para 4 lados; en 6 lados: entrada 97, cielo 105).
 */
import type { Position } from './types';
import { JAIL } from './types';

export const SQUARES_PER_SIDE = 17;
export const EXIT_OFFSET = 5;
export const SAFE_OFFSETS: readonly number[] = [0, EXIT_OFFSET, 12];
export const CORRIDOR_LENGTH = 7;

/**
 * Progreso de la casilla de entrada al pasillo: sides*17 - 5
 * (63 en 4 lados, 97 en 6 lados). El cielo es entry + 8 (71 / 105).
 */
export function entryFor(sides: number): number {
  return sides * SQUARES_PER_SIDE - EXIT_OFFSET;
}
export function homeFor(sides: number): number {
  return entryFor(sides) + CORRIDOR_LENGTH + 1;
}
export function trackLength(sides: number): number {
  return sides * SQUARES_PER_SIDE;
}

/** Casilla absoluta (0..trackLength-1) de la salida de un lado. */
export function exitSquare(side: number): number {
  return side * SQUARES_PER_SIDE + EXIT_OFFSET;
}

/** Casilla absoluta del recorrido común, o null si está en cárcel, pasillo o cielo. */
export function squareOf(sides: number, side: number, pos: Position): number | null {
  if (pos === JAIL || pos < 0 || pos > entryFor(sides)) return null;
  return (exitSquare(side) + pos) % trackLength(sides);
}

export function isSafeSquare(square: number): boolean {
  return SAFE_OFFSETS.includes(square % SQUARES_PER_SIDE);
}

/** ¿Es la casilla de salida de algún lado? Devuelve el lado o null. */
export function exitOwner(square: number): number | null {
  return square % SQUARES_PER_SIDE === EXIT_OFFSET ? Math.floor(square / SQUARES_PER_SIDE) : null;
}

export function isOnTrack(sides: number, pos: Position): boolean {
  return pos >= 0 && pos <= entryFor(sides);
}
export function isInCorridor(sides: number, pos: Position): boolean {
  return pos > entryFor(sides) && pos < homeFor(sides);
}
export function isActive(sides: number, pos: Position): boolean {
  return pos >= 0 && pos < homeFor(sides);
}

/** Lado compañero en modo parejas (el opuesto). */
export function partnerSide(sides: number, side: number): number {
  return (side + sides / 2) % sides;
}

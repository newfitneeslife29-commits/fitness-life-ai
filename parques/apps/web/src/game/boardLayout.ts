/**
 * Geometría del tablero (solo dibujo). Convierte la topología del motor en
 * coordenadas SVG centradas en (0,0). Funciona para 4 y 6 lados.
 *
 * Cada brazo tiene 3 columnas x 8 filas, saliendo de un polígono central:
 *   - columna L (k = 7..0 hacia adentro): offsets 1..8 del lado del brazo
 *   - columna M: fila 7 = entrada (offset 0, recorrido); filas 6..0 = pasillo del dueño
 *   - columna R (k = 0..7 hacia afuera): offsets 9..16 del lado ANTERIOR
 * La cárcel del lado s queda en la cuña entre el brazo s y el brazo s+1.
 */
import { entryFor, homeFor, JAIL, SQUARES_PER_SIDE } from '@parques/engine';

export const CELL = 50;
const HALF_ARM = CELL * 1.5;

export interface Pt {
  x: number;
  y: number;
}

export interface Cell {
  /** Polígono de 4 puntos (string para <polygon points>). */
  points: string;
  center: Pt;
  /** Ángulo del brazo en grados (para orientar decoraciones). */
  angle: number;
}

export function apothem(sides: number): number {
  return HALF_ARM / Math.tan(Math.PI / sides);
}

export function armAngle(sides: number, arm: number): number {
  return (arm * 360) / sides;
}

function armFrame(sides: number, arm: number) {
  const t = (armAngle(sides, arm) * Math.PI) / 180;
  // d: hacia afuera del brazo (brazo 0 apunta abajo). p: hacia la columna L.
  return { d: { x: -Math.sin(t), y: Math.cos(t) }, p: { x: -Math.cos(t), y: -Math.sin(t) } };
}

/** Punto en coordenadas de brazo: `dist` desde el centro, `lateral` hacia la columna L. */
export function armPoint(sides: number, arm: number, dist: number, lateral: number): Pt {
  const { d, p } = armFrame(sides, arm);
  return { x: d.x * dist + p.x * lateral, y: d.y * dist + p.y * lateral };
}

export type Column = 'L' | 'M' | 'R';
const COL_OFFSET: Record<Column, number> = { L: CELL, M: 0, R: -CELL };

export function armCell(sides: number, arm: number, col: Column, k: number): Cell {
  const a = apothem(sides);
  const lat = COL_OFFSET[col];
  const r0 = a + k * CELL;
  const r1 = r0 + CELL;
  const pts = [
    armPoint(sides, arm, r0, lat - CELL / 2),
    armPoint(sides, arm, r0, lat + CELL / 2),
    armPoint(sides, arm, r1, lat + CELL / 2),
    armPoint(sides, arm, r1, lat - CELL / 2),
  ];
  return {
    points: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    center: armPoint(sides, arm, (r0 + r1) / 2, lat),
    angle: armAngle(sides, arm),
  };
}

/** Celda de una casilla absoluta del recorrido común. */
export function trackCell(sides: number, square: number): Cell {
  const side = Math.floor(square / SQUARES_PER_SIDE);
  const o = square % SQUARES_PER_SIDE;
  if (o === 0) return armCell(sides, side, 'M', 7);
  if (o <= 8) return armCell(sides, side, 'L', 8 - o);
  return armCell(sides, (side + 1) % sides, 'R', o - 9);
}

/** Celda del pasillo: j = 1..7 (1 = la más cercana a la entrada). */
export function corridorCell(sides: number, side: number, j: number): Cell {
  return armCell(sides, side, 'M', 7 - j);
}

export interface JailGeom {
  center: Pt;
  radius: number;
}

export function jailGeom(sides: number, side: number): JailGeom {
  const t = (((side + 0.5) * 360) / sides) * (Math.PI / 180);
  const r = sides === 4 ? 395 : 392;
  return { center: { x: -Math.sin(t) * r, y: Math.cos(t) * r }, radius: sides === 4 ? 150 : 100 };
}

/** Polígono central (cielo). */
export function centerPolygon(sides: number): Pt[] {
  const R = HALF_ARM / Math.sin(Math.PI / sides);
  return Array.from({ length: sides }, (_, i) => {
    const t = ((i + 0.5) * 2 * Math.PI) / sides;
    return { x: -Math.sin(t) * R, y: Math.cos(t) * R };
  });
}

/** Extensión del tablero para el viewBox. */
export function boardExtent(sides: number): number {
  return sides === 4 ? apothem(sides) + 8 * CELL + 20 : OUTLINE_R6 + 10;
}

/** Radio (al vértice) del contorno hexagonal; los vértices apuntan a los brazos. */
export const OUTLINE_R6 = 585;

/** Punto donde se dibuja una ficha (sin el desplazamiento por apilamiento). */
export function piecePoint(sides: number, side: number, pos: number, index: number): Pt {
  if (pos === JAIL) {
    const j = jailGeom(sides, side);
    const s = j.radius * 0.36;
    const offs = [
      { x: -s, y: -s },
      { x: s, y: -s },
      { x: -s, y: s },
      { x: s, y: s },
    ][index % 4]!;
    return { x: j.center.x + offs.x, y: j.center.y + offs.y };
  }
  const entry = entryFor(sides);
  if (pos === homeFor(sides)) {
    const a = apothem(sides);
    return armPoint(sides, side, a * 0.5, (index - 1.5) * 15);
  }
  if (pos > entry) return corridorCell(sides, side, pos - entry).center;
  const square = (side * SQUARES_PER_SIDE + 5 + pos) % (sides * SQUARES_PER_SIDE);
  return trackCell(sides, square).center;
}

/** Desplazamiento para varias fichas en la misma casilla. */
export function stackOffset(i: number, n: number): Pt {
  if (n <= 1) return { x: 0, y: 0 };
  const r = n === 2 ? 9 : 11;
  const t = (i / n) * Math.PI * 2 - Math.PI / 4;
  return { x: Math.cos(t) * r, y: Math.sin(t) * r };
}

/**
 * Geometría del tablero clásico de parqués colombiano (solo dibujo).
 * Coordenadas SVG centradas en (0,0). Funciona para 4 y 6 lados.
 *
 * Cada brazo tiene 3 columnas de casillas anchas y planas:
 *   - columna L (lado de la cárcel del dueño del brazo): filas 0..4 = offsets 1..5
 *     (fila 4 = SALIDA, junto a la cárcel)
 *   - columna M: fila 0 = SEGURO de la punta (offset 0, entrada al pasillo),
 *     filas 1..7 = pasillo, fila 8 = LLEGADA (cielo / ficha coronada)
 *   - columna R: filas 4..0 = offsets 12..16 del lado ANTERIOR (fila 4 = SEGURO)
 * Entre dos brazos hay una curva (abanico) de 6 casillas alrededor de la cárcel:
 * offsets 6..11. Total por lado: 17 casillas (68 en 4 lados).
 * El juego avanza en sentido contrario a las agujas del reloj.
 */
import { entryFor, homeFor, JAIL, SQUARES_PER_SIDE } from '@parques/engine';

export interface Pt {
  x: number;
  y: number;
}

export interface Cell {
  pts: Pt[];
  /** Polígono para <polygon points>. */
  points: string;
  center: Pt;
  /** Eje largo de la casilla (para repartir fichas y orientar el texto). */
  axis: Pt;
  /** Rotación del texto en grados. */
  angle: number;
}

interface Params {
  /** Distancia del centro a la punta del brazo. */
  E: number;
  /** Alto de una fila. */
  h: number;
  /** Medio ancho de la columna central. */
  M: number;
  /** Medio ancho del brazo. */
  A: number;
  /** Tamaño de letra de las etiquetas. */
  font: number;
}

const PARAMS: Record<4 | 6, Params> = {
  4: { E: 500, h: 40, M: 75, A: 200, font: 27 },
  6: { E: 630, h: 40, M: 55, A: 150, font: 21 },
};

export function params(sides: number): Params {
  return PARAMS[sides === 6 ? 6 : 4];
}

/** Distancia (a lo largo del brazo) donde terminan las filas rectas y empieza la curva. */
export function fanStart(sides: number): number {
  const { E, h } = params(sides);
  return E - 5 * h;
}

function frame(sides: number, arm: number) {
  const t = (arm * 2 * Math.PI) / sides;
  // d: hacia afuera del brazo. p: hacia la columna L (cárcel del dueño).
  return { d: { x: Math.sin(t), y: Math.cos(t) }, p: { x: Math.cos(t), y: -Math.sin(t) } };
}

export function armPoint(sides: number, arm: number, dist: number, lateral: number): Pt {
  const { d, p } = frame(sides, arm % sides);
  return { x: d.x * dist + p.x * lateral, y: d.y * dist + p.y * lateral };
}

const fmt = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const avg = (pts: Pt[]): Pt => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
const deg = (v: Pt) => (Math.atan2(v.y, v.x) * 180) / Math.PI;

/** Casilla recta: columna por rango lateral y fila (0 = punta del brazo). */
function rectCell(sides: number, arm: number, lat0: number, lat1: number, row: number): Cell {
  const { E, h } = params(sides);
  const r1 = E - row * h;
  const r0 = r1 - h;
  const pts = [armPoint(sides, arm, r0, lat0), armPoint(sides, arm, r0, lat1), armPoint(sides, arm, r1, lat1), armPoint(sides, arm, r1, lat0)];
  const { p } = frame(sides, arm % sides);
  return { pts, points: fmt(pts), center: armPoint(sides, arm, (r0 + r1) / 2, (lat0 + lat1) / 2), axis: p, angle: deg(p) };
}

export type Column = 'L' | 'M' | 'R';
export function armCell(sides: number, arm: number, col: Column, row: number): Cell {
  const { M, A } = params(sides);
  if (col === 'M') return rectCell(sides, arm, -M, M, row);
  if (col === 'L') return rectCell(sides, arm, M, A, row);
  return rectCell(sides, arm, -A, -M, row);
}

/** Centro y radios de la curva alrededor de la cárcel del lado `side`. */
export function fanGeom(sides: number, side: number) {
  const { M, A } = params(sides);
  const D = fanStart(sides);
  const lat = D * Math.tan(Math.PI / sides);
  const P = armPoint(sides, side, D, lat);
  const q2 = armPoint(sides, side, D, A);
  const q3 = armPoint(sides, side + 1, D, -A);
  const a0 = Math.atan2(q2.y - P.y, q2.x - P.x);
  let delta = Math.atan2(q3.y - P.y, q3.x - P.x) - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  return { P, rIn: lat - A, rOut: lat - M, a0, delta };
}

function arc(c: Pt, r: number, a0: number, a1: number, steps: number): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
}

export const FAN_CELLS = 6;

export function fanCell(sides: number, side: number, k: number): Cell {
  const { P, rIn, rOut, a0, delta } = fanGeom(sides, side);
  const s0 = a0 + (delta * k) / FAN_CELLS;
  const s1 = a0 + (delta * (k + 1)) / FAN_CELLS;
  const pts = [...arc(P, rIn, s0, s1, 4), ...arc(P, rOut, s1, s0, 6)];
  const mid = (s0 + s1) / 2;
  const axis = { x: Math.cos(mid), y: Math.sin(mid) };
  const rm = (rIn + rOut) / 2;
  return { pts, points: fmt(pts), center: { x: P.x + axis.x * rm, y: P.y + axis.y * rm }, axis, angle: deg(axis) };
}

/** Celda de una casilla absoluta del recorrido común. */
export function trackCell(sides: number, square: number): Cell {
  const side = Math.floor(square / SQUARES_PER_SIDE);
  const o = square % SQUARES_PER_SIDE;
  if (o === 0) return armCell(sides, side, 'M', 0);
  if (o <= 5) return armCell(sides, side, 'L', o - 1);
  if (o <= 11) return fanCell(sides, side, o - 6);
  return armCell(sides, side + 1, 'R', 16 - o);
}

/** Celda del pasillo: j = 1..7 (1 = la más cercana a la entrada). */
export function corridorCell(sides: number, side: number, j: number): Cell {
  return armCell(sides, side, 'M', j);
}

/** Casilla de LLEGADA (fichas coronadas). */
export function llegadaCell(sides: number, side: number): Cell {
  return armCell(sides, side, 'M', 8);
}

/** Vértice exterior del tablero en la esquina de la cárcel del lado `side`. */
function outerVertex(sides: number, side: number): Pt {
  const { E } = params(sides);
  const { P } = fanGeom(sides, side);
  const k = E / fanStart(sides);
  return { x: P.x * k, y: P.y * k };
}

export interface JailGeom {
  /** Contorno de la cárcel (esquina redondeada hacia el centro). */
  points: string;
  center: Pt;
  /** Eje hacia afuera (para orientar las rejas). */
  axis: Pt;
}

export function jailGeom(sides: number, side: number): JailGeom {
  const { E, A } = params(sides);
  const { P, rIn, a0, delta } = fanGeom(sides, side);
  const V = outerVertex(sides, side);
  const pts = [
    armPoint(sides, side, E, A),
    ...arc(P, rIn, a0, a0 + delta, 16),
    armPoint(sides, side + 1, E, -A),
    V,
  ];
  const len = Math.hypot(V.x - P.x, V.y - P.y);
  return { points: fmt(pts), center: { x: (P.x + V.x) / 2, y: (P.y + V.y) / 2 }, axis: { x: (V.x - P.x) / len, y: (V.y - P.y) / len } };
}

/** Contorno exterior del tablero. */
export function outlinePoints(sides: number, grow = 0): string {
  return fmt(
    Array.from({ length: sides }, (_, s) => {
      const v = outerVertex(sides, s);
      const k = (Math.hypot(v.x, v.y) + grow) / Math.hypot(v.x, v.y);
      return { x: v.x * k, y: v.y * k };
    }),
  );
}

/** Radio del cielo (círculo central). */
export function skyRadius(sides: number): number {
  const { E, h } = params(sides);
  return E - 9 * h - 6;
}

/**
 * Rotación (grados) para que la cárcel de `viewSide` quede abajo a la izquierda
 * (4 lados) o abajo al centro (6 lados).
 */
export function viewRotation(sides: number, viewSide: number): number {
  const c = jailGeom(sides, viewSide).center;
  const target = sides === 4 ? 135 : 90;
  return target - deg(c);
}

/** Medio ancho y medio alto del dibujo ya rotado (para el viewBox). */
export function boardBox(sides: number): { w: number; h: number } {
  const pad = 18;
  if (sides === 4) return { w: params(4).E + pad, h: params(4).E + pad };
  const R = Math.hypot(outerVertex(6, 0).x, outerVertex(6, 0).y);
  // Con la rotación de vista, dos vértices quedan arriba y abajo.
  return { w: params(6).E + pad, h: R + pad };
}

/** Punto donde se dibuja una ficha (sin repartir por apilamiento). */
export function piecePoint(sides: number, side: number, pos: number, index: number): Pt {
  if (pos === JAIL) {
    const j = jailGeom(sides, side);
    const s = sides === 4 ? 40 : 32;
    const u = j.axis;
    const v = { x: -u.y, y: u.x };
    const [a, b] = [[-1, -1], [1, -1], [-1, 1], [1, 1]][index % 4]!;
    return { x: j.center.x + (u.x * a! + v.x * b!) * s, y: j.center.y + (u.y * a! + v.y * b!) * s };
  }
  const cell = pieceCell(sides, side, pos);
  if (pos === homeFor(sides)) {
    const step = sides === 4 ? 32 : 24;
    return { x: cell!.center.x + cell!.axis.x * (index - 1.5) * step, y: cell!.center.y + cell!.axis.y * (index - 1.5) * step };
  }
  return cell!.center;
}

/** Casilla en la que está una ficha (null en la cárcel). */
export function pieceCell(sides: number, side: number, pos: number): Cell | null {
  if (pos === JAIL) return null;
  const entry = entryFor(sides);
  if (pos === homeFor(sides)) return llegadaCell(sides, side);
  if (pos > entry) return corridorCell(sides, side, pos - entry);
  const square = (side * SQUARES_PER_SIDE + 5 + pos) % (sides * SQUARES_PER_SIDE);
  return trackCell(sides, square);
}

/** Reparte varias fichas a lo largo del eje de la casilla (las casillas son anchas). */
export function stackOffset(axis: Pt, i: number, n: number, spacing = 30): Pt {
  if (n <= 1) return { x: 0, y: 0 };
  const t = (i - (n - 1) / 2) * spacing;
  return { x: axis.x * t, y: axis.y * t };
}

export { avg };

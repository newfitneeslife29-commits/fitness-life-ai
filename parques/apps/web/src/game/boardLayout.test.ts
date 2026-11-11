import { describe, expect, it } from 'vitest';
import { entryFor, homeFor, JAIL, trackLength } from '@parques/engine';
import { corridorCell, jailGeom, llegadaCell, params, piecePoint, skyRadius, trackCell, type Pt } from './boardLayout';

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const parse = (points: string): Pt[] => points.split(' ').map((s) => ({ x: Number(s.split(',')[0]), y: Number(s.split(',')[1]) }));

function inside(p: Pt, poly: Pt[]): boolean {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ins = !ins;
  }
  return ins;
}

describe.each([4, 6] as const)('tablero clásico (%i lados)', (sides) => {
  const len = trackLength(sides);
  const { h } = params(sides);

  it('cada casilla del recorrido tiene su propia celda', () => {
    const keys = new Set(Array.from({ length: len }, (_, s) => {
      const c = trackCell(sides, s).center;
      return `${Math.round(c.x)},${Math.round(c.y)}`;
    }));
    expect(keys.size).toBe(len);
  });

  it('el recorrido es continuo (casillas consecutivas vecinas)', () => {
    for (let s = 0; s < len; s++) {
      const d = dist(trackCell(sides, s).center, trackCell(sides, (s + 1) % len).center);
      expect(d).toBeGreaterThan(h * 0.7);
      expect(d).toBeLessThan(150);
    }
  });

  it('SEGURO de la punta → pasillo de 7 → LLEGADA, junto al cielo', () => {
    for (let side = 0; side < sides; side++) {
      const cap = trackCell(sides, side * 17).center;
      expect(dist(cap, corridorCell(sides, side, 1).center)).toBeCloseTo(h, 0);
      expect(dist(corridorCell(sides, side, 7).center, llegadaCell(sides, side).center)).toBeCloseTo(h, 0);
      const ll = llegadaCell(sides, side).center;
      expect(Math.hypot(ll.x, ll.y)).toBeLessThan(skyRadius(sides) + h);
      expect(piecePoint(sides, side, entryFor(sides) + 1, 0)).toEqual(corridorCell(sides, side, 1).center);
      expect(piecePoint(sides, side, homeFor(sides), 0)).not.toEqual(piecePoint(sides, side, homeFor(sides), 1));
    }
  });

  it('la SALIDA y el SEGURO del tramo quedan pegados a la cárcel del dueño', () => {
    for (let side = 0; side < sides; side++) {
      const jail = parse(jailGeom(sides, side).points);
      const salida = trackCell(sides, side * 17 + 5);
      const seguro = trackCell(sides, side * 17 + 12);
      const near = (cell: { pts: Pt[] }) => Math.min(...cell.pts.flatMap((p) => jail.map((q) => dist(p, q))));
      expect(near(salida)).toBeLessThan(2);
      expect(near(seguro)).toBeLessThan(2);
      // Las fichas en la cárcel quedan dentro de la cárcel y ninguna casilla la pisa.
      for (let i = 0; i < 4; i++) expect(inside(piecePoint(sides, side, JAIL, i), jail)).toBe(true);
      for (let s = 0; s < len; s++) expect(inside(trackCell(sides, s).center, jail)).toBe(false);
    }
  });
});

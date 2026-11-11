import { describe, expect, it } from 'vitest';
import { entryFor, homeFor, JAIL, trackLength } from '@parques/engine';
import { boardExtent, CELL, corridorCell, jailGeom, piecePoint, trackCell } from './boardLayout';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe.each([4, 6] as const)('geometría del tablero (%i lados)', (sides) => {
  const len = trackLength(sides);

  it('cada casilla del recorrido tiene una celda distinta', () => {
    const keys = new Set(Array.from({ length: len }, (_, s) => {
      const c = trackCell(sides, s).center;
      return `${Math.round(c.x)},${Math.round(c.y)}`;
    }));
    expect(keys.size).toBe(len);
  });

  it('casillas consecutivas están una al lado de la otra (el recorrido es continuo)', () => {
    for (let s = 0; s < len; s++) {
      const d = dist(trackCell(sides, s).center, trackCell(sides, (s + 1) % len).center);
      expect(d).toBeGreaterThan(CELL * 0.5);
      expect(d).toBeLessThan(CELL * 1.5);
    }
  });

  it('el pasillo arranca junto a la entrada y no se cruza con el recorrido', () => {
    for (let side = 0; side < sides; side++) {
      const entry = trackCell(sides, side * 17).center;
      expect(dist(entry, corridorCell(sides, side, 1).center)).toBeCloseTo(CELL, 0);
      for (let j = 1; j <= 7; j++) {
        const c = corridorCell(sides, side, j).center;
        for (let s = 0; s < len; s++) expect(dist(c, trackCell(sides, s).center)).toBeGreaterThan(CELL * 0.5);
      }
    }
  });

  it('la salida queda junto a su cárcel y todo cabe en el tablero', () => {
    const E = boardExtent(sides);
    for (let side = 0; side < sides; side++) {
      const jail = jailGeom(sides, side);
      const exit = piecePoint(sides, side, 0, 0);
      const others = Array.from({ length: sides }, (_, o) => dist(piecePoint(sides, o, 0, 0), jail.center));
      expect(Math.min(...others)).toBe(dist(exit, jail.center));
      for (let s = 0; s < len; s++) {
        const c = trackCell(sides, s).center;
        expect(dist(c, jail.center)).toBeGreaterThan(jail.radius);
        expect(Math.abs(c.x)).toBeLessThan(E);
        expect(Math.abs(c.y)).toBeLessThan(E);
      }
      const home = piecePoint(sides, side, homeFor(sides), 0);
      expect(dist(home, { x: 0, y: 0 })).toBeLessThan(CELL * 3);
      expect(piecePoint(sides, side, JAIL, 0)).not.toEqual(piecePoint(sides, side, JAIL, 1));
      expect(piecePoint(sides, side, entryFor(sides) + 1, 0)).toEqual(corridorCell(sides, side, 1).center);
    }
  });
});

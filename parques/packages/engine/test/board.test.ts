import { describe, expect, it } from 'vitest';
import { entryFor, exitOwner, exitSquare, homeFor, isSafeSquare, partnerSide, squareOf, trackLength, JAIL } from '../src';

describe('tablero', () => {
  it('4 lados: 68 casillas, entrada 63, cielo 71', () => {
    expect(trackLength(4)).toBe(68);
    expect(entryFor(4)).toBe(63);
    expect(homeFor(4)).toBe(71);
  });

  it('6 lados: 102 casillas, entrada 97, cielo 105', () => {
    expect(trackLength(6)).toBe(102);
    expect(entryFor(6)).toBe(97);
    expect(homeFor(6)).toBe(105);
  });

  it('cada lado tiene 3 seguros (entrada, salida y seguro intermedio)', () => {
    const safes = Array.from({ length: 68 }, (_, i) => i).filter(isSafeSquare);
    expect(safes).toHaveLength(12);
    for (let s = 0; s < 4; s++) expect(isSafeSquare(exitSquare(s))).toBe(true);
  });

  it('la salida está en la casilla de progreso 0 y la entrada al pasillo da la vuelta', () => {
    for (let side = 0; side < 4; side++) {
      expect(squareOf(4, side, 0)).toBe(exitSquare(side));
      expect(squareOf(4, side, 63)).toBe(side * 17); // entrada (offset 0 del propio lado)
      expect(squareOf(4, side, 64)).toBeNull(); // pasillo
      expect(squareOf(4, side, JAIL)).toBeNull();
    }
  });

  it('identifica de quién es cada salida', () => {
    expect(exitOwner(exitSquare(2))).toBe(2);
    expect(exitOwner(3)).toBeNull();
  });

  it('el compañero es el lado opuesto', () => {
    expect(partnerSide(4, 0)).toBe(2);
    expect(partnerSide(4, 3)).toBe(1);
    expect(partnerSide(6, 1)).toBe(4);
  });
});

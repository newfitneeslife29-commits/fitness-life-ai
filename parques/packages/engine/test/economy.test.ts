import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, TOTAL_XP, levelFromXp, matchXp, payouts, productFor, TABLES, xpForLevel, xpToReach } from '../src';

describe('niveles hasta 500', () => {
  it('el nivel 500 es el máximo', () => {
    expect(MAX_LEVEL).toBe(500);
    expect(xpToReach(500)).toBe(TOTAL_XP);
    expect(TOTAL_XP).toBe(12_499_950);
    expect(levelFromXp(TOTAL_XP)).toMatchObject({ level: 500, max: true });
    expect(levelFromXp(TOTAL_XP * 3)).toMatchObject({ level: 500, max: true });
    expect(levelFromXp(TOTAL_XP - 1).level).toBe(499);
  });
  it('del 1 al 2 son 150 XP y cada nivel pide 100 más', () => {
    expect(xpForLevel(1)).toBe(150);
    expect(xpForLevel(2)).toBe(250);
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, need: 150 });
    expect(levelFromXp(150)).toMatchObject({ level: 2, into: 0 });
    expect(levelFromXp(399)).toMatchObject({ level: 2, into: 249 });
  });
  it('levelFromXp es consistente en todo el rango', () => {
    for (const L of [1, 2, 10, 99, 200, 498, 499, 500]) {
      expect(levelFromXp(xpToReach(L)).level).toBe(L);
      expect(levelFromXp(xpToReach(L) - 1).level).toBe(Math.max(1, L - 1));
    }
  });
});

describe('XP por partida', () => {
  it('mesa de 200: el ganador gana 50 XP; mesas más caras dan más', () => {
    expect(matchXp(200, 0)).toBe(50);
    expect(matchXp(200, 1)).toBe(40);
    expect(matchXp(200, 3)).toBe(30);
    expect(matchXp(5000, 0)).toBeGreaterThan(matchXp(1000, 0));
    expect(matchXp(0, 0)).toBe(10);
  });
});

describe('reparto del premio', () => {
  it('4 jugadores a 200: 1º se lleva su entrada + 75 % de las de 3º y 4º; 2º recupera', () => {
    expect(payouts(200, 4)).toEqual([500, 200, 0, 0]);
  });
  it('6 jugadores: ganan 1º, 2º y 3º', () => {
    expect(payouts(200, 6)).toEqual([500, 350, 200, 0, 0, 0]);
  });
  it('1 vs 1, 3 jugadores y parejas', () => {
    expect(payouts(200, 2)).toEqual([350, 0]);
    expect(payouts(200, 3)).toEqual([350, 200, 0]);
    expect(payouts(200, 4, true)).toEqual([350, 350, 0, 0]);
  });
  it('nunca se paga más de lo que entró (la casa se queda el 25 % de lo perdido)', () => {
    for (const n of [2, 3, 4, 6]) {
      const paid = payouts(1000, n).reduce((a, b) => a + b, 0);
      expect(paid).toBeLessThanOrEqual(1000 * n);
    }
  });
});

describe('mesas y productos', () => {
  it('mesas con entrada y nivel crecientes; Top Leyendas solo online', () => {
    for (let i = 1; i < TABLES.length; i++) expect(TABLES[i]!.entry).toBeGreaterThan(TABLES[i - 1]!.entry);
    expect(TABLES[0]!.entry).toBe(200);
    expect(TABLES.find((t) => t.id === 'top')).toMatchObject({ topOnly: true, onlineOnly: true });
  });
  it('los productos tienen precio en dólares', () => {
    expect(productFor('coins-s')?.usdCents).toBe(99);
    expect(productFor('item:board-oro')?.usdCents).toBe(999);
    expect(productFor('item:no-existe')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { createDeck, randomInt, shuffle } from '../deck';

const key = (c: { rank: number; suit: string }) => `${c.rank}${c.suit}`;

describe('deck', () => {
  it('creates 52 unique cards', () => {
    expect(new Set(createDeck().map(key)).size).toBe(52);
  });

  it('shuffle keeps 52 unique cards and does not mutate the input', () => {
    const deck = createDeck();
    const before = deck.map(key).join();
    const shuffled = shuffle(deck);
    expect(new Set(shuffled.map(key)).size).toBe(52);
    expect(deck.map(key).join()).toBe(before);
  });

  it('randomInt stays in range', () => {
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });

  it('shuffle is uniform (chi-squared on position of each card)', () => {
    const N = 100_000;
    // counts[card][position]
    const counts = Array.from({ length: 52 }, () => new Array(52).fill(0));
    const ids = Array.from({ length: 52 }, (_, i) => i);
    for (let t = 0; t < N; t++) {
      shuffle(ids).forEach((card, pos) => counts[card][pos]++);
    }
    const expected = N / 52;
    let chi2 = 0;
    for (const row of counts) for (const c of row) chi2 += (c - expected) ** 2 / expected;
    // 51·51 = 2601 grados de libertad; media 2601, σ ≈ 72. Margen amplio (> 6σ).
    expect(chi2).toBeLessThan(2601 + 6 * 72);
  }, 60_000);
});

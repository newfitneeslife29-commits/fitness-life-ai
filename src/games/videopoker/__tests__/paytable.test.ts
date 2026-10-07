import { describe, expect, it } from 'vitest';
import { payout } from '../paytable';

describe('payout', () => {
  it('pays the royal flush bonus only at max bet', () => {
    expect(payout('ROYAL_FLUSH', 5)).toBe(4000);
    expect(payout('ROYAL_FLUSH', 4)).toBe(1000);
    expect(payout('ROYAL_FLUSH', 1)).toBe(250);
  });

  it('scales the rest linearly (9/6)', () => {
    expect(payout('FULL_HOUSE', 1)).toBe(9);
    expect(payout('FLUSH', 1)).toBe(6);
    expect(payout('STRAIGHT_FLUSH', 5)).toBe(250);
    expect(payout('JACKS_OR_BETTER', 3)).toBe(3);
    expect(payout('NOTHING', 5)).toBe(0);
  });
});

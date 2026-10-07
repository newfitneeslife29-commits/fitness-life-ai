import { describe, expect, it } from 'vitest';
import { evaluateHand } from '../evaluate';
import { h } from './helpers';

describe('evaluateHand', () => {
  it.each([
    ['AS KS QS JS TS', 'ROYAL_FLUSH'],
    ['TH JH QH KH AH', 'ROYAL_FLUSH'],
    ['9C TC JC QC KC', 'STRAIGHT_FLUSH'],
    ['AD 2D 3D 4D 5D', 'STRAIGHT_FLUSH'],
    ['7S 7H 7D 7C 2S', 'FOUR_OF_A_KIND'],
    ['3S 3H 3D KC KS', 'FULL_HOUSE'],
    ['2H 7H 9H JH KH', 'FLUSH'],
    ['5S 6H 7D 8C 9S', 'STRAIGHT'],
    ['AS 2H 3D 4C 5S', 'STRAIGHT'],
    ['TS JH QD KC AS', 'STRAIGHT'],
    ['QS KH AD 2C 3S', 'NOTHING'],
    ['8S 8H 8D 2C 5S', 'THREE_OF_A_KIND'],
    ['4S 4H 9D 9C AS', 'TWO_PAIR'],
    ['JS JH 3D 6C 9S', 'JACKS_OR_BETTER'],
    ['AS AH 3D 6C 9S', 'JACKS_OR_BETTER'],
    ['TS TH 3D 6C 9S', 'NOTHING'],
    ['2S 5H 9D JC KS', 'NOTHING'],
  ])('%s → %s', (hand, expected) => {
    expect(evaluateHand(h(hand))).toBe(expected);
  });
});

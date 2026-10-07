import { HandRank } from './types';

export const PAYTABLE: Record<HandRank, number> = {
  ROYAL_FLUSH: 250,
  STRAIGHT_FLUSH: 50,
  FOUR_OF_A_KIND: 25,
  FULL_HOUSE: 9,
  FLUSH: 6,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  JACKS_OR_BETTER: 1,
  NOTHING: 0,
};

export function payout(rank: HandRank, bet: number): number {
  if (rank === 'ROYAL_FLUSH' && bet === 5) return 4000;
  return PAYTABLE[rank] * bet;
}

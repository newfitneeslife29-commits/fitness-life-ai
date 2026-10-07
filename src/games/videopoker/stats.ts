import { HAND_RANKS, HandRank, Stats } from './types';

export function emptyStats(): Stats {
  return {
    handsPlayed: 0,
    totalBet: 0,
    totalWon: 0,
    byRank: Object.fromEntries(HAND_RANKS.map((r) => [r, 0])) as Record<HandRank, number>,
    biggestWin: 0,
  };
}

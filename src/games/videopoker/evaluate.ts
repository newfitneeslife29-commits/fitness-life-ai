import { Card, HandRank } from './types';

export function evaluateHand(hand: Card[]): HandRank {
  const ranks = hand.map((c) => c.rank).sort((a, b) => a - b);
  const isFlush = hand.every((c) => c.suit === hand[0].suit);

  // Conteo por valor, ordenado de mayor a menor frecuencia: p. ej. [3, 2] = full
  const countMap = new Map<number, number>();
  for (const r of ranks) countMap.set(r, (countMap.get(r) ?? 0) + 1);
  const counts = [...countMap.values()].sort((a, b) => b - a);

  const unique = countMap.size === 5;
  const isWheel = ranks.join(',') === '2,3,4,5,14'; // A-2-3-4-5
  const isStraight = unique && (ranks[4] - ranks[0] === 4 || isWheel);

  if (isStraight && isFlush) return ranks[0] === 10 ? 'ROYAL_FLUSH' : 'STRAIGHT_FLUSH';
  if (counts[0] === 4) return 'FOUR_OF_A_KIND';
  if (counts[0] === 3 && counts[1] === 2) return 'FULL_HOUSE';
  if (isFlush) return 'FLUSH';
  if (isStraight) return 'STRAIGHT';
  if (counts[0] === 3) return 'THREE_OF_A_KIND';
  if (counts[0] === 2 && counts[1] === 2) return 'TWO_PAIR';
  if (counts[0] === 2) {
    const pairRank = [...countMap].find(([, n]) => n === 2)![0];
    if (pairRank >= 11) return 'JACKS_OR_BETTER';
  }
  return 'NOTHING';
}

import { Card, Rank, Suit } from '../types';

const RANK_MAP: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14,
};

/** h('AS KS QS JS TS') → mano de 5 cartas. */
export function h(s: string): Card[] {
  return s.split(' ').map((code) => ({ rank: RANK_MAP[code[0]], suit: code[1] as Suit }));
}
